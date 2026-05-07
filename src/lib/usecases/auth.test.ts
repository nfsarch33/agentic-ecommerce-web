import { describe, expect, it } from "vitest";
import {
  authReducer,
  initialAuthState,
  validateLoginInput,
} from "./auth";

const session = {
  user: { id: "u_1", email: "admin@example.com", name: "Ada Admin", role: "admin" as const },
  expiresAt: "2026-05-07T10:00:00Z",
};

describe("auth reducer", () => {
  it("records the authenticated session after login succeeds", () => {
    const state = authReducer(initialAuthState, { type: "loginSucceeded", session });
    expect(state.status).toBe("authenticated");
    expect(state.session?.user.email).toBe("admin@example.com");
    expect(state.error).toBeNull();
  });

  it("clears the session on logout", () => {
    const loggedIn = authReducer(initialAuthState, { type: "loginSucceeded", session });
    const state = authReducer(loggedIn, { type: "logoutSucceeded" });
    expect(state).toEqual(initialAuthState);
  });

  it("records login errors without keeping a stale session", () => {
    const state = authReducer(initialAuthState, {
      type: "loginFailed",
      error: "Invalid credentials",
    });
    expect(state.status).toBe("anonymous");
    expect(state.session).toBeNull();
    expect(state.error).toBe("Invalid credentials");
  });
});

describe("validateLoginInput", () => {
  it("requires a valid email and non-empty password", () => {
    expect(validateLoginInput({ email: "not-an-email", password: "" })).toEqual({
      email: "Enter a valid email address.",
      password: "Password is required.",
    });
  });

  it("normalizes valid credentials", () => {
    expect(validateLoginInput({ email: "  ADMIN@Example.COM ", password: "secret" })).toEqual({
      email: "admin@example.com",
      password: "secret",
    });
  });
});
