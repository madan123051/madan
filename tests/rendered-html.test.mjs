import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request(`http://localhost${pathname}`, {
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

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );

  return response.text();
}

test("renders the Madan landing page", async () => {
  const html = await render("/");

  assert.match(html, /Madan Shrestha/);
  assert.match(html, /Private gallery/);
});

test("marks private gallery route as noindex", async () => {
  const html = await render("/gallery");

  assert.match(html, /Private Gallery \| Madan Wilds Aura/);
  assert.match(html, /noindex/);
});
