import fs from "node:fs";
import path from "node:path";

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".cache"
]);

function exists(root, relativePath) {
  try {
    fs.accessSync(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

function firstExisting(root, candidates) {
  return candidates.find((candidate) => exists(root, candidate)) ?? null;
}

function walk(root, relativeDirectory = "") {
  const directory = path.join(root, relativeDirectory);
  let entries;

  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries.flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) return [];
      return walk(root, relativePath);
    }

    return [relativePath];
  });
}

function filesIn(root, relativeDirectory) {
  return walk(root, relativeDirectory).map((file) => file.split(path.sep).join("/"));
}

function result(id, label, found, details, paths = []) {
  return { id, label, found, details, paths };
}

export function auditRepository(repositoryPath) {
  const root = path.resolve(repositoryPath);
  const allFiles = walk(root).map((file) => file.split(path.sep).join("/"));
  const workflowFiles = filesIn(root, ".github/workflows").filter((file) => /\.(yml|yaml)$/i.test(file));
  const issueTemplateFiles = filesIn(root, ".github/ISSUE_TEMPLATE");
  const testFiles = allFiles.filter((file) =>
    /(^|\/)(test|tests|__tests__)(\/|$)/i.test(file) ||
    /\.(test|spec)\.[^/]+$/i.test(file) ||
    /(^|\/)test_[^/]+\.py$/i.test(file)
  );

  const checks = [
    (() => {
      const found = firstExisting(root, ["README.md", "README", "readme.md"]);
      return result("readme", "README with setup instructions", Boolean(found), found ? `Found ${found}.` : "Add a README with installation and usage.", found ? [found] : []);
    })(),
    (() => {
      const found = firstExisting(root, ["LICENSE", "LICENSE.md", "COPYING"]);
      return result("license", "Open-source license", Boolean(found), found ? `Found ${found}.` : "Choose a license so users know how they can reuse the project.", found ? [found] : []);
    })(),
    (() => {
      const found = firstExisting(root, ["CONTRIBUTING.md", ".github/CONTRIBUTING.md"]);
      return result("contributing", "Contributor guide", Boolean(found), found ? `Found ${found}.` : "Explain setup, tests, style, and the pull request process.", found ? [found] : []);
    })(),
    (() => {
      const found = firstExisting(root, ["CODE_OF_CONDUCT.md", ".github/CODE_OF_CONDUCT.md"]);
      return result("code-of-conduct", "Code of Conduct", Boolean(found), found ? `Found ${found}.` : "Add a clear standard for respectful project participation.", found ? [found] : []);
    })(),
    (() => {
      const found = firstExisting(root, ["SECURITY.md", ".github/SECURITY.md"]);
      return result("security", "Security policy", Boolean(found), found ? `Found ${found}.` : "Tell users how to report a vulnerability privately.", found ? [found] : []);
    })(),
    (() => {
      const found = workflowFiles.length > 0;
      return result("ci", "Continuous integration workflow", found, found ? `${workflowFiles.length} workflow file${workflowFiles.length === 1 ? "" : "s"} found.` : "Add a GitHub Actions workflow that runs checks on every change.", workflowFiles);
    })(),
    (() => {
      const found = issueTemplateFiles.length > 0;
      return result("issue-templates", "Issue templates", found, found ? `${issueTemplateFiles.length} issue template file${issueTemplateFiles.length === 1 ? "" : "s"} found.` : "Add templates that help users file actionable issues.", issueTemplateFiles);
    })(),
    (() => {
      const found = Boolean(firstExisting(root, [".github/PULL_REQUEST_TEMPLATE.md", ".github/pull_request_template.md", "PULL_REQUEST_TEMPLATE.md"]));
      const template = firstExisting(root, [".github/PULL_REQUEST_TEMPLATE.md", ".github/pull_request_template.md", "PULL_REQUEST_TEMPLATE.md"]);
      return result("pull-request-template", "Pull request template", found, found ? `Found ${template}.` : "Add a checklist for tests, documentation, and breaking changes.", template ? [template] : []);
    })(),
    (() => {
      const found = testFiles.length > 0;
      return result("tests", "Automated tests", found, found ? `${testFiles.length} likely test file${testFiles.length === 1 ? "" : "s"} found.` : "Add tests so contributors can verify changes before opening a pull request.", testFiles.slice(0, 20));
    })(),
    (() => {
      const found = Boolean(firstExisting(root, ["CHANGELOG.md", "HISTORY.md", "Changes.md"]));
      const changelog = firstExisting(root, ["CHANGELOG.md", "HISTORY.md", "Changes.md"]);
      return result("changelog", "Changelog or release history", found, found ? `Found ${changelog}.` : "Document user-facing changes so releases are easy to follow.", changelog ? [changelog] : []);
    })(),
    (() => {
      const found = Boolean(firstExisting(root, ["package.json", "pyproject.toml", "Cargo.toml", "go.mod", "pom.xml"]));
      const metadata = firstExisting(root, ["package.json", "pyproject.toml", "Cargo.toml", "go.mod", "pom.xml"]);
      return result("project-metadata", "Project metadata", found, found ? `Found ${metadata}.` : "Add the package or build metadata needed to install and run the project.", metadata ? [metadata] : []);
    })()
  ];

  const passed = checks.filter((check) => check.found).length;
  return {
    repositoryPath: root,
    passed,
    total: checks.length,
    score: Math.round((passed / checks.length) * 100),
    checks
  };
}

export function formatText(report) {
  const lines = [
    `ShinyStack audit: ${report.repositoryPath}`,
    `Score: ${report.passed}/${report.total} checks passed (${report.score}%)`,
    ""
  ];

  for (const check of report.checks) {
    lines.push(`${check.found ? "[x]" : "[ ]"} ${check.label} - ${check.details}`);
  }

  return `${lines.join("\n")}\n`;
}

export function formatMarkdown(report) {
  const lines = [
    `# ShinyStack audit`,
    "",
    `Repository: \`${report.repositoryPath}\``,
    `Score: **${report.passed}/${report.total} checks passed (${report.score}%)**`,
    "",
    "| Status | Check | Details |",
    "| --- | --- | --- |"
  ];

  for (const check of report.checks) {
    lines.push(`| ${check.found ? "PASS" : "TODO"} | ${check.label} | ${check.details} |`);
  }

  return `${lines.join("\n")}\n`;
}
