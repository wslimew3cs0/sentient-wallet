# Limitations and Non-Claims

## Read this first

Sentient Wallet is an independent educational and technical prototype. It is not a bank, exchange, broker, custodian, investment adviser, credit bureau, security product, audited wallet, or production smart-account service. It does not claim affiliation with or endorsement by any institution, protocol, wallet provider, standards body, or software vendor.

The supporting pitch materials use ambitious market, “first,” emotion, yield, and credit language. This rebuild narrows those ideas to what can be demonstrated responsibly. Unsourced market and engagement figures are excluded. Product names, if visible in preserved legacy material, are historical references rather than integrations or affiliations.

## Status boundaries

Three statuses must remain distinct:

- **Prototype source:** implementation code exists for inspection, but completion, correctness, test passage, security, and integration are not implied.
- **Simulation:** deterministic or user-configured demonstration values with no real assets or external effect.
- **Roadmap:** a future idea that is not implemented.

The repository currently contains source toward shared browser state, a synthetic ML pipeline, and local policy contracts. This document does not certify generated model artifacts, browser/API parity, contract test passage, local deployment, or end-to-end Full Local integration. Those claims require reproducible evidence from the final repository state.

## ML and data limitations

### Synthetic labels are not ground truth

The dataset is generated from designer-authored proxy rules plus seeded noise. The model is evaluated against those generated labels, not observed regret, fraud, loss, impairment, or user intent. Good synthetic metrics would show recovery of the generator’s structure, not real-world protection.

### No emotion detection

The system does not sense greed, panic, fear, fatigue, addiction, or any genuine emotion. Transaction timing, velocity, concentration, volatility, destination familiarity, approvals, and slippage are behavioral/context proxies only. Pet states are UI reactions to shared demo events.

### No reported model performance without artifacts

ROC-AUC, precision, recall, F1, FPR, FNR, Brier score, calibration, sample size, confusion matrix, and feature importance must be loaded from versioned evaluation outputs. No value should be copied from a prompt, pitch, screenshot, or hand-edited constant.

### Distribution shift

The synthetic distributions simplify balances, activity, volatility, destinations, and contract interactions. Real wallet populations, chains, assets, protocols, market regimes, bots, automation, and adversaries may differ substantially. The prototype has no established out-of-distribution detector or real-world drift baseline.

### Feature ambiguity and feedback loops

- A large amount/balance ratio may be an intentional portfolio rebalance.
- High velocity may be an automated strategy.
- A new destination may be legitimate.
- Overnight timing does not establish impairment.
- A high approval ratio depends on token and protocol semantics.
- Recent model flags can amplify prior false positives.
- Recent cancellations may reflect product influence rather than underlying risk.

These features require ablation, slice, and user-study evidence before real use.

### Explainability is limited

Linear feature contributions show how inputs affected model log-odds relative to a fitted baseline; they do not prove causation. Correlated inputs can make individual contributions unstable. Global tree importance is not a faithful per-transaction explanation.

## False-positive and false-negative limitations

### False positives

Benign actions may receive warnings or cooldowns. Consequences can include frustration, missed execution opportunities, increased gas exposure after delay, abandonment, and loss of trust. A mandatory policy magnifies this cost.

### False negatives

Dangerous, regretted, fraudulent, or otherwise harmful actions may pass without friction. The model does not inspect every smart-contract vulnerability or establish destination safety. Users must not rely on Sentient Wallet as a guarantee.

### No universal threshold

The appropriate threshold depends on the intervention’s severity, user preference, transaction type, and error cost. The model evaluation threshold, display bands, browser policy threshold, and contract thresholds are separate configuration layers and may diverge unless explicitly synchronized.

## Browser and interface limitations

Browser Demo Mode is designed for accessibility and reproducibility, not secure custody.

- Local storage can be viewed, changed, cleared, or blocked.
- Demo balances, prices, trades, history, accessories, and reward credits have no external value.
- A simulated chain/attestation state is not a blockchain confirmation.
- Browser timestamps and countdowns are not authoritative for on-chain eligibility.
- Client-side code can be modified by the visitor.
- A visible fallback model is an availability mechanism, not trained inference.
- Charts and backtests use simplified fixtures and do not reproduce market microstructure, fees, liquidity, MEV, oracle delay, or taxes.

The application must keep working without a wallet extension, node, or backend, but that convenience is also why Browser Mode cannot prove enforcement.

## Blockchain limitations

The contract design is local, minimal, and ERC-4337-inspired.

It does not claim:

- EntryPoint/UserOperation, bundler, paymaster, aggregator, or full account-abstraction compatibility;
- production audit, formal verification, bug bounty, or battle testing;
- upgrade, recovery, guardian, multisig, session-key, or spending-limit architecture;
- mainnet or testnet deployment;
- production signer/key management;
- decentralized or trustless risk assessment; or
- support for real tokens, swaps, lending, or protocol adapters.

The trusted attestation signer is a centralized oracle. A valid signature proves who signed and what call/score/version/expiry was covered; it does not prove that the model inputs or score were correct. Policy ownership is also centralized and can change thresholds, cooldowns, and signer.

The current minimal ECDSA recovery helper is reviewable prototype code, not a substitute for an audited, maintained cryptography library. Any use with assets would require replacement/hardening, independent audit, extensive testing, operational key controls, and legal review.

Local development accounts are public and local chain time can be manipulated. They provide no economic security.

## Attestation and service limitations

The target Full Local design requires a typed risk service and development signer. Until those components are present, connected, and tested, the UI-contract flow is roadmap integration.

Even when implemented:

