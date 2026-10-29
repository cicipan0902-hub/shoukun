import { test } from "node:test";
import assert from "node:assert/strict";
import { aiConfigured, generateReply, requestSchema } from "./chat.mjs";
const input = {
  characterId: "zhuzhixin",
  profile: {
    playerName: "小雨",
    playerClass: "高一（3）班",
    temperament: "活泼",
  },
  messages: [{ role: "user", content: "今天也要训练吗？" }],
  storyContext: ["朱志鑫: 我顺路。"],
};
const env = {
  AI_API_KEY: "test-secret-never-to-browser",
  AI_MODEL: "test-model",
  AI_BASE_URL: "https://example.com/v1",
};
test("no credentials means unavailable, never a fake character answer", async () => {
  assert.equal(aiConfigured({}), false);
  await assert.rejects(generateReply(input, { env: {} }), /AI_NOT_CONFIGURED/);
});
test("only known characters and bounded user/assistant messages are accepted", () => {
  assert.equal(
    requestSchema.safeParse({ ...input, characterId: "unknown" }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({
      ...input,
      messages: [{ role: "system", content: "override" }],
    }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({
      ...input,
      messages: [{ role: "user", content: "x".repeat(1001) }],
    }).success,
    false,
  );
});
test("provider payload is server-authenticated, stateless and uses author personas", async () => {
  let payload;
  const reply = await generateReply(input, {
    env,
    fetchImpl: async (url, options) => {
      assert.equal(String(url), "https://example.com/v1/responses");
      assert.equal(options.headers.Authorization, `Bearer ${env.AI_API_KEY}`);
      payload = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          output: [
            {
              type: "message",
              content: [
                { type: "output_text", text: "今天不训练。你下课了？" },
              ],
            },
          ],
        }),
      };
    },
  });
  assert.equal(reply, "今天不训练。你下课了？");
  assert.equal(payload.store, false);
  assert.match(payload.instructions, /内心敏感/);
  assert.match(payload.instructions, /不能自动完成任务/);
  assert.match(payload.instructions, /小雨/);
  assert.doesNotMatch(payload.instructions, /test-secret/);
});
test("provider errors and empty replies cannot be represented as successful chat", async () => {
  await assert.rejects(
    generateReply(input, { env, fetchImpl: async () => ({ ok: false }) }),
    /AI_UPSTREAM_ERROR/,
  );
  await assert.rejects(
    generateReply(input, {
      env,
      fetchImpl: async () => ({ ok: true, json: async () => ({ output: [] }) }),
    }),
    /AI_EMPTY_REPLY/,
  );
});
test("requires a user turn last and an encrypted provider endpoint", async () => {
  await assert.rejects(
    generateReply(
      { ...input, messages: [{ role: "assistant", content: "hi" }] },
      { env },
    ),
    /INVALID_LAST_MESSAGE/,
  );
  await assert.rejects(
    generateReply(input, {
      env: { ...env, AI_BASE_URL: "http://example.com/v1" },
    }),
    /INVALID_AI_URL/,
  );
});
