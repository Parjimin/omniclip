import { NextResponse } from "next/server";
import { verifySessionCookie, findUserById } from "@/lib/auth";

export async function GET() {
  const session = await verifySessionCookie();
  
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ 
    user: { 
      id: user.id, 
      email: user.email, 
      name: user.name 
    } 
  });
}
