import {
  beginCooldown,
  cancelPending,
  closeModal,
  executePending,
  getState,
  proceedWithConfirmation,
  resetDemo,
  setModel,
  subscribe,
  totalAssetValue,
  updateState,
  vaultMetrics,
} from "./store.js";
import { loadRiskModel } from "./ml-client.js";
import { checkLocalService, fullModeRequested } from "./api.js";
import { routes, money, statusBadge } from "./ui.js";
import { renderOverview, bindOverview } from "./views/overview.js";
import { renderExchange, bindExchange } from "./views/exchange.js";
import { renderPet, bindPet } from "./views/pet.js";
import { renderVault, bindVault } from "./views/vault.js";
import { renderSettings, bindSettings } from "./views/settings.js";
import { renderAnalytics, bindAnalytics } from "./views/analytics.js";
import { renderArchitecture, bindArchitecture } from "./views/architecture.js";

const root = document.querySelector("#sentient-root");
const routeMap = new Map(routes);
let bootVisible = sessionStorage.getItem("sentient-booted") !== "1";
let renderQueued = false;

const viewModules = {
  overview: [renderOverview, bindOverview],
  exchange: [renderExchange, bindExchange],
  pet: [renderPet, bindPet],
  vault: [renderVault, bindVault],
  settings: [renderSettings, bindSettings],
  analytics: [renderAnalytics, bindAnalytics],
  architecture: [renderArchitecture, bindArchitecture],
};

