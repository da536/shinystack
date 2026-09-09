import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { auditRepository, formatMarkdown, formatText } from "../src/checks.js";

function temporaryRepository() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "shinystack-"));
}

function writeFile(root, relativePath, contents = "content\n") {
  const destination = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, contents);
}

test("an empty repository reports every check as incomplete", () => {
  const root = temporaryRepository();
  const report = auditRepository(root);

  assert.equal(report.passed, 0);
  assert.equal(report.score, 0);
  assert.equal(report.checks.length, 11);
});

test("the audit recognizes common project and community files", () => {
  const root = temporaryRepository();
  writeFile(root, "README.md", "# Example\n");
  writeFile(root, "LICENSE", "MIT\n");
  writeFile(root, "CONTRIBUTING.md");
  writeFile(root, "CODE_OF_CONDUCT.md");
  writeFile(root, "SECURITY.md");
  writeFile(root, ".github/workflows/ci.yml");
  writeFile(root, ".github/ISSUE_TEMPLATE/bug.yml");
  writeFile(root, ".github/PULL_REQUEST_TEMPLATE.md");
  writeFile(root, "tests/example.test.js");
  writeFile(root, "CHANGELOG.md");
  writeFile(root, "package.json", "{}\n");

  const report = auditRepository(root);
  assert.equal(report.passed, 11);
  assert.equal(report.score, 100);
  assert.ok(report.checks.every((check) => check.found));
});

test("text and markdown output include the score and check labels", () => {
  const root = temporaryRepository();
  writeFile(root, "README.md");
  const report = auditRepository(root);

  assert.match(formatText(report), /Score: 1\/11 checks passed/);
  assert.match(formatText(report), /README with setup instructions/);
  assert.match(formatMarkdown(report), /\| Status \| Check \| Details \|/);
  assert.match(formatMarkdown(report), /README with setup instructions/);
});
