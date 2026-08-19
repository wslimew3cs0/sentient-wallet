# Model Card: Sentient IRS Logistic Regression

## Model details

| Field | Value |
|---|---|
| Model name | Sentient IRS Logistic Regression |
| Model version | `1.0.0` |
| Dataset version | `synthetic-transactions-v1.0.0` |
| Status | Experimental educational prototype |
| Model family | Binary Logistic Regression with L2 regularization |
| Solver | `liblinear` |
| Browser artifact | [`assets/models/irs-model.json`](../assets/models/irs-model.json) |
| Evaluation artifact | [`assets/models/model-metrics.json`](../assets/models/model-metrics.json) |
| Metadata artifact | [`assets/models/model-metadata.json`](../assets/models/model-metadata.json) |
| Parity fixtures | [`assets/models/model-test-vectors.json`](../assets/models/model-test-vectors.json) |

> **SYNTHETIC DATA ONLY.** This model estimates similarity to a
> designer-authored synthetic elevated-risk label. It does not observe emotion,
> intent, regret, mental health, creditworthiness, fraud, or real financial harm.

## Intended purpose

The model supports the Sentient Wallet demo by converting observable transaction
and context proxies into a deterministic probability and 0–100 Impulse Risk
Score (IRS). The score can inform a transparent warning, additional confirmation,
or a user-configured cooldown in an educational wallet prototype.

Appropriate uses are limited to:

- reproducible Browser Demo and Full Local inference;
- explaining which supplied proxy features changed model log-odds;
- testing proportionate friction and threshold trade-offs on synthetic fixtures;
- comparing candidate models and validating browser/Python parity; and
- technical portfolio demonstration.

The model output is advisory to a separate policy layer. The active user
threshold, transaction-frequency rule, amount tier, and contract policy may
produce a different action from the display band alone.

## Training dataset

The default pipeline generated 6,000 rows using NumPy seed `20260819`. Every row
is explicitly marked `data_origin=SYNTHETIC` and includes generator version
`1.0.0`. The positive synthetic-label rate is `0.3578333333` (2,147 positive and
3,853 negative rows).

Dataset SHA-256:

```text
568525bb14d58c6e246c307ce88c973b5a7305e396d921c8014098bb55488aea
```

The generator samples balances, amount concentration, transaction velocity,
volatility, drawdown, destination context, contract/approval exposure, slippage,
timing, cancellations, and recent model flags from fixed-seed distributions. The
binary label is a Bernoulli draw from a documented proxy-based latent-risk
function plus fixed-seed noise.

This construction is useful for deterministic software and policy testing. It is
not ground truth. Performance primarily measures recovery of assumptions encoded
by the generator.

## Input features

The raw schema has one categorical and eighteen numeric/binary inputs.

| Feature | Interpretation | Important boundary |
|---|---|---|
| `transaction_type` | BUY, SELL, TRANSFER, or CONTRACT_CALL | Does not establish intent |
| `transaction_amount` | Proposed amount in simulated USDT | Not affordability or wealth |
| `wallet_balance` | Available simulated wallet balance | Not total assets |
| `amount_balance_ratio` | Amount divided by balance | Concentration proxy only |
| `transactions_1h` | Transactions initiated in one hour | Velocity is not compulsion |
| `transactions_24h` | Transactions initiated in 24 hours | Automated strategies may be active |
| `time_since_previous_transaction` | Minutes since the preceding action | Short intervals can be legitimate |
| `market_volatility` | Simulated market-volatility ratio | Not a price forecast |
| `asset_volatility` | Simulated asset-volatility ratio | Depends on calculation window |
| `portfolio_drawdown` | Simulated recent drawdown | Does not measure distress |
| `destination_seen_before` | Binary prior-use proxy | Familiarity is not safety |
| `destination_age_days` | Synthetic destination-age context | Young does not mean malicious |
| `contract_interaction` | Binary contract-call proxy | Contract use is normal |
| `approval_ratio` | Approval exposure relative to value | Token semantics matter |
| `estimated_slippage` | Simulated slippage ratio | May be stale or wrong |
| `hour_of_day` | UTC hour | Must not imply fatigue or impairment |
| `weekend` | Weekend indicator | Coarse context only |
| `recent_cancelled_transactions` | Recent cancellation count | Cancellation can be protective |
| `recent_high_risk_transactions` | Recent model-flag count | Can create feedback loops |

The model never accepts a seed phrase, private key, psychological diagnosis,
actual emotional state, mental-health condition, personality trait, or protected
attribute.

## Preprocessing

The fixed training split supplies all preprocessing statistics.

