# Sentient Wallet Business Case

## Status and framing

Sentient Wallet is an independent educational and technical portfolio project. It explores whether explainable risk assessment and proportionate transaction friction can improve decision quality in a simulated digital-asset setting. It does not claim institutional affiliation, endorsement, production deployment, or proven commercial outcomes.

The source pitch contains market and engagement figures without supporting citations. Those figures are intentionally excluded here. Any future market sizing must use dated, reviewable sources and a defined market boundary.

## 1. Executive Summary

Digital-asset wallets make transaction execution fast and user-controlled, but speed can remove the reflection time that helps a person reconsider an unusually concentrated, repeated, volatile, or unfamiliar action. Sentient Wallet tests a focused intervention: calculate an explainable Impulsive Risk Score (IRS) from observable transaction/context proxies, then apply the least restrictive policy that meets the user’s configured protection level.

The rebuild combines three layers:

- an integrated wallet-style interface and shared demo state;
- a reproducible ML pipeline designed for deterministic browser inference; and
- a local, ERC-4337-inspired contract prototype for signed assessments, cooldown queues, cancellation, and delayed execution.

Market activity, balances, Vault allocation, yield, pet progression, and Browser Mode blockchain behavior are simulations. Real asset custody, live protocol deposits, regulated credit use, and production smart-account deployment are roadmap concepts only.

Recommendation: continue as a staged research prototype. Validate technical reproducibility and user comprehension before considering real-wallet or commercial experiments.

## 2. Problem Definition

The product hypothesis is not that all frequent or volatile trading is irrational. It is that certain observable combinations may justify a moment of review: a large share of available balance, unusual velocity, high volatility, drawdown, unfamiliar destination, broad token approval, or high slippage.

Three problems motivate the prototype:

1. wallet confirmation screens often emphasize execution details rather than behavioral context;
2. static warnings do not adapt to transaction concentration, recent activity, or a user-selected protection policy; and
3. off-chain risk analysis and on-chain enforcement are usually separate, leaving unclear who can change or bypass the decision.

The prototype must avoid converting this hypothesis into a claim that it knows a user’s emotions or intentions.

## 3. Current User Journey

The pitch describes a user initiating a transaction during a high-pressure market moment. A conventional wallet validates technical authorization and executes once signed. It may warn about malicious contracts or excessive approvals, but it does not necessarily present a longitudinal view of transaction concentration or activity velocity.

The legacy Sentient Wallet demo adds an IRS meter, intervention modal, cooldown concept, companion feedback, discipline-surplus view, and settings. Its strongest user idea is the cross-view consequence: a cancelled transaction should affect the Vault and companion. Its main technical weakness is that legacy scores and outcomes are hand-set or stochastic, so they cannot substantiate an ML or financial claim.

## 4. Root Causes

- **Interface compression:** complex financial intent is reduced to a few signing fields.
- **Time pressure:** market volatility and continuous access reward immediate action.
- **Weak contextual memory:** a single confirmation does not show recent transaction velocity or concentration.
- **Policy ambiguity:** a warning may appear strong while still allowing immediate bypass.
- **Fragmented state:** separate prototype pages can disagree about balance, intervention, pet, and settings.
- **Narrative overreach:** terms such as emotion detection, guaranteed protection, or credit score can exceed the evidence.

These are design hypotheses, not empirical findings from real users.

## 5. Emerging-Technology Hypothesis

The combined hypothesis is:

> A deterministic, explainable probability model can identify transactions with elevated proxy-based risk, while a programmable wallet policy can make the selected response auditable and harder to bypass accidentally.

ML contributes pattern weighting and calibrated probability; it does not establish intent. Blockchain contributes deterministic policy execution and event evidence; it does not make the model trustless. The companion contributes feedback and continuity; it does not sense emotion.

## 6. Proposed Solution

The intended journey is:

1. The user prepares a buy, sell, transfer, or contract interaction.
2. The application validates the transaction and constructs documented model features.
3. The model returns probability, IRS, risk band, policy recommendation, version, and leading drivers.
4. User-configured thresholds, frequency rules, and amount tiers determine whether to allow, confirm, or cool down.
5. A high-risk action is queued rather than immediately executed when the policy is mandatory.
6. The user can cancel during cooldown or execute once eligible.
7. One shared event updates transaction history, Vault analytics, companion progress, and the experimental discipline index.

Browser Demo Mode simulates this lifecycle. Full Local Mode is intended to bind the assessment to exact call details and verify it on a local development chain.

## 7. ML Feasibility

The repository includes prototype source for a fixed-seed synthetic dataset and candidate Logistic Regression and Random Forest models. The defined features are observable transaction/context proxies. The intended evaluation includes ROC-AUC, precision, recall, F1, false-positive and false-negative rates, Brier score, calibration, confusion matrix, and threshold analysis.

Feasibility is technical, not predictive: the pipeline can test reproducibility and browser parity, but synthetic labels cannot establish real-world validity. No model performance figure should appear here unless it is generated by the committed evaluation process and linked to the exact dataset/model version.

## 8. Blockchain Feasibility

Prototype contract source demonstrates a plausible local policy mechanism:

- bind a score to an account and exact call details;
- verify a development signer, expiry, policy version, and nonce;
- classify the score using configured thresholds;
- queue the call with a corresponding cooldown;
- permit owner cancellation; and
- execute only when the delay has elapsed.

