import { setGuidedStep, totalAssetValue, vaultMetrics } from "../store.js";
import { renderRiskBars } from "../charts.js";
import { implementationTag, money, petMarkup, riskClass, statusBadge } from "../ui.js";

export function renderOverview(state) {
  const vault = vaultMetrics(state);
  const latest = state.interventions.slice(0, 3);
  const modelTone = state.model.fallback ? "danger" : state.model.status === "ML MODEL READY" ? "safe" : "warning";
  return `<section class="view overview-view" aria-labelledby="overview-title">
    <div class="hero-grid">
      <div class="hero-copy">
        <div class="eyebrow">AI BEHAVIORAL RISK · PROGRAMMABLE WALLET</div>
        <h1 id="overview-title">A deliberate pause<br><span>before irreversible action.</span></h1>
        <p>Sentient Wallet combines explainable machine-learning risk signals with configurable transaction friction—so high-risk digital-asset decisions receive proportionate review before execution.</p>
        <div class="hero-actions">
          <button class="primary-button" data-action="start-guided">Run guided demo <span>→</span></button>
          <a class="secondary-button" href="#architecture">See how it works</a>
        </div>
        <div class="truth-strip">
          ${implementationTag("IMPLEMENTED")}<span>Browser ML inference and shared state</span>
          ${implementationTag("SIMULATED")}<span>Market, assets and blockchain lifecycle</span>
        </div>
      </div>
      <div class="guardian-console">
        <div class="console-top"><span>BEHAVIORAL GUARDIAN</span>${statusBadge(state.pet.state, state.pet.state === "STRESSED" ? "danger" : "safe")}</div>
        <div class="guardian-body">
          ${petMarkup(state, "hero")}
          <div class="guardian-risk ${riskClass(state.risk.level)}">
            <span>IMPULSE RISK SCORE</span>
            <strong>${state.risk.score}<small>/100</small></strong>
            <div class="risk-track"><i style="width:${state.risk.score}%"></i><b style="left:${state.policy.threshold}%" title="Policy threshold ${state.policy.threshold}"></b></div>
            <div class="risk-scale"><span>LOW</span><span>POLICY ${state.policy.threshold}</span><span>CRITICAL</span></div>
          </div>
        </div>
        <div class="console-message"><i></i><span>${state.pet.state === "DISCIPLINED" ? "Risk trend is improving. Your configured policy is standing by." : "Monitoring transaction concentration, velocity and market conditions."}</span></div>
      </div>
    </div>

    <div class="metric-grid overview-metrics">
      <article class="metric-card featured"><span>Total asset value</span><strong>${money(totalAssetValue(state))}</strong><small>Wallet balance + simulated holdings</small></article>
      <article class="metric-card"><span>Current IRS</span><strong class="${riskClass(state.risk.level)}-text">${state.risk.score}</strong><small>${state.risk.level} · threshold ${state.policy.threshold}</small></article>
      <article class="metric-card"><span>PoD Discipline Index</span><strong>${state.discipline.score}</strong><small>${state.discipline.label} · experimental 0–1000</small></article>
      <article class="metric-card"><span>Retained capital</span><strong>${money(vault.retained)}</strong><small>Calculated from cancelled demo events</small></article>
    </div>

    <div class="overview-panels">
      <article class="panel quick-panel">
        <div class="panel-heading"><div><span class="kicker">SYSTEM MAP</span><h2>One policy, every surface</h2></div><small>Shared application state</small></div>
        <div class="quick-grid">
          <a href="#exchange" class="quick-card"><span class="quick-index">01</span><strong>Exchange</strong><p>Assess a transaction and inspect its actual model drivers.</p><i>Open terminal →</i></a>
          <a href="#pet" class="quick-card"><span class="quick-index">02</span><strong>Pet Space</strong><p>See how recent risk and discipline events shape Byte.</p><i>Meet Byte →</i></a>
          <a href="#vault" class="quick-card"><span class="quick-index">03</span><strong>Vault</strong><p>Explore retained-capital allocation without moving assets.</p><i>View simulation →</i></a>
          <a href="#settings" class="quick-card"><span class="quick-index">04</span><strong>Defense Settings</strong><p>Change the threshold and friction rules used by Exchange.</p><i>Edit policy →</i></a>
        </div>
      </article>

      <article class="panel signal-panel">
        <div class="panel-heading"><div><span class="kicker">LAST 5 ASSESSMENTS</span><h2>Risk signal</h2></div>${statusBadge(state.model.status, modelTone)}</div>
        ${renderRiskBars(state.risk.history.slice(-8))}
        <div class="signal-summary"><span>Trend</span><strong>${state.risk.history.at(-1) <= state.risk.history.at(-2) ? "Improving" : "Elevated"}</strong></div>
        <div class="signal-summary"><span>Model</span><strong>${state.model.version}</strong></div>
        <div class="signal-summary"><span>Policy</span><strong>${state.policy.preset}</strong></div>
      </article>
    </div>

    <article class="panel intervention-panel">
      <div class="panel-heading"><div><span class="kicker">AUDIT TRAIL</span><h2>Recent interventions</h2></div><a href="#vault">Open Vault →</a></div>
      <div class="ledger-table" role="table" aria-label="Recent interventions">
        <div class="ledger-row header" role="row"><span>Time</span><span>Trigger</span><span>IRS</span><span>Amount</span><span>Outcome</span></div>
        ${latest.map((item) => `<div class="ledger-row" role="row"><span>${new Date(item.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}${item.sample ? " · SAMPLE" : ""}</span><span>${item.reason}</span><span class="${riskClass(item.level)}-text">${item.score}</span><span>${money(item.amount)}</span><span>${item.outcome.replaceAll("_", " ")}</span></div>`).join("")}
      </div>
    </article>
  </section>`;
}

export function bindOverview(root, context) {
  root.querySelector('[data-action="start-guided"]')?.addEventListener("click", () => {
    setGuidedStep(1);
    context.toast("FOMO fixture loaded. Exchange is ready for assessment.", "warning");
    location.hash = "exchange";
  });
}
