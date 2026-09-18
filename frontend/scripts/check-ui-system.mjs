import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const frontendRoot = resolve(import.meta.dirname, "..");
const srcRoot = join(frontendRoot, "src");
const failures = [];

function walk(dir) {
  return readdirSync(dir)
    .filter((name) => !name.startsWith("._"))
    .flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
}

const sourceFiles = walk(srcRoot);
const styleExtensions = new Set([".css", ".scss", ".sass", ".less", ".styl"]);
const codeFiles = sourceFiles.filter((file) => /\.(?:tsx?|jsx?)$/.test(file));

for (const file of sourceFiles) {
  if (styleExtensions.has(extname(file))) {
    failures.push(`${relative(frontendRoot, file)} is a legacy stylesheet; Chakra clean-slate branch must have no source stylesheets`);
  }
}

for (const file of codeFiles) {
  const text = readFileSync(file, "utf8");

  if (/import\s+["'][^"']+\.(?:css|scss|sass|less|styl)["']/.test(text)) {
    failures.push(`${relative(frontendRoot, file)} imports a legacy stylesheet`);
  }

  if (/\bstyle\s*=/.test(text)) {
    failures.push(`${relative(frontendRoot, file)} contains an inline style prop`);
  }
}

if (failures.length) {
  console.error("APPAPONI STYLELESS UI CHECK: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("APPAPONI STYLELESS UI CHECK: PASS");
console.log("No legacy CSS imports, source stylesheets, or inline style props are active.");
