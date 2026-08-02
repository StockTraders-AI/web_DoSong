import {
  backfillRecommendationDaily,
  seedDefaultRecommendationTemplates,
  seedRecommendationTemplatesFromChatAi,
  RECOMMENDATION_PROMPT_VERSION,
} from "./doSongRecommendationDb.js";
import { initStockDataDb, DB_PATH, getRecommendationDailyRangeFromDb } from "./stockDataDb.js";

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseArgs(argv) {
  const options = {
    from: "2025-01-01",
    to: formatDateKey(new Date()),
    aiTemplates: false,
    overwriteTemplates: false,
    seedOnly: false,
    promptVersion: RECOMMENDATION_PROMPT_VERSION,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--from") options.from = argv[++i] || options.from;
    else if (arg.startsWith("--from=")) options.from = arg.slice("--from=".length);
    else if (arg === "--to") options.to = argv[++i] || options.to;
    else if (arg.startsWith("--to=")) options.to = arg.slice("--to=".length);
    else if (arg === "--ai-templates") options.aiTemplates = true;
    else if (arg === "--overwrite-templates") options.overwriteTemplates = true;
    else if (arg === "--seed-only") options.seedOnly = true;
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await initStockDataDb();
  console.log(`[recommendation] DB ready at ${DB_PATH}`);

  if (options.aiTemplates) {
    console.log("[recommendation] seeding 9 templates from ChatAI");
    const saved = await seedRecommendationTemplatesFromChatAi({ overwrite: options.overwriteTemplates });
    console.log(`[recommendation] ChatAI templates saved: ${saved}`);
  } else {
    const saved = await seedDefaultRecommendationTemplates({ overwrite: options.overwriteTemplates });
    console.log(`[recommendation] default templates saved: ${saved}`);
  }

  if (options.seedOnly) return;

  const result = await backfillRecommendationDaily({
    from: options.from,
    to: options.to,
    promptVersion: options.promptVersion,
    seedTemplates: false,
  });
  console.log(`[recommendation] daily saved: ${result.saved}/${result.states}, missingTemplates=${result.missingTemplates}`);

  const sample = await getRecommendationDailyRangeFromDb({ from: options.from, to: options.to, promptVersion: options.promptVersion });
  console.log(`[recommendation] db rows in range: ${sample.length}`);
  if (sample[0]) {
    console.log(`[recommendation] latest: ${sample[0].date_key} ${sample[0].effective_state} - ${sample[0].title}`);
  }
}

main().catch((error) => {
  console.error("[recommendation] failed:", error);
  process.exitCode = 1;
});
