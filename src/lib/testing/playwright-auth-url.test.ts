import { describe, expect, it } from "vitest";
import { resolveAdminURL, resolveLoginURL } from "../../../e2e/helpers/auth-url";

describe("playwright auth URL helpers", () => {
  it("falls back to the configured base URL before the page has navigated", () => {
    expect(resolveLoginURL("about:blank", "http://127.0.0.1:3100")).toBe(
      "http://127.0.0.1:3100/api/auth/login",
    );
    expect(resolveAdminURL("about:blank", "http://127.0.0.1:3100")).toBe(
      "http://127.0.0.1:3100/admin",
    );
  });

  it("reuses the active page origin after navigation", () => {
    expect(resolveLoginURL("http://127.0.0.1:3100/admin/products?tab=media")).toBe(
      "http://127.0.0.1:3100/api/auth/login",
    );
    expect(resolveAdminURL("http://127.0.0.1:3100/admin/products?tab=media")).toBe(
      "http://127.0.0.1:3100/admin",
    );
  });
});
