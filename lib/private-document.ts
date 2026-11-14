import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const marker = Buffer.from("MEID1");

function encryptionKey() {
  const encoded = process.env.ID_DOCUMENT_ENCRYPTION_KEY;
  if (!encoded) throw new Error("Private document encryption is not configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("ID_DOCUMENT_ENCRYPTION_KEY must contain 32 base64-encoded bytes.");
  }
  return key;
}

export function encryptPrivateDocument(plain: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([marker, iv, cipher.getAuthTag(), encrypted]);
}

export function decryptPrivateDocument(stored: Buffer) {
  if (!stored.subarray(0, marker.length).equals(marker)) {
    return stored;
  }
  const ivStart = marker.length;
  const tagStart = ivStart + 12;
  const dataStart = tagStart + 16;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    stored.subarray(ivStart, tagStart),
  );
  decipher.setAuthTag(stored.subarray(tagStart, dataStart));
  return Buffer.concat([decipher.update(stored.subarray(dataStart)), decipher.final()]);
}
