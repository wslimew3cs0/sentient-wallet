import {
  addAudit,
  createPendingTransaction,
  executeTrade,
  getState,
  setMarket,
  setRisk,
} from "../store.js";
import { assessTransaction, evaluatePolicy } from "../ml-client.js";
import { simulateAttestation } from "../blockchain.js";
import { renderCandlestickChart } from "../charts.js";
import {
  finishSimulation,
  nextSimulationDay,
  openSimulation,
  resetSimulation,
  simulationTrade,
  startSimulation,
} from "../simulation.js";
import { money, number, petMarkup, riskClass, statusBadge } from "../ui.js";

const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d", "1w", "1mo"];
const ranges = ["1m", "3m", "6m", "1y", "all"];
const scenarios = [
  ["NORMAL", "Normal flow"],
  ["FOMO", "FOMO spike"],
  ["VOLATILITY", "Volatility"],
  ["NEW_DAPP", "New dApp"],
  ["RAPID", "Rapid repeat"],
];

function remainingSeconds(pending) {
  if (!pending?.deadline) return 0;
  return Math.max(0, Math.ceil((pending.deadline - Date.now()) / 1000));
}

function renderGuided(state) {
  if (!state.ui.guidedStep) return "";
  const copy = {
    1: ["01", "FOMO scenario loaded", "Review the prefilled high-concentration transaction, then run the deterministic assessment."],
    2: ["02", "Assessment ready", "The model will score the transaction using the exported coefficients and current policy."],
    3: ["03", "Intervention triggered", "Inspect the actual risk drivers in the intervention panel."],
    4: ["04", "Cooldown active", "Observe the policy queue, then cancel to retain the capital."],
    5: ["05", "Discipline event recorded", "Open Vault and Pet Space to see the shared-state effects."],
  }[state.ui.guidedStep];
  if (!copy) return "";
  return `<div class="guided-strip"><span>${copy[0]}</span><div><strong>${copy[1]}</strong><p>${copy[2]}</p></div>${state.ui.guidedStep === 5 ? '<div class="guided-links"><a href="#vault">Vault impact</a><a href="#pet">Pet response</a></div>' : ""}</div>`;
}

function renderPending(state) {
  const pending = state.pendingTransaction;
  if (!pending) return "";
  const remaining = remainingSeconds(pending);
  return `<div class="pending-strip ${pending.status === "COOLDOWN" ? "active" : ""}">
    <div><span class="kicker">PROGRAMMABLE POLICY QUEUE</span><strong>${pending.side} ${money(pending.amount)} · IRS ${pending.risk.irs_score}</strong></div>
    <div class="countdown"><span>${pending.status === "COOLDOWN" ? "DEMO COOLDOWN" : "DECISION REQUIRED"}</span><strong>${pending.status === "COOLDOWN" ? `00:${String(remaining).padStart(2, "0")}` : "—"}</strong></div>
    <div class="pending-actions">
      <button class="text-button danger" data-global-action="cancel-pending">Abandon transaction</button>
      ${pending.status === "COOLDOWN" ? `<button class="small-button" data-global-action="execute-pending" ${remaining > 0 ? "disabled" : ""}>Execute after cooldown</button>` : '<button class="small-button" data-global-action="open-intervention">Review intervention</button>'}
    </div>
  </div>`;
}

function renderRiskDrivers(state) {
  if (!state.risk.drivers?.length) return '<p class="muted">Assess a transaction to see contributing features.</p>';
  return `<div class="driver-list">${state.risk.drivers
    .map((driver, index) => `<div class="driver-row"><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${driver.label}</strong><small>${driver.impact >= 0 ? "Risk increasing" : "Risk reducing"}</small></div><b class="${driver.impact >= 0 ? "danger-text" : "safe-text"}">${driver.impact >= 0 ? "+" : ""}${Number(driver.impact).toFixed(2)}</b></div>`)
    .join("")}</div>`;
}

