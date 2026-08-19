# Sentient Wallet Engineering Rules

These rules apply to every contributor and automated agent working in this repository.

1. Preserve all material legacy-demo functions unless a documented technical or responsible-AI reason requires refinement.
2. Preserve the original visual identity.
3. The production application must use one user-facing `index.html`.
4. Do not use iframes to combine the legacy pages.
5. IRS must come from deterministic model inference.
6. An LLM must never calculate the IRS.
7. Synthetic data must always be labelled.
8. Do not claim to detect users' genuine emotions.
9. Behavioral proxies must not be presented as psychological diagnoses.
10. Blockchain features must default to a local development network.
11. Never require real assets, mainnet funds or production private keys.
12. Vault values, APYs and saved amounts must be calculated or labelled as simulated.
13. Do not fabricate model metrics.
14. Do not fabricate financial outcomes.
15. Proof of Discipline is an experimental discipline index, not a regulated credit score.
16. All views must read from one shared application state.
17. Policy changes must affect subsequent transaction assessments.
18. Interventions must update Vault and Pet state.
19. New backend and contract functions require tests.
20. No cloud account may be required for the default demo.
21. Keep implementation pragmatic.
22. Do not remove working legacy functionality for aesthetic simplicity.
23. Run regression checks after each migration stage.
24. Keep the repository operational after each major stage.

## Implementation guardrails

- Browser Demo Mode is the default and must remain usable without a backend, wallet extension, blockchain node, or cloud credentials.
- Full Local Mode may add services, but it must use development-only keys and a local chain.
- Treat market data, balances, protocol allocation, yield, backtests, pets, accessories, and tokens as clearly labelled simulation data.
- Keep the browser risk model and backend model on the same exported model version.
- Prefer focused modules, accessible controls, deterministic fixtures, and tests over clever abstractions.
- Never commit secrets, generated private keys, dependency directories, build artifacts, or local state.
