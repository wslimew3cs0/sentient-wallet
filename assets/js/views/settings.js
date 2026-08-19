import { applyPolicyPreset, getState, updatePolicy, updateState } from "../store.js";
import { statusBadge } from "../ui.js";

const presets = [
  ["CONSERVATIVE", "Lower friction", "Higher risk tolerance", 84, 5, 8],
  ["BALANCED", "Proportionate friction", "Middle risk tolerance", 72, 15, 4],
  ["PROTECTIVE", "Higher friction", "Lower risk tolerance", 58, 30, 2],
];

function activeRuleCount(policy) {
  return Number(policy.cooldownEnabled) + Number(policy.frequencyEnabled) + Number(policy.amountTierEnabled) + 1;
}

function defenseLabel(state) {
  if (state.policy.threshold <= 60) return "GUARDIAN-HIGH";
  if (state.policy.threshold <= 78) return "SENTINEL-BALANCED";
  return "WATCH-LIGHT";
}

export function renderSettings(state) {
  const policy = state.policy;
  return `<section class="view settings-view" aria-labelledby="settings-title">
    <div class="view-heading"><div><span class="eyebrow">PROGRAMMABLE FRICTION · POLICY STUDIO</span><h1 id="settings-title">Defense Settings</h1><p>These exact settings govern subsequent Exchange assessments. No preset is universally best.</p></div>${statusBadge(`POLICY v${policy.version}`, "safe")}</div>

    <article class="defense-hero">
      <div class="shield-visual" aria-hidden="true"><i></i><span>✓</span></div>
      <div><span>DEFENSE LEVEL</span><strong>${defenseLabel(state)}</strong><p>${policy.preset} preset · IRS threshold ${policy.threshold}</p></div>
      <div class="defense-signal"><span>ACTIVE RULES</span><strong>${activeRuleCount(policy)}</strong><small>Effective immediately</small></div>
    </article>

    <div class="preset-grid" aria-label="Policy presets">${presets.map(([name, headline, copy, threshold, cooldown, velocity]) => `<button class="preset-card ${policy.preset === name ? "active" : ""}" data-preset="${name}"><span>${name}</span><strong>${headline}</strong><p>${copy}</p><div><small>IRS ${threshold}</small><small>${cooldown}m</small><small>${velocity}/h</small></div></button>`).join("")}<article class="preset-card custom ${policy.preset === "CUSTOM" ? "active" : ""}"><span>CUSTOM</span><strong>Your controls</strong><p>Created whenever an individual rule changes.</p><div><small>IRS ${policy.threshold}</small><small>${policy.cooldownMinutes}m</small><small>${policy.maxTransactionsHour}/h</small></div></article></div>

    <div class="settings-layout">
      <div class="settings-stack">
        <article class="setting-card threshold-card">
          <div class="setting-heading"><span class="setting-icon warning">IRS</span><div><strong>Impulse Risk Score threshold</strong><p>Intervene when the deterministic model score reaches this policy boundary.</p></div>${statusBadge("ACTIVE", "danger")}</div>
          <div class="threshold-display"><span>Current threshold</span><strong>${policy.threshold}</strong></div>
          <input type="range" min="20" max="95" value="${policy.threshold}" data-setting="threshold" aria-label="IRS threshold">
          <div class="range-labels"><span>20 · more sensitive</span><span>95 · more permissive</span></div>
          <div class="setting-explainer">${policy.threshold <= 60 ? "Protective: more legitimate transactions may receive friction." : policy.threshold <= 78 ? "Balanced: targets elevated risk while limiting routine interruptions." : "Conservative: less friction, with a greater chance of missed elevated-risk events."}</div>
        </article>

        <article class="setting-card">
          <div class="setting-heading"><span class="setting-icon safe">T</span><div><strong>Mandatory cooling period</strong><p>High-risk transactions cannot bypass this rule in mandatory mode.</p></div><label class="switch"><input type="checkbox" data-toggle="cooldownEnabled" ${policy.cooldownEnabled ? "checked" : ""}><span></span></label></div>
          <div class="setting-fields"><label>Configured duration<select data-setting="cooldownMinutes"><option value="5" ${policy.cooldownMinutes === 5 ? "selected" : ""}>5 minutes</option><option value="15" ${policy.cooldownMinutes === 15 ? "selected" : ""}>15 minutes</option><option value="30" ${policy.cooldownMinutes === 30 ? "selected" : ""}>30 minutes</option><option value="60" ${policy.cooldownMinutes === 60 ? "selected" : ""}>60 minutes</option></select></label><label>Demo time scale<input type="number" min="5" max="60" value="${policy.demoCooldownSeconds}" data-setting="demoCooldownSeconds"><small>seconds in Browser Demo Mode</small></label></div>
        </article>

        <article class="setting-card">
          <div class="setting-heading"><span class="setting-icon">V</span><div><strong>Transaction frequency limit</strong><p>Escalates unusually concentrated transaction activity.</p></div><label class="switch"><input type="checkbox" data-toggle="frequencyEnabled" ${policy.frequencyEnabled ? "checked" : ""}><span></span></label></div>
          <div class="velocity-control"><label>Maximum transactions per hour<input type="range" min="1" max="12" value="${policy.maxTransactionsHour}" data-setting="maxTransactionsHour"><strong>${policy.maxTransactionsHour}</strong></label><div class="velocity-meter">${Array.from({ length: 12 }, (_, index) => `<i class="${index < policy.maxTransactionsHour ? "active" : ""}"></i>`).join("")}</div></div>
        </article>

        <article class="setting-card tier-card">
          <div class="setting-heading"><span class="setting-icon">$</span><div><strong>Amount-tier protection</strong><p>Overlapping rules use the maximum applicable mandatory delay.</p></div><label class="switch"><input type="checkbox" data-toggle="amountTierEnabled" ${policy.amountTierEnabled ? "checked" : ""}><span></span></label></div>
          <div class="tier-list"><div class="tier-row safe"><span>$0 to</span><label>$ <input type="number" data-tier="0" value="${policy.tiers[0].max}"></label><strong>Instant review</strong></div><div class="tier-row warning"><span>From first boundary to</span><label>$ <input type="number" data-tier="1" value="${policy.tiers[1].max}"></label><strong>${policy.cooldownMinutes}m cooldown</strong></div><div class="tier-row danger"><span>At or above</span><label>$ <input type="number" data-tier="2" value="${policy.tiers[2].min}"></label><strong>24h local-policy lock</strong></div></div>
        </article>
      </div>

      <aside class="settings-aside">
        <article class="panel policy-preview"><span class="kicker">NEXT TRANSACTION</span><h2>Effective policy</h2><div><span>Model boundary</span><strong>IRS ${policy.threshold}</strong></div><div><span>Risk cooldown</span><strong>${policy.cooldownEnabled ? `${policy.cooldownMinutes} min` : "Off"}</strong></div><div><span>Velocity rule</span><strong>${policy.frequencyEnabled ? `${policy.maxTransactionsHour} / hour` : "Off"}</strong></div><div><span>Amount tiers</span><strong>${policy.amountTierEnabled ? "Active" : "Off"}</strong></div><p>Changing a setting increments the local policy version and immediately affects Exchange.</p></article>
        <article class="panel policy-tradeoff"><span class="kicker">PROTECTION / FRICTION</span><h2>Current trade-off</h2><div class="tradeoff-scale"><i style="left:${100 - policy.threshold}%"></i></div><div><span>More protection</span><span>Less friction</span></div><p>${policy.threshold < 65 ? "This setting prioritizes protection and may interrupt more benign transactions." : policy.threshold > 80 ? "This setting prioritizes a low-friction flow and may miss some elevated-risk transactions." : "This setting aims for proportionate friction between the two objectives."}</p><a href="#analytics">Open threshold analysis →</a></article>
        <article class="panel privacy-panel"><span class="kicker">RESPONSIBLE AI</span><h2>Behavioral proxies only</h2><p>The prototype uses transaction context such as amount ratio, velocity and destination familiarity. It does not infer mental health, diagnose psychology or claim emotional certainty.</p></article>
        <div class="settings-actions"><button class="primary-button full" data-save-settings>Save policy</button><button class="secondary-button full" data-reset-policy>Restore Balanced preset</button><button class="text-button full danger" data-global-action="reset-demo">Reset entire demo</button></div>
      </aside>
    </div>
  </section>`;
}

