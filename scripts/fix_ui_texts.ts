// scripts/fix_ui_texts.ts
import { promises as fs } from "fs";
import path from "path";

// Directories to scan
const dirs = [
  path.resolve("c:/Users/alpp5/aeigsthub588/src/pages"),
  path.resolve("c:/Users/alpp5/aeigsthub588/src/components"),
];

// Regex to find TextScramble text prop literals
const regex = /text=\"([^\"]*)\"/g;

function cleanString(str: string): string {
  // Replace underscores with spaces and strip Unicode replacement chars (�)
  return str.replace(/_/g, " ").replace(/\uFFFD/g, "");
}

async function processFile(filePath: string) {
  let content = await fs.readFile(filePath, "utf-8");
  let changed = false;
  content = content.replace(regex, (match, p1) => {
    const cleaned = cleanString(p1);
    if (cleaned !== p1) {
      changed = true;
      return `text=\"${cleaned}\"`;
    }
    return match;
  });
  if (changed) {
    await fs.writeFile(filePath, content, "utf-8");
    console.log("✔️ Fixed", filePath);
  }
}

async function walk(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
    } else if (full.endsWith(".tsx")) {
      await processFile(full);
    }
  }
}

(async () => {
  for (const d of dirs) {
    await walk(d);
  }
  console.log("✅ UI text cleanup completed.");
})();
