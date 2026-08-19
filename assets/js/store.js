const STORAGE_KEY = "sentient-wallet-state-v2";
const STATE_VERSION = 2;

const accessoryCatalog = {
  glasses: { name: "Degen Glasses", price: 50 },
  crown: { name: "Diamond Crown", price: 200 },
  headphones: { name: "Signal-Cancel Headphones", price: 150 },
  bandana: { name: "Red Bandana", price: 100 },
  scarf: { name: "Recovery Scarf", price: 80 },
};

const initialInterventions = [
  {
    id: "sample-fomo-001",
    at: "2026-08-17T08:14:00.000Z",
    amount: 1260,
    side: "BUY",
    asset: "SENT",
    score: 86,
    level: "CRITICAL",
    reason: "FOMO concentration",
    outcome: "CANCELLED",
    sample: true,
  },
  {
    id: "sample-velocity-002",
    at: "2026-08-16T17:42:00.000Z",
    amount: 640,
    side: "BUY",
    asset: "SENT",
    score: 74,
    level: "HIGH",
    reason: "Transaction velocity",
    outcome: "COOLDOWN_COMPLETED",
    sample: true,
  },
];

function createInitialState() {
  return {
    version: STATE_VERSION,
    mode: "DEMO",
    wallet: {
      usdt: 10000,
      holdings: 0,
      rewardCredits: 240,
      address: "0x71c8…9A2e",
    },
    market: {
      asset: "SENT",
      pair: "SENT / USDT",
      price: 67.42,
      change24h: 3.84,
      volatility: 0.58,
      timeframe: "15m",
      range: "1m",
      scenario: "NORMAL",
    },
    risk: {
      score: 24,
      probability: 0.24,
      level: "LOW",
      recommendedPolicy: "REVIEW",
      drivers: [
        { feature: "amount_balance_ratio", label: "Transaction concentration", impact: 0.08 },
        { feature: "destination_seen_before", label: "Known destination", impact: -0.12 },
      ],
      assessedAt: null,
      history: [32, 28, 35, 29, 24],
    },
    model: {
      status: "LOADING",
      version: "pending",
      datasetVersion: "pending",
      selectedModel: "pending",
      trainingSamples: 0,
      metrics: null,
      fallback: false,
    },
    policy: {
      preset: "BALANCED",
      version: 1,
      threshold: 72,
      cooldownEnabled: true,
      cooldownMinutes: 15,
      demoCooldownSeconds: 15,
      frequencyEnabled: true,
      maxTransactionsHour: 4,
      amountTierEnabled: true,
      tiers: [
        { min: 0, max: 1000, label: "Instant review", delayMinutes: 0 },
        { min: 1000, max: 5000, label: "15 minute cooldown", delayMinutes: 15 },
        { min: 5000, max: null, label: "24 hour lock", delayMinutes: 1440 },
      ],
    },
    pendingTransaction: null,
    transactions: [],
    interventions: initialInterventions,
    auditLog: [
      { id: "log-1", at: "2026-08-19T01:00:00.000Z", type: "SYSTEM", text: "Deterministic demo fixture loaded" },
      { id: "log-2", at: "2026-08-19T01:00:01.000Z", type: "MODEL", text: "Waiting for exported model metadata" },
    ],
    vault: {
      allocations: { stable: 40, lending: 25, treasury: 20, cash: 15 },
      apyAssumptions: { stable: 3.8, lending: 5.4, treasury: 4.6, cash: 0 },
      simulationDays: 90,
      counterfactualLossRate: 12,
    },
    pet: {
      name: "Byte",
      level: 2,
      xp: 38,
      state: "CALM",
      form: "normal",
      owned: ["glasses"],
      equipped: [],
      disciplineStreak: 6,
      interventions: 2,
      tab: "COMPANION",
      previewAccessory: null,
    },
    discipline: {
      score: 612,
      label: "STEADY",
      components: { cancellations: 35, cooldowns: 22, overrides: 0, concentration: 26, trend: 29 },
    },
    backtest: {
      open: false,
      active: false,
      startDate: "2026-01-05",
      endDate: "2026-02-03",
      initialCapital: 10000,
      day: 0,
      usdt: 10000,
      holdings: 0,
      price: 67.42,
      trades: [],
      results: null,
      history: [],
    },
    chain: {
      network: "DEMO SIMULATION",
      connected: true,
      contract: "SIMULATED",
      contractAddress: "0xDemo…Policy",
      attestation: "SIMULATED",
      lastNonce: 2,
    },
    ui: {
      modal: null,
      guidedStep: 0,
      whyOpen: false,
      booted: false,
    },
  };
}

