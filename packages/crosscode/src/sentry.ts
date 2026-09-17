import * as Sentry from "@sentry/node"
import type { Config } from "./config"

const DEFAULT_DSN = process.env.CROSSCODE_SENTRY_DSN ?? ""

export function isTelemetryEnabled(config: Config): boolean {
    if (process.env.CROSSCODE_TELEMETRY === "0" || process.env.CROSSCODE_TELEMETRY === "false") return false
    if (process.env.CROSSCODE_TELEMETRY === "1" || process.env.CROSSCODE_TELEMETRY === "true") return true
    return config.telemetry === true
}

function scrubString(input: string): string {
    return input
        .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
        .replace(/\b[0-9a-f]{32,64}\b/gi, "[token]")
        .replace(/Basic\s+[A-Za-z0-9+/=]{8,}/g, "Basic [Filtered]")
        .replace(/Bearer\s+[A-Za-z0-9._~+/-]{8,}/g, "Bearer [Filtered]")
}

export function initSentry(config: Config, opts: { tunnelProvider?: string } = {}): boolean {
    const dsn = process.env.CROSSCODE_SENTRY_DSN ?? DEFAULT_DSN
    const enabled = isTelemetryEnabled(config) && dsn.length > 0
    Sentry.init({
        dsn: dsn || undefined,
        enabled,
        release: `crosscode@${process.env.npm_package_version ?? "0.6.9"}`,
        tracesSampleRate: 0,
        sendDefaultPii: false,
        beforeSend(event) {
            if (event.message) event.message = scrubString(event.message)
            if (event.exception?.values) {
                for (const value of event.exception.values) {
                    if (value.value) value.value = scrubString(value.value)
                }
            }
            if (event.request?.headers) {
                for (const key of Object.keys(event.request.headers)) {
                    if (/auth|token|cookie|session|api-?key/i.test(key)) {
                        event.request.headers[key] = "[Filtered]"
                    }
                }
            }
            return event
        },
        ignoreErrors: [/ECONNRESET/, /EPIPE/, /ENOTFOUND/, /ECONNREFUSED/],
    })
    if (enabled) {
        Sentry.setTag("tunnelProvider", opts.tunnelProvider ?? "unknown")
        if (config.auth?.tier) Sentry.setTag("tier", config.auth.tier)
    }
    return enabled
}

export function captureCliError(err: unknown, context?: Record<string, unknown>): void {
    if (context) Sentry.setContext("cli", context)
    Sentry.captureException(err)
}
