import { NextResponse } from "next/server";
import { pushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    configured: pushConfigured(),
    publicKey: process.env.VAPID_PUBLIC_KEY || null,
  });
}
