import { test } from "node:test";
import assert from "node:assert/strict";
import { cachedPage, pageStore } from "../worker/page-cache.js";
import { getLocal, setLocal, _resetLocalState } from "../worker/cache.js";
import { logEvent } from "../worker/database/analytics.js";

function kv() {
  const store = new Map(); let puts = 0;
  return { store, get puts() { return puts; },
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async put(k, v) { puts++; store.set(k, v); },
    async delete(k) { store.delete(k); } };
}
function db() { return { prepare() { return { bind: () => ({ run: async () => ({}) }) }; } }; }
function fakeCaches(works = true) {
  const m = new Map();
  return { m, default: {
    async put(req, res) { if (works) m.set(req.url, await res.text()); },
    async match(req) { return m.has(req.url) ? new Response(m.get(req.url)) : undefined; },
  } };
}
function ctx() { const p = []; return { p, waitUntil: (x) => p.push(x) }; }
const req = () => { const r = new Request("https://site.test/en/casino/x"); Object.defineProperty(r, "cf", { value: { country: "RW", city: "Kigali" } }); return r; };
const render = (n) => async (c) => {
  n.n++;
  const w = logEvent(db(), { eventType: "CASINO_VIEW", casinoId: 7, countryCode: "RW", city: "Kigali", referrer: null, landingPage: "/en/casino/x" });
  if (c) c.waitUntil(w);
  return new Response("<html>p</html>", { headers: { "Content-Type": "text/html" } });
};

test("pages are saved in the Cache API, not KV, so the free KV write limit is never used", async () => {
  _resetLocalState();
  globalThis.caches = fakeCaches(true);
  try {
    const env = { CACHE: kv(), DB: db() }; const n = { n: 0 };
    const c1 = ctx();
    await cachedPage(req(), env, c1, "casino", render(n)); await Promise.all(c1.p);
    assert.equal(n.n, 1);
    assert.equal(env.CACHE.puts, 0, "no KV write for the page");
    assert.equal(pageStore.last, "cache");
    const c2 = ctx();
    const res = await cachedPage(req(), env, c2, "casino", render(n)); await Promise.all(c2.p);
    assert.equal(res.headers.get("x-page-cache"), "hit");
    assert.equal(res.headers.get("x-page-store"), "cache");
    assert.equal(n.n, 1, "second visit did not render");
  } finally { delete globalThis.caches; _resetLocalState(); }
});

test("when the Cache API accepts but never returns a save (workers.dev), KV is used instead", async () => {
  _resetLocalState();
  globalThis.caches = fakeCaches(false);
  try {
    const env = { CACHE: kv(), DB: db() };
    assert.equal(await setLocal(env, "k1", { a: 1 }, 60), "kv:probe-failed");
    assert.deepEqual(await getLocal(env, "k1"), { a: 1 });
    assert.equal(env.CACHE.puts, 1);
  } finally { delete globalThis.caches; _resetLocalState(); }
});

test("without the Cache API (tests, old runtimes) the KV path still works", async () => {
  _resetLocalState();
  const env = { CACHE: kv() };
  assert.equal(await setLocal(env, "k2", { b: 2 }, 120), "kv:no-cache-api");
  assert.deepEqual(await getLocal(env, "k2"), { b: 2 });
});

test("a failed save is reported, not hidden", async () => {
  _resetLocalState();
  const env = { CACHE: { async get() { return null; }, async put() { throw new Error("KV put() limit exceeded for the day."); } }, DB: db() };
  assert.equal(await setLocal(env, "k3", { c: 3 }, 60), "failed");
});
