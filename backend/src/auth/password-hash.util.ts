/**
 * password-hash.util.ts
 * ---------------------
 * Centralised password hashing / verification with a transparent
 * bcrypt → Argon2id migration path.
 *
 * Migration strategy (zero downtime, no forced password resets):
 *
 *   1. NEW users   → hashed immediately with Argon2id.
 *   2. EXISTING users (bcrypt hashes, `$2b$` prefix):
 *      - On next successful login the service layer calls `upgradeNeeded()`
 *        to detect the old hash format.
 *      - The plaintext password (available only at login time) is rehashed
 *        with Argon2id and saved to the DB in the same request.
 *      - Subsequent logins use the Argon2id path.
 *
 * Why Argon2id?
 *   - Resists GPU brute-force (memory-hard) and cache-timing attacks
 *     (combines data-dependent and data-independent access patterns).
 *   - Winning algorithm of the Password Hashing Competition (PHC).
 *   - OWASP strongly recommends it over bcrypt / PBKDF2 for new systems.
 *
 * Parameter rationale (OWASP 2024 recommendation for argon2id):
 *   memoryCost  64 MB (65 536 KiB) — min 46 MB per OWASP; 64 MB is a safe
 *                                    production default.
 *   timeCost    3 iterations        — keeps < 300 ms on a modern CPU at 64 MB.
 *   parallelism 4 threads           — match typical 4-core server; argon2
 *                                    hashes are still portable to machines
 *                                    with fewer cores (just slower).
 *
 * Performance note:
 *   At these settings one hash takes ≈ 80–200 ms on a modern server core.
 *   BullMQ & clustering hide this latency in production; login calls simply
 *   await the verify + optional rehash (< 400 ms total for a migration call).
 */

import * as argon2 from 'argon2';
import * as bcrypt from 'bcryptjs';

// ── Argon2id configuration ──────────────────────────────────────────────────

/**
 * Production-safe Argon2id parameters.
 * Adjust memoryCost upward (e.g. 131072 = 128 MB) if your servers have
 * headroom and you want stronger protection.
 */
export const ARGON2_OPTIONS: argon2.Options & { raw: false } = {
  type: argon2.argon2id,
  memoryCost: 65_536, // 64 MB in KiB
  timeCost: 3, // number of iterations
  parallelism: 4, // degree of parallelism
  raw: false, // return encoded string, not raw Buffer
};

// ── Hash detection ──────────────────────────────────────────────────────────

/**
 * Returns true when the stored hash was produced by bcrypt
 * (`$2a$`, `$2b$`, or `$2y$` prefixes).
 */
export function isBcryptHash(hash: string): boolean {
  return hash.startsWith('$2');
}

/**
 * Returns true when the stored hash was produced by Argon2
 * (`$argon2i$`, `$argon2d$`, or `$argon2id$` prefixes).
 */
export function isArgon2Hash(hash: string): boolean {
  return hash.startsWith('$argon2');
}

/**
 * Returns true when the stored hash is a legacy bcrypt hash that should
 * be transparently upgraded to Argon2id on the next successful login.
 */
export function upgradeNeeded(storedHash: string): boolean {
  return isBcryptHash(storedHash);
}

// ── Core API ────────────────────────────────────────────────────────────────

/**
 * Hash a plaintext password using Argon2id.
 * Always call this for new registrations and password resets.
 *
 * @param plain - User-supplied plaintext password (never log or persist this)
 * @returns Argon2id encoded hash string suitable for DB storage
 */
export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against a stored hash, regardless of algorithm.
 *
 * The function auto-detects the hash algorithm:
 *   - `$2*` prefix  → bcrypt (bcryptjs)
 *   - `$argon2*` prefix → Argon2 (argon2 package)
 *   - Anything else  → throws to surface misconfiguration early
 *
 * @param plain      - Plaintext password from the login request body
 * @param storedHash - Hash persisted in the database
 * @returns `true` if the password matches, `false` otherwise
 * @throws Error if the hash format is unrecognised
 */
export async function verifyPassword(
  plain: string,
  storedHash: string,
): Promise<boolean> {
  if (isBcryptHash(storedHash)) {
    // Legacy bcrypt path — safe during the migration window
    return bcrypt.compare(plain, storedHash);
  }

  if (isArgon2Hash(storedHash)) {
    // Primary Argon2 path
    return argon2.verify(storedHash, plain);
  }

  // Unknown hash format — fail loudly in dev, fail closed in prod
  throw new Error(
    `Unrecognised password hash format (prefix: ${storedHash.slice(0, 10)}). ` +
      'Database may be corrupted or a different algorithm was used.',
  );
}
