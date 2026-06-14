import * as fs from "fs";
import * as path from "path";

// Directory to process
const ROOT = path.resolve("c:/Users/alpp5/aeigsthub588/src");
const EXTENSIONS = [".tsx", ".ts"];

function walk(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (EXTENSIONS.includes(path.extname(entry.name))) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath: string) {
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;
  // Replace underscores that are inside string literals ("..." or '`...`')
  // Simple heuristic: replace all '_' characters that are not part of object keys etc.
  // We'll target only within quotes to avoid breaking identifiers.
  const stringLiteralRegex = /([`\"][^`\"\r\n]*?)([_])([^`\"\r\n]*?[`\"])/g;
  // Replace all underscores with spaces inside string literals
  content = content.replace(
    /([`\"][^`\"\r\n]*?)(_)([^`\"\r\n]*?[`\"])/g,
    (match, p1, p2, p3) => {
      return `${p1} ${p3}`; // replace underscore with space
    },
  );

  // Replace the Unicode replacement character (�) with Turkish Lira sign (₺)
  const replacementChar = "\uFFFD"; // �
  content = content.replace(new RegExp(replacementChar, "g"), "₺");

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Updated ${filePath}`);
  }
}

walk(ROOT);
