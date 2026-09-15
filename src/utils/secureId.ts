/**
 * Cryptographically secure identifier generation.
 * Uses the Web Crypto API (crypto.getRandomValues) — never Math.random().
 */

function getCrypto(): Crypto | null {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) return globalThis.crypto;
  return null;
}

function randomBytes(length: number): Uint8Array {
  const crypto = getCrypto();
  if (!crypto) throw new Error('Web Crypto API is not available in this environment.');
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return arr;
}

const HEX_CHARS = '0123456789abcdef';

function bytesToHex(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += HEX_CHARS[bytes[i] >> 4] + HEX_CHARS[bytes[i] & 0xf];
  }
  return result;
}

function bytesToBase36(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += bytes[i].toString(36).padStart(2, '0');
  }
  return result;
}

export function generateUUID(): string {
  const crypto = getCrypto();
  if (crypto?.randomUUID) return crypto.randomUUID();
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytesToHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function generateId(prefix = 'id'): string {
  const bytes = randomBytes(8);
  return `${prefix}-${bytesToBase36(bytes).slice(0, 12)}`;
}

export function generateHexId(length: number): string {
  const bytes = randomBytes(Math.ceil(length / 2));
  return bytesToHex(bytes).slice(0, length);
}
