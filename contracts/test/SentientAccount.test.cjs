const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const ATTESTATION_TYPES = {
  Attestation: [
    { name: "account", type: "address" },
    { name: "target", type: "address" },
    { name: "value", type: "uint256" },
    { name: "dataHash", type: "bytes32" },
    { name: "riskScore", type: "uint16" },
    { name: "nonce", type: "uint256" },
    { name: "policyVersion", type: "uint256" },
    { name: "expiresAt", type: "uint64" },
  ],
};

async function deployFixture() {
  const [deployer, accountOwner, riskSigner, recipient, attacker, alternateSigner] =
    await ethers.getSigners();

  const policy = await ethers.deployContract("SentientRiskPolicy", [
    riskSigner.address,
    25,
    50,
    75,
    60,
    300,
    900,
  ]);
  await policy.waitForDeployment();

  const account = await ethers.deployContract("SentientAccount", [
    accountOwner.address,
    await policy.getAddress(),
  ]);
  await account.waitForDeployment();

  await deployer.sendTransaction({
    to: await account.getAddress(),
    value: ethers.parseEther("10"),
  });

  return {
    deployer,
    accountOwner,
    riskSigner,
    recipient,
    attacker,
    alternateSigner,
    policy,
    account,
  };
}

async function signAttestation({
  account,
  policy,
  signer,
  target,
  value = 0n,
  data = "0x",
  riskScore,
  nonce,
  policyVersion,
  expiresAt,
}) {
  const accountAddress = await account.getAddress();
  const network = await ethers.provider.getNetwork();
  const resolvedNonce = nonce ?? (await policy.nextNonce(accountAddress));
  const resolvedPolicyVersion = policyVersion ?? (await policy.policyVersion());
  const resolvedExpiry = expiresAt ?? BigInt((await time.latest()) + 3600);

  const attestation = {
    account: accountAddress,
    target,
    value,
    dataHash: ethers.keccak256(data),
    riskScore,
    nonce: resolvedNonce,
    policyVersion: resolvedPolicyVersion,
    expiresAt: resolvedExpiry,
  };

  const domain = {
    name: "SentientRiskPolicy",
    version: "1",
    chainId: network.chainId,
    verifyingContract: await policy.getAddress(),
  };

  const signature = await signer.signTypedData(domain, ATTESTATION_TYPES, attestation);
  return { attestation, signature, data, value };
}

async function requestIdFor(account, policy, attestation) {
  const digest = await policy.digestFor(attestation);
  return ethers.keccak256(
    ethers.solidityPacked(["address", "bytes32"], [await account.getAddress(), digest]),
  );
}

