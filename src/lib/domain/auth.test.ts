import { describe, expect, it } from "vitest";
import {
  AuthError,
  assertRole,
  canAccessRole,
  canViewAdminNavItem,
  type Role,
  type User,
} from "./auth";

describe("auth domain", () => {
  it("accepts only the supported RBAC roles", () => {
    expect(assertRole("admin")).toBe("admin");
    expect(assertRole("operator")).toBe("operator");
    expect(assertRole("viewer")).toBe("viewer");
    expect(() => assertRole("owner")).toThrow(AuthError);
  });

  it("treats admin as the highest role and viewer as read-only", () => {
    expect(canAccessRole("admin", "viewer")).toBe(true);
    expect(canAccessRole("operator", "viewer")).toBe(true);
    expect(canAccessRole("viewer", "operator")).toBe(false);
  });

  it.each([
    ["admin", "settings", true],
    ["operator", "settings", false],
    ["viewer", "agents", false],
    ["viewer", "products", true],
  ] satisfies Array<[Role, string, boolean]>)(
    "resolves %s visibility for %s navigation",
    (role, item, expected) => {
      const user: User = { id: "u_1", email: "user@example.com", role };
      expect(canViewAdminNavItem(user, item)).toBe(expected);
    },
  );
});
