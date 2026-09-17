import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const frontendRoot = resolve(import.meta.dirname, "..");
const srcRoot = join(frontendRoot, "src");
const indexCssPath = join(srcRoot, "index.css");
const indexCss = readFileSync(indexCssPath, "utf8");
const failures = [];

function walk(dir) {
  return readdirSync(dir)
    .filter((name) => !name.startsWith("._"))
    .flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
}

const sourceFiles = walk(srcRoot).filter((file) => /\.(?:css|tsx?)$/.test(file));

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
console.log("Canonical tokens/classes enforced; no !important or off-token colors found.");