let state = loadState();
const listeners = new Set();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    if (parsed.version !== STATE_VERSION) return createInitialState();
    return parsed;
  } catch {
    return createInitialState();
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The demo remains usable when storage is blocked.
  }
}

function derive(next) {
  const cancelled = next.interventions.filter((item) => item.outcome === "CANCELLED").length;
  const cooldowns = next.interventions.filter((item) => item.outcome === "COOLDOWN_COMPLETED").length;
  const overrides = next.interventions.filter((item) => item.outcome === "OVERRIDDEN").length;
  const recentRisk = next.risk.history.slice(-5);
  const trend = recentRisk.length ? recentRisk.reduce((sum, value) => sum + value, 0) / recentRisk.length : 50;
  const concentration = Math.max(0, 50 - Math.round((next.risk.score || 0) / 2));
  const score = Math.max(
    0,
    Math.min(1000, Math.round(500 + cancelled * 35 + cooldowns * 22 - overrides * 45 + concentration + (50 - trend))),
  );
  next.discipline = {
    score,
    label: score >= 760 ? "DISCIPLINED" : score >= 600 ? "STEADY" : score >= 450 ? "BUILDING" : "AT RISK",
    components: {
      cancellations: cancelled * 35,
      cooldowns: cooldowns * 22,
      overrides: overrides * -45,
      concentration,
      trend: Math.round(50 - trend),
    },
  };

  const scoreNow = next.risk.score || 0;
  const latestOutcome = next.interventions[0]?.outcome;
  let petState = "CALM";
  let form = "normal";
  if (next.pendingTransaction) {
    petState = "ALERT";
    form = "stressed";
  } else if (["CANCELLED", "COOLDOWN_COMPLETED"].includes(latestOutcome)) {
    petState = "DISCIPLINED";
    form = "happy";
  } else if (scoreNow >= 85) {
    petState = "STRESSED";
    form = "stressed";
  } else if (scoreNow >= 65) {
    petState = "CAUTIOUS";
    form = "normal";
  } else if (recentRisk.length > 1 && recentRisk.at(-1) < recentRisk.at(-2)) {
    petState = "RECOVERING";
    form = "happy";
  }
  next.pet.state = petState;
  next.pet.form = form;
  next.pet.level = Math.max(1, 1 + Math.floor(next.pet.xp / 100));
  next.pet.interventions = next.interventions.length;
  return next;
}

export function getState() {
  return state;
}