function renderSimulation(state) {
  const sim = state.backtest;
  if (!sim.open) return "";
  const finalAssets = sim.usdt + sim.holdings * sim.price;
  return `<aside class="simulation-drawer" aria-label="Behavioral Trading Simulation">
    <div class="drawer-heading"><div><span class="kicker">SIMULATION ONLY</span><h2>Behavioral Trading Simulation</h2></div><button class="icon-button" data-sim="close" aria-label="Close simulation">×</button></div>
    ${!sim.active && !sim.results ? `<div class="simulation-setup">
      <p>Compare baseline behavior and the Sentient policy on the same deterministic 30-day market path.</p>
      <label>Start date<input id="sim-start" type="date" value="${sim.startDate}"></label>
      <label>End date<input id="sim-end" type="date" value="${sim.endDate}"></label>
      <label>Initial capital<input id="sim-capital" type="number" min="100" value="${sim.initialCapital}"></label>
      <button class="primary-button full" data-sim="start">Start simulation</button>
      <div class="sim-history"><span>Session history</span><strong>${sim.history.length} runs</strong></div>
    </div>` : ""}
    ${sim.active ? `<div class="simulation-active">
      <div class="sim-day"><span>DAY ${sim.day + 1} / ${sim.path.length}</span><strong>${money(sim.price)}</strong></div>
      <div class="sim-wallet"><div><span>Available</span><strong>${money(sim.usdt)}</strong></div><div><span>Holdings</span><strong>${number(sim.holdings, 4)}</strong></div><div><span>Assets</span><strong>${money(finalAssets)}</strong></div></div>
      <label>Trade value<input id="sim-amount" type="number" min="1" value="500"></label>
      <div class="button-pair"><button class="buy-button" data-sim="buy">Buy</button><button class="sell-button" data-sim="sell">Sell</button></div>
      <button class="small-button full" data-sim="next">Next day →</button>
      <button class="text-button full" data-sim="finish">End and compare policies</button>
      <div class="trade-log">${sim.trades.slice(0, 5).map((trade) => `<span><b>${trade.side}</b> ${money(trade.amount)} · day ${trade.day}</span>`).join("") || "No trades yet"}</div>
    </div>` : ""}
    ${sim.results ? `<div class="simulation-results">
      <span class="kicker">SAME PATH · TWO POLICIES</span>
      <div class="result-compare"><article><span>Baseline behavior</span><strong>${money(sim.results.baselineFinal)}</strong><small>${sim.results.baselineRoi.toFixed(2)}% ROI</small></article><article class="policy"><span>Sentient policy</span><strong>${money(sim.results.policyFinal)}</strong><small>${sim.results.policyRoi.toFixed(2)}% ROI</small></article></div>
      <div class="result-grid"><span>Trades<b>${sim.results.trades}</b></span><span>Interventions<b>${sim.results.interventions}</b></span><span>Cancelled<b>${sim.results.cancelled}</b></span><span>Friction count<b>${sim.results.frictionCount}</b></span></div>
      <div class="sim-disclaimer">Illustrative loss avoided: <strong>${money(sim.results.simulatedLossAvoided)}</strong>. This deterministic simulation is not evidence of future returns.</div>
      <button class="small-button full" data-sim="reset">Run another simulation</button>
    </div>` : ""}
  </aside>`;
}

