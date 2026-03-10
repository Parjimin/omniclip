import { NextResponse } from "next/server";
import { createUser, createSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, dan nama wajib diisi" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }

    try {
      const user = await createUser(email, password, name);
      await createSessionCookie(user.id, user.email);
      
      return NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Email sudah terdaftar") {
        return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
      }
      throw err;
    }
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan saat registrasi" }, { status: 500 });
  }
}
