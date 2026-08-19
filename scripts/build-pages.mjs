import { spawnSync } from "node:child_process";

const contentResult = spawnSync(process.execPath, ["scripts/generate-content.mjs"], {
  stdio: "inherit",
});

if (contentResult.status !== 0) process.exit(contentResult.status ?? 1);

const result = spawnSync(
  process.execPath,
  ["node_modules/next/dist/bin/next", "build"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      GITHUB_PAGES: "true",
      NEXT_PUBLIC_BASE_PATH: `/${process.env.GITHUB_REPOSITORY?.split("/")[1] || "xiaohey"}`,
    },
  },
);

process.exit(result.status ?? 1);