export function renderExchange(state) {
  const suggestedAmount = state.ui.guidedStep >= 1 && state.ui.guidedStep <= 4 ? 6800 : 1000;
  const modelTone = state.model.fallback ? "danger" : state.model.status === "ML MODEL READY" ? "safe" : "warning";
  return `<section class="view exchange-view" aria-labelledby="exchange-title">
    ${renderGuided(state)}
    ${renderPending(state)}
    <div class="view-heading exchange-heading">
      <div><span class="eyebrow">TRADING TERMINAL · SIMULATED MARKET</span><h1 id="exchange-title">${state.market.pair}</h1></div>
      <div class="ticker"><strong>${money(state.market.price)}</strong><span class="safe-text">+${state.market.change24h}%</span></div>
      <div class="heading-actions">${statusBadge(state.model.status, modelTone)}<button class="small-button" data-action="toggle-simulation">Behavioral simulation</button></div>
    </div>

    <div class="scenario-rail" aria-label="Deterministic market scenarios"><span>SCENARIO</span>${scenarios.map(([value, label]) => `<button class="scenario-chip ${state.market.scenario === value ? "active" : ""}" data-scenario="${value}">${label}</button>`).join("")}</div>

    <div class="terminal-grid">
      <aside class="terminal-side companion-side">
        <div class="terminal-label"><span>NEURAL COMPANION</span><b>LVL ${state.pet.level}</b></div>
        <div class="mini-companion">${petMarkup(state, "medium")}<strong>${state.pet.state}</strong><p>${state.pet.state === "DISCIPLINED" ? "Policy signal stable. Keep the pause deliberate." : "I translate risk signals—not emotions."}</p></div>
        <div class="irs-block ${riskClass(state.risk.level)}">
          <div><span>IMPULSE RISK SCORE</span><strong>${state.risk.score}<small>/100</small></strong></div>
          <div class="risk-track"><i style="width:${state.risk.score}%"></i><b style="left:${state.policy.threshold}%"></b></div>
          <div class="irs-meta"><span>${state.risk.level}</span><span>Block threshold ${state.policy.threshold}</span></div>
        </div>
        <details class="why-score" ${state.ui.whyOpen ? "open" : ""}><summary>WHY THIS SCORE?</summary>${renderRiskDrivers(state)}</details>
        <div class="system-log"><div class="terminal-label"><span>SYSTEM LOG</span><i></i></div>${state.auditLog.slice(0, 7).map((log) => `<p><time>${new Date(log.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time><span>${log.text}</span></p>`).join("")}</div>
      </aside>

      <div class="market-panel">
        <div class="chart-controls"><div><span>TIMEFRAME</span>${timeframes.map((item) => `<button data-timeframe="${item}" class="${state.market.timeframe === item ? "active" : ""}">${item}</button>`).join("")}</div><div><span>RANGE</span>${ranges.map((item) => `<button data-range="${item}" class="${state.market.range === item ? "active" : ""}">${item}</button>`).join("")}</div></div>
        ${renderCandlestickChart(state)}
        <div class="market-condition"><div><span>MARKET CONDITION</span><strong>${state.market.scenario === "NORMAL" ? "ORDERLY" : state.market.scenario.replaceAll("_", " ")}</strong></div><div><span>SIMULATED VOLATILITY</span><strong>${Math.round(state.market.volatility * 100)}%</strong></div><div><span>ATTESTATION</span><strong>${state.chain.attestation}</strong></div></div>
      </div>

      <aside class="terminal-side order-side">
        <div class="ticket-tabs"><button class="active">Market</button><button disabled>Limit · roadmap</button></div>
        <label class="trade-input"><span>Transaction value</span><div><b>$</b><input id="trade-amount" type="number" min="1" step="1" value="${suggestedAmount}" aria-label="Transaction value in USDT"><em>USDT</em></div></label>
        <div class="amount-buttons">${[25, 50, 75, 100].map((value) => `<button data-percent="${value}">${value}%</button>`).join("")}</div>
        <div class="balance-line"><span>Available USDT</span><strong>${money(state.wallet.usdt)}</strong></div>
        <div class="balance-line"><span>SENT holdings</span><strong>${number(state.wallet.holdings, 4)} · ${money(state.wallet.holdings * state.market.price)}</strong></div>
        <button class="buy-button trade-button" data-side="BUY"><span>Assess + Buy</span><small>Runs model before execution</small></button>
        <button class="sell-button trade-button" data-side="SELL"><span>Assess + Sell</span><small>Balance validation applies</small></button>
        <div class="policy-card"><span class="kicker">ACTIVE POLICY</span><div><strong>${state.policy.preset}</strong><b>v${state.policy.version}</b></div><p>IRS ≥ ${state.policy.threshold} · ${state.policy.cooldownMinutes}m configured cooldown · ${state.policy.maxTransactionsHour}/hour</p><a href="#settings">Edit policy →</a></div>
        <div class="truth-note"><strong>DEMO MODE</strong><p>Market data, wallet values and chain responses are simulated. The browser risk score is deterministic model inference when the model is ready.</p></div>
      </aside>
    </div>
    ${renderSimulation(state)}
  </section>`;
}

function runAssessment(side, context) {
  const input = document.querySelector("#trade-amount");
  const amount = Number(input?.value);
  const state = getState();
  if (!Number.isFinite(amount) || amount <= 0) return context.toast("Enter a valid transaction value.", "danger");
  if (side === "BUY" && amount > state.wallet.usdt) return context.toast("Transaction exceeds the available USDT balance.", "danger");
  if (side === "SELL" && amount > state.wallet.holdings * state.market.price) return context.toast("Transaction exceeds the current SENT holdings.", "danger");

  const result = assessTransaction(state, amount, side);
  const decision = evaluatePolicy(state, amount, result);
  setRisk(result);
  const attestation = simulateAttestation(state, { side, amount }, result);
  addAudit(`Attestation ${attestation.transactionHash} · ${attestation.status}`, "CHAIN");
  if (decision.mandatory || result.irs_score >= 40) {
    createPendingTransaction({ side, amount }, result, decision);
    context.toast(decision.mandatory ? "Policy intervention queued." : "Additional confirmation required.", "warning");
    return;
  }
  try {
    executeTrade({ side, amount });
    context.toast(`${side === "BUY" ? "Purchase" : "Sale"} executed after low-risk review.`, "safe");
  } catch (error) {
    context.toast(error.message, "danger");
  }
}

export function bindExchange(root, context) {
  root.querySelectorAll("[data-timeframe]").forEach((button) => button.addEventListener("click", () => setMarket({ timeframe: button.dataset.timeframe })));
  root.querySelectorAll("[data-range]").forEach((button) => button.addEventListener("click", () => setMarket({ range: button.dataset.range })));
  root.querySelectorAll("[data-scenario]").forEach((button) => button.addEventListener("click", () => {
    const scenario = button.dataset.scenario;
    const volatility = scenario === "NORMAL" ? 0.58 : scenario === "FOMO" ? 0.92 : scenario === "VOLATILITY" ? 0.97 : 0.68;
    setMarket({ scenario, volatility });
    context.toast(`${button.textContent.trim()} fixture loaded.`, "neutral");
  }));
  root.querySelectorAll("[data-percent]").forEach((button) => button.addEventListener("click", () => {
    const state = getState();
    const input = root.querySelector("#trade-amount");
    if (input) input.value = String(Math.floor(state.wallet.usdt * Number(button.dataset.percent) / 100));
  }));
  root.querySelectorAll("[data-side]").forEach((button) => button.addEventListener("click", () => runAssessment(button.dataset.side, context)));
  root.querySelector('[data-action="toggle-simulation"]')?.addEventListener("click", () => openSimulation(!getState().backtest.open));

  root.querySelector('[data-sim="close"]')?.addEventListener("click", () => openSimulation(false));
  root.querySelector('[data-sim="start"]')?.addEventListener("click", () => startSimulation({ initialCapital: root.querySelector("#sim-capital")?.value }));
  root.querySelector('[data-sim="buy"]')?.addEventListener("click", () => {
    try { simulationTrade("BUY", root.querySelector("#sim-amount")?.value); } catch (error) { context.toast(error.message, "danger"); }
  });
  root.querySelector('[data-sim="sell"]')?.addEventListener("click", () => {
    try { simulationTrade("SELL", root.querySelector("#sim-amount")?.value); } catch (error) { context.toast(error.message, "danger"); }
  });
  root.querySelector('[data-sim="next"]')?.addEventListener("click", nextSimulationDay);
  root.querySelector('[data-sim="finish"]')?.addEventListener("click", () => { finishSimulation(); context.toast("Policy comparison calculated from the deterministic path.", "safe"); });
  root.querySelector('[data-sim="reset"]')?.addEventListener("click", resetSimulation);
}
