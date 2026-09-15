import { useEffect, useRef, useState } from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
}

// Lightweight QR code generator (no external dependency)
// Implements a compact QR Code generator following the standard
export function QRCode({ value, size = 220 }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      const matrix = generateQRMatrix(value);
      drawMatrix(canvasRef.current, matrix, size);
      setError(false);
    } catch {
      setError(true);
    }
  }, [value, size]);

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-nova-border bg-nova-surface-2"
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-nova-muted">QR unavailable</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-2xl"
      style={{ width: size, height: size }}
    />
  );
}

function drawMatrix(canvas: HTMLCanvasElement, matrix: number[][], size: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const count = matrix.length;
  const cell = size / count;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#0a0b14';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  }
}

// --- Minimal QR Code generation (byte mode, version auto-selected) ---
// Based on the QR code specification. Supports byte encoding with error correction level L.

const EC_LEVEL_L = 0;

function generateQRMatrix(text: string): number[][] {
  const data = new TextEncoder().encode(text);
  const version = selectVersion(data.length);
  const matrix = createMatrix(version, data);
  return matrix;
}

function selectVersion(byteLength: number): number {
  // Capacity for byte mode, EC level L
  const capacities = [
    17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792, 858,
    929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, 1840, 1952, 2068, 2188, 2303, 2431,
    2563, 2699, 2839, 2983,
  ];
  for (let v = 0; v < capacities.length; v++) {
    if (capacities[v] >= byteLength + 2) return v + 1;
  }
  return 40;
}

function createMatrix(version: number, data: Uint8Array): number[][] {
  const size = 17 + 4 * version;
  const matrix: number[][] = Array.from({ length: size }, () => new Array(size).fill(-1));
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  // Finder patterns
  placeFinder(matrix, reserved, 0, 0);
  placeFinder(matrix, reserved, size - 7, 0);
  placeFinder(matrix, reserved, 0, size - 7);

  // Alignment patterns
  if (version >= 2) {
    const positions = getAlignmentPositions(version);
    for (const [r, c] of positions) {
      placeAlignment(matrix, reserved, r, c);
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!reserved[6][i]) {
      matrix[6][i] = i % 2 === 0 ? 1 : 0;
      reserved[6][i] = true;
    }
    if (!reserved[i][6]) {
      matrix[i][6] = i % 2 === 0 ? 1 : 0;
      reserved[i][6] = true;
    }
  }

  // Format info placeholders
  reserveFormatInfo(matrix, reserved);

  // Data
  const codewords = encodeData(version, data);
  placeData(matrix, reserved, codewords);

  // Format info
  applyFormatInfo(matrix, EC_LEVEL_L);

  return matrix.map((row) => row.map((v) => (v === 1 ? 1 : 0)));
}

function placeFinder(matrix: number[][], reserved: boolean[][], r: number, c: number) {
  for (let dr = -1; dr <= 7; dr++) {
    for (let dc = -1; dc <= 7; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= matrix.length || cc >= matrix.length) continue;
      let val: number;
      if (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6) {
        if (dr === 0 || dr === 6 || dc === 0 || dc === 6) val = 1;
        else if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) val = 1;
        else val = 0;
      } else {
        val = 0;
      }
      matrix[rr][cc] = val;
      reserved[rr][cc] = true;
    }
  }
}

function placeAlignment(matrix: number[][], reserved: boolean[][], r: number, c: number) {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const val = Math.max(Math.abs(dr), Math.abs(dc)) !== 1 ? 1 : 0;
      matrix[r + dr][c + dc] = val;
      reserved[r + dr][c + dc] = true;
    }
  }
}

function getAlignmentPositions(version: number): [number, number][] {
  if (version < 2) return [];
  const size = 17 + 4 * version;
  const intervals = Math.floor(version / 7) + 2;
  const result: [number, number][] = [];
  const first = 6;
  const last = size - 7;
  const step = Math.ceil((last - first) / (intervals - 1) / 2) * 2;
  const positions = [first];
  for (let i = 1; i < intervals - 1; i++) {
    positions.push(last - (intervals - 1 - i) * step);
  }
  positions.push(last);
  for (const r of positions) {
    for (const c of positions) {
      if ((r === 6 && c === 6) || (r === 6 && c === last) || (r === last && c === 6)) continue;
      result.push([r, c]);
    }
  }
  return result;
}

function reserveFormatInfo(matrix: number[][], reserved: boolean[][]) {
  const size = matrix.length;
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      reserved[8][i] = true;
      matrix[8][i] = 0;
      reserved[i][8] = true;
      matrix[i][8] = 0;
    }
  }
  for (let i = 0; i < 8; i++) {
    const r = size - 1 - i;
    reserved[r][8] = true;
    matrix[r][8] = 0;
    reserved[8][size - 1 - i] = true;
    matrix[8][size - 1 - i] = 0;
  }
  reserved[size - 8][8] = true;
  matrix[size - 8][8] = 1; // dark module
}

