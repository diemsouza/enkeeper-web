import { cookies } from "next/headers";
import { LAST_ACCESS_COOKIE_NAME } from "@/src/core/last-access";
import { LoginFlow } from "./login-flow";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const hasAccessedBefore = Boolean(
    cookieStore.get(LAST_ACCESS_COOKIE_NAME)?.value,
  );
  return <LoginFlow hasAccessedBefore={hasAccessedBefore} />;
}