export function updateState(mutator, options = {}) {
  const next = clone(state);
  mutator(next);
  state = derive(next);
  if (options.persist !== false) persist();
  listeners.forEach((listener) => listener(state));
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetDemo() {
  state = derive(createInitialState());
  persist();
  listeners.forEach((listener) => listener(state));
  return state;
}

export function addAudit(text, type = "SYSTEM") {
  updateState((next) => {
    next.auditLog.unshift({ id: createId("log"), at: new Date().toISOString(), type, text });
    next.auditLog = next.auditLog.slice(0, 30);
  });
}

export function setModel(modelPatch) {
  updateState((next) => {
    next.model = { ...next.model, ...modelPatch };
    next.auditLog.unshift({
      id: createId("log"),
      at: new Date().toISOString(),
      type: "MODEL",
      text: modelPatch.fallback ? "Recovery heuristic active" : `Model ${modelPatch.version || "ready"} loaded`,
    });
  });
}

export function setRisk(result) {
  updateState((next) => {
    next.risk = {
      ...next.risk,
      score: result.irs_score,
      probability: result.risk_probability,
      level: result.risk_level,
      recommendedPolicy: result.recommended_policy,
      drivers: result.top_drivers,
      assessedAt: new Date().toISOString(),
      history: [...next.risk.history, result.irs_score].slice(-24),
    };
    next.auditLog.unshift({
      id: createId("log"),
      at: new Date().toISOString(),
      type: "RISK",
      text: `Assessment complete · IRS ${result.irs_score} · ${result.risk_level}`,
    });
  });
}

export function applyPolicyPreset(name) {
  const presets = {
    CONSERVATIVE: { threshold: 84, cooldownMinutes: 5, maxTransactionsHour: 8 },
    BALANCED: { threshold: 72, cooldownMinutes: 15, maxTransactionsHour: 4 },
    PROTECTIVE: { threshold: 58, cooldownMinutes: 30, maxTransactionsHour: 2 },
  };
  if (!presets[name]) return;
  updateState((next) => {
    next.policy = { ...next.policy, ...presets[name], preset: name, version: next.policy.version + 1 };
    next.auditLog.unshift({ id: createId("log"), at: new Date().toISOString(), type: "POLICY", text: `${name} policy activated` });
  });
}

export function updatePolicy(patch) {
  updateState((next) => {
    next.policy = { ...next.policy, ...patch, preset: "CUSTOM", version: next.policy.version + 1 };
  });
}

export function createPendingTransaction(transaction, riskResult, decision) {
  const eventId = createId("intervention");
  updateState((next) => {
    next.pendingTransaction = {
      ...transaction,
      id: createId("pending"),
      eventId,
      createdAt: Date.now(),
      deadline: null,
      status: "AWAITING_DECISION",
      decision,
      risk: riskResult,
    };
    next.interventions.unshift({
      id: eventId,
      at: new Date().toISOString(),
      amount: transaction.amount,
      side: transaction.side,
      asset: next.market.asset,
      score: riskResult.irs_score,
      level: riskResult.risk_level,
      reason: riskResult.top_drivers?.[0]?.label || "Policy threshold",
      outcome: "PENDING",
      sample: false,
    });
    next.pet.xp += 8;
    next.ui.modal = "INTERVENTION";
    next.ui.guidedStep = next.ui.guidedStep ? 3 : 0;
  });
}

export function beginCooldown() {
  updateState((next) => {
    if (!next.pendingTransaction) return;
    const seconds = next.mode === "DEMO" ? next.policy.demoCooldownSeconds : next.policy.cooldownMinutes * 60;
    next.pendingTransaction.status = "COOLDOWN";
    next.pendingTransaction.deadline = Date.now() + seconds * 1000;
    next.ui.modal = null;
    next.ui.guidedStep = next.ui.guidedStep ? 4 : 0;
    next.auditLog.unshift({ id: createId("log"), at: new Date().toISOString(), type: "POLICY", text: `${seconds}s demo cooldown queued` });
  });
}

function updateInterventionOutcome(next, eventId, outcome) {
  const event = next.interventions.find((item) => item.id === eventId);
  if (event && event.outcome === "PENDING") event.outcome = outcome;
}

export function cancelPending() {
  updateState((next) => {
    if (!next.pendingTransaction) return;
    updateInterventionOutcome(next, next.pendingTransaction.eventId, "CANCELLED");
    next.pet.xp += 22;
    next.pet.disciplineStreak += 1;
    next.auditLog.unshift({
      id: createId("log"),
      at: new Date().toISOString(),
      type: "DISCIPLINE",
      text: `$${next.pendingTransaction.amount.toFixed(2)} retained · no assets moved`,
    });
    next.pendingTransaction = null;
    next.ui.modal = null;
    next.ui.guidedStep = next.ui.guidedStep ? 5 : 0;
  });
}

function applyTrade(next, transaction, source = "DIRECT") {
  const value = Number(transaction.amount);
  const units = value / next.market.price;
  if (transaction.side === "BUY") {
    if (value > next.wallet.usdt) throw new Error("Insufficient USDT balance");
    next.wallet.usdt -= value;
    next.wallet.holdings += units;
  } else {
    if (units > next.wallet.holdings) throw new Error("Insufficient SENT holdings");
    next.wallet.holdings -= units;
    next.wallet.usdt += value;
  }
  next.transactions.unshift({
    id: createId("trade"),
    at: new Date().toISOString(),
    side: transaction.side,
    amount: value,
    units,
    price: next.market.price,
    source,
  });
  next.auditLog.unshift({ id: createId("log"), at: new Date().toISOString(), type: "TRADE", text: `${transaction.side} ${units.toFixed(4)} SENT · $${value.toFixed(2)}` });
}

export function executeTrade(transaction, source = "DIRECT") {
  let error = null;
  updateState((next) => {
    try {
      applyTrade(next, transaction, source);
    } catch (caught) {
      error = caught;
    }
  });
  if (error) throw error;
}

export function executePending() {
  let error = null;
  updateState((next) => {
    if (!next.pendingTransaction) {
      error = new Error("No pending transaction");
      return;
    }
    if (next.pendingTransaction.deadline && Date.now() < next.pendingTransaction.deadline) {
      error = new Error("Cooldown is still active");
      return;
    }
    try {
      applyTrade(next, next.pendingTransaction, "COOLDOWN");
      updateInterventionOutcome(next, next.pendingTransaction.eventId, "COOLDOWN_COMPLETED");
      next.pet.xp += 12;
      next.pendingTransaction = null;
    } catch (caught) {
      error = caught;
    }
  });
  if (error) throw error;
}

export function proceedWithConfirmation() {
  let error = null;
  updateState((next) => {
    if (!next.pendingTransaction) {
      error = new Error("No pending transaction");
      return;
    }
    if (next.pendingTransaction.decision.mandatory) {
      error = new Error("The active policy requires a cooldown");
      return;
    }
    try {
      applyTrade(next, next.pendingTransaction, "CONFIRMED_OVERRIDE");
      updateInterventionOutcome(next, next.pendingTransaction.eventId, "OVERRIDDEN");
      next.pendingTransaction = null;
      next.ui.modal = null;
    } catch (caught) {
      error = caught;
    }
  });
  if (error) throw error;
}

export function closeModal() {
  updateState((next) => {
    next.ui.modal = null;
  });
}

export function setMarket(patch) {
  updateState((next) => {
    next.market = { ...next.market, ...patch };
  });
}

export function setPetTab(tab) {
  updateState((next) => {
    next.pet.tab = tab;
  });
}

export function previewAccessory(item) {
  updateState((next) => {
    next.pet.previewAccessory = item === "none" ? null : item;
  });
}

export function purchaseAccessory(item) {
  const catalogItem = accessoryCatalog[item];
  if (!catalogItem) throw new Error("Unknown accessory");
  let error = null;
  updateState((next) => {
    if (next.pet.owned.includes(item)) return;
    if (next.wallet.rewardCredits < catalogItem.price) {
      error = new Error("Not enough demo reward credits");
      return;
    }
    next.wallet.rewardCredits -= catalogItem.price;
    next.pet.owned.push(item);
    next.pet.previewAccessory = item;
  });
  if (error) throw error;
}

export function applyAccessory(item) {
  updateState((next) => {
    if (!item) {
      next.pet.equipped = [];
      return;
    }
    if (!next.pet.owned.includes(item)) return;
    next.pet.equipped = [item];
  });
}

export function setGuidedStep(step) {
  updateState((next) => {
    next.ui.guidedStep = step;
    if (step === 1) next.market.scenario = "FOMO";
  });
}

export function vaultMetrics(current = state) {
  const cancelled = current.interventions.filter((item) => item.outcome === "CANCELLED");
  const retained = cancelled.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const weightedApy = Object.entries(current.vault.allocations).reduce((sum, [key, percent]) => {
    return sum + (percent / 100) * (current.vault.apyAssumptions[key] || 0);
  }, 0);
  const illustrativeYield = retained * (weightedApy / 100) * (current.vault.simulationDays / 365);
  return { retained, weightedApy, illustrativeYield, cancelledCount: cancelled.length };
}

export function totalAssetValue(current = state) {
  return current.wallet.usdt + current.wallet.holdings * current.market.price;
}

export { accessoryCatalog };
