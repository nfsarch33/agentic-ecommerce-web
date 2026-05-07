import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fetchBackendSession } from "@/lib/adapters/api/auth";
import { canAccessRole, type Role, type Session } from "@/lib/domain/auth";
import { readAuthTokenFromCookieHeader } from "./auth-cookie";

export function authBackendBaseUrl(): string {
  return process.env.MC_API_BASE_URL ?? "http://localhost:8080";
}

export async function getSessionFromCookieHeader(cookieHeader: string | null): Promise<Session | null> {
  const accessToken = readAuthTokenFromCookieHeader(cookieHeader);
  if (!accessToken) return null;
  try {
    return await fetchBackendSession({
      baseUrl: authBackendBaseUrl(),
      accessToken,
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<Session | null> {
  const headerStore = await headers();
  return getSessionFromCookieHeader(headerStore.get("cookie"));
}

export async function requireServerSession(minRole: Role = "viewer"): Promise<Session> {
  const session = await getServerSession();
  if (!session) {
    redirect("/login?next=/admin");
  }
  if (!canAccessRole(session.user.role, minRole)) {
    redirect("/admin");
  }
  return session;
}
