// Small dependency-free CSV parser — good enough for the simple, flat order
// sheets dispatchers export from WhatsApp/Excel. Handles quoted fields and
// commas/quotes inside quotes; doesn't handle embedded newlines inside quotes.
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ",") {
          fields.push(cur);
          cur = "";
        } else cur += ch;
      }
    }
    fields.push(cur);
    return fields.map((f) => f.trim());
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}
