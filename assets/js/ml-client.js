const MODEL_URL = new URL("../models/irs-model.json", import.meta.url);
const METADATA_URL = new URL("../models/model-metadata.json", import.meta.url);
const METRICS_URL = new URL("../models/model-metrics.json", import.meta.url);

let model = null;
let metadata = null;
let metrics = null;
let fallbackActive = false;

const fallbackModel = {
  version: "recovery-1",
  intercept: -1.75,
  coefficients: {
    amount_balance_ratio: 2.9,
    transactions_1h: 0.22,
    transactions_24h: 0.035,
    market_volatility: 1.05,
    asset_volatility: 0.85,
    portfolio_drawdown: 1.4,
    destination_seen_before: -0.75,
    destination_age_days: -0.002,
    contract_interaction: 0.35,
    approval_ratio: 0.8,
    estimated_slippage: 4.2,
    weekend: 0.14,
    recent_cancelled_transactions: 0.08,
    recent_high_risk_transactions: 0.24,
  },
};

const labels = {
  amount_balance_ratio: "Transaction relative to available balance",
  transactions_1h: "Transactions initiated within one hour",
  transactions_24h: "Transactions initiated within 24 hours",
  time_since_previous_transaction: "Time since the previous transaction",
  market_volatility: "Simulated market volatility",
  asset_volatility: "Asset volatility",
  portfolio_drawdown: "Recent portfolio drawdown",
  destination_seen_before: "Destination familiarity",
  destination_age_days: "Destination account age",
  contract_interaction: "Smart-contract interaction",
  approval_ratio: "Approval relative to transaction value",
  estimated_slippage: "Estimated slippage",
  hour_of_day: "Transaction time",
  weekend: "Weekend activity",
  recent_cancelled_transactions: "Recent cancelled transactions",
  recent_high_risk_transactions: "Recent high-risk assessments",
  transaction_amount: "Transaction amount",
  wallet_balance: "Available wallet balance",
};

function sigmoid(value) {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const exp = Math.exp(value);
  return exp / (1 + exp);
}

