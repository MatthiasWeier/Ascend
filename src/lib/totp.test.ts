import { describe, it, expect } from "vitest";
import { generateTotpSecret, totpAuthUri, verifyTotpToken, matchTotpCounter } from "@/lib/totp";
import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

// Standalone reference HOTP implementation (RFC 4226), independent of
// src/lib/totp.ts's own internals, so these tests actually verify
// interoperability with a real authenticator app's algorithm rather than
// just testing the implementation against itself.
function base32DecodeRef(input: string): Buffer {
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

function hotpRef(secret: Buffer, counter: number): string {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", secret).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(binCode % 10 ** DIGITS).padStart(DIGITS, "0");
}

function codeForCounter(secret: string, counter: number): string {
  return hotpRef(base32DecodeRef(secret), counter);
}

function currentCounter(): number {
  return Math.floor(Date.now() / 1000 / STEP_SECONDS);
}

describe("generateTotpSecret", () => {
  it("produces a base32 string with no padding/invalid characters", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThan(0);
  });

  it("produces different secrets each call", () => {
    expect(generateTotpSecret()).not.toBe(generateTotpSecret());
  });
});

describe("totpAuthUri", () => {
  it("builds a well-formed otpauth:// URI with the expected parameters", () => {
    const uri = totpAuthUri("JBSWY3DPEHPK3PXP", "alice");
    expect(uri).toBe(
      "otpauth://totp/Ascend:alice?secret=JBSWY3DPEHPK3PXP&issuer=Ascend&algorithm=SHA1&digits=6&period=30"
    );
  });

  it("URL-encodes a custom issuer and username", () => {
    const uri = totpAuthUri("JBSWY3DPEHPK3PXP", "a b", "My App");
    expect(uri).toContain("My%20App:a%20b");
    expect(uri).toContain("issuer=My%20App");
  });
});

describe("verifyTotpToken / matchTotpCounter", () => {
  const secret = generateTotpSecret();

  it("accepts the code for the current 30s step", () => {
    const code = codeForCounter(secret, currentCounter());
    expect(verifyTotpToken(secret, code)).toBe(true);
    expect(matchTotpCounter(secret, code)).toBe(currentCounter());
  });

  it("accepts a code one step in the past or future (clock drift window)", () => {
    expect(verifyTotpToken(secret, codeForCounter(secret, currentCounter() - 1))).toBe(true);
    expect(verifyTotpToken(secret, codeForCounter(secret, currentCounter() + 1))).toBe(true);
  });

  it("rejects a code two steps away - outside the drift window", () => {
    expect(verifyTotpToken(secret, codeForCounter(secret, currentCounter() - 2))).toBe(false);
    expect(verifyTotpToken(secret, codeForCounter(secret, currentCounter() + 2))).toBe(false);
  });

  it("rejects a code generated from a different secret", () => {
    const otherSecret = generateTotpSecret();
    const code = codeForCounter(otherSecret, currentCounter());
    expect(verifyTotpToken(secret, code)).toBe(false);
  });

  it("rejects malformed input (wrong length, non-digits)", () => {
    expect(verifyTotpToken(secret, "12345")).toBe(false);
    expect(verifyTotpToken(secret, "1234567")).toBe(false);
    expect(verifyTotpToken(secret, "abcdef")).toBe(false);
    expect(verifyTotpToken(secret, "")).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    const code = codeForCounter(secret, currentCounter());
    expect(verifyTotpToken(secret, ` ${code} `)).toBe(true);
  });

  it("matchTotpCounter returns null for no match", () => {
    // Pick a 6-digit value guaranteed not to be any of the valid codes in
    // the current drift window, rather than assuming "000000" never is.
    const validCodes = [-1, 0, 1].map((offset) => codeForCounter(secret, currentCounter() + offset));
    let candidate = "000000";
    while (validCodes.includes(candidate)) {
      candidate = String(Number(candidate) + 1).padStart(6, "0");
    }
    expect(matchTotpCounter(secret, candidate)).toBeNull();
  });
});
