import { logger } from "./logger"

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY)
}

export async function verifyTurnstileToken(token: string | null | undefined, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    logger.warn("Turnstile", "TURNSTILE_SECRET_KEY not set - skipping verification (fail-open). Set it in production.")
    return true
  }
  if (!token) return false
  try {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, ...(remoteIp ? { remoteip: remoteIp } : {}) }),
      signal: ctrl.signal,
    })
    clearTimeout(timeout)
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error("Turnstile", `Verification request failed: ${msg}`)
    return false
  }
}

export function turnstileTokenFromBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null
  const t = (body as Record<string, unknown>).turnstileToken
  return typeof t === "string" && t.length > 0 ? t : null
}
