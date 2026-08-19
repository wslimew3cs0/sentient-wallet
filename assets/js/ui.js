export const routes = [
  ["overview", "Overview"],
  ["exchange", "Exchange"],
  ["pet", "Pet Space"],
  ["vault", "Vault"],
  ["settings", "Defense Settings"],
  ["analytics", "Risk Analytics"],
  ["architecture", "Architecture"],
];

export function money(value, digits = 2) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value || 0));
}

export function number(value, digits = 0) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value || 0));
}

export function percent(value, digits = 1) {
  return `${Number(value || 0).toFixed(digits)}%`;
}

export function riskClass(level) {
  return String(level || "LOW").toLowerCase();
}

export function petMarkup(state, size = "large", accessoryOverride) {
  const accessory = accessoryOverride === undefined ? state.pet.equipped[0] : accessoryOverride;
  return `<div class="pixel-pet ${size} ${state.pet.form}" role="img" aria-label="Byte companion is ${state.pet.state.toLowerCase()}">
    <span class="pet-ear left"></span><span class="pet-ear right"></span>
    <span class="pet-face"><i class="pet-eye left"></i><i class="pet-eye right"></i><i class="pet-mouth"></i></span>
    <span class="pet-body"></span>
    ${accessory ? `<span class="pet-accessory ${accessory}" aria-hidden="true"></span>` : ""}
  </div>`;
}

export function statusBadge(label, tone = "neutral") {
  return `<span class="status-badge ${tone}"><i></i>${label}</span>`;
}

export function implementationTag(kind) {
  const tone = kind === "IMPLEMENTED" ? "safe" : kind === "SIMULATED" ? "warning" : "neutral";
  return statusBadge(kind, tone);
}

export function emptyState(title, copy) {
  return `<div class="empty-state"><strong>${title}</strong><span>${copy}</span></div>`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