function currentRoute() {
  const candidate = location.hash.replace(/^#/, "").split("?")[0] || "overview";
  return routeMap.has(candidate) ? candidate : "overview";
}

function renderHeader(state, route) {
  const vault = vaultMetrics(state);
  const modelTone = state.model.fallback ? "danger" : state.model.status === "ML MODEL READY" ? "safe" : "warning";
  return `<header class="app-header">
    <div class="topbar">
      <a href="#overview" class="brand" aria-label="Sentient Wallet overview"><strong>SENTIENT</strong><span>/ WEB3 OS</span><i>V2.0</i></a>
      <div class="header-telemetry">
        <div><span>Total asset value</span><strong>${money(totalAssetValue(state))}</strong></div>
        <div><span>USDT</span><strong>${state.wallet.usdt.toFixed(2)}</strong></div>
        <div><span>PoD Discipline</span><strong>${state.discipline.score}</strong></div>
      </div>
      <div class="header-status">${statusBadge(`${state.mode} MODE`, state.mode === "DEMO" ? "warning" : "safe")}${statusBadge(state.chain.connected ? state.chain.network : "CHAIN OFFLINE", state.chain.connected ? "safe" : "danger")}<button class="reset-button" data-global-action="reset-demo">Reset demo</button></div>
    </div>
    <div class="mode-banner"><span>DEMO MODE · SIMULATED MARKET AND BLOCKCHAIN DATA</span><span>MODEL ${state.model.version}</span><span>RETAINED ${money(vault.retained)}</span></div>
    <nav class="primary-nav" aria-label="Primary navigation">${routes.map(([key, label], index) => `<a href="#${key}" class="${route === key ? "active" : ""}" ${route === key ? 'aria-current="page"' : ""}><span>${String(index + 1).padStart(2, "0")}</span>${label}</a>`).join("")}</nav>
    <div class="system-line"><span>${state.model.status}</span><i></i><span>POLICY v${state.policy.version}</span><i></i><span>${state.pendingTransaction ? "ACTION PENDING" : "NO PENDING TRANSACTION"}</span><i></i><span>${state.chain.contract} CONTRACT</span><b class="${modelTone}"></b></div>
  </header>`;
}

function renderModal(state) {
  const pending = state.pendingTransaction;
  if (state.ui.modal !== "INTERVENTION" || !pending) return "";
  const decision = pending.decision;
  const risk = pending.risk;
  return `<div class="modal-backdrop" role="presentation"><section class="intervention-modal" role="dialog" aria-modal="true" aria-labelledby="intervention-title">
    <div class="modal-alert-line"></div>
    <div class="modal-heading"><div><span class="kicker">TRANSACTION INTERVENTION</span><h2 id="intervention-title">Programmable friction engaged</h2></div><button class="icon-button" data-global-action="modal-close" aria-label="Close intervention">×</button></div>
    <p class="modal-intro">The transaction crossed one or more active policy rules. Review the model drivers and the required next step.</p>
    <div class="modal-metrics"><div><span>IRS</span><strong>${risk.irs_score} / 100</strong></div><div><span>Risk level</span><strong class="${risk.risk_level.toLowerCase()}-text">${risk.risk_level}</strong></div><div><span>Policy</span><strong>${decision.mandatory ? `${decision.delayMinutes}m cooldown` : "Additional confirmation"}</strong></div><div><span>Model</span><strong>${risk.model_version}</strong></div></div>
    <div class="modal-drivers"><span>TOP RISK DRIVERS</span>${risk.top_drivers.slice(0, 4).map((driver, index) => `<div><b>${String(index + 1).padStart(2, "0")}</b><span>${driver.label}</span><strong class="${driver.impact >= 0 ? "danger-text" : "safe-text"}">${driver.impact >= 0 ? "+" : ""}${driver.impact.toFixed(2)}</strong></div>`).join("")}</div>
    <div class="modal-policy-reasons">${decision.reasons.map((reason) => `<span><i></i>${reason}</span>`).join("") || "<span><i></i>Model review requested by the active policy.</span>"}</div>
    <div class="modal-actions"><button class="abandon-button" data-global-action="cancel-pending"><strong>ABANDON TRANSACTION</strong><span>${money(pending.amount)} remains available · update Vault and Byte</span></button>${decision.mandatory ? '<button class="cooldown-button" data-global-action="begin-cooldown"><strong>BEGIN REQUIRED COOLDOWN</strong><span>Proceed only after the policy condition is satisfied</span></button>' : '<button class="cooldown-button" data-global-action="proceed-confirmed"><strong>PROCEED WITH ADDITIONAL CONFIRMATION</strong><span>Record an explicit override event</span></button>'}</div>
    <small class="modal-foot">Demo blockchain lifecycle is simulated. In Full Local Mode the signed attestation is verified by the local policy contract.</small>
  </section></div>`;
}

function renderBoot() {
  if (!bootVisible) return "";
  return `<div class="boot-overlay"><div class="boot-console"><div class="boot-mark"><i></i><span>S</span></div><strong>SENTIENT OS</strong><p>CALIBRATING BEHAVIORAL POLICY ENGINE</p><div class="boot-track"><i></i></div><div class="boot-checks"><span>MODEL ARTIFACT</span><b>VERIFYING</b><span>SHARED STATE</span><b>READY</b><span>CHAIN MODE</span><b>SIMULATION</b></div></div></div>`;
}

function renderFooter() {
  return `<footer class="app-footer"><div><strong>SENTIENT WALLET</strong><span>AI Behavioral Risk & Programmable Wallet Prototype</span></div><p>Independent educational portfolio project. No affiliation with financial institutions, protocols or technology vendors. No real assets, returns or psychological diagnoses.</p><a href="#architecture">Implementation truth →</a></footer>`;
}

function renderApp() {
  if (!root || renderQueued) return;
  const route = currentRoute();
  const state = getState();
  const [renderView, bindView] = viewModules[route];
  root.innerHTML = `${renderHeader(state, route)}<main id="main-content">${renderView(state)}</main>${renderFooter()}<div id="toast-region" class="toast-region" aria-live="assertive"></div>${renderModal(state)}${renderBoot()}`;
  bindView(root, context);
}

function toast(message, tone = "neutral") {
  const region = document.querySelector("#toast-region");
  if (!region) return;
  const item = document.createElement("div");
  item.className = `toast ${tone}`;
  item.innerHTML = `<i></i><span>${message}</span>`;
  region.append(item);
  requestAnimationFrame(() => item.classList.add("show"));
  setTimeout(() => {
    item.classList.remove("show");
    setTimeout(() => item.remove(), 220);
  }, 3600);
}

const context = { toast, render: renderApp };

function handleGlobalAction(event) {
  const button = event.target.closest("[data-global-action]");
  if (!button) return;
  const action = button.dataset.globalAction;
  try {
    if (action === "cancel-pending") {
      cancelPending();
      toast("Transaction abandoned. Capital retained and shared state updated.", "safe");
    } else if (action === "begin-cooldown") {
      beginCooldown();
      toast("Mandatory demo cooldown started.", "warning");
    } else if (action === "execute-pending") {
      executePending();
      toast("Transaction executed after the policy cooldown.", "safe");
    } else if (action === "proceed-confirmed") {
      proceedWithConfirmation();
      toast("Permissive-policy override recorded and transaction executed.", "warning");
    } else if (action === "open-intervention") {
      updateState((next) => { next.ui.modal = "INTERVENTION"; });
    } else if (action === "modal-close") {
      closeModal();
    } else if (action === "reset-demo") {
      if (window.confirm("Reset all local Sentient Wallet demo state?")) {
        resetDemo();
        toast("Deterministic demo fixture restored.", "safe");
      }
    }
  } catch (error) {
    toast(error.message || "The action could not be completed.", "danger");
  }
}

root?.addEventListener("click", handleGlobalAction);
window.addEventListener("hashchange", renderApp);
subscribe(renderApp);

renderApp();

loadRiskModel().then((status) => {
  setModel(status);
  if (!status.fallback) toast(`Deterministic model ${status.version} verified.`, "safe");
});

if (fullModeRequested()) {
  checkLocalService().then((health) => {
    if (health) {
      updateState((next) => {
        next.mode = "FULL LOCAL";
        next.chain = { ...next.chain, network: "LOCAL HARDHAT", contract: "CONNECTED", attestation: "LOCAL SIGNED" };
      });
      toast("Full Local Mode service detected.", "safe");
    } else {
      toast("Full Local Mode was requested, but local services are unavailable. Demo Mode remains active.", "warning");
    }
  });
}

if (bootVisible) {
  setTimeout(() => {
    bootVisible = false;
    sessionStorage.setItem("sentient-booted", "1");
    renderApp();
  }, 1250);
}

setInterval(() => {
  const state = getState();
  if (state.pendingTransaction?.status === "COOLDOWN" && currentRoute() === "exchange") renderApp();
}, 1000);