describe("SentientRiskPolicy", function () {
  it("classifies low, moderate, high, and critical scores at configured boundaries", async function () {
    const { policy } = await loadFixture(deployFixture);

    expect(await policy.riskTierFor(0)).to.equal(0n);
    expect(await policy.riskTierFor(24)).to.equal(0n);
    expect(await policy.riskTierFor(25)).to.equal(1n);
    expect(await policy.riskTierFor(49)).to.equal(1n);
    expect(await policy.riskTierFor(50)).to.equal(2n);
    expect(await policy.riskTierFor(74)).to.equal(2n);
    expect(await policy.riskTierFor(75)).to.equal(3n);
    expect(await policy.riskTierFor(100)).to.equal(3n);

    expect(await policy.cooldownFor(0)).to.equal(0n);
    expect(await policy.cooldownFor(1)).to.equal(60n);
    expect(await policy.cooldownFor(2)).to.equal(300n);
    expect(await policy.cooldownFor(3)).to.equal(900n);
    await expect(policy.riskTierFor(101))
      .to.be.revertedWithCustomError(policy, "RiskScoreOutOfRange")
      .withArgs(101);
  });

  it("updates thresholds, increments policy version, and invalidates stale attestations", async function () {
    const { policy, account, accountOwner, riskSigner, recipient } = await loadFixture(deployFixture);
    const signed = await signAttestation({
      account,
      policy,
      signer: riskSigner,
      target: recipient.address,
      riskScore: 30,
    });

    await expect(policy.updateThresholds(40, 60, 80))
      .to.emit(policy, "ThresholdsUpdated")
      .withArgs(40, 60, 80)
      .and.to.emit(policy, "PolicyVersionUpdated")
      .withArgs(1, 2);

    await expect(
      account
        .connect(accountOwner)
        .queueTransaction(
          recipient.address,
          signed.value,
          signed.data,
          signed.attestation,
          signed.signature,
        ),
    )
      .to.be.revertedWithCustomError(policy, "PolicyVersionMismatch")
      .withArgs(2, 1);

    const current = await signAttestation({
      account,
      policy,
      signer: riskSigner,
      target: recipient.address,
      riskScore: 30,
    });
    const requestId = await requestIdFor(account, policy, current.attestation);
    await account
      .connect(accountOwner)
      .queueTransaction(
        recipient.address,
        current.value,
        current.data,
        current.attestation,
        current.signature,
      );

    expect((await account.getTransaction(requestId)).riskTier).to.equal(0n);
  });

  it("updates cooldowns for subsequent attestations and increments policy version", async function () {
    const { policy, account, accountOwner, riskSigner, recipient } = await loadFixture(deployFixture);

    await expect(policy.updateCooldowns(120, 600, 1200))
      .to.emit(policy, "CooldownsUpdated")
      .withArgs(120, 600, 1200)
      .and.to.emit(policy, "PolicyVersionUpdated")
      .withArgs(1, 2);

    const signed = await signAttestation({
      account,
      policy,
      signer: riskSigner,
      target: recipient.address,
      riskScore: 30,
    });
    const requestId = await requestIdFor(account, policy, signed.attestation);
    const queued = await account
      .connect(accountOwner)
      .queueTransaction(
        recipient.address,
        signed.value,
        signed.data,
        signed.attestation,
        signed.signature,
      );
    const receipt = await queued.wait();
    const queuedBlock = await ethers.provider.getBlock(receipt.blockNumber);
    const transactionData = await account.getTransaction(requestId);

    expect(transactionData.executeAfter).to.equal(BigInt(queuedBlock.timestamp + 120));
  });

  it("restricts policy updates and rejects invalid threshold/cooldown configurations", async function () {
    const { policy, attacker } = await loadFixture(deployFixture);

    await expect(policy.connect(attacker).updateThresholds(20, 40, 80))
      .to.be.revertedWithCustomError(policy, "Unauthorized")
      .withArgs(attacker.address);
    await expect(policy.updateThresholds(50, 50, 80)).to.be.revertedWithCustomError(
      policy,
      "InvalidThresholds",
    );
    await expect(policy.updateCooldowns(300, 60, 900)).to.be.revertedWithCustomError(
      policy,
      "InvalidCooldowns",
    );
  });
});

