import { google } from "googleapis";
import { db } from "../db.js";
import { systemSettings } from "../../shared/schema.js";
import { decrypt } from "./crypto.js";
import { eq } from "drizzle-orm";
import type { Employee } from "../../shared/schema.js";

// الترويسات الرسمية — مطابقة تماماً للملف المرجعي "نموذج منصة نواة لمديريات الصحة والهيئات"
// هذه هي الأسماء الرسمية التي يجب أن يتطابق معها الـ Google Sheet والتصدير والمنصة
const DEFAULT_HEADERS = [
  "م",
  "المستوى التنظيمي الاول",
  "التصنيف/ الجهة المرتبطة",
  "المستوى التنظيمي الثاني",
  "المستوى التنظيمي الثالث",
  "المستوى التنظيمي الرابع",
  "المستوى التنظيمي الخامس",
  "محافظة العمل",
  "الرقم الذاتي",
  "مسمى العمل",
  "تاريخ التولد",
  "تاريخ بدء العمل بالدولة",
  "تاريخ التثبيت في الدولة",
  "تاريخ التعاقد في الدولة",
  "الاسم",
  "اسم الأب",
  "النسبة",
  "اسم الأم الكامل",
  "الرقم الوطني",
  "الجنس",
  "رقم الجوال",
  "منطقة السكن",
  "تفصيل مكان السكن",
  "الوضع العائلي",
  "الفئة الوظيفية",
  "مثبت أو متعاقد",
  "نمط التعيين أو التعاقد",
  "تفاصيل دمج",
  "هل لديك إعاقة",
  "نوع الإعاقة",
  "بطاقة الإعاقة",
  "رقم القيد",
  "مكان القيد",
  "دولة الولادة",
  "المحافظة",
  "المنطقة_المدينة",
  "الناحية",
  "آخر مؤهل علمي معين على أساسه",
  "الحالة",
  "تفصيل الحالة",
  "حساب شام كاش",
  "عدد الأبناء",
  "عدد الزوجات",
  "ملاحظات مركزية",
];

// ربط كل ترويسة بدالة تُعيد قيمتها من الـ Employee
// الأسماء مطابقة للملف المرجعي الرسمي
const HEADER_TO_VALUE: Record<string, (emp: Employee) => string> = {
  "م": (emp) => String(emp.sequentialNumber || ""),
  "المستوى التنظيمي الاول": (emp) => emp.orgLevel1 || "",
  "التصنيف/ الجهة المرتبطة": (emp) => emp.orgClassification || "",
  "المستوى التنظيمي الثاني": (emp) => emp.orgLevel2 || "",
  "المستوى التنظيمي الثالث": (emp) => emp.orgLevel3 || "",
  "المستوى التنظيمي الرابع": (emp) => emp.orgLevel4 || "",
  "المستوى التنظيمي الخامس": (emp) => emp.orgLevel5 || "",
  "محافظة العمل": (emp) => emp.workGovernorate || "",
  "الرقم الذاتي": (emp) => emp.employeeRefId || "",
  "مسمى العمل": (emp) => emp.jobTitle || "",
  "تاريخ التولد": (emp) => emp.birthDate || "",
  "تاريخ بدء العمل بالدولة": (emp) => emp.workStartDate || "",
  "تاريخ التثبيت في الدولة": (emp) => emp.permanentDate || "",
  "تاريخ التعاقد في الدولة": (emp) => emp.contractDate || "",
  "الاسم": (emp) => emp.firstName || "",
  "اسم الأب": (emp) => emp.fatherName || "",
  "النسبة": (emp) => emp.familyName || "",
  "اسم الأم الكامل": (emp) => emp.motherFullName || "",
  "الرقم الوطني": (emp) => emp.nationalId || "",
  "الجنس": (emp) => emp.gender || "",
  "رقم الجوال": (emp) => emp.mobile || "",
  "منطقة السكن": (emp) => emp.residenceArea || "",
  "تفصيل مكان السكن": (emp) => emp.residenceDetail || "",
  "الوضع العائلي": (emp) => emp.maritalStatus || "",
  "الفئة الوظيفية": (emp) => emp.jobCategory || "",
  "مثبت أو متعاقد": (emp) => emp.employmentStatus || "",
  "نمط التعيين أو التعاقد": (emp) => emp.appointmentPattern || "",
  "تفاصيل دمج": (emp) => emp.mergeDetails || "",
  "هل لديك إعاقة": (emp) => emp.hasDisability || "",
  "نوع الإعاقة": (emp) => emp.disabilityType || "",
  "بطاقة الإعاقة": (emp) => emp.disabilityCard || "",
  "رقم القيد": (emp) => emp.registryNumber || "",
  "مكان القيد": (emp) => emp.registryPlace || "",
  "دولة الولادة": (emp) => emp.birthCountry || "",
  "المحافظة": (emp) => emp.governorate || "",
  "المنطقة_المدينة": (emp) => emp.cityDistrict || "",
  "الناحية": (emp) => emp.subDistrict || "",
  "آخر مؤهل علمي معين على أساسه": (emp) => emp.lastQualification || "",
  "الحالة": (emp) => emp.status || "",
  "تفصيل الحالة": (emp) => emp.statusDetail || "",
  "حساب شام كاش": (emp) => emp.shamCashAccount || "",
  "عدد الأبناء": (emp) => String(emp.childrenCount ?? ""),
  "عدد الزوجات": (emp) => String(emp.wivesCount ?? ""),
  "ملاحظات مركزية": (emp) => emp.centralNotes || "",
};

