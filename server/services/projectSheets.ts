import { google } from "googleapis";
import { db } from "../db.js";
import { projects, projectFields } from "../../shared/schema.js";
import { decrypt } from "./crypto.js";
import { eq } from "drizzle-orm";

async function getSheetsClient(projectId: string) {
  const [proj] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!proj) throw new Error("المشروع غير موجود");
  if (!proj.googleServiceAccountKeyEnc || !proj.googleServiceAccountEmail) {
    throw new Error("لم يتم إعداد Google Sheets لهذا المشروع");
  }

  const keyJson = decrypt(proj.googleServiceAccountKeyEnc);
  const credentials = JSON.parse(keyJson);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  return { sheets, proj };
}

async function getProjectFields(projectId: string) {
  return db.select().from(projectFields)
    .where(eq(projectFields.projectId, projectId))
    .orderBy(projectFields.stepNumber, projectFields.orderIndex);
}

// Ensure header row exists with all field labels
async function ensureHeaders(sheets: any, spreadsheetId: string, sheetName: string, fields: any[]) {
  const headers = ["م", ...fields.map(f => f.label)];
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });
  const existing = res.data.values?.[0] || [];
  if (existing.join(",") !== headers.join(",")) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!1:1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
  }
}

export async function appendRecordToSheet(projectId: string, recordData: Record<string, any>, seqNum: number): Promise<number | null> {
  try {
    const { sheets, proj } = await getSheetsClient(projectId);
    if (!proj.googleSheetId) return null;

    const fields = await getProjectFields(projectId);
    const sheetName = proj.googleSheetName || "بيانات";

    await ensureHeaders(sheets, proj.googleSheetId, sheetName, fields);

    const row = [String(seqNum), ...fields.map(f => String(recordData[f.key] ?? ""))];

    const res = await sheets.spreadsheets.values.append({
      spreadsheetId: proj.googleSheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    const updatedRange: string = res.data.updates?.updatedRange || "";
    const match = updatedRange.match(/!A(\d+)/);
    return match ? parseInt(match[1]) : null;
  } catch (err) {
    console.error("[ProjectSheets] appendRecordToSheet error:", err);
    return null;
  }
}

export async function updateRecordRow(projectId: string, rowIndex: number, recordData: Record<string, any>, seqNum: number): Promise<void> {
  try {
    const { sheets, proj } = await getSheetsClient(projectId);
    if (!proj.googleSheetId) return;

    const fields = await getProjectFields(projectId);
    const sheetName = proj.googleSheetName || "بيانات";

    const row = [String(seqNum), ...fields.map(f => String(recordData[f.key] ?? ""))];

    await sheets.spreadsheets.values.update({
      spreadsheetId: proj.googleSheetId,
      range: `${sheetName}!A${rowIndex}`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
  } catch (err) {
    console.error("[ProjectSheets] updateRecordRow error:", err);
  }
}

export async function deleteRecordRow(projectId: string, rowIndex: number): Promise<boolean> {
  try {
    const { sheets, proj } = await getSheetsClient(projectId);
    if (!proj.googleSheetId) return false;

    // Get spreadsheet ID of the sheet to get sheetId
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: proj.googleSheetId });
    const sheetName = proj.googleSheetName || "بيانات";
    const sheetMeta = spreadsheet.data.sheets?.find(
      (s: any) => s.properties?.title === sheetName
    );
    if (!sheetMeta?.properties?.sheetId) return false;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: proj.googleSheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetMeta.properties.sheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        }],
      },
    });
    return true;
  } catch (err) {
    console.error("[ProjectSheets] deleteRecordRow error:", err);
    return false;
  }
}

export async function testProjectSheetsConnection(projectId: string): Promise<{ ok: boolean; message: string }> {
  try {
    const { sheets, proj } = await getSheetsClient(projectId);
    if (!proj.googleSheetId) return { ok: false, message: "لم يتم إدخال Sheet ID" };

    await sheets.spreadsheets.get({ spreadsheetId: proj.googleSheetId });
    return { ok: true, message: "✅ تم الاتصال بـ Google Sheets بنجاح" };
  } catch (err: any) {
    return { ok: false, message: `❌ ${err.message}` };
  }
}

export async function createProjectSheet(projectId: string): Promise<{ ok: boolean; sheetId?: string; message: string }> {
  try {
    const { sheets, proj } = await getSheetsClient(projectId);
    const fields = await getProjectFields(projectId);
    const sheetName = proj.googleSheetName || proj.name || "بيانات";

    let spreadsheetId = proj.googleSheetId;

    if (!spreadsheetId) {
      const newSheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: { title: proj.name },
          sheets: [{ properties: { title: sheetName } }],
        },
      });
      spreadsheetId = newSheet.data.spreadsheetId!;
      // Save the new sheet ID
      await db.update(projects).set({ googleSheetId: spreadsheetId }).where(eq(projects.id, projectId));
    }

    await ensureHeaders(sheets, spreadsheetId, sheetName, fields);
    return { ok: true, sheetId: spreadsheetId, message: "✅ تم إنشاء/تحديث Google Sheet بنجاح" };
  } catch (err: any) {
    return { ok: false, message: `❌ ${err.message}` };
  }
}
