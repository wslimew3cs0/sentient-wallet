# Responsible AI

## Purpose

Sentient Wallet explores whether observable transaction and market-context features can support a proportionate wallet warning or cooldown. The ML output is an **experimental transaction-risk estimate**, not an observation of emotion, intent, mental health, personality, morality, or creditworthiness.

This document governs the language, data use, model evaluation, policy behavior, and user controls of the prototype. It applies equally to Browser Demo Mode and Full Local Mode.

## Capability status

| Capability | Responsible description |
|---|---|
| Synthetic data generator and model pipeline source | Prototype source; useful for reproducibility testing, not evidence of real-world validity |
| Browser risk experience | Prototype/simulation; must show model version or visible fallback status |
| Pet and behavioral states | Gamified interpretation of application events; not emotion detection |
| PoD Discipline Index | Experimental demo index; not a regulated or unregulated credit score |
| Vault and backtest outcomes | Simulation based on explicit assumptions; not investment performance |
| On-chain cooldown | Local development prototype; not guaranteed protection |
| Credit, lending, or pricing use | Roadmap concept and prohibited current use |

## Permitted purpose

The IRS may be used to:

- summarize documented transaction/context proxies;
- explain why an action resembles the synthetic high-risk class;
- select a user-configured review, confirmation, or cooldown response in a demo or local prototype;
- compare protection and friction across thresholds; and
- support reproducibility, interface, and policy research.

It must not be used to:

- diagnose or infer a psychological or medical condition;
- claim that the user is greedy, panicked, impaired, addicted, or irrational;
- determine employment, insurance, housing, education, credit, or access to essential services;
- make autonomous investment decisions;
- guarantee fraud, loss, or impulse prevention;
- punish users or reduce access based on the companion or discipline index; or
- train a production model from user activity without a separate lawful, consented, reviewed program.

## Synthetic training data

Real labelled wallet-behavior data is not available. The prototype therefore generates deterministic synthetic transactions from published proxy rules and seeded noise. Every generated row must carry an explicit synthetic-origin label and version metadata.

Synthetic data supports software testing because the same seed can recreate the same rows. It does not validate the product hypothesis. The label is produced by designer-authored rules, so a model can learn those assumptions and appear to perform well without learning anything about real users or real harm.

Consequences:

- evaluation metrics describe recovery of a synthetic label mechanism only;
- class balance, feature distributions, and interactions are constructed;
- no result may be generalized to a population, demographic, wallet ecosystem, or market regime;
- synthetic performance cannot justify real-money intervention; and
- a future real-data study requires new consent, governance, privacy analysis, sampling design, and outcome definitions.

## Behavioral proxies and claim boundaries

| Proxy group | Examples | What it may indicate | What it cannot establish |
|---|---|---|---|
| Concentration | Amount, balance, amount/balance ratio | Size relative to the current demo wallet | Affordability, wealth, regret, or intent |
| Velocity | Transactions in 1h/24h, time since prior action | Unusual activity density | Compulsion, panic, or addiction |
| Market context | Market/asset volatility, drawdown, slippage | Execution context with elevated uncertainty | The future direction of price or whether a trade is wise |
| Destination context | Previously used, age, contract interaction | Familiarity and technical exposure proxy | Trustworthiness, fraud, or maliciousness |
| Approval exposure | Approval ratio | Scope of token permission in the synthetic scenario | Whether the contract will exploit the user |
| Timing | Hour and weekend | Temporal context | Fatigue, impairment, location, or mental state |
| History | Recent cancellations/high-risk assessments | Recent application events | Stable personality or creditworthiness |

The preferred term is **behavioral and transaction-context proxy**. “Emotion detection,” “psychological profile,” and similar claims are prohibited.

## False positives and false negatives

### False positive

A transaction assigned to the synthetic high-risk class is actually benign for the user. The result can create delay, frustration, missed timing, reduced trust, or pressure to disable the system.

Controls:

- show the score, threshold, model version, and leading drivers;
- allow the user to select a protection preset or custom threshold;
- distinguish a recommendation from a mandatory policy;
- provide a clear cancel/review path and, where policy permits, additional confirmation;
- collect appeal/override feedback only with consent; and
- evaluate false-positive rate and friction at each candidate threshold.

### False negative

A genuinely dangerous or regretted transaction receives no additional friction. The user may assume protection that the system did not provide.

Controls:

- state that Sentient Wallet cannot guarantee protection;
- evaluate recall and false-negative rate, not accuracy alone;
- retain deterministic amount, frequency, and policy rules alongside model output;
- allow an optional more protective preset;
- monitor incidents and out-of-distribution inputs; and
- avoid marketing language that invites overreliance.

### Trade-off policy

Reducing one error generally increases the other. Threshold selection must therefore be documented as a protection-versus-friction decision. No single threshold or preset is universally optimal. The current user’s chosen policy and the model’s evaluation threshold are different concepts and must be displayed separately.

## Transparency and explanation

Every assessment should expose:

- IRS and probability;
- risk band;
- model and dataset version;
- assessment timestamp;
- active policy and threshold;
- the strongest risk-increasing and risk-reducing input contributions; and
- whether the result came from the intended model or a recovery fallback.

Explanations must be generated from the same feature values used for inference. Generic post-hoc warnings that do not correspond to inputs are not acceptable.

