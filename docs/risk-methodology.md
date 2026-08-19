# IRS Risk Methodology

## Purpose and evidence boundary

The Impulsive Risk Score (IRS) is a prototype transaction-risk measure. It estimates how closely a transaction resembles a **synthetically defined elevated-risk class** using observable transaction and context proxies. It does not measure emotion, intent, rationality, mental health, or future financial loss.

This document describes the reproducible methodology encoded in the ML source and the intended policy interpretation. It deliberately reports no performance values: metrics are valid only after the pipeline generates versioned dataset, evaluation, and model artifacts. Source code alone is not a result.

## Output contract

For a validated feature vector, the intended inference result is:

```json
{
  "irs_score": 82,
  "risk_probability": 0.82,
  "risk_level": "CRITICAL",
  "recommended_policy": "COOLDOWN",
  "top_drivers": [
    {
      "feature": "amount_balance_ratio",
      "label": "Transaction relative to wallet balance",
      "impact": 0.31
    }
  ],
  "model_version": "versioned-artifact-value"
}
```

The numbers above illustrate the response shape only. They are not model evidence or a promised result.

The probability is mapped to a display score on a 0-100 scale:

```text
IRS = round(100 × predicted probability)
```

The application must retain the unrounded probability for policy analysis and use the versioned artifact’s bands rather than reimplementing them ad hoc.

## Feature schema

The prototype schema contains one categorical feature and eighteen numeric/binary features.

| Feature | Interpretation | Main caution |
|---|---|---|
| `transaction_type` | Buy, sell, transfer, or contract call | Type does not determine intent |
| `transaction_amount` | Proposed amount in demo units | Absolute amount is context-dependent |
| `wallet_balance` | Available demo balance before the action | Not total wealth or affordability |
| `amount_balance_ratio` | Amount divided by available balance | Concentration proxy, not regret probability |
| `transactions_1h` | Recent one-hour activity count | Velocity is not compulsion |
| `transactions_24h` | Recent 24-hour activity count | User strategies differ |
| `time_since_previous_transaction` | Minutes since prior action | Short intervals can be legitimate |
| `market_volatility` | Demo market volatility ratio | Not a price forecast |
| `asset_volatility` | Demo asset volatility ratio | Requires consistent calculation window |
| `portfolio_drawdown` | Recent demo portfolio decline ratio | Does not measure user distress |
| `destination_seen_before` | Whether destination appeared previously | Familiarity is not safety |
| `destination_age_days` | Synthetic age/familiarity context | Young destinations are not necessarily malicious |
| `contract_interaction` | Whether call data invokes a contract | Contract use is normal in Web3 |
| `approval_ratio` | Approval exposure relative to value | Depends on token semantics |
| `estimated_slippage` | Estimated execution slippage ratio | Estimate can be stale or wrong |
| `hour_of_day` | UTC hour | Must not infer fatigue or impairment |
| `weekend` | Weekend indicator | Coarse context only |
| `recent_cancelled_transactions` | Recent demo cancellations | A cancellation can reflect good review or a changed plan |
| `recent_high_risk_transactions` | Recent model-flagged actions | Feedback loops can amplify prior model error |

Unsupported fields include actual emotional state, mental-health condition, personality traits, protected attributes, psychological diagnosis, seed phrase, and private key.

## Synthetic dataset

### Generation

The default generator is configured for 6,000 rows with fixed seed `20260819`. Each row is explicitly marked `SYNTHETIC` and carries a generator version. The generator creates:

- log-normal wallet balances;
- a mixture of routine and concentrated amount ratios;
- Poisson transaction counts with occasional burst regimes;
- volatility and drawdown distributions with occasional shocks;
- destination familiarity and age;
- contract, approval and slippage context;
- time-of-day and weekend context; and
- recent cancellation/high-risk counts.

The dataset writer records row counts, class counts, feature names, seed, generator version, and a SHA-256 hash of stable CSV bytes.

