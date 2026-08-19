import {
  accessoryCatalog,
  applyAccessory,
  getState,
  previewAccessory,
  purchaseAccessory,
  setPetTab,
} from "../store.js";
import { number, petMarkup, statusBadge } from "../ui.js";

const tabs = [
  ["COMPANION", "My Pet"],
  ["EVOLUTION", "Evolution Path"],
  ["STUDIO", "Try-On Room"],
  ["GALLERY", "Player Showcase"],
];

const stateRules = [
  ["CALM", "IRS below 65 and no pending policy action"],
  ["CAUTIOUS", "IRS from 65 to 84"],
  ["ALERT", "A transaction is queued for a decision or cooldown"],
  ["STRESSED", "IRS is 85 or higher"],
  ["RECOVERING", "Recent IRS trend is falling"],
  ["DISCIPLINED", "The latest intervention was cancelled or completed after cooldown"],
];

function accessorySymbol(key) {
  return { glasses: "⌐", crown: "♛", headphones: "◖◗", bandana: "◆", scarf: "≈" }[key] || "·";
}

function renderCompanion(state) {
  return `<div class="pet-companion-layout">
    <article class="pet-stage panel">
      <div class="pet-stage-top"><div><span class="kicker">BEHAVIORAL COMPANION</span><h2>${state.pet.name}</h2></div>${statusBadge(state.pet.state, ["STRESSED", "ALERT"].includes(state.pet.state) ? "danger" : "safe")}</div>
      <div class="pet-spotlight">${petMarkup(state, "xlarge")}<div class="pet-shadow"></div></div>
      <div class="pet-equipment"><span>Equipped</span><strong>${state.pet.equipped.length ? state.pet.equipped.map((item) => accessoryCatalog[item].name).join(", ") : "No equipment"}</strong></div>
      <div class="pet-progress"><div><span>Level ${state.pet.level}</span><span>${state.pet.xp % 100} / 100 XP</span></div><div class="xp-track"><i style="width:${state.pet.xp % 100}%"></i></div></div>
      <div class="pet-stat-row"><div><span>PoD Discipline Index</span><strong>${state.discipline.score}</strong></div><div><span>Interventions</span><strong>${state.interventions.length}</strong></div><div><span>Streak</span><strong>${state.pet.disciplineStreak}d</strong></div></div>
    </article>
    <div class="pet-side-stack">
      <article class="panel boutique-panel">
        <div class="panel-heading"><div><span class="kicker">DEMO REWARD SHOP</span><h2>Accessory boutique</h2></div><div class="credit-balance"><span>Credits</span><strong>${number(state.wallet.rewardCredits)} SENT</strong></div></div>
        <div class="accessory-grid">${Object.entries(accessoryCatalog).map(([key, item]) => {
          const owned = state.pet.owned.includes(key);
          const equipped = state.pet.equipped.includes(key);
          return `<article class="accessory-card"><div class="accessory-icon ${key}">${accessorySymbol(key)}</div><div><strong>${item.name}</strong><span>${key === "glasses" ? "Filters noisy signals" : key === "crown" ? "A discipline milestone" : key === "headphones" ? "A calmer review space" : key === "bandana" ? "For resilient decisions" : "Marks recovery streaks"}</span><b>${item.price} SENT · DEMO</b></div><button data-buy="${key}" ${owned ? "disabled" : ""}>${equipped ? "Equipped" : owned ? "Owned" : "Buy"}</button></article>`;
        }).join("")}</div>
        <button class="secondary-button full" data-pet-tab="STUDIO">Open Try-On Room →</button>
      </article>
      <article class="panel behavior-card">
        <div class="panel-heading"><div><span class="kicker">TRANSPARENT RULES</span><h2>Why Byte changed</h2></div><span class="state-orb"></span></div>
        <p>Byte reflects transaction-risk signals and discipline events. It does not detect emotions or diagnose psychology.</p>
        <div class="behavior-reasons"><span><i class="safe"></i>Current IRS <b>${state.risk.score}</b></span><span><i class="warning"></i>Recent interventions <b>${state.interventions.length}</b></span><span><i></i>Discipline streak <b>${state.pet.disciplineStreak} days</b></span></div>
      </article>
    </div>
  </div>`;
}

function renderEvolution(state) {
  const stages = [
    { level: 1, name: "Signal Seed", copy: "Learns the shape of the demo policy.", form: "normal" },
    { level: 3, name: "Circuit Scout", copy: "Unlocked through transparent discipline events.", form: "happy" },
    { level: 6, name: "Guardian Form", copy: "A demo milestone—not a tradable asset.", form: "happy" },
  ];
  return `<div class="evolution-layout"><article class="panel evolution-path"><div class="panel-heading"><div><span class="kicker">DEMO PROGRESSION</span><h2>Evolution path</h2></div><span>Level ${state.pet.level}</span></div><div class="evolution-line">${stages.map((stage, index) => `<div class="evolution-stage ${state.pet.level >= stage.level ? "unlocked" : ""}"><span class="stage-level">LV.${stage.level}</span>${petMarkup({ ...state, pet: { ...state.pet, form: stage.form, equipped: [] } }, "medium")}<strong>${stage.name}</strong><p>${stage.copy}</p><small>${state.pet.level >= stage.level ? "UNLOCKED" : `${stage.level - state.pet.level} levels remaining`}</small>${index < stages.length - 1 ? '<i class="path-connector"></i>' : ""}</div>`).join("")}</div></article>
    <article class="panel rules-panel"><span class="kicker">STATE ENGINE</span><h2>Behavioral state map</h2><p>State is calculated from the current IRS, trend, pending interventions, completion/cancellation and streak.</p><div class="state-rule-list">${stateRules.map(([name, rule]) => `<div class="${name === state.pet.state ? "current" : ""}"><strong>${name}</strong><span>${rule}</span></div>`).join("")}</div></article></div>`;
}

