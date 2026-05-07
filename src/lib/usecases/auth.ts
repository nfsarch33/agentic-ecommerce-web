import type { Session } from "@/lib/domain/auth";

export interface AuthState {
  readonly status: "anonymous" | "authenticated";
  readonly session: Session | null;
  readonly error: string | null;
}

export type AuthAction =
  | { readonly type: "loginSucceeded"; readonly session: Session }
  | { readonly type: "loginFailed"; readonly error: string }
  | { readonly type: "logoutSucceeded" };

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

export type LoginValidationResult = LoginInput | Partial<Record<keyof LoginInput, string>>;

export const initialAuthState: AuthState = {
  status: "anonymous",
  session: null,
  error: null,
};

const emailRE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "loginSucceeded":
      return {
        status: "authenticated",
        session: action.session,
        error: null,
      };
    case "loginFailed":
      return {
        status: "anonymous",
        session: null,
        error: action.error,
      };
    case "logoutSucceeded":
      return initialAuthState;
    default:
      return state;
  }
}

export function validateLoginInput(input: LoginInput): LoginValidationResult {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const errors: Partial<Record<keyof LoginInput, string>> = {};

  if (!emailRE.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (password.trim() === "") {
    errors.password = "Password is required.";
  }
  if (Object.keys(errors).length > 0) return errors;
  return { email, password };
}

export function hasLoginValidationErrors(
  result: LoginValidationResult,
): result is Partial<Record<keyof LoginInput, string>> {
  return result.email === "Enter a valid email address." || result.password === "Password is required.";
}
