"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setLoggingOut] = useState(false);

  async function logout(): Promise<void> {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network failures: the BFF logout is best-effort and the
      // user-visible side effect is the redirect+refresh below. Letting
      // a rejected fetch escape `void logout()` would surface as an
      // unhandled-rejection warning without changing UX.
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={isLoggingOut}
      className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:text-gray-400"
    >
      {isLoggingOut ? "Signing out..." : "Log out"}
    </button>
  );
}
