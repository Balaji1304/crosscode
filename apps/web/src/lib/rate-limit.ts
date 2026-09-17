import { Ratelimit, type Duration } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"
import { logger } from "./logger"

let redis: Redis | null = null
let misconfiguredWarned = false

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    if (!misconfiguredWarned) {
      misconfiguredWarned = true
      logger.warn("RateLimit", "UPSTASH_REDIS_REST_URL/TOKEN not set - rate limiting is fail-open. Set env vars in production.")
    }
    return null
  }
  if (!redis) redis = new Redis({ url, token })
  return redis
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown"
}

export type RateLimitPresetName = "authEmail" | "sensitiveWrite" | "billing" | "publicRead" | "globalApi"

const PRESETS: Record<RateLimitPresetName, { prefix: string; limiters: { max: number; window: Duration }[] }> = {
  authEmail: { prefix: "rl:auth-email", limiters: [{ max: 5, window: "1 m" }, { max: 20, window: "1 h" }] },
  sensitiveWrite: { prefix: "rl:sensitive-write", limiters: [{ max: 10, window: "1 m" }, { max: 50, window: "1 h" }] },
  billing: { prefix: "rl:billing", limiters: [{ max: 15, window: "1 m" }] },
  publicRead: { prefix: "rl:public-read", limiters: [{ max: 60, window: "1 m" }] },
  globalApi: { prefix: "rl:global-api", limiters: [{ max: 100, window: "1 m" }] },
}

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
  ip: string
  enforced: boolean
}

export async function checkRateLimit(req: Request, preset: RateLimitPresetName, keySuffix?: string): Promise<RateLimitResult> {
  const ip = getClientIp(req)
  const client = getRedis()
  if (!client) return { success: true, limit: 0, remaining: 0, reset: 0, ip, enforced: false }

  const { prefix, limiters } = PRESETS[preset]
  const key = keySuffix ? `${prefix}:${ip}:${keySuffix}` : `${prefix}:${ip}`

  try {
    for (const { max, window } of limiters) {
      const limiter = new Ratelimit({ redis: client, limiter: Ratelimit.slidingWindow(max, window), prefix })
      const { success, limit, remaining, reset } = await limiter.limit(key)
      if (!success) {
        logger.warn("RateLimit", `Blocked ip=${ip} preset=${preset} limit=${limit}/${window}`)
        return { success: false, limit, remaining, reset, ip, enforced: true }
      }
    }
    return { success: true, limit: 0, remaining: 0, reset: 0, ip, enforced: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error("RateLimit", `Redis error, fail-open: ${msg}`)
    return { success: true, limit: 0, remaining: 0, reset: 0, ip, enforced: false }
  }
}

export function rateLimitedResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  )
}

export async function checkOtpResendCooldown(email: string, cooldownSeconds = 60): Promise<{ allowed: boolean; retryAfter: number }> {
  const client = getRedis()
  if (!client) return { allowed: true, retryAfter: 0 }
  const key = `otp-cooldown:${email.toLowerCase()}`
  try {
    const set = await client.set(key, "1", { nx: true, ex: cooldownSeconds })
    if (set === "OK") return { allowed: true, retryAfter: 0 }
    const ttl = await client.ttl(key)
    return { allowed: false, retryAfter: ttl > 0 ? ttl : cooldownSeconds }
  } catch {
    return { allowed: true, retryAfter: 0 }
  }
}
