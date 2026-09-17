import { NextRequest, NextResponse } from "next/server"
import { getBillingUser } from "@/lib/billing-auth"
import { getDodo } from "@/lib/dodo"
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const ipRl = await checkRateLimit(req, "billing")
    if (!ipRl.success) return rateLimitedResponse(ipRl)

    const currentUser = await getBillingUser(req)
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const userRl = await checkRateLimit(req, "billing", `user:${currentUser.id}`)
    if (!userRl.success) return rateLimitedResponse(userRl)
    if (!currentUser.dodoCustomerId) return NextResponse.json({ error: "No billing account found" }, { status: 400 })

    const portal = await getDodo().customers.customerPortal.create(currentUser.dodoCustomerId)
    return NextResponse.json({ url: portal.link })
  } catch (error) {
    console.error("Failed to create DoDo portal session", error)
    return NextResponse.json({ error: "Unable to open billing portal" }, { status: 500 })
  }
}
