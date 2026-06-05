import fs from "node:fs/promises";

const sheetId = process.env.GOOGLE_SHEET_ID || "";
const gid = process.env.GOOGLE_SHEET_GID || "0";
const outputPath = process.env.OUTPUT_PATH || "data/allergy.csv";

if (!sheetId) {
  throw new Error("GOOGLE_SHEET_ID is required.");
}

const sourceUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
const response = await fetch(sourceUrl, {
  headers: {
    "User-Agent": "restaurant-allergy-display-sync/1.0"
  }
});

if (!response.ok) {
  throw new Error(`Failed to fetch Google Sheet CSV: ${response.status} ${response.statusText}`);
}

const csvText = await response.text();
const normalized = normalizeCsv(csvText);

await fs.writeFile(outputPath, normalized, "utf8");
console.log(`Updated ${outputPath} from ${sourceUrl}`);

function normalizeCsv(text) {
  const normalizedNewlines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalizedNewlines.split("\n");

  while (lines.length > 0 && isBlankRow(lines[0])) {
    lines.shift();
  }

  while (lines.length > 0 && isBlankRow(lines[lines.length - 1])) {
    lines.pop();
  }

  return `${lines.join("\n")}\n`;
}

function isBlankRow(line) {
  return line.split(",").every((cell) => cell.trim() === "");
}
