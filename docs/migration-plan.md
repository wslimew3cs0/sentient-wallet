# Migration Plan

## Design authority

The legacy HTML files control the terminal UI and interaction vocabulary. The supporting pitch deck supplies the guardian narrative, cyan/gold/red semantic palette, companion purpose, and discipline-surplus concept. The engineering brief controls responsible-AI wording, deterministic scoring, shared state, policy enforcement, and implementation truthfulness.

## Delivery stages

1. **Audit and archive** — preserve sources, capture all legacy screens, record every material feature and known defect.
2. **Single-page shell** — create one hash-routed `index.html`, global telemetry header, responsive navigation, loader, toasts, and reusable card primitives.
3. **Shared state** — version and persist wallet, model, policy, pending transaction, history, Vault, companion, discipline, simulation, and chain state.
4. **Legacy parity** — migrate the exchange, companion, Vault and settings functions; repair no-op controls and responsive defects.
5. **Deterministic ML** — generate fixed-seed synthetic data, compare models, export the selected model, run browser inference, and display real contributions.
6. **Policy and cooldown** — translate model output plus configured rules into normal review, confirmation, or mandatory queue/cooldown states.
7. **Local full mode** — expose model inference and development attestations through FastAPI; enforce the matching policy on a local Hardhat chain.
8. **Analytics and documentation** — surface real evaluation artifacts, the protection/friction frontier, trust boundaries, limitations, and reproducible setup.
9. **Regression and release** — verify routes and cross-view state, capture integrated screens, run model/API/contract/UI checks, and build the hosted application.

## Accounting invariants

- A cancelled high-risk transaction never reduces the wallet balance.
- Discipline surplus is an analytical retained-capital value, not an additional asset; it is never added to total asset value twice.
- Market holdings and demo reward credits are separate.
- Illustrative allocation and yield never move assets and are labelled simulation.
- Each intervention has one immutable ID and can affect derived state only once.

## Risk decision order

1. Validate amount, balance/holdings, and required fields.
2. Build the model feature vector and calculate deterministic probability and IRS.
3. Apply the active IRS threshold, velocity rule, and amount tiers.
4. Use the maximum applicable mandatory delay when rules overlap.
5. Execute low-risk transactions, ask for confirmation only when the active policy allows it, or queue a mandatory cooldown.
6. Record cancellation, cooldown completion, confirmation, or execution in the shared audit ledger.

## Known legacy defects intentionally corrected

- Vault throws while updating missing protocol element IDs.
- Settings controls are mostly presentational and do not persist or govern Exchange.
- Pet Try-On Apply is a no-op and the scarf definition is incomplete.
- Exchange scoring and market paths are stochastic/manual rather than reproducible.
- The high-risk modal offers an immediate bypass despite claiming contract enforcement.
- Fixed outcomes and live-market language overstate simulated behavior.
