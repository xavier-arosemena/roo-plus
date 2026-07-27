# ADR: Remove Roo Code Cloud Integration

**Date**: 2026-07-27

**Status**: ✅ ACCEPTED

## Context

The Roo Code Cloud backend at `app.roocode.com` has been permanently shut down (HTTP 410 Gone). The response body returned:

```json
{ "error": "service_shut_down", "message": "Roo Code Cloud is no longer available." }
```

The project `packages/cloud/` module contained ~400 lines of integration code talking to this dead endpoint, including:

- `CloudService` — Singleton orchestrator for all cloud features
- `WebAuthService` — Clerk-based OAuth authentication flow
- `CloudSettingsService` — Organization settings sync
- `CloudShareService` — Task sharing via shareable URLs
- `CloudTelemetryClient` — Anonymous usage telemetry
- `RetryQueue` — Persisted retry queue that could grow extension state to 1MB+

## Decision

**Option A: Remove `packages/cloud/` entirely** — chosen over:

- Option B: Replace with a new cloud backend (no replacement exists)
- Option C: Keep dead code with graceful degradation (unnecessary complexity)

## Consequences

### Positive

- Extension activation no longer blocks on cloud initialization
- No more HTTP 410 errors, exponential backoff loops, or state bloat
- Sign-in button and all cloud auth UI removed (fixes issue #31)
- ~400 lines of dead code removed
- All existing core features (AI providers, MCP, terminal, settings, modes) continue working

### Negative

- Task sharing via cloud URLs is no longer available
- Organization settings sync is no longer available
- Cloud-based telemetry collection is removed (PostHog telemetry in `packages/telemetry/` unaffected)

### Neutral

- The `CloudUserInfo`, `CloudOrganization`, `OrganizationSettings` types remain in `@roo-code/types` for backward compatibility
- `MdmService.isCompliant()` simplified to skip cloud auth checks
