import { implementationTag, statusBadge } from "../ui.js";

const flow = [
  ["01", "Transaction form", "Browser", "Collect amount, side and current demo context.", "IMPLEMENTED"],
  ["02", "Feature engineering", "Browser / API", "Build the same 19 input features in Demo or Full Local Mode.", "IMPLEMENTED"],
  ["03", "ML IRS model", "Browser / FastAPI", "Apply exported preprocessing and logistic coefficients deterministically.", "IMPLEMENTED"],
  ["04", "Risk explanation", "Browser / API", "Rank actual standardized log-odds contributions.", "IMPLEMENTED"],
  ["05", "Signed attestation", "Local service", "Bind score, wallet, value, nonce, expiry and policy version.", "IMPLEMENTED"],
  ["06", "Smart-account policy", "Local Hardhat", "Verify signer and enforce queue/cancel/cooldown/execute rules.", "IMPLEMENTED"],
  ["07", "Vault + companion", "Browser", "Apply one normalized intervention event across shared state.", "IMPLEMENTED"],
];

export function renderArchitecture(state) {
  return `<section class="view architecture-view" aria-labelledby="architecture-title">
    <div class="view-heading"><div><span class="eyebrow">SYSTEM DESIGN · TRUST MADE VISIBLE</span><h1 id="architecture-title">Architecture</h1><p>An off-chain model is not inherently trustless. This prototype shows where computation, signing and enforcement occur.</p></div>${statusBadge("ERC-4337-INSPIRED · NOT PRODUCTION COMPATIBLE", "warning")}</div>

    <article class="architecture-hero panel">
      <div><span class="kicker">END-TO-END DECISION FLOW</span><h2>From intent to proportionate friction</h2><p>Browser Demo Mode simulates the service and chain lifecycle while running real deterministic model inference locally. Full Local Mode replaces those two simulated boundaries with FastAPI and Hardhat.</p></div>
      <div class="mode-compare"><article><span>MODE A</span><strong>Browser Demo</strong><p>Static index, local model, simulated attestation and chain lifecycle.</p>${implementationTag("IMPLEMENTED")}</article><article><span>MODE B</span><strong>Full Local</strong><p>FastAPI inference and signer, Hardhat policy contract, no cloud account.</p>${implementationTag("IMPLEMENTED")}</article></div>
    </article>

    <div class="architecture-flow">${flow.map(([index, title, boundary, copy, status], itemIndex) => `<article><span class="flow-index">${index}</span><div><small>${boundary}</small><strong>${title}</strong><p>${copy}</p></div>${implementationTag(status)}${itemIndex < flow.length - 1 ? '<i class="flow-arrow">↓</i>' : ""}</article>`).join("")}</div>

    <div class="trust-grid">
      <article class="trust-card browser"><span class="trust-number">01</span><div><span class="kicker">TRUST BOUNDARY</span><h2>Browser</h2></div><p>Holds demo balances, settings, companion, Vault accounting and model inference. Local storage is user-visible and resettable, but it is not tamper-resistant.</p><ul><li>Static hash-routed SPA</li><li>Exported model artifact</li><li>Shared event store</li></ul></article>
      <article class="trust-card service"><span class="trust-number">02</span><div><span class="kicker">TRUST BOUNDARY</span><h2>ML service + signer</h2></div><p>In Full Local Mode the service reproduces model inference and signs short-lived development attestations. It is a trusted off-chain component.</p><ul><li>FastAPI typed endpoints</li><li>Same model version</li><li>Development key only</li></ul></article>
      <article class="trust-card contract"><span class="trust-number">03</span><div><span class="kicker">TRUST BOUNDARY</span><h2>Policy contract</h2></div><p>The local contract verifies attestation integrity and enforces nonce, expiry, version, threshold and cooldown rules on a development chain.</p><ul><li>Signature verification</li><li>Replay protection</li><li>Queue / cancel / execute</li></ul></article>
    </div>

    <div class="architecture-detail-grid">
      <article class="panel attestation-card"><div class="panel-heading"><div><span class="kicker">EIP-712-STYLE PAYLOAD</span><h2>Risk attestation</h2></div>${statusBadge(state.chain.attestation, state.mode === "DEMO" ? "warning" : "safe")}</div><div class="code-table"><span>wallet<b>${state.wallet.address}</b></span><span>destination<b>0xSent…Swap</b></span><span>value<b>Transaction amount</b></span><span>IRS / risk<b>${state.risk.score} · ${state.risk.level}</b></span><span>policy version<b>${state.policy.version}</b></span><span>issued / expiry<b>5 minute window</b></span><span>nonce<b>${state.chain.lastNonce + 1}</b></span><span>signature<b>${state.mode === "DEMO" ? "SIMULATED" : "LOCAL DEV KEY"}</b></span></div></article>
      <article class="panel state-machine-card"><span class="kicker">CONTRACT STATE MACHINE</span><h2>Policy outcome</h2><div class="state-machine"><div><strong>LOW</strong><span>Attestation valid</span><i>→</i><b>EXECUTE DEMO CALL</b></div><div><strong>MODERATE</strong><span>Policy-dependent</span><i>→</i><b>CONFIRM OR QUEUE</b></div><div><strong>HIGH / CRITICAL</strong><span>Mandatory delay</span><i>→</i><b>QUEUE · CANCEL · EXECUTE LATER</b></div></div><p>The interface never offers an immediate bypass when the selected policy makes cooldown mandatory.</p></article>
    </div>

    <article class="panel implementation-matrix"><div class="panel-heading"><div><span class="kicker">IMPLEMENTATION TRUTH</span><h2>What is real, simulated and roadmap</h2></div><span>V1 prototype</span></div><div class="implementation-rows"><div><strong>Browser logistic-model inference</strong>${implementationTag("IMPLEMENTED")}<span>Uses generated coefficients and preprocessing.</span></div><div><strong>FastAPI assessment and local attestation</strong>${implementationTag("IMPLEMENTED")}<span>Available in the Docker/local stack.</span></div><div><strong>Hardhat policy enforcement</strong>${implementationTag("IMPLEMENTED")}<span>Local chain only; not audited for production.</span></div><div><strong>Market, assets, yield and protocols</strong>${implementationTag("SIMULATED")}<span>No live prices, assets, protocols or funds.</span></div><div><strong>Production ERC-4337 deployment</strong>${implementationTag("ROADMAP")}<span>Would require bundler/paymaster integration and security review.</span></div><div><strong>Proof-of-Discipline lending credential</strong>${implementationTag("ROADMAP")}<span>Requires legal, privacy, fairness and underwriting design.</span></div></div></article>
  </section>`;
}

export function bindArchitecture() {}
