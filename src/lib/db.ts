import type { User } from "@/types/content";

const users = new Map<string, User>();

export function findUserByEmail(email: string): User | undefined {
  for (const u of users.values()) {
    if (u.email.toLowerCase() === email.toLowerCase()) return u;
  }
}

export function findUserById(id: string): User | undefined {
  return users.get(id);
}

export function createUser(user: User): User {
  if (findUserByEmail(user.email)) throw new Error("A user with this email already exists");
  users.set(user.id, user);
  return user;
}
