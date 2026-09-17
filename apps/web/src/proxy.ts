import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { logger } from "@/lib/logger"
import { checkRateLimit } from "@/lib/rate-limit"

export default async function middleware(request: NextRequest) {
  const { method, nextUrl } = request
  const start = Date.now()

  if (nextUrl.pathname.startsWith("/api/")) {
    const rl = await checkRateLimit(request, "globalApi")
    if (!rl.success) {
      const retryAfter = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))
      logger.warn("HTTP", `429 ${method} ${nextUrl.pathname} ip=${rl.ip}`)
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      )
    }
  }

  const response = await NextResponse.next()

  const duration = Date.now() - start
  logger.info("HTTP", `${method} ${nextUrl.pathname}${nextUrl.search} -> ${response.status} (${duration}ms)`)

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
}