// ربط كل ترويسة بالحقل المقابل في قاعدة البيانات (للاستيراد)
const HEADER_TO_FIELD: Record<string, string> = {
  "م": "_sequentialNumber",
  "المستوى التنظيمي الاول": "orgLevel1",
  "التصنيف/ الجهة المرتبطة": "orgClassification",
  "المستوى التنظيمي الثاني": "orgLevel2",
  "المستوى التنظيمي الثالث": "orgLevel3",
  "المستوى التنظيمي الرابع": "orgLevel4",
  "المستوى التنظيمي الخامس": "orgLevel5",
  "محافظة العمل": "workGovernorate",
  "الرقم الذاتي": "employeeRefId",
  "مسمى العمل": "jobTitle",
  "تاريخ التولد": "birthDate",
  "تاريخ بدء العمل بالدولة": "workStartDate",
  "تاريخ التثبيت في الدولة": "permanentDate",
  "تاريخ التعاقد في الدولة": "contractDate",
  "الاسم": "firstName",
  "اسم الأب": "fatherName",
  "النسبة": "familyName",
  "اسم الأم الكامل": "motherFullName",
  "الرقم الوطني": "nationalId",
  "الجنس": "gender",
  "رقم الجوال": "mobile",
  "منطقة السكن": "residenceArea",
  "تفصيل مكان السكن": "residenceDetail",
  "الوضع العائلي": "maritalStatus",
  "الفئة الوظيفية": "jobCategory",
  "مثبت أو متعاقد": "employmentStatus",
  "نمط التعيين أو التعاقد": "appointmentPattern",
  "تفاصيل دمج": "mergeDetails",
  "هل لديك إعاقة": "hasDisability",
  "نوع الإعاقة": "disabilityType",
  "بطاقة الإعاقة": "disabilityCard",
  "رقم القيد": "registryNumber",
  "مكان القيد": "registryPlace",
  "دولة الولادة": "birthCountry",
  "المحافظة": "governorate",
  "المنطقة_المدينة": "cityDistrict",
  "الناحية": "subDistrict",
  "آخر مؤهل علمي معين على أساسه": "lastQualification",
  "الحالة": "status",
  "تفصيل الحالة": "statusDetail",
  "حساب شام كاش": "shamCashAccount",
  "عدد الأبناء": "childrenCount",
  "عدد الزوجات": "wivesCount",
  "ملاحظات مركزية": "centralNotes",
};

async function getAuthClient() {
  const [settings] = await db.select().from(systemSettings).where(eq(systemSettings.id, "singleton"));
  if (!settings?.googleServiceAccountKeyEnc) throw new Error("لم يتم إعداد Google Service Account");

  const keyJson = decrypt(settings.googleServiceAccountKeyEnc);
  const key = JSON.parse(keyJson);

  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return { auth, sheetId: settings.googleSheetId, sheetName: settings.googleSheetName || "Sheet1" };
}

