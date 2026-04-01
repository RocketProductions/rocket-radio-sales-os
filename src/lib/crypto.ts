/**
 * crypto.ts — AES-256-GCM token encryption/decryption.
 *
 * Requires ENCRYPTION_KEY env var (32-byte hex, generate with: openssl rand -hex 32).
 * Format: {iv_hex}:{authTag_hex}:{encrypted_hex}
 *
 * NEVER expose this module to the browser — server-only.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const DEV_FALLBACK_KEY =
  "0000000000000000000000000000000000000000000000000000000000000000";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    console.warn(
      "[crypto] WARNING: ENCRYPTION_KEY is not set. Using insecure dev fallback key. Set ENCRYPTION_KEY in production."
    );
    return Buffer.from(DEV_FALLBACK_KEY, "hex");
  }
  if (raw.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate with: openssl rand -hex 32"
    );
  }
  return Buffer.from(raw, "hex");
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a string formatted as: {iv_hex}:{authTag_hex}:{encrypted_hex}
 */
export function encryptToken(plaintext: string): string {
  try {
    const key = getKey();
    const iv = randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = createCipheriv("aes-256-gcm", key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
  } catch (err) {
    throw new Error(
      `encryptToken failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Decrypt a ciphertext string produced by encryptToken.
 * Expects format: {iv_hex}:{authTag_hex}:{encrypted_hex}
 */
export function decryptToken(ciphertext: string): string {
  try {
    const parts = ciphertext.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid ciphertext format — expected iv:authTag:data");
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (err) {
    throw new Error(
      `decryptToken failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
