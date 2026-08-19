import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const modelDirectory = new URL("../assets/models/", import.meta.url);

async function readJson(filename) {
  return JSON.parse(
    await readFile(new URL(filename, modelDirectory), "utf8"),
  );
}

function transform(model, features) {
  const values = [];
  const { numeric, categorical, categorical_feature_order: categoryOrder } =
    model.preprocessing;

  for (const feature of numeric.features) {
    const raw = Number(features[feature]);
    assert.ok(Number.isFinite(raw), `${feature} must be finite`);
    values.push((raw - numeric.means[feature]) / numeric.scales[feature]);
  }

  for (const feature of categoryOrder) {
    const raw = String(features[feature]);
    const categories = categorical[feature].categories;
    assert.ok(
      categories.includes(raw),
      `${feature} contains unsupported category ${raw}`,
    );
    for (const category of categories) {
      values.push(raw === category ? 1 : 0);
    }
  }

  return values;
}

function infer(model, features) {
  const transformed = transform(model, features);
  const { coefficients, intercept } = model.model;
  assert.equal(transformed.length, coefficients.length);

  const logit = coefficients.reduce(
    (sum, coefficient, index) =>
      sum + coefficient * transformed[index],
    intercept,
  );
  const clipped = Math.min(35, Math.max(-35, logit));
  const riskProbability = 1 / (1 + Math.exp(-clipped));
  const riskBand = model.output.risk_bands.find(
    ({ minimum, maximum_exclusive: maximum }) =>
      riskProbability >= minimum && riskProbability < maximum,
  );
  assert.ok(riskBand, "risk probability must map to an exported risk band");

  return {
    risk_probability: riskProbability,
    irs_score: Math.round(riskProbability * 100),
    risk_level: riskBand.level,
  };
}

test("browser formula reproduces every published model parity vector", async () => {
  const [model, fixtures] = await Promise.all([
    readJson("irs-model.json"),
    readJson("model-test-vectors.json"),
  ]);

  assert.equal(model.model.type, "logistic_regression");
  assert.equal(model.data_origin, "SYNTHETIC");
  assert.equal(fixtures.model_version, model.model_version);
  assert.equal(fixtures.data_origin, "SYNTHETIC");
  assert.ok(fixtures.vectors.length > 0);

  for (const fixture of fixtures.vectors) {
    const actual = infer(model, fixture.features);
    const expected = fixture.expected;
    assert.ok(
      Math.abs(actual.risk_probability - expected.risk_probability) <=
        fixtures.tolerance,
      `${fixture.name} probability differed: actual=${actual.risk_probability}, expected=${expected.risk_probability}`,
    );
    assert.equal(actual.irs_score, expected.irs_score, fixture.name);
    assert.equal(actual.risk_level, expected.risk_level, fixture.name);
  }
});

test("published preprocessing order, coefficients, and checksums are coherent", async () => {
  const [modelBytes, metricsBytes, fixtureBytes, metadata] = await Promise.all([
    readFile(new URL("irs-model.json", modelDirectory)),
    readFile(new URL("model-metrics.json", modelDirectory)),
    readFile(new URL("model-test-vectors.json", modelDirectory)),
    readJson("model-metadata.json"),
  ]);
  const model = JSON.parse(modelBytes.toString("utf8"));

  assert.deepEqual(
    model.model.coefficient_feature_order,
    model.preprocessing.transformed_feature_order,
  );
  assert.equal(
    model.model.coefficients.length,
    model.preprocessing.transformed_feature_order.length,
  );
  assert.equal(model.input_schema.length, 19);
  assert.ok(model.input_schema.every(({ required }) => required));

  const files = new Map([
    ["irs-model.json", modelBytes],
    ["model-metrics.json", metricsBytes],
    ["model-test-vectors.json", fixtureBytes],
  ]);
  for (const [filename, expected] of Object.entries(metadata.artifacts)) {
    const actual = createHash("sha256").update(files.get(filename)).digest("hex");
    assert.equal(actual, expected, filename);
  }

  const badFixture = {
    ...JSON.parse(fixtureBytes.toString("utf8")).vectors[0].features,
    transaction_type: "UNKNOWN",
  };
  assert.throws(() => infer(model, badFixture), /unsupported category/);
});
