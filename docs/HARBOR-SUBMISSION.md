# HARBOR 2026 — CAUSA Submission Readiness

This document is maintained in English for the HARBOR submission materials.

## Project overview
**CAUSA** is a document credential and verification application for organizations that issue certificates. The issuer creates a certificate off-chain, stores the document securely off-chain, computes a SHA-256 fingerprint from the exact document bytes, and registers only an opaque credential identifier and the fingerprint in an EVM-compatible registry on ME Network. A verifier scans a QR code, retrieves the certificate, recomputes its SHA-256 fingerprint, and checks the registry status. Issuers can revoke credentials.

## Target users and problem
Organizations that issue certificates and people who need to verify whether a certificate has been altered. CAUSA aims to make document integrity checks independently verifiable without publishing personal documents on-chain.

## ME Network integration
- Smart contract: `contracts/CausaCredentialRegistry.sol` (Solidity, EVM-compatible).
- Wallet/network interaction: `src/me-network.js` using ethers.js.
- Document fingerprint: SHA-256 of exact file bytes in `src/document-hash.js`.
- On-chain data minimization: document contents and personal data must remain off-chain; only an opaque ID and cryptographic fingerprint are submitted.
- Required live evidence before claiming completion: deployed contract address, official ME Network chain ID, transaction hash for registration, transaction/call evidence for verification, and revocation evidence if demonstrated.

**Status:** Source integration is prepared, but the project must not be described as fully running on ME Network until the contract is deployed to the official network and successful live transaction/call records are captured.

## Technical stack
- JavaScript (ES modules) and Vite for the web application.
- Solidity for the EVM smart contract.
- Node.js scripts for contract compilation and deployment.
- ethers.js for wallet and contract interaction.

HARBOR's official eligibility rule is based on real execution of at least one core feature on ME Network. The official HARBOR page does not prescribe one mandatory programming language for all project formats; the stack above is selected for the EVM integration.

## Run locally
1. Install Node.js 20 or later.
2. Run `npm install`.
3. Run `npm test` to execute the SHA-256 known-vector test.
4. Run `npm run build` to build the web application.
5. Run `npm run dev` for local development.

## HARBOR submission checklist
- [ ] Team has 2–5 members and all members have completed advanced ME ID verification.
- [ ] Registration and team details are confirmed through the original registration/edit link.
- [ ] Project description identifies target users, problem, core functions, and the ME Network access method.
- [ ] Final repository URL and final commit SHA are recorded; review access is granted if the repository is private.
- [ ] README and submission materials are in English, with reproducible dependencies, configuration, and run instructions.
- [ ] Online experience link or local execution instructions are available.
- [ ] 3–5 minute demo video shows the real user workflow with English narration or English subtitles.
- [ ] ME Network evidence is included: deployed contract, transaction/call hashes, and/or Hub/Rollapp details as applicable.
- [ ] Only new work completed during the hackathon period is identified; prior project foundation is disclosed separately.
- [ ] No personal documents, personal identifiers, wallet secrets, or private keys are included in repository history or on-chain data.

## Important limitations
The local demo may use browser storage and mock records. Mock/demo actions are not proof of blockchain execution. Do not use real certificates or personal data in the demo until production storage, access controls, privacy review, and the live network workflow have been validated.