For a linear model, signed standardized feature contributions can support a local explanation. Global Random Forest importance is not a per-transaction causal explanation and must not be presented as one.

The UI should use phrasing such as “This transaction is large relative to the simulated available balance,” not “You are behaving irrationally.”

## User agency and intervention design

The product should help users configure guardrails in advance rather than surprise them with hidden restrictions. Policy changes must show their consequences and affect future assessments.

Mandatory cooldown is appropriate only when the user has deliberately enabled a policy that requires it. The intervention view must explain the duration, reason, pending action, available cancellation, and what happens when time expires.

The companion must remain supportive. Language that implies the user is harming a living being, losing moral worth, or disappointing the system is a coercive dark pattern and should not be used. Companion progress and accessories are demo gamification components, not financial assets or NFTs.

Users must be able to:

- inspect and change policy settings;
- understand which settings are mandatory;
- reset the demo;
- navigate away without losing a pending transaction;
- distinguish a simulated outcome from a confirmed local-chain event; and
- access the core controls without animation, color-only cues, or a pet interaction.

## Privacy and data minimization

Wallet history is sensitive. Addresses, transaction timing, balance, destination history, and repeated interactions can be identifying when combined, even without a name.

Browser Demo Mode should use local deterministic fixtures and avoid network transmission by default. A future local or hosted service must define and justify every collected field.

Required controls before non-demo data collection:

1. clear purpose, lawful basis, and consent where required;
2. collection limited to features necessary for the stated assessment;
3. local aggregation of counts, ratios, and trends where possible;
4. no raw seed phrase, private key, signing key, or unnecessary full call data;
5. short retention with deletion and export mechanisms;
6. encryption and authenticated access;
7. separation of identifiers from research features;
8. access and model-inference audit logs;
9. a prohibition on hidden reuse for advertising, sale, or credit decisions; and
10. a privacy review for any persistent discipline history or cross-wallet linkage.

Pseudonymous wallet addresses are not anonymous. A public chain can make deletion of on-chain information impossible, so no behavioral profile or explanation should be written on chain in this prototype. The contract needs only the bounded score and transaction-bound attestation fields.

## PoD Discipline Index

The pitch’s “Proof of Discipline” credit vision is roadmap narrative. The user-facing prototype concept must be named **PoD Discipline Index** and display:

> Experimental behavioral index. Not a regulated credit score.

The index may summarize demo cancellations, cooldown completions, permitted overrides, concentration, risk trend, and streaks. It must not be used to infer character, price a loan, change access, or share a profile with a third party. Its formula and input events must be visible and resettable.

Any future credit or lending study would require a distinct governance program, legal analysis, fairness assessment, adverse-action/appeal design, identity and Sybil analysis, and evidence that the measure is valid for the proposed decision. That work is not part of the prototype.

## Evaluation and monitoring

No metric may be hardcoded or copied from a pitch. Model values shown in the application must come from versioned evaluation artifacts.

At minimum, evaluation should include:

- ROC-AUC, precision, recall and F1;
- false-positive and false-negative rates;
- confusion matrix;
- Brier score and calibration curve;
- score distribution;
- threshold frontier and intervention rate;
- deterministic rerun and browser/Python parity; and
- slice checks across transaction type, amount concentration, destination familiarity, contract interaction and time context.

For synthetic data, slice results are debugging evidence only. Before a real pilot, monitoring design must add missingness, out-of-range frequency, score drift, calibration drift, override/cancellation behavior, user complaints, and harm incidents.

## Model and policy governance

Every model release should record:

- dataset and generator version/hash;
- source revision and random seed;
- feature schema and preprocessing order;
- candidate models and selection rule;
- metrics and thresholds;
- model artifact hash;
- known limitations and intended use;
- approver and change rationale; and
- rollback procedure.

Every policy change should record the previous and new threshold/cooldown, policy version, actor, time, and reason. A model change and a policy change are separate events.

The local attestation signer must not sign if model/version validation fails. The contract proves signature validity, not responsible model governance.

## Human review and incident handling

For the prototype, “human review” means that the user can inspect the explanation and choose among the actions allowed by the preconfigured policy. It does not mean that a financial professional reviewed the transaction.

If an assessment appears wrong:

1. preserve the input fixture, model version, policy version and explanation;
2. classify the issue as data validation, inference, explanation, policy, UI or contract reconciliation;
3. avoid changing historical outcomes silently;
4. correct the defect with a versioned change and regression test; and
5. disclose material limitations in the repository.

Any event involving real funds would exceed the intended scope and should trigger immediate suspension rather than continued experimentation.

## Responsible release checklist

- All synthetic data and simulated financial values are visibly labelled.
- The application never claims genuine emotion detection or diagnosis.
- Model metrics are generated, versioned, and not fabricated.
- Explanations correspond to actual inputs.
- False-positive and false-negative trade-offs are displayed.
- Policy settings and mandatory behavior are understandable.
- The PoD metric is explicitly experimental and non-credit.
- Browser Demo Mode sends no wallet history by default.
- Local-chain status cannot be confused with mainnet or real assets.
- Companion language is supportive and non-coercive.
- Accessibility and reduced-motion checks cover interventions.
- Limitations and degraded modes are linked from the interface.

Passing this checklist improves disclosure quality; it does not establish that the system is safe for real financial use.