- service downtime can prevent new attestations;
- signer compromise can authorize wrong scores;
- nonce coordination can fail under concurrent requests;
- short expiry can create availability friction;
- long expiry increases stale-assessment risk;
- feature calculation can differ between browser and service;
- contract policy can diverge from UI settings; and
- private transaction intent may be exposed to the service.

These are not solved merely by using EIP-712.

## Financial and accounting limitations

### No real assets or yield

Vault balances, APYs, allocation, cumulative yield, “saved” amounts, and comparisons are simulated or user-configured assumptions. No protocol deposit, lending position, tokenized treasury, or RWA position is created. Protocol names are examples, not integrations or endorsements.

### Discipline surplus is counterfactual

When a proposed purchase is cancelled, the wallet retains the money it already had. The cancelled amount is not a new deposit, profit, or separate asset. It must never be counted twice in total asset value.

“Loss avoided” depends on an unknowable counterfactual price path and should not be reported except as a clearly labelled scenario calculation with its assumptions.

### Backtests are not evidence of future returns

The Behavioral Trading Simulation simplifies execution and user decisions. Results can change with chosen dates, fixtures, fees, policy and path. They are not investment performance, a forecast, or proof that cooldowns create wealth.

### No fee model is implemented by narrative alone

The pitch’s performance-fee concept raises custody, valuation, loss, disclosure, tax, and regulatory questions. It is not an implemented commercial model. “Zero platform transaction fee” would not eliminate network gas or third-party costs.

## Companion and gamification limitations

The companion is a visual feedback mechanism. It is not alive, sentient, emotionally aware, or a source of financial advice. Accessories, reward credits, evolution forms, gallery pets, and rarity are demo components, not NFTs or tradable assets.

Gamification can create pressure or shame. The production-facing prototype should not imply that overriding a warning harms the pet or makes the user morally inferior. Users must be able to understand and operate core controls without interacting with the companion.

## PoD Discipline Index limitations

The PoD Discipline Index is a transparent demo formula over application events such as cancellations, cooldown completion, overrides, concentration, trend, and streak. It is not a credit score and has no demonstrated relationship to repayment, default, suitability, or financial character.

It must not be used for:

- loan pricing or eligibility;
- credit limits;
- insurance, employment, housing, or access decisions;
- cross-wallet profiling;
- public reputation; or
- transferable credentials.

The pitch’s future credit narrative remains roadmap only. Any such study would require legal, privacy, fairness, identity, appeal, adverse-action, and empirical-validity work outside this prototype.

## Privacy limitations

Wallet addresses are pseudonymous, not anonymous. Combined balances, destinations, timing, contract interactions, and behavioral sequences can identify or profile a person.

Browser Demo Mode should keep fixtures local. A future service must not collect more than necessary and must define retention, deletion, access, encryption, audit, and secondary-use controls. Private keys and seed phrases are never model inputs.

On-chain deletion is generally impossible. The prototype therefore should not place raw behavioral features, explanations, discipline history, or identity on chain. A bounded transaction attestation still reveals some metadata and should not be treated as private.

## Security limitations

This prototype is not a substitute for:

- contract simulation and malicious-call analysis;
- phishing and domain protection;
- token approval review;
- secure key storage;
- device compromise protection;
- oracle and price manipulation controls;
- rate limiting and denial-of-service protection;
- dependency and supply-chain review; or
- incident response for real funds.

An IRS can be low while a call is malicious, and high while a call is safe. Behavioral friction and technical transaction security are complementary, not interchangeable.

## Operational and testing limitations

The definition of done requires more than the presence of files. Evidence should include:

- a clean build from documented prerequisites;
- deterministic dataset regeneration;
- generated model/evaluation/export artifacts;
- browser/Python inference parity;
- UI navigation and cross-view regression tests;
- local contract compilation and positive/negative tests;
- typed API validation and failure paths;
- end-to-end local attestation/queue/cancel/execute reconciliation;
- accessibility and reduced-motion checks;
- simulation-label review; and
- no console errors in supported flows.

Until each gate has evidence, the related capability remains prototype source or roadmap. This document intentionally does not claim that the repository as a whole has passed those gates.

## Business and regulatory limitations

There is no validated market demand, pricing, retention, loss reduction, willingness to pay, or commercial viability evidence. Market-size and gamification claims in source pitch materials are not used without attributable sources.

A product that delays transactions, signs risk attestations, charges on yield, recommends allocation, or influences lending could trigger financial, consumer-protection, privacy, AI, cybersecurity, tax, or other obligations depending on jurisdiction and implementation. This repository provides no legal conclusion.

## Claims the project must not make

- “The wallet knows how you feel.”
- “The IRS predicts irrational behavior.”
- “The model prevents losses or fraud.”
- “The smart contract makes the model trustless.”
- “Discipline surplus is profit.”
- “Simulated APY is an achievable return.”
- “PoD measures creditworthiness.”
- “The prototype is a complete ERC-4337 wallet.”
- “Local contract tests make the system production-safe.”
- “The product is the first of its kind.”
- “The project is endorsed by named institutions, protocols, or vendors.”

## Evidence needed to narrow these limitations

The next responsible evidence sequence is:

1. finish and verify deterministic prototype behavior with no real funds;
2. publish versioned model artifacts and limitations;
3. test explanation and simulation-label comprehension;
4. measure protection-versus-friction behavior in controlled synthetic tasks;
5. complete independent privacy, security, accessibility, and contract reviews; and
6. define a separately governed, consented research protocol before considering real wallet data.

Even successful research would narrow specific uncertainties; it would not eliminate financial risk.
