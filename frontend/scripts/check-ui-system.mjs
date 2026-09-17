import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const frontendRoot = resolve(import.meta.dirname, "..");
const srcRoot = join(frontendRoot, "src");
const indexCssPath = join(srcRoot, "index.css");
const indexCss = readFileSync(indexCssPath, "utf8");
const failures = [];

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = indexCss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  return match?.[1] ?? null;
}

function requireRule(selector) {
  const body = ruleBody(selector);
  if (!body) failures.push(`src/index.css is missing canonical rule ${selector}`);
  return body;
}

function walk(dir) {
  return readdirSync(dir)
    .filter((name) => !name.startsWith("._"))
    .flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
}

const sourceFiles = walk(srcRoot).filter((file) => /\.(?:css|tsx?)$/.test(file));
const tsxFiles = sourceFiles.filter((file) => file.endsWith(".tsx"));

// Canonical control invariants. These are deliberately structural: page CSS may
// arrange controls, but it may not silently create a second button/field system.
const buttonRule = requireRule(".app-button");
if (buttonRule) {
  if (!/width:\s*fit-content/.test(buttonRule)) {
    failures.push(".app-button must be content-width by default; use app-button-block for full width");
  }
  if (!/min-height:\s*var\(--control-height-sm\)/.test(buttonRule)) {
    failures.push(".app-button must use the canonical compact control height");
  }
}

const primaryButtonRule = requireRule(".app-button-primary");
if (primaryButtonRule && /min-height\s*:/.test(primaryButtonRule)) {
  failures.push(".app-button-primary must not change button height; primary is emphasis, not size");
}

const blockButtonRule = requireRule(".app-button-block");
if (blockButtonRule && !/width:\s*100%/.test(blockButtonRule)) {
  failures.push(".app-button-block must be the explicit full-width button primitive");
}

const numberRule = requireRule(".app-control-number");
if (numberRule && !/width:\s*\d+px/.test(numberRule)) {
  failures.push(".app-control-number must keep numeric utility fields intentionally narrow");
}

if (!indexCss.includes('input:not([type="checkbox"]):not([type="radio"]):not([type="range"])')) {
  failures.push("shared text-field styling must exclude checkbox/radio/range controls");
}

if (indexCss.includes(".setup-grid > .app-card")) {
  failures.push("reusable setup grids may not nest app-card surfaces; use setup-section");
}

for (const file of tsxFiles) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/<input\b[\s\S]*?>/g)) {
    const tag = match[0];
    if (/type=["']number["']/.test(tag) && !/className=["'][^"']*app-control-number/.test(tag)) {
      failures.push(`${relative(frontendRoot, file)} has a number input without app-control-number`);
    }
  }

  for (const match of text.matchAll(/<button\b[\s\S]*?>/g)) {
    const tag = match[0];
    if (/type=["']submit["']/.test(tag) && !/className=["'][^"']*app-button/.test(tag)) {
      failures.push(`${relative(frontendRoot, file)} has a submit button outside the canonical app-button system`);
    }
  }
}

const schedulingPath = join(srcRoot, "pages", "AdminSchedulingPage.tsx");
const schedulingSource = readFileSync(schedulingPath, "utf8");
const setupStart = schedulingSource.indexOf('<details className="admin-setup-disclosure" open>');
const setupEnd = setupStart >= 0 ? schedulingSource.indexOf("</details>", setupStart) : -1;
if (setupStart < 0 || setupEnd < 0) {
  failures.push("AdminSchedulingPage is missing the reusable scheduling disclosure");
} else {
  const setupSource = schedulingSource.slice(setupStart, setupEnd);
  if (setupSource.includes('className="app-card"')) {
    failures.push("Scheduling reusable setup contains nested app-card surfaces");
  }
  const sectionCount = (setupSource.match(/className="setup-section"/g) ?? []).length;
  if (sectionCount !== 4) {
    failures.push(`Scheduling reusable setup expected 4 flat setup-section blocks, found ${sectionCount}`);
  }
}

for (const file of sourceFiles) {
  const text = readFileSync(file, "utf8");
  if (text.includes("!important")) {
    failures.push(`${relative(frontendRoot, file)} uses !important`);
  }
}

const rootMatch = indexCss.match(/:root\s*\{([\s\S]*?)\}/);
if (!rootMatch) {
  failures.push("src/index.css is missing the :root token block");
} else {
  const outsideRoot = indexCss.replace(rootMatch[0], "");
  if (/#[0-9a-f]{3,8}\b/i.test(outsideRoot) || /\brgba?\(/i.test(outsideRoot)) {
    failures.push("src/index.css contains a literal color outside :root tokens");
  }
}

for (const file of sourceFiles.filter((file) => file.endsWith(".css") && file !== indexCssPath)) {
  const text = readFileSync(file, "utf8");
  if (/#[0-9a-f]{3,8}\b/i.test(text) || /\brgba?\(/i.test(text)) {
    failures.push(`${relative(frontendRoot, file)} contains a literal color; use a :root token`);
  }
}

const retiredClasses = [
  "admin-primary-button",
  "admin-secondary-button",
  "admin-delete-button",
  "admin-edit-button",
  "admin-manage-button",
  "admin-delete-cancel",
  "member-household-cancel",
  "member-household-save",
  "admin-card-head",
  "admin-card",
  "member-card-head",
  "admin-empty",
  "member-empty",
  "admin-error",
  "member-error",
  "admin-status",
  "member-offline",
  "login-error",
  "operations-tabs",
  "member-service-tabs",
  "meal-plan-days",
  "login-submit",
  "login-secondary",
];

for (const file of sourceFiles) {
  const text = readFileSync(file, "utf8");
  for (const className of retiredClasses) {
    const pattern = new RegExp(`(^|[^a-zA-Z0-9_-])${className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-zA-Z0-9_-]|$)`);
    if (pattern.test(text)) {
      failures.push(`${relative(frontendRoot, file)} still uses retired UI class ${className}`);
    }
  }
}

if (failures.length) {
  console.error("APPOPONI UI SYSTEM CHECK: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("APPOPONI UI SYSTEM CHECK: PASS");
console.log("Canonical controls, setup surfaces, tokens/classes, and color rules enforced.");