/**
 * يقرأ صف الترويسة الفعلي من الـ Sheet.
 * إذا كان الـ Sheet فارغاً يكتب الترويسات الافتراضية ويعيدها.
 */
async function getOrCreateHeaders(sheets: any, sheetId: string, sheetName: string): Promise<string[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1:AZ1`,
  });

  const existingRow: string[] = res.data.values?.[0] ?? [];
  const trimmed = existingRow.map((h: any) => String(h || "").trim());

  if (trimmed.filter(h => h).length === 0) {
    // Sheet فارغ — اكتب الترويسات الافتراضية
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [DEFAULT_HEADERS] },
    });
    return DEFAULT_HEADERS;
  }

  return trimmed;
}

/**
 * يبني صف البيانات بناءً على ترتيب الترويسة الفعلية في الـ Sheet.
 * كل قيمة تذهب للعمود الصحيح بالاسم، بغض النظر عن ترتيب الأعمدة.
 */
function employeeToRow(emp: Employee, headers: string[]): string[] {
  return headers.map(header => {
    const fn = HEADER_TO_VALUE[header.trim()];
    return fn ? fn(emp) : "";
  });
}

export async function appendToSheet(employee: Employee): Promise<number | null> {
  try {
    const { auth, sheetId, sheetName } = await getAuthClient();
    if (!sheetId) return null;
    const sheets = google.sheets({ version: "v4", auth });

    const headers = await getOrCreateHeaders(sheets, sheetId, sheetName!);
    const row = employeeToRow(employee, headers);

    const lastCol = colLetter(headers.length);
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:${lastCol}`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    const updatedRange = response.data.updates?.updatedRange || "";
    const match = updatedRange.match(/!A(\d+)/);
    return match ? parseInt(match[1]) : null;
  } catch (err) {
    console.error("Google Sheets append error:", err);
    return null;
  }
}

export async function updateSheetRow(rowIndex: number, employee: Employee): Promise<boolean> {
  try {
    const { auth, sheetId, sheetName } = await getAuthClient();
    if (!sheetId || !rowIndex) return false;
    const sheets = google.sheets({ version: "v4", auth });

    const headers = await getOrCreateHeaders(sheets, sheetId, sheetName!);
    const row = employeeToRow(employee, headers);

    const lastCol = colLetter(headers.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A${rowIndex}:${lastCol}${rowIndex}`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
    return true;
  } catch (err) {
    console.error("Google Sheets update error:", err);
    return false;
  }
}

export async function deleteSheetRow(rowIndex: number): Promise<boolean> {
  try {
    const { auth, sheetId, sheetName } = await getAuthClient();
    if (!sheetId || !rowIndex) return false;
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);
    if (sheet?.properties?.sheetId === undefined) return false;
    const numericSheetId = sheet?.properties?.sheetId ?? 0;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: numericSheetId,
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
    console.error("Google Sheets delete row error:", err);
    return false;
  }
}

/**
 * استيراد البيانات من الـ Sheet إلى قاعدة البيانات.
 * يقرأ الترويسة الفعلية ويبني الـ mapping تلقائياً — يعمل مع أي ترتيب للأعمدة.
 */
export async function importFromSheet(): Promise<{ rows: any[]; sheetName: string }> {
  const { auth, sheetId, sheetName } = await getAuthClient();
  if (!sheetId) throw new Error("لم يتم إدخال Sheet ID");
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A:AZ`,
  });

  const allRows = res.data.values || [];
  if (allRows.length === 0) return { rows: [], sheetName: sheetName! };

  // صف الترويسة الفعلي
  const headerRow: string[] = allRows[0].map((h: any) => String(h || "").trim());
  const dataRows = allRows.slice(1);

  const parsed = dataRows
    .filter(row => row.length > 0)
    .map((row, idx) => {
      const obj: Record<string, any> = { _sheetRowIndex: idx + 2 };

      // اربط كل خلية بالحقل المقابل بناءً على الترويسة
      headerRow.forEach((header, colIdx) => {
        const field = HEADER_TO_FIELD[header];
        if (!field) return;
        const raw = (row[colIdx] || "").toString().trim() || undefined;
        if (field === "childrenCount" || field === "wivesCount") {
          obj[field] = raw ? parseInt(raw) || undefined : undefined;
        } else if (field !== "_sequentialNumber") {
          obj[field] = raw;
        }
      });

      // قيم افتراضية للحقول الإلزامية
      if (!obj.firstName) obj.firstName = "—";
      if (!obj.familyName) obj.familyName = "—";
      if (!obj.nationalId) obj.nationalId = `NO-ID-${idx}`;

      return obj;
    })
    .filter(row => row.firstName || row.familyName); // تجاهل الصفوف الفارغة

  return { rows: parsed, sheetName: sheetName! };
}