### Synthetic label mechanism

The binary `risk_label` is a Bernoulli draw from a documented latent-risk function plus seeded noise. The latent function increases with designer-selected combinations such as concentration, velocity, short intervals, volatility, drawdown, unfamiliar or young destinations, contract/approval exposure, slippage, overnight context, recent high-risk events, and certain interactions.

This is a transparent simulation of a hypothesis. It is not a labelled observation of user harm. Strong performance against these labels primarily shows that a model can recover the generator’s structure.

### Dataset validation

Before training, the pipeline should reject data when:

- required columns are absent;
- the frame is empty;
- any row lacks the explicit synthetic origin;
- labels are not binary or only one class is represented;
- transaction types are unsupported; or
- amount or balance is non-positive.

Additional production-style range and missingness checks are still required at inference time.

## Preprocessing

The training split determines all preprocessing parameters:

- numeric features use standard scores based on training-split means and population standard deviations;
- `transaction_type` uses a fixed one-hot category order;
- an unknown transaction type is rejected rather than silently mapped; and
- the transformed feature order and source mapping are exported with the artifact.

Using test-set statistics would leak evaluation information and is prohibited. Browser and Python inference must apply the same means, scales, category order, coefficient order, and finite-value checks.

## Candidate models

The pipeline defines two candidates trained on the same fixed stratified split:

### Logistic Regression

- linear log-odds model;
- standardized numeric inputs plus one-hot transaction type;
- strong portability to JSON/browser inference;
- signed per-feature contributions are inspectable; and
- limited ability to represent nonlinear interactions not encoded as inputs.

### Random Forest

- nonlinear tree ensemble;
- configured prototype uses deterministic seeding and bounded depth/leaf size;
- can model interactions without explicit terms; and
- harder to export and explain faithfully in a small static browser application.

The current default training configuration uses a 75% training / 25% held-out test split and 300 forest estimators. These are configuration choices, not performance claims.

## Evaluation protocol

Both candidates must be evaluated on the identical held-out set using:

- ROC-AUC;
- precision;
- recall;
- F1;
- false-positive rate;
- false-negative rate;
- confusion matrix;
- Brier score;
- expected calibration error;
- calibration curve;
- ROC curve;
- score distribution; and
- threshold frontier.

Accuracy is intentionally excluded from the selection rule because it can conceal class imbalance and does not express the protection/friction trade-off.

### Published selection rule

The prototype configuration combines the following terms:

| Term | Weight |
|---|---:|
| ROC-AUC | 0.28 |
| Recall | 0.18 |
| Precision | 0.10 |
| F1 | 0.12 |
| Calibration quality (`1 - Brier`) | 0.20 |
| Interpretability | 0.12 |

The interpretability prior is higher for Logistic Regression than Random Forest because the intended static browser implementation requires deterministic, reviewable local contributions. The tie-break favors Logistic Regression.

This weighting is a design decision and should be sensitivity-tested. It must not be presented as a universal financial-risk objective.

## Risk bands and policy thresholds

The model configuration defines display bands:

| Probability | Display band | Model recommendation |
|---|---|---|
| 0.00 to < 0.35 | Low | Allow |
| 0.35 to < 0.60 | Moderate | Additional confirmation |
| 0.60 to < 0.80 | High | Cooldown |
| 0.80 to 1.00 | Critical | Cooldown |

Candidate classification metrics are currently designed around an evaluation threshold of 0.50. That threshold answers “how does this model classify the held-out synthetic set?” It is separate from:

- the display-band cutoffs;
- the active user policy threshold;
- frequency and amount-tier rules; and
- the local contract thresholds.

The UI must display the active policy rather than imply that a model band alone caused an intervention.

## Protection-versus-friction frontier

For thresholds from 0.05 through 0.95 in 0.05 steps, the evaluation helper calculates:

- true high-risk synthetic transactions intercepted;
- benign synthetic transactions interrupted;
- false positives;
- false negatives;
- intervention rate;
- risk protection (recall); and
- user friction (false-positive rate).

