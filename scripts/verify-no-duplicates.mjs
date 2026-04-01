#!/usr/bin/env node
import { readdir, readFile } from "fs/promises";
import path from "path";

const SRC_DIR = path.resolve(process.cwd(), "src");

async function getFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? getFiles(full) : full;
  }));
  return files.flat().filter((f) => /\.(ts|tsx)$/.test(f));
}

// Next.js route segment config exports that are expected to appear in multiple page files
const NEXTJS_ROUTE_CONFIGS = new Set(["dynamic", "revalidate", "runtime", "preferredRegion", "maxDuration", "fetchCache", "dynamicParams", "generateStaticParams", "metadata", "generateMetadata"]);

async function getExports(file) {
  const content = await readFile(file, "utf8");
  return [...content.matchAll(/^export\s+(?:function|class|const|type|interface|enum)\s+(\w+)/gm)]
    .map((m) => m[1])
    .filter((name) => !NEXTJS_ROUTE_CONFIGS.has(name));
}

async function main() {
  const files = await getFiles(SRC_DIR);
  const seen = new Map();
  let hasDuplicates = false;
  for (const file of files) {
    for (const name of await getExports(file)) {
      if (seen.has(name)) {
        console.error(`Duplicate export "${name}" in:\n  ${seen.get(name)}\n  ${file}`);
        hasDuplicates = true;
      } else {
        seen.set(name, file);
      }
    }
  }
  if (hasDuplicates) process.exit(1);
  else console.log(`OK: No duplicate exports found across ${files.length} files.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
