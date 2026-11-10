import { type Db, saveCapture } from "@interview-intel/db";
import { captureFromText } from "@interview-intel/domain";

export type Env = {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  ALLOWED_USER_IDS: string;
  DATABASE_URL: string;
};

export type Connect = (env: Env) => { db: Db; close?: () => Promise<void> };

export const REPLIES = {
  saved: "נשמר",
  duplicate: "כבר שמור",
  urlSaved: "נשמר. הדבק כאן את הטקסט או שלח צילום מסך כדי שאוכל לחלץ ממנו.",
} as const;

type Update = { message?: { chat: { id: number }; from?: { id: number }; text?: string } };

/** Builds the Worker. `connect` is injected so tests can run against PGlite. */
export function createWorker(connect: Connect) {
  return {
    async fetch(request: Request, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
      if (request.method !== "POST") return new Response("Not found", { status: 404 });
      if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.TELEGRAM_WEBHOOK_SECRET) {
        return new Response("Forbidden", { status: 403 });
      }

      const message = ((await request.json().catch(() => ({}))) as Update).message;
      // Always 200 for anything we ignore, so Telegram does not redeliver it.
      if (!message?.chat || !message.text || !message.from || !isAllowed(env, message.from.id)) {
        return new Response("ok");
      }

      const capture = await captureFromText(message.text);
      const { db, close } = connect(env);
      try {
        const result = await saveCapture(db, capture);
        const reply =
          result === "duplicate" ? REPLIES.duplicate : capture.kind === "url" ? REPLIES.urlSaved : REPLIES.saved;
        // The Capture is saved; a failed reply must not make Telegram redeliver it.
        await sendMessage(env, message.chat.id, reply).catch((err) => console.error(err));
      } finally {
        if (close) ctx.waitUntil(close());
      }
      return new Response("ok");
    },
  };
}

function isAllowed(env: Env, userId: number): boolean {
  return env.ALLOWED_USER_IDS.split(",").map((id) => id.trim()).includes(String(userId));
}

async function sendMessage(env: Env, chatId: number, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) throw new Error(`Telegram sendMessage failed: ${res.status}`);
}