The frontier helps select a demo policy transparently. It does not reveal the real-world cost of an error because the labels and sample are synthetic.

### Error interpretation

**False positive:** the model recommends friction for a transaction labelled benign. Likely user costs include delay, frustration, missed execution timing, and distrust.

**False negative:** the model recommends no friction for a transaction labelled elevated-risk. Likely product costs include false reassurance and failure to create the intended review opportunity.

The relative cost is contextual. Threshold decisions must be revisited by transaction type and intervention severity; no single ratio is assumed here.

## Policy decision order

The application should make decisions in this order:

1. Validate amount, balance or holdings, type, destination, and finite feature ranges.
2. Build the feature vector from the current state without using future information.
3. Apply the exact exported preprocessing and model.
4. Convert probability to IRS and display band.
5. Generate explanations from the actual transformed input.
6. Evaluate the active IRS threshold, frequency limit, and amount tier.
7. Use the maximum applicable mandatory delay when rules overlap.
8. Execute, request additional confirmation, or create a mandatory cooldown.
9. Record exactly one terminal transaction/intervention outcome.

A fallback heuristic may exist only for availability. It must be deterministic, visibly labelled `FALLBACK MODE`, excluded from model metrics, and never represented as the trained IRS.

## Explainability methodology

For a selected Logistic Regression model, a local contribution can be calculated as:

```text
standardized feature value × fitted coefficient
```

Positive values increase log-odds relative to the intercept; negative values reduce them. The interface should aggregate one-hot terms back to their human feature labels, sort by magnitude, and show both risk-increasing and risk-reducing factors.

Important cautions:

- a contribution is not causal;
- correlated inputs can divide or shift apparent importance;
- the intercept and preprocessing baseline matter;
- an input can be influential because of synthetic generator design; and
- global forest impurity importance is not a local explanation.

Each explanation must carry the same model version as the score.

## Reproducibility and parity gates

A model release is valid only when it includes:

- generated dataset and metadata;
- stable dataset hash and seed;
- fixed train/test transaction IDs;
- library versions;
- candidate evaluation artifact;
- selected-model name and rationale;
- preprocessing metadata;
- browser-portable model data;
- model and metadata hashes; and
- parity fixtures with expected probabilities.

Required checks include:

1. regenerating the dataset with the same seed produces the same hash;
2. rerunning training produces equivalent selected artifacts within documented numerical tolerance;
3. browser and Python inference agree on fixed rows;
4. IRS remains within 0-100;
5. missing, unknown, non-finite, and extreme inputs fail safely; and
6. every UI metric is loaded from the evaluation artifact rather than typed by hand.

Until these artifacts and checks exist, the model should be described as pipeline prototype source, not a completed model.

## Privacy and feedback-loop risks

The preferred demo computes features locally. If future inference leaves the browser, it should send derived values rather than unnecessary raw history or full addresses where possible.

Features based on prior model outcomes can create feedback loops. For example, `recent_high_risk_transactions` may amplify earlier false positives. Cancellations can also reflect compliance with the product rather than inherent risk. These features require ablation analysis before any real-data pilot.

Wallet identifiers, destinations, timestamps, balances, and behavioral sequences can be identifying. No model feature should be written on chain; the contract needs only the bounded score and transaction-bound verification fields.

## Methodological limitations

- The target label is synthetic and circular with the generator rules.
- No real losses, regrets, fraud outcomes, or user intentions are observed.
- Market and portfolio features are simplified simulation values.
- There is no demonstrated calibration under distribution shift.
- UTC timing may encode geography or lifestyle if applied to real users.
- Transaction history can produce unequal friction for different strategies.
- The score is not validated for credit, lending, suitability, or compliance use.
- A smart contract can enforce the score but cannot validate its correctness.

See `responsible-ai.md` and `limitations.md` for release controls and broader system constraints.