- Numeric inputs use a standard score based on training-split means and
  population standard deviations.
- `transaction_type` is one-hot encoded in the fixed order `BUY`, `SELL`,
  `TRANSFER`, `CONTRACT_CALL`.
- Unknown categories are rejected rather than silently mapped.
- Eighteen standardized numeric terms followed by four one-hot terms produce the
  22 exported coefficients.
- `amount_balance_ratio` should be recomputed from the validated amount and
  balance before inference.
- Missing, non-numeric, non-finite, and unsupported categorical values must fail
  validation rather than receive a score.

Exact means, scales, category order, transformed-feature order, intercept, and
coefficients are stored in `irs-model.json`. Test-set information is not used for
preprocessing.

## Candidate models and selection

Both candidates used the same fixed, stratified 75/25 split: 4,500 training rows
and 1,500 held-out test rows.

1. Logistic Regression: portable coefficients and signed local contributions.
2. Random Forest: 300 trees, maximum depth 10, minimum leaf size 5, and one CPU
   worker for deterministic comparison.

Accuracy was deliberately excluded. Candidate selection used:

```text
0.28 × ROC-AUC
+ 0.18 × Recall
+ 0.10 × Precision
+ 0.12 × F1
+ 0.20 × (1 − Brier score)
+ 0.12 × Interpretability
```

Interpretability values were 1.00 for Logistic Regression and 0.35 for Random
Forest. This is a product-design weighting, not a universally correct risk
objective. It reflects the need for inspectable local browser inference while
giving recall and calibration explicit weight.

The resulting selection scores were `0.7381395267` for Logistic Regression and
`0.6584437468` for Random Forest, so Logistic Regression was selected.

## Held-out evaluation results

All values below come from `model-metrics.json`. Classification metrics use a
0.50 probability threshold.

| Metric | Selected Logistic Regression | Random Forest comparison |
|---|---:|---:|
| ROC-AUC | 0.7808563014 | 0.7747417966 |
| Precision | 0.6769596200 | 0.7048346056 |
| Recall | 0.5307262570 | 0.5158286778 |
| F1 | 0.5949895616 | 0.5956989247 |
| False-positive rate | 0.1412253375 | 0.1204569055 |
| False-negative rate | 0.4692737430 | 0.4841713222 |
| Brier score | 0.1756283667 | 0.1765022486 |
| Expected calibration error | 0.0188096276 | 0.0292209061 |
| Selection score | 0.7381395267 | 0.6584437468 |

Selected-model confusion matrix, formatted as `[[TN, FP], [FN, TP]]`:

```text
[[827, 136],
 [252, 285]]
```

The expected calibration error uses ten equal-width probability bins; the
exported calibration curve uses ten equal-count bins. The evaluation artifact also
contains the complete ROC curve, calibration curve, score histograms, feature
importance, and threshold frontier.

### Error interpretation

At the 0.50 evaluation threshold, 136 synthetically benign rows received a flag
and 252 synthetic elevated-risk rows did not. The 46.93% false-negative rate is
material: the model must not be described as comprehensive protection. Lowering
the threshold improves synthetic recall but increases unnecessary friction.

At the exported default policy threshold of 0.80, the held-out frontier records:

- 97 of 537 positive synthetic rows intercepted (`18.0633%` protection/recall);
- 14 of 963 negative synthetic rows interrupted (`1.4538%` friction/FPR);
- 440 false negatives; and
- a `7.4%` overall intervention rate.

This demonstrates why the evaluation threshold, display bands, and user policy
threshold must remain visibly separate.

## Output and decision thresholds

Browser probability is calculated directly from the export:

```text
logit = intercept + Σ(coefficient[i] × transformed_feature[i])
probability = 1 / (1 + exp(−logit))
IRS = round(probability × 100)
```

| Probability | Display level | Model recommendation |
|---|---|---|
| 0.00 to < 0.35 | LOW | ALLOW |
| 0.35 to < 0.60 | MODERATE | ADDITIONAL_CONFIRMATION |
| 0.60 to < 0.80 | HIGH | COOLDOWN |
| 0.80 to 1.00 | CRITICAL | COOLDOWN |

These are descriptive artifact defaults. A mandatory cooldown is valid only when
the user-configured or local-contract policy requires it.

## Explainability

For each transformed input, the local signed contribution is:

```text
standardized feature value × fitted coefficient
```

Positive contributions increase synthetic elevated-risk log-odds relative to the
intercept; negative contributions reduce them. One-hot terms should be aggregated
back to `transaction_type` for display. Contributions are associational model
mechanics, not causal explanations.

The largest selected-model global importance shares, calculated from normalized
absolute standardized coefficients, are:

