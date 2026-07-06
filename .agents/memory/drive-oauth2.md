---
name: Drive OAuth2 implementation
description: Google Drive OAuth2 flow for personal Gmail accounts (alternative to Service Account)
---

## Rule
Use OAuth2 (user's own Google account) instead of Service Account when `driveOAuthRefreshTokenEnc` + `driveOAuthClientId` + `driveOAuthClientSecretEnc` are all set on the project. Service Account is the fallback.

**Why:** Service Accounts have no storage quota on personal Gmail Drive. OAuth2 uploads as the real user, counting against their 15GB.

## How to apply
- `driveStorage.ts getDriveClient()` checks OAuth2 fields first, falls back to SA.
- OAuth2 scopes: `drive` + `spreadsheets` (covers both Drive sync and Sheets).
- New DB columns: `drive_oauth_client_id`, `drive_oauth_client_secret_enc`, `drive_oauth_refresh_token_enc`.
- CSRF protection: nonce stored in `req.session.driveOAuthNonce` + `req.session.driveOAuthProjectId`, encoded in OAuth state as `nonce:projectId`, verified on callback.
- If Client ID changes in PATCH, `driveOAuthRefreshTokenEnc` is cleared automatically (old token invalid with new credentials).
- If user gets `no_refresh_token` error, they must revoke app access at https://myaccount.google.com/permissions and retry.

## Redirect URI
`https://${REPLIT_DEV_DOMAIN}/api/drive-oauth/callback` — must be registered verbatim in Google Cloud Console.

## Key files
- `server/routes/driveOAuth.ts` — URL generation, callback, disconnect
- `server/services/driveStorage.ts` — OAuth2 vs SA selection
- `shared/schema.ts` — `updateProjectSchema` includes `driveOAuthClientId`, `driveOAuthClientSecret`
- `client/src/pages/admin/ProjectSettings.tsx` — OAuth UI section in Drive tab
