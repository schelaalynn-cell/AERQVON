/**
 * Buffer polyfill for browser environment.
 * @ton/core and @tonconnect/sdk require Node.js Buffer in the browser.
 */
import { Buffer } from 'buffer';

if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}

export { Buffer };
