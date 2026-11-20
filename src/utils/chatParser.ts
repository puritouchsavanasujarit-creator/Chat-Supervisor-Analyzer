import * as XLSX from 'xlsx';
import { detectTimestampsInText } from './timestamp.ts';

export { detectTimestampsInText };

export interface ParsedImportResult {
  transcript: string;
  detectedAgentName?: string;
  detectedScenarioLabel?: string;
  rowCount: number;
  summaryNote: string;
}


function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function rowsToTranscript(rows: string[][]): ParsedImportResult {
  const nonEmpty = rows.filter((r) => r.some((cell) => cell && cell.trim().length > 0));
  if (nonEmpty.length === 0) {
    return { transcript: '', rowCount: 0, summaryNote: 'ไม่พบข้อมูลข้อความในไฟล์' };
  }

  const header = nonEmpty[0].map((h) => h.toLowerCase());
  const hasHeader =
    header.some((h) =>
      ['sender', 'role', 'speaker', 'message', 'text', 'time', 'timestamp', 'ผู้ส่ง', 'ข้อความ', 'เวลา', 'บทสนทนา'].some(
        (kw) => h.includes(kw)
      )
    );

  const dataRows = hasHeader ? nonEmpty.slice(1) : nonEmpty;

  const findCol = (keywords: string[], fallback: number) => {
    if (!hasHeader) return fallback;
    const idx = header.findIndex((h) => keywords.some((k) => h.includes(k)));
    return idx >= 0 ? idx : fallback;
  };

  const timeIdx = hasHeader ? header.findIndex((h) => ['time', 'timestamp', 'เวลา', 'date'].some((k) => h.includes(k))) : -1;
  const senderIdx = findCol(['sender', 'role', 'speaker', 'from', 'ผู้ส่ง', 'บทบาท'], 0);
  const messageIdx = findCol(
    ['message', 'text', 'chat', 'content', 'msg', 'ข้อความ', 'บทสนทนา'],
    nonEmpty[0].length > 1 ? 1 : 0
  );

  const lines: string[] = [];
  for (const row of dataRows) {
    if (row.length === 1) {
      if (row[0].trim()) lines.push(row[0].trim());
      continue;
    }
    const timeVal = timeIdx >= 0 && row[timeIdx] ? `[${row[timeIdx].trim()}] ` : '';
    const senderVal = row[senderIdx] ? row[senderIdx].trim() : '';
    const msgVal = row[messageIdx] ? row[messageIdx].trim() : row.slice(1).join(' ').trim();
    if (!msgVal) continue;
    lines.push(senderVal ? `${timeVal}${senderVal}: ${msgVal}` : `${timeVal}${msgVal}`);
  }

  return {
    transcript: lines.join('\n'),
    rowCount: lines.length,
    summaryNote: `นำเข้าบทสนทนาสำเร็จ ${lines.length} บรรทัด`,
  };
}

export async function parseChatFile(
  file: File,
  mode: 'txt' | 'csv' | 'excel'
): Promise<ParsedImportResult> {
  if (mode === 'txt') {
    const text = await file.text();
    const cleaned = text.replace(/\r\n/g, '\n').trim();
    const lineCount = cleaned ? cleaned.split('\n').filter((l) => l.trim()).length : 0;
    return {
      transcript: cleaned,
      rowCount: lineCount,
      summaryNote: `อ่านไฟล์ TXT สำเร็จ (${lineCount} บรรทัด)`,
    };
  }

  if (mode === 'csv') {
    const text = await file.text();
    const rawLines = text.replace(/\r\n/g, '\n').split('\n');
    const rows = rawLines.map(parseCsvLine);
    return rowsToTranscript(rows);
  }

  // Excel (.xlsx / .xls)
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { transcript: '', rowCount: 0, summaryNote: 'ไม่พบชีทข้อมูลในไฟล์ Excel' };
  }
  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    defval: '',
  });
  const stringRows = rawRows.map((row) => row.map((cell) => String(cell ?? '').trim()));
  return rowsToTranscript(stringRows);
}
