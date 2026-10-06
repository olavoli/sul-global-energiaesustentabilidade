import { describe, expect, test } from "bun:test";
import { newsletterEmailHash, verifyKitSignature } from "./security";

async function header(raw: Uint8Array, timestamp: number, secret: string) {
  const prefix = new TextEncoder().encode(`${timestamp}.`);
  const input = new Uint8Array(prefix.length + raw.length);
  input.set(prefix);
  input.set(raw, prefix.length);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, input);
  const digest = [...new Uint8Array(signed)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `t=${timestamp},v1=${digest}`;
}

describe("segurança da newsletter", () => {
  test("HMAC de e-mail é hexadecimal minúsculo e usa secret", async () => {
    const first = await newsletterEmailHash("reader@example.com", "secret-a");
    const second = await newsletterEmailHash("reader@example.com", "secret-b");
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toBe(second);
  });

  test("assinatura Kit usa bytes brutos, aceita rotação e rejeita alteração/staleness", async () => {
    const secret = "webhook-secret";
    const timestamp = 1_800_000_000;
    const raw = new TextEncoder().encode('{"events": []}');
    const valid = await header(raw, timestamp, secret);
    expect(
      await verifyKitSignature(
        raw,
        `t=${timestamp},v1=${"0".repeat(64)},${valid.split(",")[1]}`,
        secret,
        timestamp,
      ),
    ).toBe(true);
    expect(
      await verifyKitSignature(new TextEncoder().encode('{"events":[]}'), valid, secret, timestamp),
    ).toBe(false);
    expect(await verifyKitSignature(raw, valid, secret, timestamp + 301)).toBe(false);
  });
});
