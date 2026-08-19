const hre = require("hardhat");

const DEFAULT_LOCAL_RISK_SIGNER_LABEL = "sentient-wallet/local-dev-risk-signer/v1";

async function main() {
  const [deployer, , accountOwner] = await hre.ethers.getSigners();
  const configuredKey = process.env.SENTIENT_DEV_ATTESTATION_KEY?.trim();
  const signerLabel =
    process.env.SENTIENT_DEV_SIGNER_LABEL || DEFAULT_LOCAL_RISK_SIGNER_LABEL;
  const derivedKey = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(signerLabel));
  const localRiskSigner = new hre.ethers.Wallet(configuredKey || derivedKey);

  // Short development cooldowns keep the local demo practical. Production
  // values must be governed separately and must not reuse this public signer.
  const policy = await hre.ethers.deployContract("SentientRiskPolicy", [
    localRiskSigner.address,
    25,
    50,
    75,
    10,
    30,
    60,
  ]);
  await policy.waitForDeployment();

  const account = await hre.ethers.deployContract("SentientAccount", [
    accountOwner.address,
    await policy.getAddress(),
  ]);
  await account.waitForDeployment();

  console.log("SentientRiskPolicy:", await policy.getAddress());
  console.log("SentientAccount:", await account.getAddress());
  console.log("Policy owner:", deployer.address);
  console.log("Development risk signer:", localRiskSigner.address);
  console.log("Account owner:", accountOwner.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
