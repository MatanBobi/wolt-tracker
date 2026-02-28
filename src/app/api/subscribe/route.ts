import { NextRequest, NextResponse } from "next/server";
import { setSubscription } from "../../../lib/store";
import type { PushSubscription as WebPushSubscription } from "web-push";

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "x-user-id header required" }, { status: 400 });
  }

  try {
    const subscription: WebPushSubscription = await request.json();

    if (!subscription?.endpoint) {
      return NextResponse.json(
        { error: "Invalid push subscription" },
        { status: 400 }
      );
    }

    await setSubscription(userId, subscription);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}