async function fetchOptional(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${url.pathname}`);
  return response.json();
}

export async function loadRiskModel() {
  try {
    const [loadedModel, loadedMetadata] = await Promise.all([fetchOptional(MODEL_URL), fetchOptional(METADATA_URL)]);
    model = loadedModel;
    metadata = loadedMetadata;
    try {
      metrics = await fetchOptional(METRICS_URL);
    } catch {
      metrics = loadedMetadata.metrics || loadedModel.metrics || null;
    }
    fallbackActive = false;
  } catch (error) {
    model = fallbackModel;
    metadata = { model_version: fallbackModel.version, dataset_version: "not-loaded", selected_model: "Recovery heuristic", training_samples: 0 };
    metrics = null;
    fallbackActive = true;
    console.warn("Sentient Wallet model recovery mode:", error);
  }
  return modelStatus();
}

export function modelStatus() {
  const version = model?.model_version || model?.version || metadata?.model_version || "unknown";
  const selectedModel = model?.selected_model || model?.model_name || metadata?.selected_model || metadata?.model_name || "Logistic Regression";
  const trainingSamples = Number(metadata?.dataset?.row_count || metadata?.training_samples || metadata?.training_sample_size || model?.training_samples || 0);
  return {
    status: fallbackActive ? "FALLBACK MODE" : "ML MODEL READY",
    fallback: fallbackActive,
    version,
    datasetVersion: metadata?.dataset_version || model?.dataset_version || "synthetic-v1",
    selectedModel,
    trainingSamples,
    metrics: metrics || metadata?.metrics || model?.metrics || null,
  };
}

export function buildFeatures(state, amount, side = "BUY") {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const scenario = state.market.scenario;
  const scenarioBoost = scenario === "FOMO" ? 4 : scenario === "RAPID" ? 6 : 0;
  const volatilityBoost = scenario === "VOLATILITY" || scenario === "FOMO" ? 0.34 : 0;
  const destinationSeen = scenario === "NEW_DAPP" || scenario === "FOMO" ? 0 : 1;
  const recentTransactions = state.transactions.filter((item) => new Date(item.at).getTime() >= oneHourAgo).length;
  const dayTransactions = state.transactions.filter((item) => new Date(item.at).getTime() >= oneDayAgo).length;
  const lastAt = state.transactions[0]?.at ? new Date(state.transactions[0].at).getTime() : now - 7200000;
  const hour = new Date().getHours();
  const weekend = [0, 6].includes(new Date().getDay()) ? 1 : 0;
  const balance = side === "BUY" ? state.wallet.usdt : Math.max(state.wallet.holdings * state.market.price, 1);
  return {
    transaction_type: side,
    transaction_amount: Number(amount),
    wallet_balance: Math.max(balance, 1),
    amount_balance_ratio: Math.min(Number(amount) / Math.max(balance, 1), 2),
    transactions_1h: recentTransactions + scenarioBoost,
    transactions_24h: dayTransactions + scenarioBoost * 2 + 1,
    time_since_previous_transaction: Math.max(0, (now - lastAt) / 60000),
    market_volatility: Math.min(1, state.market.volatility + volatilityBoost),
    asset_volatility: Math.min(1, state.market.volatility * 0.84 + volatilityBoost),
    portfolio_drawdown: scenario === "FOMO" ? 0.24 : scenario === "VOLATILITY" ? 0.18 : 0.03,
    destination_seen_before: destinationSeen,
    destination_age_days: destinationSeen ? 180 : 2,
    contract_interaction: side === "BUY" ? 1 : 0,
    approval_ratio: scenario === "NEW_DAPP" ? 1.5 : 1,
    estimated_slippage: scenario === "VOLATILITY" || scenario === "FOMO" ? 0.065 : 0.008,
    hour_of_day: hour,
    weekend,
    recent_cancelled_transactions: state.interventions.filter((item) => item.outcome === "CANCELLED").length,
    recent_high_risk_transactions: state.interventions.filter((item) => item.score >= state.policy.threshold).length,
  };
}

function normalizeFeature(name, value, activeModel) {
  const preprocessing = activeModel.preprocessing?.numeric || activeModel.preprocessing || activeModel.scaler || {};
  const means = preprocessing.means || preprocessing.mean || activeModel.feature_means || {};
  const scales = preprocessing.scales || preprocessing.scale || activeModel.feature_scales || {};
  const mean = Array.isArray(means) ? means[(activeModel.feature_order || activeModel.features || []).indexOf(name)] : means[name];
  const scale = Array.isArray(scales) ? scales[(activeModel.feature_order || activeModel.features || []).indexOf(name)] : scales[name];
  if (Number.isFinite(mean) && Number.isFinite(scale) && scale !== 0) return (value - mean) / scale;
  return value;
}

function coefficientMap(activeModel) {
  const modelBlock = activeModel.model || activeModel;
  if (modelBlock.coefficients && !Array.isArray(modelBlock.coefficients)) return modelBlock.coefficients;
  const order = modelBlock.coefficient_feature_order || activeModel.feature_order || activeModel.features || activeModel.numeric_features || [];
  const values = Array.isArray(modelBlock.coefficients?.[0]) ? modelBlock.coefficients[0] : modelBlock.coefficients || activeModel.coef || [];
  return Object.fromEntries(order.map((name, index) => [name, Number(values[index] || 0)]));
}

function calculate(features) {
  const activeModel = model || fallbackModel;
  const coefficients = coefficientMap(activeModel);
  const modelBlock = activeModel.model || activeModel;
  let logit = Number(modelBlock.intercept?.[0] ?? modelBlock.intercept ?? activeModel.bias ?? -1.5);
  const contributionMap = new Map();
  Object.entries(coefficients).forEach(([name, coefficient]) => {
    const [source, category] = name.split("=");
    if (!(source in features)) return;
    const normalized = category ? (String(features[source]) === category ? 1 : 0) : normalizeFeature(source, Number(features[source]), activeModel);
    const contribution = Number(coefficient) * normalized;
    logit += contribution;
    const previous = contributionMap.get(source) || 0;
    contributionMap.set(source, previous + contribution);
  });
  const probability = Math.max(0.01, Math.min(0.99, sigmoid(logit)));
  const contributions = [...contributionMap.entries()].map(([feature, impact]) => ({
    feature,
    label: labels[feature] || feature.replaceAll("_", " "),
    impact,
  }));
  contributions.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  return { probability, contributions };
}

export function assessTransaction(state, amount, side = "BUY") {
  const features = buildFeatures(state, amount, side);
  const { probability, contributions } = calculate(features);
  const score = Math.floor(probability * 100 + 0.5);
  const band = model?.output?.risk_bands?.find((item) => probability >= item.minimum && probability < item.maximum_exclusive);
  const riskLevel = band?.level || (score >= 85 ? "CRITICAL" : score >= 65 ? "HIGH" : score >= 40 ? "MODERATE" : "LOW");
  const recommendedPolicy = band?.recommended_policy || (score >= 65 ? "COOLDOWN" : score >= 40 ? "ADDITIONAL_CONFIRMATION" : "ALLOW");
  return {
    irs_score: score,
    risk_probability: Number(probability.toFixed(4)),
    risk_level: riskLevel,
    recommended_policy: recommendedPolicy,
    top_drivers: contributions.slice(0, 6).map((item) => ({ ...item, impact: Number(item.impact.toFixed(4)) })),
    model_version: modelStatus().version,
    features,
  };
}

export function evaluatePolicy(state, amount, riskResult) {
  const policy = state.policy;
  const applicableTier = policy.tiers.find((tier) => amount >= tier.min && (tier.max == null || amount < tier.max));
  const recentHour = riskResult.features.transactions_1h;
  const thresholdTriggered = riskResult.irs_score >= policy.threshold;
  const frequencyTriggered = policy.frequencyEnabled && recentHour >= policy.maxTransactionsHour;
  const tierDelay = policy.amountTierEnabled ? Number(applicableTier?.delayMinutes || 0) : 0;
  const delayMinutes = Math.max(thresholdTriggered && policy.cooldownEnabled ? policy.cooldownMinutes : 0, frequencyTriggered ? policy.cooldownMinutes : 0, tierDelay);
  const mandatory = delayMinutes > 0;
  return {
    mandatory,
    delayMinutes,
    thresholdTriggered,
    frequencyTriggered,
    amountTier: applicableTier?.label || "Manual review",
    reasons: [
      thresholdTriggered && `IRS ${riskResult.irs_score} crossed threshold ${policy.threshold}`,
      frequencyTriggered && `${recentHour} transactions within one hour crossed the ${policy.maxTransactionsHour} limit`,
      tierDelay > 0 && `${applicableTier.label} applies to this amount`,
    ].filter(Boolean),
  };
}

export function getModelArtifacts() {
  return { model, metadata, metrics, fallbackActive };
}
