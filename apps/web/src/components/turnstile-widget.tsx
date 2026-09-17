"use client"

import { useEffect, useRef } from "react"

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; reset: (id?: string) => void }
    onTurnstileLoad?: () => void
  }
}

export function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const ref = useRef<HTMLDivElement>(null)
  const onTokenRef = useRef(onToken)

  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

  useEffect(() => {
    if (!siteKey || !ref.current) return
    let widgetId: string | undefined
    let cancelled = false

    const render = () => {
      if (cancelled || !ref.current || !window.turnstile || widgetId) return
      widgetId = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      })
    }

    if (window.turnstile) {
      render()
    } else {
      window.onTurnstileLoad = render
      const script = document.querySelector('script[data-turnstile]') as HTMLScriptElement | null
      if (!script) {
        const s = document.createElement("script")
        s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad"
        s.async = true
        s.defer = true
        s.dataset.turnstile = "true"
        document.head.appendChild(s)
      }
    }
    return () => {
      cancelled = true
    }
  }, [siteKey])

  if (!siteKey) return null
  return <div ref={ref} />
}
