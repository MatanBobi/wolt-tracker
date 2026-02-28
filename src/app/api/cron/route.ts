import { NextRequest, NextResponse } from "next/server";
import { pollAllVenues } from "../../../lib/poller";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    // Support both: ?secret=xxx query param, or Authorization: Bearer xxx header
    const { searchParams } = new URL(request.url);
    const querySecret = searchParams.get("secret");
    const authHeader = request.headers.get("authorization");
    const headerSecret = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (querySecret !== cronSecret && headerSecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await pollAllVenues();
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Poll failed:", error);
    return NextResponse.json({ error: "Poll failed" }, { status: 500 });
  }
}
