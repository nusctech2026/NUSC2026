import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { parse } from "parse5";

const webBase = process.env.TEST_WEB_BASE_URL || "http://127.0.0.1:3101";
const storeBase =
  process.env.TEST_STORE_BASE_URL || "http://127.0.0.1:3103";
const webRoutes = [
  "/",
  "/club",
  "/honours",
  "/pathway",
  "/community",
  "/partners",
  "/careers",
  "/contact",
];
const documents = new Map();
let storeDocument;
const attrs = (node, name) =>
  node.attrs?.find((attribute) => attribute.name === name)?.value;
const find = (node, match) => [
  ...(match(node) ? [node] : []),
  ...(node.childNodes || []).flatMap((child) => find(child, match)),
];
const text = (node) =>
  node.nodeName === "#text"
    ? node.value
    : (node.childNodes || [])
        .filter((child) => !["script", "style"].includes(child.tagName))
        .map(text)
        .join("");
const normalize = (value) => value.replace(/\s+/g, "");
const servers = [];
let logs = "";

const startApp = (appDir, port) => {
  const server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      appDir,
      "-p",
      port,
      "-H",
      "127.0.0.1",
    ],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  server.stdout.on("data", (chunk) => (logs += chunk));
  server.stderr.on("data", (chunk) => (logs += chunk));
  servers.push(server);
  return server;
};

const waitFor = async (url, server) => {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    if (server.exitCode !== null) throw new Error(logs);
    if (attempt === 99)
      throw new Error(`Production server did not start: ${logs}`);
    await delay(200);
  }
};

before(async () => {
  if (!process.env.TEST_WEB_BASE_URL) {
    await waitFor(webBase, startApp("apps/web", "3101"));
  }
  if (!process.env.TEST_STORE_BASE_URL) {
    await waitFor(storeBase, startApp("apps/store", "3103"));
  }
  for (const route of webRoutes) {
    const response = await fetch(webBase + route);
    assert.equal(response.status, 200, route);
    documents.set(route, parse(await response.text()));
  }
  const storeResponse = await fetch(storeBase);
  assert.equal(storeResponse.status, 200, "store /");
  storeDocument = parse(await storeResponse.text());
});

after(() => {
  for (const server of servers) server.kill();
});

test("all public URLs serve complete HTML with one main heading and unique page metadata", () => {
  const titles = new Set();
  for (const [route, document] of documents) {
    assert.equal(
      find(document, (node) => node.tagName === "h1").length,
      1,
      route,
    );
    assert.equal(
      find(document, (node) => node.tagName === "main").length,
      1,
      route,
    );
    const title = text(find(document, (node) => node.tagName === "title")[0]);
    assert(!titles.has(title), `Duplicate title: ${title}`);
    titles.add(title);
    assert(
      find(document, (node) => attrs(node, "name") === "description").length,
      route,
    );
    assert(!/photo slot|graphic slot/i.test(text(document)), route);
  }
  assert.equal(find(storeDocument, (node) => node.tagName === "h1").length, 1);
  assert.equal(
    find(storeDocument, (node) => node.tagName === "main").length,
    1,
  );
  assert(
    find(storeDocument, (node) => attrs(node, "name") === "description")
      .length,
  );
  assert(!/photo slot|graphic slot/i.test(text(storeDocument)));
});

test("every local link resolves to a migrated page and every fragment has a destination", () => {
  for (const [route, document] of documents) {
    for (const link of find(document, (node) => node.tagName === "a")) {
      const href = attrs(link, "href");
      if (!href || /^(https?:|mailto:)/.test(href)) continue;
      const url = new URL(href, webBase + route);
      const target = documents.get(url.pathname);
      assert(target, `${route} contains an unknown local link: ${href}`);
      if (url.hash)
        assert(
          find(target, (node) => attrs(node, "id") === url.hash.slice(1))
            .length,
          href,
        );
    }
  }
  for (const link of find(storeDocument, (node) => node.tagName === "a")) {
    const href = attrs(link, "href");
    if (!href || /^(https?:|mailto:)/.test(href)) continue;
    const url = new URL(href, storeBase);
    assert.equal(url.pathname, "/", `store contains an unknown local link: ${href}`);
    if (url.hash)
      assert(
        find(storeDocument, (node) => attrs(node, "id") === url.hash.slice(1))
          .length,
        href,
      );
  }
});

test("original club paragraphs, player names, awards and role requirements survive the migration", async () => {
  const source = parse(await readFile("index.html", "utf8"));
  const originalBody = find(source, (node) => node.tagName === "body")[0];
  const rendered = normalize([...documents.values()].map(text).join(" "));
  const originalCopy = find(originalBody, (node) =>
    ["p", "h3", "li"].includes(node.tagName),
  );
  for (const node of originalCopy) {
    const value = normalize(text(node));
    assert(
      rendered.includes(value),
      `Missing original content: ${text(node).trim()}`,
    );
  }
});

test("careers keeps five roles and usable application email links", () => {
  const careers = documents.get("/careers");
  const jobs = find(careers, (node) =>
    (attrs(node, "class") || "").split(" ").includes("job"),
  );
  assert.equal(jobs.length, 5);
  for (const job of jobs) {
    const apply = find(job, (node) => node.tagName === "a")[0];
    const url = new URL(attrs(apply, "href"));
    assert.equal(url.protocol, "mailto:");
    assert.equal(url.pathname, "nagalandunitedsportsclub@gmail.com");
    assert(
      url.searchParams
        .get("subject")
        .includes(text(find(job, (node) => node.tagName === "h3")[0])),
    );
    assert(url.searchParams.get("body").includes("CV"));
  }
});

test("unknown URLs return a useful 404 page", async () => {
  const response = await fetch(webBase + "/not-a-club-page");
  assert.equal(response.status, 404);
  assert((await response.text()).includes("Off the pitch."));
});