This is not a complete ERC-4337 implementation and not a production wallet. The off-chain signer remains a central trust dependency. Feasibility must be demonstrated with local compilation, negative-path tests, deployment, and end-to-end UI reconciliation; this document does not certify those results.

## 9. Business Value Hypotheses

Potential value should be treated as testable hypotheses:

- **Decision support:** explanations may help users recognize concentration, velocity, or unfamiliar destinations.
- **Configurable protection:** explicit policy presets may reduce accidental overrides while preserving agency.
- **Auditability:** consistent assessment and intervention events may improve review of what happened and why.
- **Engagement with discipline:** a companion may make risk feedback easier to revisit, provided it avoids guilt or manipulation.
- **Product differentiation:** the combination of explainable risk and enforceable local policy may be more distinctive than a static warning.
- **Research value:** the protection-versus-friction frontier creates a measurable way to discuss policy choices.

None of these hypotheses establishes loss avoidance, retention, willingness to pay, or regulatory viability.

## 10. Protection-versus-Friction Trade-off

Two errors matter:

| Error | User impact | Business impact | Control |
|---|---|---|---|
| False positive: benign transaction receives friction | Delay, frustration, possible missed opportunity | Abandonment and loss of trust | Calibrated thresholds, explanations, configurable policies, measured appeal/override path |
| False negative: risky proxy pattern is allowed | No additional reflection time | Failure of the protection proposition and possible harm | Recall monitoring, conservative optional preset, policy rules independent of the model, incident review |

The appropriate balance is context-dependent. A small transfer to a known destination and a concentrated contract approval should not necessarily use the same threshold. No preset is universally best.

## 11. Risks and Controls

| Risk | Control direction |
|---|---|
| Synthetic labels encode designer assumptions | Publish generator rules, separate synthetic from real evidence, prohibit performance generalization |
| Model output is mistaken for intent or emotion | Use transaction-risk language and feature explanations only |
| Unnecessary intervention | Threshold analysis, user-selected policy, accessible cancellation and review |
| Missed risky activity | Independent deterministic rules, monitoring, conservative optional policy |
| Signer compromise | Development-only keys, rotation, expiry, nonce and transaction binding; no real funds |
| Browser state manipulation | Treat local state as demo-only; reconcile to contract events in local mode |
| Double-counted “saved” value | Enforce accounting invariants and event idempotency |
| Yield simulation mistaken for performance | Label assumptions and simulation on every relevant surface |
| Companion becomes coercive | Supportive language, reduced-motion/accessibility controls, no “harm the pet” framing |
| PoD interpreted as creditworthiness | Call it an experimental discipline index; prohibit lending decisions |

## 12. Pilot KPIs

No target values are asserted. A controlled, simulated usability pilot could measure:

### Model and policy quality

- reproducibility and browser/API parity;
- ROC-AUC, precision, recall, F1, FPR, FNR, Brier score and calibration from versioned artifacts;
- intervention rate by threshold and scenario;
- false-positive appeal or override rate;
- time from warning to decision; and
- explanation comprehension.

### User experience

- completion rate for the guided demo;
- ability to identify the top risk driver;
- policy-setting comprehension;
- abandonment caused by confusing friction;
- accessibility task completion; and
- trust calibration: whether users understand what is simulated and what the score cannot infer.

### System integrity

- deterministic replay success;
- cross-view state consistency;
- duplicate intervention count;
- contract negative-path test coverage;
- stale/expired attestation rejection; and
- successful reconciliation of queued, cancelled, and executed events.

“Simulated loss avoided” may be shown only as a clearly defined counterfactual inside a named scenario, never as evidence of actual savings.

## 13. Commercial Model Concept

The pitch proposes aligning revenue with positive yield through a performance share. That is a **future concept**, not an implemented business model. It raises unresolved questions about custody, authorization, valuation, loss treatment, high-water marks, consumer disclosures, financial regulation, tax, and whether the product is recommending or managing investments.

A safer prototype path is free educational software with no fees and no asset movement. If later research supports a commercial path, possible models should be evaluated separately, such as paid analytics, enterprise policy tooling, or clearly scoped software subscriptions. No commercial model should depend on guilt-based engagement or sale of behavioral data.

## 14. Recommendation

Proceed only through evidence gates:

1. complete deterministic model generation, evaluation, export, and parity tests;
2. complete shared-state and legacy-regression checks;
3. validate that explanations and simulation labels are understood;
4. complete local contract tests and end-to-end reconciliation;
5. conduct a privacy and threat-model review; and
6. run a simulated usability study focused on false-positive tolerance and user agency.

Do not connect real assets or make credit, safety, or return claims during this phase.

## 15. Next Steps

- Produce versioned model and evaluation artifacts; report only generated metrics.
- Establish the exact feature contract shared by browser and local API.
- Complete deterministic UI scenarios for low risk, high risk, cancellation, cooldown, and degraded model state.
- Run local contract tests for signature, expiry, replay, policy version, threshold, cancellation, and timing behavior.
- Add an end-to-end Full Local integration only after the signer and reconciliation design are reviewed.
- Conduct privacy, accessibility, dark-pattern, and secure-key reviews.
- Define a pilot protocol with pre-registered hypotheses and no real funds.
- Revisit market size and commercial claims only with attributable evidence and legal review.