/**
 * يتحقق من تطابق أعمدة الـ Sheet مع الأعمدة المعروفة في النظام.
 * يعيد: الأعمدة المتطابقة، الناقصة من الـ Sheet، والإضافية في الـ Sheet.
 */
export async function verifySheetColumns(): Promise<{
  ok: boolean;
  sheetHeaders: string[];
  matched: string[];
  missingFromSheet: string[];
  extraInSheet: string[];
  message?: string;
}> {
  try {
    const { auth, sheetId, sheetName } = await getAuthClient();
    if (!sheetId) return { ok: false, sheetHeaders: [], matched: [], missingFromSheet: [], extraInSheet: [], message: "لم يتم إدخال Sheet ID" };
    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1:AZ1`,
    });

    const rawHeaders: string[] = res.data.values?.[0] ?? [];
    const sheetHeaders = rawHeaders.map((h: any) => String(h || "").trim()).filter(h => h);

    if (sheetHeaders.length === 0) {
      return { ok: false, sheetHeaders: [], matched: [], missingFromSheet: DEFAULT_HEADERS, extraInSheet: [], message: "الـ Sheet فارغ — لا توجد ترويسات" };
    }

    const knownSet = new Set(Object.keys(HEADER_TO_VALUE));
    const sheetSet = new Set(sheetHeaders);

    const matched = sheetHeaders.filter(h => knownSet.has(h));
    const extraInSheet = sheetHeaders.filter(h => !knownSet.has(h));
    const missingFromSheet = DEFAULT_HEADERS.filter(h => !sheetSet.has(h));

    return { ok: true, sheetHeaders, matched, missingFromSheet, extraInSheet };
  } catch (err: any) {
    return { ok: false, sheetHeaders: [], matched: [], missingFromSheet: [], extraInSheet: [], message: `❌ فشل الاتصال: ${err.message}` };
  }
}

/**
 * يُصحّح صف الترويسة في الـ Sheet ليطابق الأسماء الرسمية في الملف المرجعي.
 * يكتب فوق الصف الأول فقط دون المساس بأي بيانات.
 */
export async function fixSheetHeaders(): Promise<{
  ok: boolean;
  updated: boolean;
  oldHeaders: string[];
  newHeaders: string[];
  message?: string;
}> {
  try {
    const { auth, sheetId, sheetName } = await getAuthClient();
    if (!sheetId) return { ok: false, updated: false, oldHeaders: [], newHeaders: [], message: "لم يتم إدخال Sheet ID" };
    const sheets = google.sheets({ version: "v4", auth });

    // اقرأ الترويسات الحالية
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1:AZ1`,
    });
    const oldHeaders: string[] = (res.data.values?.[0] ?? []).map((h: any) => String(h || "").trim());

    // اكتب الترويسات الرسمية في الصف الأول
    const lastCol = colLetter(DEFAULT_HEADERS.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1:${lastCol}1`,
      valueInputOption: "RAW",
      requestBody: { values: [DEFAULT_HEADERS] },
    });

    return { ok: true, updated: true, oldHeaders, newHeaders: DEFAULT_HEADERS };
  } catch (err: any) {
    return { ok: false, updated: false, oldHeaders: [], newHeaders: [], message: `❌ فشل: ${err.message}` };
  }
}

export async function testSheetsConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const { auth, sheetId, sheetName } = await getAuthClient();
    if (!sheetId) return { ok: false, message: "لم يتم إدخال Sheet ID" };
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    return { ok: true, message: "✅ الاتصال ناجح" };
  } catch (err: any) {
    return { ok: false, message: `❌ فشل الاتصال: ${err.message}` };
  }
}

// تحويل رقم العمود إلى حرف (1→A, 26→Z, 27→AA ...)
function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s || "A";
}
