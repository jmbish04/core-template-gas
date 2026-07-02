# Shared Cloudflare Reference

The Cloudflare integration layer is in [shared/src/cloudflare](/Volumes/Projects/workers/core-template-gas/shared/src/cloudflare).

## Modules

- `CloudflareClient`
- `AiGateway`
- `WorkersAi`
- `D1`
- `Kv`
- `Images`
- `Vectorize`

## Configuration

Most callers should construct a `CloudflareClient` from Script Properties:

- account ID
- API token
- optional email
- optional base URL override

## Intent

This shared layer lets Apps Script projects call Cloudflare services without rebuilding the same HTTP plumbing in each project.
