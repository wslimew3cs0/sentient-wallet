function shortHash(seed) {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `0x${Math.abs(hash >>> 0).toString(16).padStart(8, "0")}…demo`;
}

export function simulateAttestation(state, transaction, riskResult) {
  const issuedAt = Math.floor(Date.now() / 1000);
  return {
    wallet: state.wallet.address,
    destination: "0xSent…Swap",
    value: transaction.amount,
    transactionHash: shortHash(`${transaction.side}:${transaction.amount}:${issuedAt}`),
    irsScore: riskResult.irs_score,
    riskLevel: riskResult.risk_level,
    policyVersion: state.policy.version,
    issuedAt,
    expiresAt: issuedAt + 300,
    nonce: state.chain.lastNonce + 1,
    status: "SIMULATED",
  };
}

export function blockchainLifecycleLabel(pending) {
  if (!pending) return "READY FOR ASSESSMENT";
  if (pending.status === "COOLDOWN") return "QUEUED BY POLICY";
  return "ATTESTATION SIMULATED";
}
