import { getState, totalAssetValue, updateState, vaultMetrics } from "../store.js";
import { money, percent, riskClass, statusBadge } from "../ui.js";

const allocationLabels = {
  stable: ["Stable Reserve", "Illustrative stable-value reserve", "USDC / cash-equivalent examples"],
  lending: ["Lending Strategy", "Illustrative overcollateralized lending", "Aave / Compound examples"],
  treasury: ["Tokenized Treasury / RWA", "Illustrative tokenized treasury exposure", "No live protocol connection"],
  cash: ["Cash", "Unallocated liquidity", "No yield assumed"],
};

function reasonCounts(state) {
  const counts = { "FOMO concentration": 0, "Transaction velocity": 0, "Policy threshold": 0, Other: 0 };
  state.interventions.forEach((item) => {
    if (item.reason.toLowerCase().includes("fomo")) counts["FOMO concentration"] += 1;
    else if (item.reason.toLowerCase().includes("velocity")) counts["Transaction velocity"] += 1;
    else if (item.reason.toLowerCase().includes("threshold")) counts["Policy threshold"] += 1;
    else counts.Other += 1;
  });
  return counts;
}

export function renderVault(state) {
  const metrics = vaultMetrics(state);
  const reasons = reasonCounts(state);
  const totalReasons = Math.max(1, state.interventions.length);
  const currentAssets = totalAssetValue(state);
  const assumedLoss = metrics.retained * (state.vault.counterfactualLossRate / 100);
  const counterfactual = currentAssets - assumedLoss;
  const maxCompare = Math.max(currentAssets, counterfactual, 1);
  return `<section class="view vault-view" aria-labelledby="vault-title">
    <div class="view-heading"><div><span class="eyebrow">DISCIPLINE SURPLUS · ACCOUNTING SIMULATION</span><h1 id="vault-title">Vault</h1><p>Cancelled demo transactions retain capital in the wallet. Allocation below is illustrative only; no assets or approvals move.</p></div>${statusBadge("SIMULATED ALLOCATION · NO REAL ASSETS MOVED", "warning")}</div>

    <div class="metric-grid vault-metrics">
      <article class="metric-card featured"><span>Retained capital</span><strong>${money(metrics.retained)}</strong><small>Calculated from ${metrics.cancelledCount} cancelled event${metrics.cancelledCount === 1 ? "" : "s"}</small></article>
      <article class="metric-card"><span>Interventions</span><strong>${state.interventions.length}</strong><small>Includes ${state.interventions.filter((item) => item.sample).length} labelled sample fixtures</small></article>
      <article class="metric-card"><span>Illustrative yield</span><strong>${money(metrics.illustrativeYield)}</strong><small>${state.vault.simulationDays} days · ${percent(metrics.weightedApy, 2)} weighted assumption</small></article>
      <article class="metric-card"><span>Wallet assets</span><strong>${money(currentAssets)}</strong><small>Retained capital is not added twice</small></article>
    </div>

    <div class="vault-top-grid">
      <article class="panel reason-panel"><div class="panel-heading"><div><span class="kicker">INTERVENTION MIX</span><h2>Why policy engaged</h2></div><span>${state.interventions.length} total</span></div><div class="reason-bars">${Object.entries(reasons).map(([reason, count]) => `<div><span>${reason}<b>${count}</b></span><i><em style="width:${(count / totalReasons) * 100}%"></em></i></div>`).join("")}</div></article>
      <article class="panel surplus-flow"><div class="panel-heading"><div><span class="kicker">ACCOUNTING FLOW</span><h2>Discipline surplus</h2></div><span>Calculated</span></div><div class="flow-row"><div><strong>Cancelled transaction</strong><span>Policy event</span></div><i>→</i><div><strong>Capital retained</strong><span>Wallet unchanged</span></div><i>→</i><div><strong>Illustrative allocation</strong><span>Visualization only</span></div></div><p>A cancellation preserves optionality. “Discipline surplus” is an analytical label for retained capital, not a second balance.</p></article>
    </div>

    <article class="panel allocation-panel">
      <div class="panel-heading"><div><span class="kicker">USER-CONFIGURED ASSUMPTION</span><h2>Illustrative allocation</h2></div><span>Total ${Object.values(state.vault.allocations).reduce((a, b) => a + b, 0)}%</span></div>
      <div class="allocation-grid">${Object.entries(state.vault.allocations).map(([key, value]) => {
        const [label, copy, note] = allocationLabels[key];
        const dollars = metrics.retained * (value / 100);
        return `<article class="allocation-card ${key}"><div class="allocation-top"><span class="allocation-symbol">${key.slice(0, 1).toUpperCase()}</span><div><strong>${label}</strong><small>${copy}</small></div></div><div class="allocation-value"><strong>${money(dollars)}</strong><span>${value}%</span></div><input type="range" min="0" max="100" value="${value}" data-allocation="${key}" aria-label="${label} allocation percentage"><div class="allocation-foot"><span>${percent(state.vault.apyAssumptions[key], 1)} APY assumption</span><small>${note}</small></div></article>`;
      }).join("")}</div>
      <div class="allocation-warning"><strong>Simulation integrity</strong><span>Percentages should total 100%. Values and rates are local assumptions, not offers, live APYs or return forecasts.</span></div>
    </article>

    <div class="vault-analysis-grid">
      <article class="panel comparison-panel"><div class="panel-heading"><div><span class="kicker">COUNTERFACTUAL · NOT A FORECAST</span><h2>Protection vs impulsive path</h2></div><label class="compact-field">Adverse move<input type="number" min="0" max="100" value="${state.vault.counterfactualLossRate}" data-counterfactual> %</label></div><div class="comparison-numbers"><div><span>Current demo assets</span><strong class="safe-text">${money(currentAssets)}</strong></div><div><span>Counterfactual assets</span><strong class="danger-text">${money(counterfactual)}</strong></div></div><div class="comparison-bars"><div><span>With retained capital</span><i><em class="safe" style="width:${(currentAssets / maxCompare) * 100}%"></em></i></div><div><span>Assumed impulsive path</span><i><em class="danger" style="width:${(counterfactual / maxCompare) * 100}%"></em></i></div></div><p>Difference: <strong>${money(assumedLoss)}</strong>, calculated only from the user-configured adverse-move assumption. It is not a claim that losses were prevented.</p></article>
      <article class="panel yield-panel"><span class="kicker">ILLUSTRATIVE YIELD</span><h2>${money(metrics.illustrativeYield)}</h2><p>On ${money(metrics.retained)} retained capital for ${state.vault.simulationDays} days at a weighted ${percent(metrics.weightedApy, 2)} assumption.</p><div>${Object.entries(state.vault.allocations).map(([key, value]) => `<span><i class="${key}"></i>${allocationLabels[key][0]}<b>${money(metrics.retained * (value / 100) * (state.vault.apyAssumptions[key] / 100) * (state.vault.simulationDays / 365))}</b></span>`).join("")}</div><small>SIMULATION · SIMPLE INTEREST · NO FEES OR LOSSES MODELLED</small></article>
    </div>

    <article class="panel vault-ledger"><div class="panel-heading"><div><span class="kicker">SHARED EVENT LEDGER</span><h2>Recent interventions</h2></div><span>Newest first</span></div><div class="ledger-table"><div class="ledger-row header"><span>Date</span><span>Reason</span><span>IRS</span><span>Amount</span><span>Outcome</span></div>${state.interventions.slice(0, 8).map((item) => `<div class="ledger-row"><span>${new Date(item.at).toLocaleDateString()}${item.sample ? " · SAMPLE" : ""}</span><span>${item.reason}</span><span class="${riskClass(item.level)}-text">${item.score}</span><span>${money(item.amount)}</span><span>${item.outcome.replaceAll("_", " ")}</span></div>`).join("")}</div></article>
  </section>`;
}

export function bindVault(root, context) {
  root.querySelectorAll("[data-allocation]").forEach((input) => input.addEventListener("change", () => {
    updateState((next) => { next.vault.allocations[input.dataset.allocation] = Number(input.value); });
    const total = Object.values(getState().vault.allocations).reduce((a, b) => a + b, 0);
    context.toast(total === 100 ? "Allocation assumption updated." : `Allocation totals ${total}%. Adjust to 100% for a complete scenario.`, total === 100 ? "safe" : "warning");
  }));
  root.querySelector("[data-counterfactual]")?.addEventListener("change", (event) => {
    updateState((next) => { next.vault.counterfactualLossRate = Math.max(0, Math.min(100, Number(event.target.value))); });
    context.toast("Counterfactual assumption updated.", "neutral");
  });
}
