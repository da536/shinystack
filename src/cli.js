#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditRepository, formatMarkdown, formatText } from "./checks.js";

const VERSION = "0.1.0";

function usage() {
  return `Usage: shinystack [options]

Audit an open-source repository for contributor and maintenance essentials.

Options:
  --path <directory>       Repository to audit (default: current directory)
  --format <text|json|md>  Output format (default: text)
  --strict                 Exit with code 1 when any check fails
  --version                Print the version
  --help                   Show this help
`;
}

function parseArgs(argv) {
  const options = { repositoryPath: process.cwd(), format: "text", strict: false };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (argument === "--version" || argument === "-v") {
      options.version = true;
    } else if (argument === "--strict") {
      options.strict = true;
    } else if (argument === "--path" || argument === "-p") {
      const value = argv[index + 1];
      if (!value || value.startsWith("-")) throw new Error("--path needs a directory.");
      options.repositoryPath = path.resolve(value);
      index += 1;
    } else if (argument === "--format" || argument === "-f") {
      const value = argv[index + 1];
      if (!value || value.startsWith("-")) throw new Error("--format needs text, json, or md.");
      options.format = value === "markdown" ? "md" : value;
      index += 1;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  if (!["text", "json", "md"].includes(options.format)) {
    throw new Error("--format must be text, json, or md.");
  }

  return options;
}

export async function main(argv = process.argv.slice(2)) {
  let options;

  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error("Run `shinystack --help` for usage.");
    return 2;
  }

  if (options.help) {
    console.log(usage());
    return 0;
  }

  if (options.version) {
    console.log(VERSION);
    return 0;
  }

  const report = auditRepository(options.repositoryPath);
  const output = options.format === "json"
    ? JSON.stringify(report, null, 2)
    : options.format === "md"
      ? formatMarkdown(report)
      : formatText(report);

  console.log(output);
  return options.strict && report.passed !== report.total ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
