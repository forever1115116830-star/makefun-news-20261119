import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
// SPDX-License-Identifier: MIT
import { dirname, join } from 'node:path';

// Node 22 entrypoint: fully validate entry.png and copy it byte-for-byte into
// the requested output directory. Only node:fs, node:path, and the small
// CRC-32 implementation below are used.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_BYTES = 1048576; // 1 MiB
const MAX_DIMENSION = 1024;

// Self-contained CRC-32 (IEEE 802.3, reflected polynomial 0xEDB88320).
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < CRC_TABLE.length; n++) {
  let value = n;
  for (let bit = 0; bit < 8; bit++) {
    value = (value & 1) === 1 ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  }
  CRC_TABLE[n] = value >>> 0;
}

function crc32(bytes: Buffer, start: number, end: number): number {
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) {
    crc = (CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function fail(message: string): never {
  throw new Error(message);
}

const source = join(import.meta.dirname, 'entry.png');
const bytes = readFileSync(source);

if (bytes.length > MAX_BYTES) {
  fail(`entry.png is ${bytes.length} bytes, exceeding the ${MAX_BYTES}-byte limit`);
}
if (bytes.length < 8 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
  fail('entry.png is not a valid PNG (bad signature or truncated header)');
}

let offset = 8;
let chunkCount = 0;
let firstType = '';
let firstLength = -1;
let lastType = '';
let width = 0;
let height = 0;

while (offset < bytes.length) {
  const remaining = bytes.length - offset;
  if (remaining < 12) {
    fail(`PNG chunk header at byte ${offset} is truncated`);
  }

  const length = bytes.readUInt32BE(offset);
  const type = bytes.toString('latin1', offset + 4, offset + 8);
  if (length > remaining - 12) {
    fail(`PNG chunk ${type} at byte ${offset} declares ${length} data bytes, exceeding the ${remaining - 12} bytes remaining`);
  }

  const dataStart = offset + 8;
  const dataEnd = dataStart + length;
  const declaredCrc = bytes.readUInt32BE(dataEnd);
  const actualCrc = crc32(bytes, offset + 4, dataEnd);
  if (declaredCrc !== actualCrc) {
    fail(`PNG chunk ${type} at byte ${offset} has declared CRC32 ${declaredCrc.toString(16).padStart(8, '0')} but computed ${actualCrc.toString(16).padStart(8, '0')}`);
  }

  if (chunkCount === 0) {
    firstType = type;
    firstLength = length;
    if (type !== 'IHDR' || length !== 13) {
      fail('first PNG chunk must be IHDR with a 13-byte data field');
    }
    width = bytes.readUInt32BE(dataStart);
    height = bytes.readUInt32BE(dataStart + 4);
    if (width === 0 || height === 0) {
      fail(`entry.png has invalid dimensions ${width}x${height}`);
    }
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      fail(`entry.png dimensions ${width}x${height} exceed ${MAX_DIMENSION} px`);
    }
  }

  lastType = type;
  chunkCount += 1;
  offset = dataEnd + 4;
}

if (chunkCount === 0) fail('entry.png contains no PNG chunks');
if (firstType !== 'IHDR' || firstLength !== 13) fail('entry.png does not begin with a valid IHDR chunk');
if (lastType !== 'IEND') fail(`entry.png must end with IEND, but the last chunk is ${lastType}`);
if (offset !== bytes.length) fail('entry.png has trailing bytes after the final chunk');

const destination = join(process.env.MAKEFUN_OUTPUT_DIR || '/output', 'entry.png');
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, bytes);
console.log(`Copied ${width}x${height} PNG (${bytes.length} bytes, ${chunkCount} chunks verified) to ${destination}`);
