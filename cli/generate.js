#!/usr/bin/env node
const { spawnSync } = require("child_process");
const path = require("path");

const target = path.join(__dirname, "generate.ts");
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", target, ...process.argv.slice(2)],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
