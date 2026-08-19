import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Sentient Wallet application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Sentient Wallet · AI Risk &amp; Programmable Policy<\/title>/i);
  assert.match(html, /id="sentient-root"/);
  assert.match(html, /Initializing behavioral policy engine/);
  assert.match(html, /\/assets\/js\/app\.js/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Your site is taking shape/i);
  assert.doesNotMatch(html, /<iframe\b/i);
});

test("keeps one canonical, static, hash-routed user experience", async () => {
  const [index, page, layout, appScript, css] = await Promise.all([
    readFile(new URL("index.html", projectRoot), "utf8"),
    readFile(new URL("app/page.tsx", projectRoot), "utf8"),
    readFile(new URL("app/layout.tsx", projectRoot), "utf8"),
    readFile(new URL("assets/js/app.js", projectRoot), "utf8"),
    readFile(new URL("assets/css/app.css", projectRoot), "utf8"),
  ]);

  assert.match(index, /<meta\s+name="viewport"/i);
  assert.match(index, /id="sentient-root"/);
  assert.match(index, /<script\s+type="module"\s+src="\.\/assets\/js\/app\.js"><\/script>/i);
  assert.doesNotMatch(index, /<iframe\b/i);
  assert.match(page, /from "next\/script"/);
  assert.match(page, /strategy="afterInteractive"/);
  assert.match(layout, /Sentient Wallet/);
  assert.match(appScript, /window\.addEventListener\("hashchange"/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);

  await Promise.all([
    access(new URL("assets/models/irs-model.json", projectRoot)),
    access(new URL("assets/js/views/overview.js", projectRoot)),
    access(new URL("assets/js/views/exchange.js", projectRoot)),
    access(new URL("assets/js/views/pet.js", projectRoot)),
    access(new URL("assets/js/views/vault.js", projectRoot)),
    access(new URL("assets/js/views/settings.js", projectRoot)),
    access(new URL("assets/js/views/analytics.js", projectRoot)),
    access(new URL("assets/js/views/architecture.js", projectRoot)),
    access(new URL("legacy/index.html", projectRoot)),
  ]);
});
