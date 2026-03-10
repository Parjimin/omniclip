import { SignIn1 } from "@/components/ui/modern-stunning-sign-in";
import { verifySessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  // If the user is already authenticated, redirect them to the setup page
  const session = await verifySessionCookie();
  
  if (session) {
    redirect("/setup");
  }

  return <SignIn1 />;
}
