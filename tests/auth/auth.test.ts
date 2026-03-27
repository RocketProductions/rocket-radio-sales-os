import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signToken, verifyToken } from "@/lib/auth";

process.env.JWT_SECRET = "test-secret-for-unit-tests-minimum-length";

describe("auth helpers", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("SuperSecret123!");
    expect(await verifyPassword("SuperSecret123!", hash)).toBe(true);
    expect(await verifyPassword("WrongPassword", hash)).toBe(false);
  });

  it("signs and verifies a JWT", async () => {
    const payload = { sub: "user-1", email: "test@example.com", tenantId: "tenant-1", role: "executive" as const };
    const token = await signToken(payload);
    expect(typeof token).toBe("string");
    const decoded = await verifyToken(token);
    expect(decoded.sub).toBe("user-1");
    expect(decoded.email).toBe("test@example.com");
  });
});
