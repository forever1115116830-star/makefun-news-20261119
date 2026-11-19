# News Image · 19 November 2026

A single 1024 × 1024 editorial news poster, supplied as `entry.png`. The Node 22 entrypoint validates its PNG header, dimensions (each at most 1024 px), and file size (at most 1 MiB), then copies its original bytes unchanged to the requested output directory.

## Run

```sh
MAKEFUN_OUTPUT_DIR=/tmp/makefun-poster node main.ts
```

The output is `/tmp/makefun-poster/entry.png`; when `MAKEFUN_OUTPUT_DIR` is unset, the default is `/output/entry.png`. The script uses only Node built-in `fs` and `path`, requires no package installation, and reports malformed/oversized inputs as errors. Repeated runs against the same input yield identical output bytes.

`main.py` is the original artwork generator; `main.ts` deliberately copies the existing image rather than regenerating it so rendering dependencies and font differences cannot affect the submission.

Licensed under MIT; see [LICENSE](LICENSE).
