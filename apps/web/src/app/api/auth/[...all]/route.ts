import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit"
import { isTurnstileConfigured, verifyTurnstileToken } from "@/lib/turnstile"

const { GET: authGET, POST: authPOST } = toNextJsHandler(auth)

// better-auth sub-paths that trigger an outbound email (OTP / verification)
const EMAIL_SENDING_PATHS = ["/email-otp/send-verification-otp", "/sign-up/email", "/send-verification-email"]

async function guardEmailAbuse(request: Request): Promise<NextResponse | null> {
  const rl = await checkRateLimit(request, "authEmail")
  if (!rl.success) return rateLimitedResponse(rl)

  if (isTurnstileConfigured()) {
    const url = new URL(request.url)
    const needsCaptcha = request.method === "POST" && EMAIL_SENDING_PATHS.some((p) => url.pathname.endsWith(p))
    if (needsCaptcha) {
      const ok = await verifyTurnstileToken(request.headers.get("x-turnstile-token"), getClientIp(request))
      if (!ok) return NextResponse.json({ error: "Bot verification failed" }, { status: 403 })
    }
  }
  return null
}

export async function GET(request: Request) {
  const blocked = await guardEmailAbuse(request)
  if (blocked) return blocked
  return authGET(request)
}

export async function POST(request: Request) {
  const blocked = await guardEmailAbuse(request)
  if (blocked) return blocked
  return authPOST(request)
}
