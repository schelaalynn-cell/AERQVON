# AERQVON — Security Documentation

## Overview

AERQVON is a crypto wallet app crypto wallet operating in **Demo Mode**. This document
outlines the security principles, architecture, and best practices for the current MVP and
future production releases.

---

## Key Management Principles

### Current (Demo Mode)
- **No real private keys** are generated, stored, or processed.
- **No seed phrases** are generated, stored, or requested from users.
- Wallet addresses shown in the UI are **fictional/demo addresses** — they do not control real funds.
- All transactions are **simulated** and never broadcast to any blockchain.

### Future (Production)
- Private keys must be generated and stored in a **secure hardware-backed keystore** (e.g., Secure Enclave on iOS, StrongBox on Android, or HSM on server).
- Seed phrases must never leave the user's device unencrypted.
- Keys must never be stored in `localStorage`, `sessionStorage`, or `IndexedDB` in plaintext.
- Keys must never be sent to any backend or third-party service.
- Use **threshold signature schemes (TSS)** or **multi-party computation (MPC)** where possible to avoid single points of failure.

---

## Telegram Authentication

### initData Validation
- Telegram `initData` is provided by the Telegram WebApp SDK on launch.
- **Never trust client-provided user information in production.**
- `initData` must be **validated server-side** by verifying the HMAC signature using the bot token.
- The validation flow:
  1. Extract `hash` from `initData`.
  2. Build a data-check string from all other `initData` parameters, sorted alphabetically.
  3. Compute `secret_key = HMAC_SHA256(bot_token, "WebAppData")`.
  4. Compute `expected_hash = HMAC_SHA256(secret_key, data_check_string)`.
  5. Compare `expected_hash` with the provided `hash`. If they match, the data is authentic.
- In demo mode, a fallback demo user is used when running outside Telegram.

---

## Transaction Security

### Current (Demo Mode)
- All transactions are simulated — no real blockchain calls are made.
- Send/swap operations only modify in-memory balances and local transaction records.
- Transactions are labeled "Not broadcast to the blockchain."

### Future (Production)
- Every transaction must require **explicit user confirmation** with biometric or PIN verification.
- Transaction details (recipient, amount, asset, network) must be displayed for review before signing.
- Implement **address book verification** to detect address replacement attacks.
- Display **human-readable transaction summaries** decoded from raw blockchain data.
- Enforce **rate limiting** on transaction submission to prevent abuse.

---

## Secret Management

- **Never commit `.env` files** to version control. The `.gitignore` must exclude `.env`.
- **Never put API secrets in frontend code.** All secrets belong on the server.
- Use environment variables for all configuration. Validate their presence at startup.
- In production, use a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault).
- Bot tokens, API keys, and database credentials must never appear in client-side code.

---

## XSS Protection

- All user-generated content (transaction memos, usernames, addresses) must be **escaped before rendering**.
- React's JSX automatically escapes string expressions — never use `dangerouslySetInnerHTML`.
- Content Security Policy (CSP) headers should be set to restrict script sources.
- Sanitize any HTML input on the server side before storage.
- Validate and sanitize all user inputs at system boundaries.

---

## Input Validation

- **Address validation:** Validate blockchain addresses against the correct format for each network before processing.
- **Amount validation:** Ensure amounts are positive numbers, within balance limits, and respect asset decimals.
- **Slippage validation:** Ensure slippage tolerance is within acceptable bounds (0.01%–50%).
- All validation must occur both client-side (for UX) and server-side (for security).
- Use strict TypeScript types to prevent type confusion bugs.

---

## API Security

- All API endpoints must require authentication (valid Telegram `initData` or session token).
- Use **HTTPS only** — never allow plaintext HTTP connections.
- Implement **rate limiting** on all endpoints to prevent abuse and DoS.
- Use **CORS headers** to restrict which origins can access the API.
- Validate all incoming request bodies against strict schemas.
- Return generic error messages — never leak internal state or stack traces.

---

## Rate Limiting

- Apply rate limits per user (identified by Telegram ID) and per IP address.
- Recommended limits:
  - Transaction submission: 10 per minute
  - Swap quotes: 60 per minute
  - Balance queries: 120 per minute
  - Authentication: 5 per minute
- Use exponential backoff for retrying failed requests.
- Return `429 Too Many Requests` with a `Retry-After` header.

---

## Secure Deployment

- Deploy via CI/CD pipelines with automated security scanning (SAST/DAST).
- Use **Content Security Policy** headers on all responses.
- Set `X-Frame-Options: DENY` or `frame-ancestors` to prevent clickjacking (except for Telegram's iframe).
- Set `X-Content-Type-Options: nosniff`.
- Enable **HSTS** with a long `max-age`.
- Keep dependencies updated — monitor for CVEs via `npm audit` and Dependabot.
- Run regular penetration tests before any production release.
- All database tables must have **Row Level Security (RLS)** enabled.
