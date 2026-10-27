import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth/current-user";
import { sanitizeRedirectPath } from "@/src/core/auth-routes";
import { GoogleLoginDone } from "./google-login-done";

type GoogleLoginPageProps = {
  searchParams: Promise<{ event?: string; redirect_to?: string }>;
};

export default async function GoogleLoginPage({
  searchParams,
}: GoogleLoginPageProps) {
  const { event, redirect_to } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <GoogleLoginDone
      userId={user.id}
      event={event === "sign_up" ? "sign_up" : "login"}
      redirectTo={sanitizeRedirectPath(redirect_to)}
    />
  );
}
