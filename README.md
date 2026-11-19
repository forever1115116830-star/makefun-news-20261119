# News Image · 19 November 2026

A single 1024 × 1024 editorial news poster, supplied as `entry.png`. The Node 22 entrypoint validates the PNG completely, then copies its original bytes unchanged to the requested output directory.

## Validation

`main.ts` uses only Node built-ins (`node:fs`, `node:path`) and a self-contained CRC-32 implementation. It rejects the file if any of the following checks fail:

- **File size** — at most 1 MiB (1,048,576 bytes).
- **PNG signature** — the 8-byte header `89 50 4E 47 0D 0A 1A 0A` is present and the file is not truncated.
- **Chunk structure** — every chunk is walked from byte 8; truncated chunk headers or declared data lengths that overrun the file are rejected.
- **CRC-32** — each chunk's declared CRC-32 (IEEE, reflected polynomial `0xEDB88320`) is recomputed over its type and data bytes and must match; a mismatch aborts the run.
- **IHDR** — the first chunk must be `IHDR` with exactly 13 data bytes, and the declared width and height must be at least 1 px and at most 1024 px each.
- **IEND** — the final chunk must be `IEND`, and no bytes may follow it.

On success the script copies the unmodified bytes to `$MAKEFUN_OUTPUT_DIR/entry.png` (default `/output/entry.png`, created recursively) and prints a one-line confirmation that includes the verified chunk count, e.g.

```
Copied 1024x1024 PNG (73221 bytes, 4 chunks verified) to /tmp/mf3/entry.png
```

## Run

```sh
MAKEFUN_OUTPUT_DIR=/tmp/makefun-poster node main.ts
```

The output is `/tmp/makefun-poster/entry.png`; when `MAKEFUN_OUTPUT_DIR` is unset, the default is `/output/entry.png`. The script requires no package installation and reports malformed/oversized inputs as errors. Repeated runs against the same input yield identical output bytes.

`main.py` is the original artwork generator; `main.ts` deliberately copies the existing image rather than regenerating it so rendering dependencies and font differences cannot affect the submission.

Licensed under MIT; see [LICENSE](LICENSE).