function encodeData(version: number, data: Uint8Array): number[] {
  const ecCodewords = getEcCodewords(version);
  const totalCodewords = getTotalCodewords(version);
  const dataCodewords = totalCodewords - ecCodewords;

  // Build bit stream
  const bits: number[] = [];

  // Mode indicator (byte mode = 0100)
  appendBits(bits, 0b0100, 4);

  // Character count
  const ccBits = version < 10 ? 8 : 16;
  appendBits(bits, data.length, ccBits);

  // Data
  for (const byte of data) {
    appendBits(bits, byte, 8);
  }

  // Terminator
  const totalDataBits = dataCodewords * 8;
  const remaining = totalDataBits - bits.length;
  if (remaining > 0) appendBits(bits, 0, Math.min(4, remaining));

  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad codewords
  const padBytes = [0xec, 0x11];
  let pi = 0;
  while (bits.length < totalDataBits) {
    appendBits(bits, padBytes[pi % 2], 8);
    pi++;
  }

  // Convert to bytes
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i + j];
    }
    codewords.push(b);
  }

  // Error correction
  const ec = generateEc(codewords.slice(0, dataCodewords), ecCodewords);

  // Interleave
  const blocks = [codewords.slice(0, dataCodewords)];
  const ecBlocks = [ec];

  const result: number[] = [];
  const maxData = Math.max(...blocks.map((b) => b.length));
  const maxEc = Math.max(...ecBlocks.map((b) => b.length));

  for (let i = 0; i < maxData; i++) {
    for (const block of blocks) {
      if (i < block.length) result.push(block[i]);
    }
  }
  for (let i = 0; i < maxEc; i++) {
    for (const block of ecBlocks) {
      if (i < block.length) result.push(block[i]);
    }
  }

  return result;
}

function appendBits(arr: number[], value: number, count: number) {
  for (let i = count - 1; i >= 0; i--) {
    arr.push((value >> i) & 1);
  }
}

const EC_CODEWORDS_TABLE: Record<number, number> = {
  1: 7, 2: 10, 3: 15, 4: 20, 5: 26, 6: 36, 7: 40, 8: 48, 9: 60, 10: 72,
  11: 80, 12: 96, 13: 104, 14: 120, 15: 132, 16: 144, 17: 168, 18: 180, 19: 216, 20: 240,
  21: 260, 22: 288, 23: 320, 24: 360, 25: 408, 26: 448, 27: 480, 28: 532, 29: 560, 30: 632,
  31: 672, 32: 704, 33: 776, 34: 864, 35: 896, 36: 992, 37: 1056, 38: 1120, 39: 1208, 40: 1296,
};

const TOTAL_CODEWORDS_TABLE: Record<number, number> = {
  1: 26, 2: 44, 3: 70, 4: 100, 5: 134, 6: 172, 7: 196, 8: 242, 9: 292, 10: 346,
  11: 404, 12: 466, 13: 532, 14: 581, 15: 655, 16: 733, 17: 815, 18: 901, 19: 991, 20: 1085,
  21: 1156, 22: 1258, 23: 1364, 24: 1474, 25: 1610, 26: 1726, 27: 1902, 28: 2031, 29: 2158, 30: 2335,
  31: 2461, 32: 2605, 33: 2747, 34: 2929, 35: 3057, 36: 3253, 37: 3417, 38: 3597, 39: 3791, 40: 3993,
};

function getEcCodewords(version: number): number {
  return EC_CODEWORDS_TABLE[version] ?? 7;
}

function getTotalCodewords(version: number): number {
  return TOTAL_CODEWORDS_TABLE[version] ?? 26;
}

// Reed-Solomon error correction
function generateEc(data: number[], ecLength: number): number[] {
  const genPoly = getGeneratorPolynomial(ecLength);
  const result = new Array(ecLength).fill(0);
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.shift();
    result.push(0);
    if (factor === 0) continue;
    for (let i = 0; i < ecLength; i++) {
      result[i] ^= multiplyGf(factor, genPoly[i]);
    }
  }
  return result;
}

const GF_EXP: number[] = new Array(512);
const GF_LOG: number[] = new Array(256);

(function initGf() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function multiplyGf(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function getGeneratorPolynomial(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const newPoly = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      newPoly[j] ^= poly[j];
      newPoly[j + 1] ^= multiplyGf(poly[j], GF_EXP[i]);
    }
    poly = newPoly;
  }
  return poly;
}

function placeData(matrix: number[][], reserved: boolean[][], codewords: number[]) {
  const size = matrix.length;
  let bitIndex = 0;
  let direction = -1; // upward
  let col = size - 1;
  let row = size - 1;

  while (col > 0) {
    if (col === 6) col--; // skip timing column

    for (let i = 0; i < size; i++) {
      const r = direction === -1 ? size - 1 - i : i;
      for (let j = 0; j < 2; j++) {
        const c = col - j;
        if (!reserved[r][c]) {
          const byteIdx = Math.floor(bitIndex / 8);
          const bitIdx = 7 - (bitIndex % 8);
          const bit = byteIdx < codewords.length ? (codewords[byteIdx] >> bitIdx) & 1 : 0;
          matrix[r][c] = bit;
          bitIndex++;
        }
      }
    }
    col -= 2;
    direction = -direction;
  }
}

function applyFormatInfo(matrix: number[][], ecLevel: number) {
  const format = (ecLevel << 3) | 0b00; // mask pattern 0
  const bits = computeFormatBits(format);

  const size = matrix.length;
  // Horizontal
  for (let i = 0; i <= 5; i++) {
    matrix[8][i] = (bits >> i) & 1;
  }
  matrix[8][7] = (bits >> 6) & 1;
  matrix[8][8] = (bits >> 7) & 1;
  matrix[7][8] = (bits >> 8) & 1;
  for (let i = 9; i < 15; i++) {
    matrix[14 - i][8] = (bits >> i) & 1;
  }

  // Vertical
  for (let i = 0; i < 8; i++) {
    matrix[size - 1 - i][8] = (bits >> i) & 1;
  }
  for (let i = 0; i < 7; i++) {
    matrix[8][size - 7 + i] = (bits >> (i + 8) & 1);
  }
}

function computeFormatBits(format: number): number {
  let result = format << 10;
  for (let i = 14; i >= 10; i--) {
    if ((result >> i) & 1) {
      result ^= 0b10100110111 << (i - 10);
    }
  }
  return ((format << 10) | (result & 0x3ff)) ^ 0b101010000010010;
}