| Input feature | Importance share |
|---|---:|
| `amount_balance_ratio` | 0.2248467819 |
| `transaction_type` | 0.1916884572 |
| `destination_seen_before` | 0.1064931668 |
| `transactions_1h` | 0.0775934802 |
| `approval_ratio` | 0.0585463726 |

Correlated inputs—including amount, balance, and their ratio—can redistribute
coefficient magnitude. Importance does not establish that a feature caused risk
or harm.

## Known limitations

- All examples and labels are synthetic; no real user, transaction outcome,
  regret, loss, fraud, or intervention benefit was observed.
- The generator encodes designer assumptions that the candidates can learn.
- Evaluation uses one fixed holdout rather than external validation, temporal
  validation, confidence intervals, or population-level cross-validation.
- Calibration applies only to this synthetic distribution.
- Amount, balance, and ratio are correlated, which limits coefficient stability.
- Timing, destination familiarity, velocity, and contract use are ambiguous and
  can flag legitimate strategies.
- Recent model flags can feed prior model error back into later assessments.
- No real-world out-of-distribution detector, drift baseline, fairness analysis,
  adversarial validation, or subgroup validity study has been established.
- The model is not a smart-contract vulnerability scanner. A low IRS can still
  accompany a malicious call, and a high IRS can accompany a safe call.
- Browser code is inspectable and mutable; only the local contract prototype can
  demonstrate policy enforcement, and that prototype is not production safe.

## Out-of-scope and prohibited uses

Do not use this model for:

- emotion, intent, addiction, impairment, or mental-health inference;
- credit scoring, lending, insurance, employment, housing, education, pricing, or
  access to essential services;
- autonomous investment decisions or financial advice;
- fraud guarantees, destination-safety certification, or smart-contract audit;
- claims of guaranteed loss prevention, improved returns, or user rationality;
- hidden profiling, advertising, sale of behavioral history, or cross-wallet
  reputation; or
- mainnet enforcement or handling real assets without a separate evidence,
  governance, security, legal, and consent program.

## Privacy

Balances, timing, destinations, approvals, and transaction history can be
identifying even without a name. Browser Demo Mode should calculate from local
fixtures and keep derived state local by default.

Any future service should minimize data by sending derived counts and ratios
instead of unnecessary raw history or complete addresses. It must define purpose,
consent or other lawful basis, retention, deletion, access, encryption, audit, and
secondary-use controls. Seed phrases and private keys are never model inputs.
Behavioral profiles and explanations should not be written on chain.

## Responsible-AI controls

- Every dataset row and artifact identifies its synthetic origin.
- UI language must describe transaction/context proxies, never a psychological
  state or diagnosis.
- Every score should show model version, active policy, threshold, and real input
  contributions.
- Model inference and fallback inference must be visibly distinguished.
- False-positive and false-negative consequences must be presented alongside
  threshold analysis.
- Users choose protection presets and can inspect the consequences before a
  mandatory policy is applied.
- Pet state is supportive demo gamification, not detected emotion or financial
  advice.
- The PoD Discipline Index is experimental and is not a credit score.
- Metrics must be loaded from versioned artifacts rather than typed into the UI.
- Any future real-data study requires consent, data governance, privacy review,
  validity research, human review, appeal paths, and incident handling.

## Reproducibility and release evidence

The published artifacts were produced with NumPy `2.0.2`, pandas `2.3.3`, and
scikit-learn `1.6.1`. Rebuild from the repository root with:

```bash
python3 -m ml.run_pipeline
python3 -m unittest discover -s ml/tests -v
node --test tests/model-parity.test.mjs
```

Current artifact SHA-256 values:

| Artifact | SHA-256 |
|---|---|
| `irs-model.json` | `6c218cd7b0b73edf73e7ca4f07792197aa0e6d46a088dba97730804feee6e35d` |
| `model-metrics.json` | `17c74a2d9cd44d37f8963765c9879eeb18aa60e0b1510ec678a9f510c6f7ce87` |
| `model-test-vectors.json` | `721b11ad4b9dede7e2e5c1c2b7b452cf9b80bb55633353f3ed5268ff97e01786` |

The Python suite checks the versioned dataset fingerprint, byte-identical reruns,
synthetic-origin constraints, artifact checksums, and portable inference. The
dependency-free Node test independently applies the published preprocessing,
coefficient order, sigmoid, IRS rounding, and risk bands to every parity fixture
with tolerance `1e-10`.

Passing these checks establishes artifact reproducibility and implementation
parity only. It does not establish real-world validity, safety, fairness, or
financial benefit.
