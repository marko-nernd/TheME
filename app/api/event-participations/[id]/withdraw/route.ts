import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { BookingChangeError, cancelBooking } from "@/lib/cancel-booking";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const body = await request.json();
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (reason.length < 5) {
    return NextResponse.json({ error: "Add a brief reason for declining the accepted invitation." }, { status: 400 });
  }
  try {
    await cancelBooking((await params).id, member.id, false, reason);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof BookingChangeError ? error.message : "Could not safely cancel this booking. Payment may still be processing; please retry shortly." }, { status: 409 });
  }
}
