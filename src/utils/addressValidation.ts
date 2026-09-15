/**
 * TON address validation and parsing.
 * Validates the structure and checksum of TON addresses without external libraries.
 */

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function base64UrlDecode(input: string): Uint8Array | null {
  const cleanInput = input.replace(/=+$/, '');
  const lookup: Record<string, number> = {};
  for (let i = 0; i < BASE64_ALPHABET.length; i++) lookup[BASE64_ALPHABET[i]] = i;
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of cleanInput) {
    const value = lookup[char];
    if (value === undefined) return null;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) { bits -= 8; bytes.push((buffer >> bits) & 0xff); }
  }
  return new Uint8Array(bytes);
}

function crc32c(data: Uint8Array): number {
  const POLY = 0x82f63b78;
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (POLY & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface TonAddressInfo {
  valid: boolean;
  format: 'user-friendly' | 'raw' | 'unknown';
  bounceable: boolean;
  workchain: number | null;
  error?: string;
}

export function validateTonAddress(address: string): TonAddressInfo {
  if (!address || typeof address !== 'string') return { valid: false, format: 'unknown', bounceable: false, workchain: null, error: 'Address is empty' };
  const trimmed = address.trim();
  if (/^-?\d+:([0-9a-fA-F]{64})$/.test(trimmed)) {
    const colonIdx = trimmed.indexOf(':');
    const workchain = parseInt(trimmed.slice(0, colonIdx), 10);
    return { valid: true, format: 'raw', bounceable: false, workchain };
  }
  if (trimmed.length === 48 && /^[EQU][A-Za-z0-9_-]+$/.test(trimmed)) {
    const decoded = base64UrlDecode(trimmed);
    if (!decoded || decoded.length !== 36) return { valid: false, format: 'user-friendly', bounceable: false, workchain: null, error: 'Invalid encoding' };
    const tag = decoded[0];
    const storedCrc = (decoded[34] << 8) | decoded[35];
    const computedCrc = crc32c(decoded.slice(0, 34));
    if (storedCrc !== computedCrc) return { valid: false, format: 'user-friendly', bounceable: false, workchain: null, error: 'Checksum mismatch' };
    const isBounceable = (tag & 0x80) === 0;
    const workchain = decoded[1] === 0xff ? -1 : decoded[1];
    return { valid: true, format: 'user-friendly', bounceable: isBounceable, workchain };
  }
  return { valid: false, format: 'unknown', bounceable: false, workchain: null, error: 'Address does not match any known TON format' };
}

export function validateNonTonAddress(address: string, network: string): TonAddressInfo {
  if (!address || address.length < 6) return { valid: false, format: 'unknown', bounceable: false, workchain: null, error: 'Address too short' };
  if (network === 'ETH') {
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) return { valid: true, format: 'raw', bounceable: false, workchain: null };
    return { valid: false, format: 'unknown', bounceable: false, workchain: null, error: 'Invalid Ethereum address' };
  }
  if (network === 'BTC') {
    if (/^bc1[a-z0-9]{20,}$/.test(address) || /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) return { valid: true, format: 'raw', bounceable: false, workchain: null };
    return { valid: false, format: 'unknown', bounceable: false, workchain: null, error: 'Invalid Bitcoin address' };
  }
  return { valid: false, format: 'unknown', bounceable: false, workchain: null, error: `Unknown network: ${network}` };
}

export function validateAddress(address: string, networkId: string): boolean {
  if (networkId === 'TON') return validateTonAddress(address).valid;
  return validateNonTonAddress(address, networkId).valid;
}
