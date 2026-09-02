import { google } from "googleapis";

// Nome da coluna que o sistema cria/usa na planilha do cliente pra escrever
// o status do funil de volta, quando o lead muda de etapa no CRM.
export const STATUS_COLUMN_HEADER = "Status CRM";

let cachedAuth: InstanceType<typeof google.auth.JWT> | null = null;

function getAuth() {
  if (cachedAuth) return cachedAuth;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error(
      "Integração com Planilha Google não configurada (faltam GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)."
    );
  }
  // no .env a chave vem com \n escapado (string de uma linha só)
  const privateKey = rawKey.replace(/\\n/g, "\n");

  cachedAuth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return cachedAuth;
}

function getSheetsApi() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

// Aceita tanto a URL completa quanto só o ID da planilha.
export function extractSheetId(input: string): string | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) return urlMatch[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

export function columnIndexToLetter(index: number): string {
  let letter = "";
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

function rangeForTab(tab: string | null | undefined, cells: string) {
  return tab ? `'${tab.replace(/'/g, "''")}'!${cells}` : cells;
}

export type SheetSnapshot = {
  header: string[];
  rows: string[][];
};

// Lê a planilha inteira (linha 1 = cabeçalho). Limite de 5000 linhas e 60
// colunas — mais que suficiente pra um export de leads.
export async function readSheet(sheetId: string, tab?: string | null): Promise<SheetSnapshot> {
  const sheets = getSheetsApi();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: rangeForTab(tab, "A1:BH5000"),
  });
  const values = res.data.values ?? [];
  const [header = [], ...rows] = values as string[][];
  return { header, rows };
}

export function rowsToRecords(header: string[], rows: string[][]): Record<string, string>[] {
  return rows
    .filter((r) => r.some((cell) => cell && cell.trim() !== ""))
    .map((row) => {
      const record: Record<string, string> = {};
      header.forEach((h, i) => {
        if (h) record[h] = row[i] ?? "";
      });
      return record;
    });
}

// Garante que a planilha tem a coluna "Status CRM" — cria na primeira
// coluna vazia da linha 1 se ainda não existir. Retorna a letra da coluna.
export async function ensureStatusColumn(sheetId: string, tab: string | null | undefined, header: string[]): Promise<string> {
  const existingIndex = header.findIndex((h) => h?.trim().toLowerCase() === STATUS_COLUMN_HEADER.toLowerCase());
  if (existingIndex >= 0) return columnIndexToLetter(existingIndex);

  const newIndex = header.length; // próxima coluna livre
  const letter = columnIndexToLetter(newIndex);
  const sheets = getSheetsApi();
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: rangeForTab(tab, `${letter}1`),
    valueInputOption: "RAW",
    requestBody: { values: [[STATUS_COLUMN_HEADER]] },
  });
  return letter;
}

// Escreve o status numa linha específica (baseado no índice da linha de
// dados, 0 = primeira linha depois do cabeçalho).
export async function writeStatusCell(
  sheetId: string,
  tab: string | null | undefined,
  statusColumnLetter: string,
  dataRowIndex: number,
  statusLabel: string
) {
  const sheets = getSheetsApi();
  const rowNumber = dataRowIndex + 2; // +1 pro cabeçalho, +1 porque planilha é 1-indexed
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: rangeForTab(tab, `${statusColumnLetter}${rowNumber}`),
    valueInputOption: "RAW",
    requestBody: { values: [[statusLabel]] },
  });
}

// Testa se a conta de serviço tem acesso de leitura (usado ao conectar, pra
// dar erro claro na hora em vez de só falhar silenciosamente depois).
export async function testSheetAccess(sheetId: string, tab?: string | null): Promise<{ ok: true; rowCount: number } | { ok: false; error: string }> {
  try {
    const { rows } = await readSheet(sheetId, tab);
    return { ok: true, rowCount: rows.length };
  } catch (err: any) {
    const message = err?.errors?.[0]?.message || err?.message || "Erro desconhecido ao acessar a planilha.";
    return { ok: false, error: message };
  }
}
