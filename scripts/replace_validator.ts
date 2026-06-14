import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve("c:/Users/alpp5/aeigsthub588/src");
const EXT = ".ts";

function walk(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (full.endsWith(EXT)) {
      replaceInFile(full);
    }
  }
}

function replaceInFile(filePath: string) {
  const content = fs.readFileSync(filePath, "utf8");
  const original = content;
  // Replace .validator( with .inputValidator(
  const updated = content.replace(/\.validator\(/g, ".inputValidator(");
  if (updated !== original) {
    fs.writeFileSync(filePath, updated, "utf8");
    console.log(`Updated ${filePath}`);
  }
}

walk(ROOT);
