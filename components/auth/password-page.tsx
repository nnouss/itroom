import { redirect } from "next/navigation";
import { AuthForm } from "./auth-form";
import { createClient } from "@/lib/supabase/server";
import { isEnvConfigured } from "@/lib/env";
export async function PasswordPage({ title }: { title: string }) {
  const configured = isEnvConfigured();
  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) redirect("/auth/error");
  }
  return (
    <>
      <h1 className="type-heading mb-6">{title}</h1>
      <AuthForm mode="password" configured={configured} />
    </>
  );
}