function renderStudio(state) {
  const preview = state.pet.previewAccessory;
  return `<div class="studio-layout"><article class="panel studio-stage"><span class="kicker">TRY-ON PREVIEW</span><h2>Signal studio</h2><div class="pet-spotlight studio">${petMarkup(state, "xlarge", preview)}<div class="pet-shadow"></div></div><p>Preview any accessory. Applying equipment requires owning it.</p><button class="primary-button" data-apply-preview>${preview ? `Apply ${accessoryCatalog[preview].name}` : "Clear equipment"}</button></article>
    <article class="panel studio-options"><div class="panel-heading"><div><span class="kicker">ACCESSORIES</span><h2>Choose a signal layer</h2></div><span>${state.pet.owned.length} owned</span></div><div class="try-grid"><button class="try-item ${preview == null ? "active" : ""}" data-preview="none"><i>·</i><strong>None</strong><span>Default form</span></button>${Object.entries(accessoryCatalog).map(([key, item]) => `<button class="try-item ${preview === key ? "active" : ""}" data-preview="${key}"><i>${accessorySymbol(key)}</i><strong>${item.name}</strong><span>${state.pet.owned.includes(key) ? "OWNED" : "PREVIEW ONLY"}</span></button>`).join("")}</div><div class="demo-disclaimer"><strong>DEMO GAMIFICATION</strong><p>Accessories, credits and companion forms are local demo state. They are not NFTs, financial assets or tradable tokens.</p></div></article></div>`;
}

function renderGallery(state) {
  const names = ["AlphaByte", "CircuitMoth", "YieldFox", "QuietBull", "NeonOtter", "LedgerLynx", "SignalCrow", "GuardGecko", "VaultKoi", "PausePanda", "PolicyPup", "RationalRam"];
  const forms = ["normal", "happy", "stressed"];
  return `<article class="panel gallery-panel"><div class="panel-heading"><div><span class="kicker">PLAYER SHOWCASE · DEMO PROFILES</span><h2>Companion gallery</h2></div><span>12 local fixtures</span></div><div class="gallery-grid">${names.map((name, index) => `<article><div class="gallery-pet tint-${index % 6}">${petMarkup({ ...state, pet: { ...state.pet, form: forms[index % 3], equipped: index % 4 === 0 ? ["glasses"] : [] } }, "small")}</div><strong>${name}</strong><span>Discipline ${540 + index * 27}</span><small>DEMO · NOT TRADABLE</small></article>`).join("")}</div></article>`;
}

export function renderPet(state) {
  const content = state.pet.tab === "EVOLUTION" ? renderEvolution(state) : state.pet.tab === "STUDIO" ? renderStudio(state) : state.pet.tab === "GALLERY" ? renderGallery(state) : renderCompanion(state);
  return `<section class="view pet-view" aria-labelledby="pet-title"><div class="view-heading"><div><span class="eyebrow">BEHAVIORAL COMPANION · LOCAL GAMIFICATION</span><h1 id="pet-title">Pet Space</h1><p>Transparent feedback for risk and discipline events—never a claim about genuine emotion.</p></div><div class="heading-balance"><span>Demo reward credits</span><strong>${number(state.wallet.rewardCredits)} SENT</strong></div></div><nav class="subnav" aria-label="Pet Space sections">${tabs.map(([value, label]) => `<button data-pet-tab="${value}" class="${state.pet.tab === value ? "active" : ""}">${label}</button>`).join("")}</nav>${content}</section>`;
}

export function bindPet(root, context) {
  root.querySelectorAll("[data-pet-tab]").forEach((button) => button.addEventListener("click", () => setPetTab(button.dataset.petTab)));
  root.querySelectorAll("[data-buy]").forEach((button) => button.addEventListener("click", () => {
    try { purchaseAccessory(button.dataset.buy); context.toast(`${accessoryCatalog[button.dataset.buy].name} added to the local collection.`, "safe"); } catch (error) { context.toast(error.message, "danger"); }
  }));
  root.querySelectorAll("[data-preview]").forEach((button) => button.addEventListener("click", () => previewAccessory(button.dataset.preview)));
  root.querySelector("[data-apply-preview]")?.addEventListener("click", () => {
    const item = getState().pet.previewAccessory;
    if (item && !getState().pet.owned.includes(item)) return context.toast("Purchase this demo accessory before applying it.", "warning");
    applyAccessory(item);
    context.toast(item ? `${accessoryCatalog[item].name} equipped.` : "Equipment cleared.", "safe");
  });
}
