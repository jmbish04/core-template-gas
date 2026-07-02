# Shared Cloudflare Reference

The Cloudflare integration layer is in [shared/src/cloudflare](/Volumes/Projects/workers/core-template-gas/shared/src/cloudflare).

## Modules

- `CloudflareClient`
- `CoreGsuiteToolsClient`
- `CoreGsuiteToolsCloudflareProxy`
- `CoreGsuiteToolsGmailProxy`
- `CoreGsuiteToolsDocsProxy`
- `CoreGsuiteToolsSheetsProxy`
- `CoreGsuiteToolsDriveProxy`
- `CoreGsuiteToolsAppsScriptProxy`
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

For the worker bridge, construct `CoreGsuiteToolsClient` with:

- optional `baseUrl`
- optional worker API key
- optional default Google account label/email
- optional auth header override

The default worker base URL is `https://core-gsuite-tools.hacolby.workers.dev`.

## Worker Bridge Contract

The deployed worker currently exposes Google Workspace REST endpoints and OpenAPI at `/openapi.json`. The shared Apps Script layer now also codifies the expected Cloudflare proxy route namespace under:

- `/api/cloudflare/d1/query`
- `/api/cloudflare/kv/get`
- `/api/cloudflare/kv/put`
- `/api/cloudflare/kv/delete`
- `/api/cloudflare/kv/list`
- `/api/cloudflare/vectorize/query`
- `/api/cloudflare/vectorize/insert`
- `/api/cloudflare/images/list`
- `/api/cloudflare/workers-ai/run`
- `/api/cloudflare/ai-gateway/url`

These routes are the stable Apps Script-side contract for generic Cloudflare resource access through the worker bridge.

## Intent

This shared layer lets Apps Script projects call Cloudflare services without rebuilding the same HTTP plumbing in each project, while keeping the deployed `core-gsuite-tools` worker as the central integration point.
