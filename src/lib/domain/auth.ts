export type Role = "admin" | "operator" | "viewer";

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name?: string;
  readonly role: Role;
}

export interface Session {
  readonly user: User;
  readonly expiresAt: string;
}

export class AuthError extends Error {
  override readonly name = "AuthError";
  readonly code: string;

  constructor(message: string, code = "auth_error") {
    super(message);
    this.code = code;
  }
}

const roles = new Set<Role>(["admin", "operator", "viewer"]);
const roleRank: Record<Role, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
};

const adminNavMinimumRoles: Record<string, Role> = {
  dashboard: "viewer",
  products: "viewer",
  media: "operator",
  orders: "viewer",
  sync: "operator",
  agents: "operator",
  compliance: "operator",
  workflows: "operator",
  n8n: "admin",
  temporal: "admin",
  settings: "admin",
};

export function assertRole(value: unknown): Role {
  if (typeof value !== "string" || !roles.has(value as Role)) {
    throw new AuthError("role must be admin, operator, or viewer", "invalid_role");
  }
  return value as Role;
}

export function canAccessRole(actual: Role, required: Role): boolean {
  return roleRank[actual] >= roleRank[required];
}

export function canViewAdminNavItem(user: Pick<User, "role">, item: string): boolean {
  const required = adminNavMinimumRoles[item] ?? "admin";
  return canAccessRole(user.role, required);
}
