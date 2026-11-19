import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
// SPDX-License-Identifier: MIT
import { dirname, join } from 'node:path';

// Node 22 entrypoint: validate entry.png and copy it byte-for-byte into the
// requested output directory. Only node:fs and node:path are used.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_BYTES = 1024 * 1024; // 1 MiB
const MAX_DIMENSION = 1024;
const IHDR_LENGTH = 13;
const IHDR_MIN_BYTES = 8 + 4 + 4 + IHDR_LENGTH + 4; // signature + length + type + data + crc

const source = join(import.meta.dirname, 'entry.png');
const bytes = readFileSync(source);

if (bytes.length > MAX_BYTES) {
  throw new Error(`entry.png is ${bytes.length} bytes, exceeding the ${MAX_BYTES}-byte limit`);
}
if (bytes.length < IHDR_MIN_BYTES || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
  throw new Error('entry.png is not a valid PNG (bad signature or truncated header)');
}

// The first chunk must be IHDR and carry exactly 13 bytes of data.
if (bytes.readUInt32BE(8) !== IHDR_LENGTH || bytes.toString('latin1', 12, 16) !== 'IHDR') {
  throw new Error('entry.png does not start with a valid IHDR chunk');
}

const width = bytes.readUInt32BE(16);
const height = bytes.readUInt32BE(20);
if (width === 0 || height === 0) {
  throw new Error(`entry.png has invalid dimensions ${width}x${height}`);
}
if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
  throw new Error(`entry.png dimensions ${width}x${height} exceed ${MAX_DIMENSION} px`);
}

const destination = join(process.env.MAKEFUN_OUTPUT_DIR || '/output', 'entry.png');
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, bytes);
console.log(`Copied ${width}x${height} PNG (${bytes.length} bytes) to ${destination}`);
