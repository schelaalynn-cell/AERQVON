# AERQVON — Threat Model

## Overview

This document identifies threats to AERQVON and describes mitigations for each.
Threats are categorized by attack surface and rated by likelihood and impact.

---

## 1. Seed Phrase Theft

**Description:** An attacker steals a user's seed phrase, gaining full control of their wallet.

**Likelihood:** High (if seed phrases are handled incorrectly)
**Impact:** Critical — total loss of funds.

**Mitigations:**
- Demo mode: No seed phrases are generated or stored.
- Production: Seed phrases are generated on-device in a secure keystore and never transmitted.
- Seed phrases are never stored in `localStorage`, `IndexedDB`, or any client-side storage.
- Users are never asked to type their seed phrase into the app (except during intentional import, which is disabled in demo mode).
- Education: Warn users never to share their seed phrase with anyone, including "support."

---

## 2. Private Key Theft

**Description:** An attacker extracts the private key from the device or intercepts it in transit.

**Likelihood:** Medium
**Impact:** Critical — total loss of funds.

**Mitigations:**
- Demo mode: No private keys exist.
- Production: Keys are stored in hardware-backed keystores (Secure Enclave, StrongBox).
- Keys never leave the device in plaintext.
- Keys are never sent to the backend.
- Use TSS/MPC to eliminate single-key compromise scenarios.

---

## 3. Cross-Site Scripting (XSS)

**Description:** An attacker injects malicious JavaScript into the app, potentially stealing data or manipulating transactions.

**Likelihood:** Medium
**Impact:** High — data theft, transaction manipulation.

**Mitigations:**
- React's JSX auto-escapes all string expressions.
- Never use `dangerouslySetInnerHTML`.
- Content Security Policy restricts script execution to trusted sources.
- All user input is validated and sanitized at system boundaries.
- Transaction memos and user-generated content are escaped before rendering.

---

## 4. Telegram Authentication Spoofing

**Description:** An attacker forges Telegram `initData` to impersonate another user.

**Likelihood:** Medium (if validation is skipped)
**Impact:** High — unauthorized access to another user's wallet.

**Mitigations:**
- `initData` must always be validated server-side using HMAC verification with the bot token.
- Never trust client-provided user IDs or usernames without server-side validation.
- Session tokens are issued only after successful `initData` validation.
- Re-validate `initData` on sensitive operations (transactions, settings changes).

---

## 5. Malicious Mini App

**Description:** An attacker creates a fake crypto wallet app that mimics AERQVON to steal user data or seed phrases.

**Likelihood:** Medium
**Impact:** Critical — phishing, fund loss.

**Mitigations:**
- Users should only open AERQVON from the official Telegram bot.
- Display the official bot username in the app for verification.
- Never ask for seed phrases or private keys in the UI.
- Educate users to verify the bot's verified status badge in Telegram.

---

## 6. Transaction Manipulation

**Description:** An attacker modifies transaction parameters (amount, recipient) before the user confirms.

**Likelihood:** Medium
**Impact:** High — funds sent to wrong address.

**Mitigations:**
- Display full transaction details (recipient, amount, asset, network, fee) on a confirmation screen.
- Require explicit user action (button press + biometric) to confirm.
- Re-display critical fields (recipient address) on the final confirmation screen.
- Use immutable transaction objects once constructed.

---

## 7. Address Replacement

**Description:** An attacker substitutes their own address for the intended recipient's address (e.g., via clipboard hijacking or UI manipulation).

**Likelihood:** Medium
**Impact:** High — funds sent to attacker.

**Mitigations:**
- Display the full recipient address on the confirmation screen — never truncated.
- Show the first and last characters of the address prominently.
- Implement an address book with saved, verified addresses.
- Warn users if the recipient address differs from a previously used address.
- Detect clipboard changes and warn if the pasted address changed after copying.

---

## 8. Replay Attacks

**Description:** An attacker captures a valid transaction request and replays it to duplicate the transaction.

**Likelihood:** Low
**Impact:** Medium — duplicate transactions.

**Mitigations:**
- Include a nonce or timestamp in every transaction request.
- Server validates that each nonce is used only once.
- Transaction requests include a TTL (time-to-live) after which they are rejected.
- Use idempotency keys for API requests.

---

## 9. API Abuse

**Description:** An attacker floods the API with requests to degrade service or extract data.

**Likelihood:** Medium
**Impact:** Medium — service degradation, data scraping.

**Mitigations:**
- Rate limiting per user and per IP on all endpoints.
- Return `429 Too Many Requests` with `Retry-After` header.
- Use exponential backoff on the client side.
- Monitor for anomalous request patterns and block abusive clients.
- Require authentication on all non-public endpoints.

---

## 10. Phishing

**Description:** An attacker tricks a user into revealing sensitive information through fake websites, messages, or support accounts.

**Likelihood:** High
**Impact:** Critical — credential/seed phrase theft.

**Mitigations:**
- Never ask for seed phrases or private keys — the app does not request them.
- Display security warnings about phishing in the Security Center.
- Educate users about fake support accounts and how to identify official channels.
- Link only to official, verified resources from within the app.
- Do not render external links without user confirmation.

---

## 11. Supply-Chain Attacks

**Description:** A compromised dependency injects malicious code into AERQVON's build.

**Likelihood:** Low-Medium
**Impact:** Critical — full compromise.

**Mitigations:**
- Keep dependencies updated and monitor for CVEs.
- Use `npm audit` and Dependabot in CI/CD.
- Pin dependency versions with lockfiles.
- Review changelogs before upgrading major versions.
- Use Subresource Integrity (SRI) for externally loaded scripts (e.g., Telegram SDK).
- Minimize the number of dependencies.

---

## 12. Backend Compromise

**Description:** An attacker gains access to the backend server or database.

**Likelihood:** Low
**Impact:** High — data breach, service disruption.

**Mitigations:**
- Private keys are never stored on the backend — keys remain on user devices.
- Use Row Level Security (RLS) on all database tables.
- Encrypt data at rest and in transit.
- Use least-privilege access controls for database and server access.
- Implement audit logging for all administrative actions.
- Have an incident response plan for backend compromise.
- Regular security audits and penetration testing.

---

## 13. Fake Support Accounts

**Description:** An attacker impersonates AERQVON support on Telegram to trick users into revealing sensitive information.

**Likelihood:** High
**Impact:** Critical — social engineering, fund loss.

**Mitigations:**
- Clearly state in the app that AERQVON support will **never** ask for seed phrases or private keys.
- Provide a list of official support channels in the Security Center.
- Warn users about common social engineering tactics.
- Display security tips on the onboarding and settings screens.
- Report fake accounts to Telegram when identified.