describe("SentientAccount", function () {
  it("queues and immediately executes a valid low-risk transaction", async function () {
    const { policy, account, accountOwner, riskSigner, recipient } = await loadFixture(deployFixture);
    const value = ethers.parseEther("1");
    const signed = await signAttestation({
      account,
      policy,
      signer: riskSigner,
      target: recipient.address,
      value,
      riskScore: 10,
    });
    const requestId = await requestIdFor(account, policy, signed.attestation);

    await expect(
      account
        .connect(accountOwner)
        .queueTransaction(
          recipient.address,
          signed.value,
          signed.data,
          signed.attestation,
          signed.signature,
        ),
    )
      .to.emit(account, "TransactionQueued")
      .withArgs(
        requestId,
        recipient.address,
        value,
        10,
        0,
        anyValue,
        await policy.digestFor(signed.attestation),
      );

    const queued = await account.getTransaction(requestId);
    expect(queued.riskTier).to.equal(0n);
    expect(queued.executeAfter).to.equal(queued.queuedAt);

    await expect(() => account.connect(accountOwner).executeTransaction(requestId)).to.changeEtherBalances(
      [account, recipient],
      [-value, value],
    );
    expect((await account.getTransaction(requestId)).executed).to.equal(true);
  });

  for (const testCase of [
    { name: "moderate", score: 30, tier: 1n, cooldown: 60n },
    { name: "high", score: 60, tier: 2n, cooldown: 300n },
    { name: "critical", score: 90, tier: 3n, cooldown: 900n },
  ]) {
    it(`enforces the ${testCase.name} cooldown before allowing execution`, async function () {
      const { policy, account, accountOwner, riskSigner, recipient } = await loadFixture(deployFixture);
      const signed = await signAttestation({
        account,
        policy,
        signer: riskSigner,
        target: recipient.address,
        riskScore: testCase.score,
      });
      const requestId = await requestIdFor(account, policy, signed.attestation);

      await account
        .connect(accountOwner)
        .queueTransaction(
          recipient.address,
          signed.value,
          signed.data,
          signed.attestation,
          signed.signature,
        );
      const queued = await account.getTransaction(requestId);

      expect(queued.riskTier).to.equal(testCase.tier);
      expect(queued.executeAfter - queued.queuedAt).to.equal(testCase.cooldown);
      await expect(account.connect(accountOwner).executeTransaction(requestId)).to.be.revertedWithCustomError(
        account,
        "ExecutionTooEarly",
      );

      await time.increaseTo(queued.executeAfter);
      await expect(account.connect(accountOwner).executeTransaction(requestId))
        .to.emit(account, "TransactionExecuted")
        .withArgs(requestId, recipient.address, 0, "0x");
    });
  }

  it("allows cancellation and permanently prevents the canceled request from executing", async function () {
    const { policy, account, accountOwner, riskSigner, recipient } = await loadFixture(deployFixture);
    const signed = await signAttestation({
      account,
      policy,
      signer: riskSigner,
      target: recipient.address,
      riskScore: 60,
    });
    const requestId = await requestIdFor(account, policy, signed.attestation);

    await account
      .connect(accountOwner)
      .queueTransaction(
        recipient.address,
        signed.value,
        signed.data,
        signed.attestation,
        signed.signature,
      );
    await expect(account.connect(accountOwner).cancelTransaction(requestId))
      .to.emit(account, "TransactionCanceled")
      .withArgs(requestId);
    expect((await account.getTransaction(requestId)).canceled).to.equal(true);

    await time.increase(301);
    await expect(account.connect(accountOwner).executeTransaction(requestId))
      .to.be.revertedWithCustomError(account, "QueuedTransactionCanceled")
      .withArgs(requestId);
  });

  it("rejects expired attestations", async function () {
    const { policy, account, accountOwner, riskSigner, recipient } = await loadFixture(deployFixture);
    const expiredAt = BigInt((await time.latest()) - 1);
    const signed = await signAttestation({
      account,
      policy,
      signer: riskSigner,
      target: recipient.address,
      riskScore: 10,
      expiresAt: expiredAt,
    });

    await expect(
      account
        .connect(accountOwner)
        .queueTransaction(
          recipient.address,
          signed.value,
          signed.data,
          signed.attestation,
          signed.signature,
        ),
    )
      .to.be.revertedWithCustomError(policy, "AttestationExpired")
      .withArgs(expiredAt, anyValue);
  });

  it("rejects a validly formed attestation signed by the wrong signer", async function () {
    const { policy, account, accountOwner, alternateSigner, recipient, riskSigner } =
      await loadFixture(deployFixture);
    const signed = await signAttestation({
      account,
      policy,
      signer: alternateSigner,
      target: recipient.address,
      riskScore: 10,
    });

    await expect(
      account
        .connect(accountOwner)
        .queueTransaction(
          recipient.address,
          signed.value,
          signed.data,
          signed.attestation,
          signed.signature,
        ),
    )
      .to.be.revertedWithCustomError(policy, "InvalidSigner")
      .withArgs(alternateSigner.address, riskSigner.address);
  });

  it("rejects malformed and payload-tampered signatures", async function () {
    const { policy, account, accountOwner, riskSigner, recipient } = await loadFixture(deployFixture);
    const signed = await signAttestation({
      account,
      policy,
      signer: riskSigner,
      target: recipient.address,
      riskScore: 10,
    });

    await expect(
      account
        .connect(accountOwner)
        .queueTransaction(recipient.address, signed.value, signed.data, signed.attestation, "0x1234"),
    ).to.be.revertedWithCustomError(policy, "InvalidSignatureLength");

    const tampered = { ...signed.attestation, riskScore: 11 };
    await expect(
      account
        .connect(accountOwner)
        .queueTransaction(recipient.address, signed.value, signed.data, tampered, signed.signature),
    ).to.be.revertedWithCustomError(policy, "InvalidSigner");
  });

  it("binds a signature to the exact target, value, and calldata", async function () {
    const { policy, account, accountOwner, riskSigner, recipient, attacker } =
      await loadFixture(deployFixture);
    const signed = await signAttestation({
      account,
      policy,
      signer: riskSigner,
      target: recipient.address,
      value: 1n,
      data: "0x1234",
      riskScore: 10,
    });

    await expect(
      account
        .connect(accountOwner)
        .queueTransaction(attacker.address, signed.value, signed.data, signed.attestation, signed.signature),
    ).to.be.revertedWithCustomError(policy, "TransactionDetailsMismatch");
    await expect(
      account
        .connect(accountOwner)
        .queueTransaction(recipient.address, 2n, signed.data, signed.attestation, signed.signature),
    ).to.be.revertedWithCustomError(policy, "TransactionDetailsMismatch");
    await expect(
      account
        .connect(accountOwner)
        .queueTransaction(recipient.address, signed.value, "0xabcd", signed.attestation, signed.signature),
    ).to.be.revertedWithCustomError(policy, "TransactionDetailsMismatch");
  });

  it("rejects replay of a consumed attestation", async function () {
    const { policy, account, accountOwner, riskSigner, recipient } = await loadFixture(deployFixture);
    const signed = await signAttestation({
      account,
      policy,
      signer: riskSigner,
      target: recipient.address,
      riskScore: 10,
    });

    await account
      .connect(accountOwner)
      .queueTransaction(
        recipient.address,
        signed.value,
        signed.data,
        signed.attestation,
        signed.signature,
      );
    const digest = await policy.digestFor(signed.attestation);

    await expect(
      account
        .connect(accountOwner)
        .queueTransaction(
          recipient.address,
          signed.value,
          signed.data,
          signed.attestation,
          signed.signature,
        ),
    )
      .to.be.revertedWithCustomError(policy, "AttestationAlreadyUsed")
      .withArgs(digest);
  });

  it("enforces an exact sequential nonce", async function () {
    const { policy, account, accountOwner, riskSigner, recipient } = await loadFixture(deployFixture);
    const signed = await signAttestation({
      account,
      policy,
      signer: riskSigner,
      target: recipient.address,
      riskScore: 10,
      nonce: 2n,
    });

    await expect(
      account
        .connect(accountOwner)
        .queueTransaction(
          recipient.address,
          signed.value,
          signed.data,
          signed.attestation,
          signed.signature,
        ),
    )
      .to.be.revertedWithCustomError(policy, "NonceMismatch")
      .withArgs(await account.getAddress(), 0, 2);
  });

  it("restricts queue, cancel, and execute operations to the account owner", async function () {
    const { policy, account, attacker, riskSigner, recipient } = await loadFixture(deployFixture);
    const signed = await signAttestation({
      account,
      policy,
      signer: riskSigner,
      target: recipient.address,
      riskScore: 10,
    });

    await expect(
      account
        .connect(attacker)
        .queueTransaction(
          recipient.address,
          signed.value,
          signed.data,
          signed.attestation,
          signed.signature,
        ),
    )
      .to.be.revertedWithCustomError(account, "Unauthorized")
      .withArgs(attacker.address);
  });
});
