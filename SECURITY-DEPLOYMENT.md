# Dashboard session deployment

Deploy the matching API security changes before this dashboard.

- Configure the API `BROWSER_SESSION_ORIGINS` and `CORS_ALLOWED_ORIGINS` with
  the exact HTTPS dashboard origin. Disable `CORS_ALLOW_ALL_ORIGINS`.
- Refresh credentials now use HttpOnly, Secure, SameSite=None API cookies.
  Access tokens stay in memory; existing local-storage sessions are discarded.
- Serve the dashboard and API under the same registrable domain, or proxy the
  API under the dashboard site and update `API_BASE_URL` in `src/lib/api.ts`.
  Browsers may block cookies between unrelated sites.
- Preserve Origin and Set-Cookie through the reverse proxy. Cookie session
  requests use credentials and have a 15-second network timeout.
- Registration submits the signed credential returned by OTP verification.
- Logout clears private caches, ignores stale responses, unsubscribes browser
  push, and revokes the cookie after pending refreshes settle. If revocation
  cannot be confirmed, the dashboard displays an error.

The API repository's `SECURITY-DEPLOYMENT.md` describes credential rotation,
WebSocket authentication, Redis exposure, and mobile-client compatibility.
