import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const read = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL("../stories/foundation/" + name, import.meta.url),
      "utf8",
    ),
  );
const source = read("story.json"),
  project = read("project-demo.json"),
  cast = read("characters.json"),
  assets = read("assets.json"),
  extra = read("extensions.json");
import { compileProject } from "../src/authoring/compile";
const pixel =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jrWQAAAAASUVORK5CYII=";
async function enter(page: Page) {
  await page.goto("/");
  await page.getByLabel("你的昵称", { exact: true }).fill("测试同学");
  await page.getByRole("button", { name: "让故事发生", exact: true }).click();
  await page.getByRole("button", { name: "轻触解锁", exact: true }).click();
}
async function home(page: Page) {
  await page.getByRole("button", { name: "返回桌面", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "打开微信", exact: true }),
  ).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  const raw = structuredClone(source);
  raw.content.photos[0].hidden = false;
  raw.chats[1].messages.push({
    id: "test-image",
    body: "测试图片",
    senderId: "brother",
    hidden: false,
    kind: "image",
    media: pixel,
  } as (typeof raw.chats)[1]["messages"][number]);
  const r = compileProject(raw, project, cast, assets, extra, {
    "avatar-zhangzeyu": pixel,
  });
  await page.route("**/work.json", (route) => route.fulfill({ json: r.work }));
});
test("image preview, consistent avatar and small-screen layout", async ({
  page,
}) => {
  await enter(page);
  await page.getByRole("button", { name: "打开微信", exact: true }).click();
  await page.locator(".wx-chat-row").filter({ hasText: "张泽禹" }).click();
  await expect(page.locator(".skin-message img").first()).toBeVisible();
  await page
    .locator(".skin-bubble")
    .filter({ has: page.locator("img") })
    .last()
    .click();
  await expect(page.getByRole("dialog", { name: "图片大图" })).toBeVisible();
  await page.getByRole("button", { name: "关闭大图" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
test("optional password game, failure retry and refresh restore", async ({
  page,
}) => {
  await enter(page);
  await page.getByRole("button", { name: "打开相册", exact: true }).click();
  await page.getByRole("button", { name: "查看篮球场边的背影" }).click();
  await home(page);
  await page.getByRole("button", { name: "打开备忘录", exact: true }).click();
  await page
    .locator(".notes-list button")
    .filter({ hasText: "测试小游戏 · 线索盒" })
    .click();
  await page.getByPlaceholder("内容密码").fill("bad");
  await page.getByRole("button", { name: "解锁内容", exact: true }).click();
  await expect(page.getByText("密码不正确")).toBeVisible();
  await page.getByPlaceholder("内容密码").fill("1028");
  await page.getByRole("button", { name: "解锁内容", exact: true }).click();
  await expect(
    page.getByText("解锁成功。这是小游戏测试内容，不属于正式剧情。"),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "继续 测试同学 的故事" }).click();
  await page.getByRole("button", { name: "轻触解锁" }).click();
  await page.getByRole("button", { name: "打开备忘录", exact: true }).click();
  await page
    .locator(".notes-list button")
    .filter({ hasText: "测试小游戏 · 线索盒" })
    .click();
  await expect(page.getByPlaceholder("内容密码")).toHaveCount(0);
  await expect(
    page.getByText("解锁成功。这是小游戏测试内容，不属于正式剧情。"),
  ).toBeVisible();
});
test("production contains no development controls", async ({ page }) => {
  await enter(page);
  await expect(
    page.getByRole("button", { name: "开发调试（仅开发环境）" }),
  ).toHaveCount(0);
});

test("chapter three roster review, restored checkmarks, scene and private memo", async ({ page }) => {
  test.setTimeout(120000);
  const { mergeExtensions } = await import("../src/authoring/compile");
  const active = compileProject(
    read("chapter-01.json"), read("project.json"), cast, assets,
    mergeExtensions([read("chapter-01.extensions.json"), read("chapter-02.json"), read("chapter-03.json"), read("chapter-04.json")]),
    {}, read("interactions.json"),
  ).work;
  // Dedicated UI fixture; production defaults and story routes remain unmodified.
  active.variables["chapter.chapter-01-good-weather.completed"] = true;
  active.variables["chapter.chapter-02-small-crush.completed"] = true;
  active.variables["chapter.chapter-02-small-crush.started"] = true;
  active.variables["friend.junhao.state"] = "accepted";
  active.variables["friend.star.state"] = "met";
  active.nodes = active.nodes.filter((n) => n.id !== "ch01-start");
  await page.route("**/work.json", (route) => route.fulfill({ json: active }));
  await enter(page);
  await page.getByRole("button", { name: "打开备忘录", exact: true }).click();
  await page.getByRole("button", { name: /第三章 · 报名表之外/ }).click();
  await page.getByRole("button", { name: "剧情指引", exact: true }).click();
  await page.getByRole("dialog", { name: "当前剧情指引", exact: true }).getByRole("button", { name: "打开微信", exact: true }).click();
  await page.getByRole("button", { name: /选择回复/ }).click();
  await page.getByRole("button", { name: "好，我来核对。", exact: true }).click();
  await page.getByRole("button", { name: "剧情指引", exact: true }).click();
  await page.getByRole("heading", { name: "查看并核对报名表" }).waitFor({ timeout: 20000 });
  await page.getByRole("dialog", { name: "当前剧情指引", exact: true }).getByRole("button", { name: "打开文件", exact: true }).click();
  await expect(page.getByRole("button", { name: "提交本轮核对" })).toBeDisabled();
  await page.getByRole("button", { name: "查看朱志鑫的报名资料" }).click();
  await expect(page.getByRole("region", { name: "朱志鑫的公开资料" })).toContainText("活动材料与流程协助");
  for (const name of ["张峻豪", "张泽禹", "左航"])
    await page.getByRole("button", { name: `查看${name}的报名资料` }).click();
  await expect(page.getByRole("status")).toContainText("4 / 4");
  await page.reload();
  await page.getByRole("button", { name: /继续.*的故事/ }).click();
  await page.getByRole("button", { name: "轻触解锁", exact: true }).click();
  await page.getByRole("button", { name: "剧情指引", exact: true }).click();
  await page.getByRole("dialog", { name: "当前剧情指引", exact: true }).getByRole("button", { name: "打开文件", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("4 / 4");
  await page.getByRole("button", { name: "提交本轮核对" }).click();
  await expect(page.getByText("本轮核对已提交。资料仍可回看，回工作群继续即可。", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "剧情指引", exact: true }).click();
  await page.getByRole("dialog", { name: "当前剧情指引", exact: true }).getByRole("button", { name: "打开微信", exact: true }).click();
  await page.getByRole("button", { name: /选择回复/ }).click({ timeout: 25000 });
  await page.getByRole("button", { name: "先写“意向待补”，设备和人员都确认后再转正式报名。", exact: true }).click();
  await page.getByRole("button", { name: "剧情指引", exact: true }).click();
  await page.getByRole("heading", { name: "排练室门口" }).waitFor({ timeout: 15000 });
  await page.getByRole("dialog", { name: "当前剧情指引", exact: true }).getByRole("button", { name: "打开文件", exact: true }).click();
  await page.getByRole("button", { name: "交回核对单，再看一眼登记表" }).click();
  await page.getByRole("button", { name: "解释自己在分开核对两种意向。" }).click();
  await expect(page.getByText("这版是你核的？", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "剧情指引", exact: true }).click();
  await page.getByRole("dialog", { name: "当前剧情指引", exact: true }).getByRole("button", { name: "打开文件", exact: true }).click();
  await expect(page.getByRole("heading", { name: "文化节节目单 · 核对后" })).toBeVisible();
  await page.getByRole("button", { name: "剧情指引", exact: true }).click();
  await page.getByRole("dialog", { name: "当前剧情指引", exact: true }).getByRole("button", { name: "打开朋友圈", exact: true }).click();
  await page.getByRole("button", { name: /张泽禹 今天先把待定写清楚/ }).click();
  await page.getByRole("button", { name: "剧情指引", exact: true }).click();
  await page.getByRole("dialog", { name: "当前剧情指引", exact: true }).getByRole("button", { name: "打开备忘录", exact: true }).click();
  await expect(page.getByText(/第三章《报名表之外》已完成/).first()).toBeVisible();
});

test("chapter four text Demo, neutral work response, branch memo and save restore", async ({ page }) => {
  test.setTimeout(120000);
  const { mergeExtensions } = await import("../src/authoring/compile");
  const active = compileProject(read("chapter-01.json"), read("project.json"), cast, assets,
    mergeExtensions([read("chapter-01.extensions.json"), read("chapter-02.json"), read("chapter-03.json"), read("chapter-04.json")]), {}, read("interactions.json")).work;
  // Isolated browser fixture; production starts and all real chapter paths are separately tested.
  for (const id of ["chapter-01-good-weather", "chapter-02-small-crush", "chapter-03-beyond-form"])
    active.variables[`chapter.${id}.completed`] = true;
  active.variables["chapter.chapter-02-small-crush.started"] = true;
  active.variables["friend.junhao.state"] = "accepted";
  active.variables["friend.star.state"] = "met";
  active.nodes = active.nodes.filter((n) => n.id !== "ch01-start");
  await page.route("**/work.json", (route) => route.fulfill({ json: active }));
  await enter(page);
  await page.getByRole("button", { name: "打开备忘录", exact: true }).click();
  await page.getByRole("button", { name: /第四章 · 未完成的旋律/ }).click();
  await page.getByRole("button", { name: "剧情指引", exact: true }).click();
  await page.getByRole("heading", { name: "先核附件和版本" }).waitFor({ timeout: 20000 });
  await page.getByRole("dialog", { name: "当前剧情指引", exact: true }).getByRole("button", { name: "打开文件", exact: true }).click();
  await expect(page.getByRole("heading", { name: "节目附件登记 · 草稿版" })).toBeVisible();
  await page.getByRole("button", { name: "剧情指引", exact: true }).click();
  await page.getByRole("dialog", { name: "当前剧情指引", exact: true }).getByRole("button", { name: "打开文件", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("没有实际音频播放");
  await expect(page.locator("audio")).toHaveCount(0);
  await page.getByRole("button", { name: "记录已看完，回复张峻豪" }).click();
  await page.getByRole("button", { name: "剧情指引", exact: true }).click();
  await page.getByRole("dialog", { name: "当前剧情指引", exact: true }).getByRole("button", { name: "打开微信", exact: true }).click();
  await page.getByRole("button", { name: /选择回复/ }).click({ timeout: 15000 });
  await expect(page.getByRole("group", { name: "预设回复选项" }).getByRole("button")).toHaveCount(3);
  await page.getByRole("button", { name: "我先把版本和附件核清楚，旋律的事晚点再聊。", exact: true }).click();
  await expect(page.getByRole("button", { name: "行，先把你手头的做完。", exact: true })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "剧情指引", exact: true }).click();
  await page.getByRole("heading", { name: "把附件单送过去" }).waitFor({ timeout: 15000 });
  await page.getByRole("dialog", { name: "当前剧情指引", exact: true }).getByRole("button", { name: "打开文件", exact: true }).click();
  await page.getByRole("button", { name: "收好附件单，回工作群看看" }).click();
  await page.getByRole("button", { name: "剧情指引", exact: true }).click();
  await page.getByRole("heading", { name: "今晚，先记这些" }).waitFor({ timeout: 15000 });
  await page.getByRole("dialog", { name: "当前剧情指引", exact: true }).getByRole("button", { name: "打开备忘录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "先把手头的做完" })).toBeVisible();
  await expect(page.getByText(/第四章《未完成的旋律》已完成/).first()).toBeVisible();
  await page.getByRole("button", { name: "返回手机", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /继续.*的故事/ }).click();
  await page.getByRole("button", { name: "轻触解锁", exact: true }).click();
  await page.getByRole("button", { name: "剧情指引", exact: true }).click();
  await expect(page.getByRole("heading", { name: "第四章已完成" })).toBeVisible();
});
