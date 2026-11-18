import crypto from "node:crypto";

// RFC 6238 TOTP (SHA-1, 6 digits, 30s step) implemented from scratch -
// small enough not to need a dependency, and every authenticator app
// (Google/Microsoft Authenticator, Aegis, 1Password, ...) speaks this
// exact profile.
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", secret).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binCode % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function totpAuthUri(secret: string, username: string, issuer = "Ascend"): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(username)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

// Accepts the current 30s step plus one step of drift either side (90s
// window total) - generous enough for clock skew between phone and
// server without meaningfully weakening the 6-digit code. Returns the
// matched HOTP counter (not just true/false) so a caller can do replay
// protection - see lib/totp-replay.ts - without redoing this search.
export function matchTotpCounter(secret: string, token: string, window = 1): number | null {
  const clean = token.trim();
  if (!/^\d{6}$/.test(clean)) return null;
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const candidateCounter = counter + errorWindow;
    const candidate = hotp(key, candidateCounter);
    if (
      candidate.length === clean.length &&
      crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(clean))
    ) {
      return candidateCounter;
    }
  }
  return null;
}

// Plain validity check with no replay protection - only for places that
// genuinely don't have a user record to track a counter against. Prefer
// verifyAndConsumeTotp (lib/totp-replay.ts) wherever a userId is available.
export function verifyTotpToken(secret: string, token: string, window = 1): boolean {
  return matchTotpCounter(secret, token, window) !== null;
}
