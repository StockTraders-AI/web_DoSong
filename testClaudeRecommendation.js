/**
 * Standalone test: generate the "Khuyến nghị từ AI" title/body/action for one
 * date using Claude (Anthropic) instead of the hardcoded DEFAULT_TEMPLATES /
 * old chatbotgpt HTTP call in doSongRecommendationDb.js. Does not touch the
 * live server or DB writes - just prints Claude's output for comparison.
 *
 * Usage (PowerShell):
 *   $env:ANTHROPIC_API_KEY="sk-ant-..."; node testClaudeRecommendation.js --date 2026-08-26
 * Usage (bash):
 *   ANTHROPIC_API_KEY=sk-ant-... node testClaudeRecommendation.js --date 2026-08-26
 */
import { buildRecommendationDailyStates } from "./doSongRecommendationDb.js";
import { initStockDataDb, DB_PATH } from "./stockDataDb.js";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseArgs(argv) {
  const options = { date: formatDateKey(new Date()) };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--date") options.date = argv[++i] || options.date;
    else if (arg.startsWith("--date=")) options.date = arg.slice("--date=".length);
  }
  return options;
}

function buildPrompt(state) {
  const w = state.wave;
  return [
    "Ban la chuyen gia phan tich dong tien chung khoan Viet Nam theo mo hinh 'do song' (chu ky song thi truong).",
    `Du lieu tin hieu ngay ${state.dateKey}:`,
    `- Cho mua: ${w.choMua} ma`,
    `- Mua: ${w.mua} ma`,
    `- Cho ban: ${w.choBan} ma`,
    `- Ban: ${w.ban} ma`,
    `- Tong: ${w.tong} ma`,
    `- Trang thai do song (theo he thong noi bo, KHONG duoc doi ten khac): ${state.effectiveState}${state.pha ? `, giai doan: ${state.pha}` : ""}`,
    "",
    "Hay viet 3 phan bang tieng Viet, ngan gon, giong van phong khuyen nghi dau tu chuyen nghiep, dua DUNG tren cac con so tren, khong bia them so lieu khac:",
    "1. title: 1 cau tieu de ngan (duoi 12 tu) tom tat nhan dinh thi truong.",
    "2. body: 2-3 cau giai thich dua tren cac con so tren.",
    "3. action: 1 cau khuyen nghi hanh dong cu the cho nha dau tu.",
    "",
    'Tra loi DUNG dinh dang JSON, khong them chu gi khac ngoai JSON: {"title": "...", "body": "...", "action": "..."}',
  ].join("\n");
}

async function callClaude(promptText) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      "Thieu ANTHROPIC_API_KEY. Chay lai voi: $env:ANTHROPIC_API_KEY=\"sk-ant-...\"; node testClaudeRecommendation.js"
    );
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: promptText }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Claude API loi ${res.status}: ${data?.error?.message || res.statusText}`);
  }
  return (data.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

function parseClaudeJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await initStockDataDb();
  console.log(`[claude-test] DB ready at ${DB_PATH}`);

  const states = await buildRecommendationDailyStates({ from: options.date, to: options.date });
  const state = states[0];
  if (!state) {
    console.error(`[claude-test] Khong tim thay du lieu do song cho ngay ${options.date}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[claude-test] Ngay ${state.dateKey} | trang thai ${state.effectiveState} | pha ${state.pha || "?"}`);
  console.log("[claude-test] So lieu:", state.wave);

  console.log("[claude-test] Dang goi Claude...");
  const rawText = await callClaude(buildPrompt(state));

  let parsed;
  try {
    parsed = parseClaudeJson(rawText);
  } catch (error) {
    console.error("[claude-test] Khong parse duoc JSON tu Claude, in nguyen van phan hoi:");
    console.log(rawText);
    return;
  }

  console.log("\n=== Ket qua tu Claude ===");
  console.log("title:  ", parsed.title);
  console.log("body:   ", parsed.body);
  console.log("action: ", parsed.action);

  const fallback = state; // for quick eyeball comparison against DEFAULT_TEMPLATES if needed
  console.log("\n(so sanh: trang thai goc de doi chieu voi DEFAULT_TEMPLATES trong doSongRecommendationDb.js)");
  console.log("effectiveState:", fallback.effectiveState);
}

main().catch((error) => {
  console.error("[claude-test] failed:", error);
  process.exitCode = 1;
});
