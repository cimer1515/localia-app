# Automatic certificate issuance (Supabase + ME Network)

This implementation adds server-side issuance endpoints. The PDF, SHA-256, transaction, QR verification and retrieval are linked by a certificate ID.

## What is automated

1. The issuer's authenticated Supabase user calls the Netlify issuance function.
2. The server generates the final PDF with a QR pointing to `/verify/{certificateId}`.
3. The server calculates SHA-256 over the exact final PDF bytes.
4. The PDF is uploaded to a **private** Supabase Storage bucket.
5. The backend checks the configured EVM chain and calls `registerCredential(keccak256(certificateId), bytes32(SHA-256))` using the institutional issuer wallet.
6. It waits for a successful receipt, reads the contract record back, and persists the transaction metadata in Supabase.
7. The verification endpoint checks the contract record and recomputes SHA-256 from the stored PDF. It then provides a five-minute signed download URL.

The QR contains only the verification URL and opaque certificate ID. It does not expose personal data or require the visitor to connect a wallet.

## Important prototype boundary

The current LOCALIA reviewer panel is a same-browser demonstration with a hard-coded demo PIN. It is **not** secure institutional authentication and must not be allowed to issue official certificates. The server endpoint therefore requires a Supabase Auth bearer token and an active row in `issuer_roles`. Integrating the reviewer UI with Supabase Auth is a required next step before calling issuance from the approval event.

The generated document is explicitly labeled demo / not official because the current approval workflow is simulated. Blockchain registration proves integrity of the bytes and on-chain record; it does not make a demo approval legally valid.

## Supabase setup

1. Create/open the existing Supabase project.
2. Run `supabase/certificates-schema.sql` in SQL Editor.
3. Create a **private** Storage bucket named `certificates`.
4. Create/verify a Supabase Auth user for the actual reviewer.
5. After independently verifying that reviewer, insert/update their row in `issuer_roles` with `user_id`, `active=true`, and a verified `issuer_name` (for example the legal entity name). Never enable this for public/demo users.

## Netlify environment variables (server-side only)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (secret; never VITE_ and never browser-side)
- `SUPABASE_CERT_BUCKET=certificates`
- `ME_EVM_RPC_URL` (official EVM RPC from ME)
- `ME_EVM_CHAIN_ID` (confirmed numeric EVM chain ID)
- `ME_REGISTRY_ADDRESS` (deployed LocaliaCredentialRegistry address)
- `ME_ISSUER_PRIVATE_KEY` (institutional issuer wallet key; Netlify secret only)
- `HARBOR_SITE_URL` (deployed HTTPS origin, e.g. https://your-site.netlify.app)

The issuer wallet must be authorized in the registry and funded for gas. Never put its private key in Vite variables, source files, GitHub, Supabase table data, or localStorage.

## Routes

- POST `/.netlify/functions/issue-certificate` (authenticated issuer only)
- GET `/verify/{certificateId}` (public read-only verification)

Netlify rewrites /verify/* to the verification function.

## Test checklist

- Use a demo certificate only.
- Confirm PDF is saved in private Storage.
- Confirm backend SHA-256 equals the PDF bytes.
- Confirm the contract's getCredential() returns the same hash and issuer.
- Confirm Supabase stores the successful TxHash.
- Scan QR in a private/incognito window; verify status and open the time-limited PDF link.
- Modify a copy of the PDF and confirm it does not verify.
- Revoke the credential and confirm verification fails.
