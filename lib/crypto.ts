import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "crypto";

/**
 * AES-256-GCM for third-party credentials stored in the database (Google refresh tokens).
 * Key: TOKEN_ENCRYPTION_KEY, falling back to JWT_SECRET. Rotating the key makes stored
 * values unreadable, so set TOKEN_ENCRYPTION_KEY once and keep it.
 */
const PREFIX = "enc:v1:";

function getKey(): Buffer {
    const secret = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || "bilula_secret_default_key_2024";
    return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

/** Values without the prefix are returned unchanged (plaintext written before encryption existed). */
export function decryptSecret(stored: string): string {
    if (!stored.startsWith(PREFIX)) return stored;
    const raw = Buffer.from(stored.slice(PREFIX.length), "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function sha256(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}

/** URL-safe random token with an optional readable prefix (e.g. "mtx_at_"). */
export function randomToken(prefix = "", bytes = 32): string {
    return prefix + randomBytes(bytes).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && timingSafeEqual(ab, bb);
}
