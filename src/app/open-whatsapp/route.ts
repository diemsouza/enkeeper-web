import { NextResponse } from "next/server";

export function GET(): NextResponse {
  const wabaPhoneNumber = process.env.WABA_PHONE_NUMBER || "";
  const text = encodeURIComponent("Oi, quero começar a praticar.");
  const url = `https://wa.me/${wabaPhoneNumber}?text=${text}`;
  const response = NextResponse.redirect(url);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
