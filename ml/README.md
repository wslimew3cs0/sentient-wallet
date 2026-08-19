# Sentient Wallet IRS model pipeline

This directory contains the reproducible machine-learning pipeline for the
Sentient Wallet Impulse Risk Score (IRS).

> **SYNTHETIC DATA ONLY.** The labels are generated from documented
> behavioral-risk proxy rules plus seeded noise. They do not represent observed
> emotion, intent, mental health, creditworthiness, or real financial harm.

The model is an educational prototype for proportionate demo-wallet friction.
It must not be used as psychological diagnosis, autonomous financial advice, or
evidence that losses will be prevented.

## Reproduce the published artifacts

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r ml/requirements.txt
python3 -m ml.run_pipeline
python3 -m unittest discover -s ml/tests -v
```

The default run uses:

- dataset seed `20260819`;
- 6,000 explicitly labelled synthetic rows;
- a fixed 75/25 stratified train/test split;
- Logistic Regression and Random Forest candidates;
- a 0.50 evaluation threshold;
- one CPU worker for deterministic Random Forest fitting.

The generated CSV and Python training bundle are ignored working files under
`ml/data/` and `ml/artifacts/`. The browser-facing, reviewable artifacts are:

- `assets/models/irs-model.json` — coefficients, intercept, preprocessing,
  feature schema, risk bands, and explanation metadata;
- `assets/models/model-metadata.json` — dataset fingerprint, environment,
  selected metrics, checksums, and limitations;
- `assets/models/model-metrics.json` — both candidates' metrics, confusion
  matrices, ROC/calibration points, score histograms, feature importance, and
  threshold frontiers;
- `assets/models/model-test-vectors.json` — low, typical, and high synthetic
  vectors for browser/Python inference parity.

Run stages separately when debugging:

```bash
python3 -m ml.generate_synthetic_data
python3 -m ml.train_model
python3 -m ml.evaluate_model
python3 -m ml.export_model
```

All scripts also accept `--help`. No cloud account, API key, wallet, or live
financial data is required.

## Dataset

`generate_synthetic_data.py` creates the following model inputs:

| Feature | Meaning |
|---|---|
| `transaction_type` | BUY, SELL, TRANSFER, or CONTRACT_CALL |
| `transaction_amount` | Proposed amount in simulated USDT |
| `wallet_balance` | Available simulated USDT balance |
| `amount_balance_ratio` | Amount divided by balance |
| `transactions_1h`, `transactions_24h` | Recent transaction velocity |
| `time_since_previous_transaction` | Minutes since the prior transaction |
| `market_volatility`, `asset_volatility` | Simulated volatility ratios |
| `portfolio_drawdown` | Simulated recent drawdown ratio |
| `destination_seen_before` | Binary prior-use proxy |
| `destination_age_days` | Simulated destination age |
| `contract_interaction` | Binary contract-call proxy |
| `approval_ratio` | Approval amount relative to transaction value |
| `estimated_slippage` | Simulated slippage ratio |
| `hour_of_day`, `weekend` | Transaction timing proxies |
| `recent_cancelled_transactions` | Recent cancellation count |
| `recent_high_risk_transactions` | Recent high-risk assessment count |

Every row also contains `data_origin=SYNTHETIC`, a synthetic transaction ID,
the generator version, and the binary `risk_label`. Unsupported fields such as
actual emotion, mental-health condition, personality, or psychological diagnosis
are neither generated nor inferred.

### Generation rules

The generator uses NumPy's fixed-seed `default_rng` and models:

- log-normal wallet balances;
- a mixture of routine and wallet-concentrated transaction amounts;
- Poisson transaction velocity with occasional bursts;
- beta-distributed volatility/drawdown with occasional shocks;
- seeded destination familiarity/age and contract/approval behavior;
- seeded timing, slippage, cancellation, and recent-risk histories.

The binary label is a seeded Bernoulli draw from a latent risk probability. Its
inputs are only the listed behavioral/context proxies. Larger balance share,
faster repetition, higher velocity/volatility/drawdown, unseen or young
destinations, broader approvals, slippage, recent risky activity, and two
documented interactions increase the latent probability. A fixed-seed noise term
prevents the model from merely recovering a deterministic hand-written threshold.
The exact executable formula is in `generate_synthetic_data.py`.

The published dataset fingerprint is:

```text
568525bb14d58c6e246c307ce88c973b5a7305e396d921c8014098bb55488aea
```

Changing generation behavior requires a dataset/generator version change and a
new expected fingerprint in the reproducibility test.

## Preprocessing and candidates

The fixed training split supplies population means and standard deviations for
all numeric features. Transaction type is one-hot encoded in the published order
`BUY`, `SELL`, `TRANSFER`, `CONTRACT_CALL`. Unknown categories are rejected.

Two models are trained against the identical transformed split:

1. Logistic Regression (`liblinear`, L2 regularization), chosen for calibrated,
   coefficient-level browser inference and explanations.
2. Random Forest (300 trees, maximum depth 10, minimum leaf size 5), used as a
   non-linear comparison.

Accuracy is deliberately excluded from selection. The published score is:

```text
0.28 × ROC-AUC
+ 0.18 × Recall
+ 0.10 × Precision
+ 0.12 × F1
+ 0.20 × (1 − Brier score)
+ 0.12 × Interpretability
```

Interpretability is scored as `1.00` for Logistic Regression and `0.35` for
Random Forest. This makes the product trade-off explicit instead of silently
selecting the most complex candidate. False negatives represent potentially risky
synthetic transactions receiving no model flag; false positives represent benign
synthetic transactions receiving unnecessary friction.

## Actual published holdout results

These values were generated by the checked-in pipeline, not typed into the model
artifact. The full precision values and plot arrays are in
`assets/models/model-metrics.json`.

| Metric | Logistic Regression | Random Forest |
|---|---:|---:|
| Selection score | 0.7381 | 0.6584 |
| ROC-AUC | 0.7809 | 0.7747 |
| Precision | 0.6770 | 0.7048 |
| Recall | 0.5307 | 0.5158 |
| F1 | 0.5950 | 0.5957 |
| False-positive rate | 0.1412 | 0.1205 |
| False-negative rate | 0.4693 | 0.4842 |
| Brier score | 0.1756 | 0.1765 |
| Expected calibration error | 0.0188 | 0.0292 |
| Confusion matrix `[[TN, FP], [FN, TP]]` | `[[827, 136], [252, 285]]` | `[[847, 116], [260, 277]]` |

Logistic Regression is therefore the selected browser model. This does not mean
it has been validated on real users or real transactions; it only performs better
under the published multi-objective rule on held-out synthetic labels.

## Browser inference contract

The browser does not call a random scorer. It should:

1. validate all required inputs against `input_schema`;
2. recompute `amount_balance_ratio` from amount and balance;
3. apply the exported numeric means/scales and categorical order;
4. calculate `logit = intercept + Σ(coefficient × transformed value)`;
5. calculate `probability = 1 / (1 + exp(-logit))`;
6. calculate `IRS = round(probability × 100)`;
7. map probability to the exported risk bands;
8. explain the result with signed per-feature log-odds contributions.

The default bands are LOW below 0.35, MODERATE below 0.60, HIGH below 0.80,
and CRITICAL from 0.80. These descriptive bands are separate from the user's
configurable policy threshold and amount/frequency rules.

The reproducibility suite recalculates all three exported parity vectors using
the browser formula and enforces a `1e-10` probability tolerance.

## Evaluation artifacts

For each candidate, `evaluate_model.py` calculates:

- ROC-AUC, precision, recall, F1;
- false-positive and false-negative rates;
- Brier score and ten-bin expected calibration error;
- confusion matrix;
- ROC and equal-count calibration curve points;
- positive/negative score histograms;
- transformed and input-aggregated feature importance;
- a 0.05–0.95 threshold frontier containing intercepted synthetic risks,
  interrupted benign rows, false positives, false negatives, intervention rate,
  risk protection, and user friction.

## Limitations

- Evaluation measures recovery of synthetic labels, not loss prevention.
- The generator encodes assumptions that the trained model will inherit.
- The holdout is reproducible but is not external or real-world validation.
- Distribution shift, fairness across user populations, adversarial behavior,
  privacy in a deployed system, and production calibration remain untested.
- The model output should inform transparent, proportionate policy friction; it
  must not be presented as certainty, emotion detection, or a regulated score.