export function bindSettings(root, context) {
  root.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => {
    applyPolicyPreset(button.dataset.preset);
    context.toast(`${button.dataset.preset} policy activated.`, "safe");
  }));
  root.querySelectorAll("[data-setting]").forEach((input) => input.addEventListener("change", () => {
    updatePolicy({ [input.dataset.setting]: Number(input.value) });
    context.toast("Custom policy updated for the next assessment.", "neutral");
  }));
  root.querySelectorAll("[data-toggle]").forEach((input) => input.addEventListener("change", () => {
    updatePolicy({ [input.dataset.toggle]: input.checked });
    context.toast(`${input.dataset.toggle.replace(/([A-Z])/g, " $1")} ${input.checked ? "enabled" : "disabled"}.`, input.checked ? "safe" : "warning");
  }));
  root.querySelectorAll("[data-tier]").forEach((input) => input.addEventListener("change", () => {
    const index = Number(input.dataset.tier);
    const value = Number(input.value);
    updateState((next) => {
      if (index === 0) {
        next.policy.tiers[0].max = value;
        next.policy.tiers[1].min = value;
      } else if (index === 1) {
        next.policy.tiers[1].max = value;
        next.policy.tiers[2].min = value;
      } else {
        next.policy.tiers[1].max = value;
        next.policy.tiers[2].min = value;
      }
      next.policy.preset = "CUSTOM";
      next.policy.version += 1;
    });
    context.toast("Amount boundary updated with no overlap.", "safe");
  }));
  root.querySelector("[data-save-settings]")?.addEventListener("click", () => context.toast(`Policy v${getState().policy.version} is active and stored locally.`, "safe"));
  root.querySelector("[data-reset-policy]")?.addEventListener("click", () => { applyPolicyPreset("BALANCED"); context.toast("Balanced policy restored.", "safe"); });
}
