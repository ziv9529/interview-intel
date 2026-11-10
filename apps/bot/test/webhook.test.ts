import { type Db, schema } from "@interview-intel/db";
import { createTestDb } from "@interview-intel/db/testing";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { type Env, REPLIES, createWorker } from "../src/worker";

const OWNER = 111;
const env: Env = {
  TELEGRAM_BOT_TOKEN: "test-token",
  TELEGRAM_WEBHOOK_SECRET: "test-secret",
  ALLOWED_USER_IDS: `${OWNER}`,
  DATABASE_URL: "unused",
};

let db: Db;
let sent: { chat_id: number; text: string }[];

beforeEach(async () => {
  db = await createTestDb();
  sent = [];
  // Fake Telegram at the outbound HTTP boundary.
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    expect(url).toBe("https://api.telegram.org/bottest-token/sendMessage");
    sent.push(JSON.parse(init.body as string));
    return new Response(JSON.stringify({ ok: true }));
  });
});
afterEach(() => vi.unstubAllGlobals());

async function send(text: string, from = OWNER) {
  const worker = createWorker(() => ({ db }));
  const request = new Request("https://bot.test/", {
    method: "POST",
    headers: { "X-Telegram-Bot-Api-Secret-Token": env.TELEGRAM_WEBHOOK_SECRET },
    body: JSON.stringify({ update_id: 1, message: { chat: { id: from }, from: { id: from }, text } }),
  });
  return worker.fetch(request, env, { waitUntil: () => {} });
}

const captures = () => db.select().from(schema.captures);

it("saves a text message as a text Capture and replies «נשמר»", async () => {
  const res = await send("Invented post: the Acme backend loop had a live-coding stage.");

  expect(res.status).toBe(200);
  expect(await captures()).toMatchObject([
    { kind: "text", rawText: "Invented post: the Acme backend loop had a live-coding stage." },
  ]);
  expect(sent).toEqual([{ chat_id: OWNER, text: REPLIES.saved }]);
});

it("replies «כבר שמור» to the same text and creates nothing", async () => {
  await send("Invented post: same text twice.");
  await send("Invented post: same text twice.");

  expect(await captures()).toHaveLength(1);
  expect(sent.map((m) => m.text)).toEqual([REPLIES.saved, REPLIES.duplicate]);
});

it("saves a bare link as a url Capture and asks for the text", async () => {
  await send("https://example.com/invented-post");

  expect(await captures()).toMatchObject([
    { kind: "url", rawText: null, sourceUrl: "https://example.com/invented-post" },
  ]);
  expect(sent).toEqual([{ chat_id: OWNER, text: REPLIES.urlSaved }]);
});

it("ignores users not on the allowlist", async () => {
  const res = await send("Invented post from a stranger.", 999);

  expect(res.status).toBe(200);
  expect(await captures()).toHaveLength(0);
  expect(sent).toHaveLength(0);
});
