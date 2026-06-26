import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { employees, auditLog, users } from "../../shared/schema.js";
import { eq, or, ilike, and, count, desc, gte, lte, gt, sql, isNotNull } from "drizzle-orm";
import { requireAuth, requireAdmin, requireEditorOrAdmin } from "../middleware/auth.js";
import ExcelJS from "exceljs";
import { appendToSheet, updateSheetRow, deleteSheetRow, importFromSheet } from "../services/sheets.js";

const router = Router();

// Strip system-managed fields from user-submitted data to prevent drizzle timestamp errors
const SYSTEM_FIELDS = ["id", "sequentialNumber", "editToken", "tokenExpiresAt", "submittedAt", "updatedAt", "sheetsRowIndex"];
function sanitizeEmployeeData(data: Record<string, any>) {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!SYSTEM_FIELDS.includes(k)) clean[k] = v;
  }
  return clean;
}

// POST create new employee (editor or admin) with Sheets sync
router.post("/employees", requireEditorOrAdmin, async (req: Request, res: Response) => {
  try {
    const data = req.body;

    // Prevent duplicate by national ID
    if (data.nationalId) {
      const [existing] = await db.select({ id: employees.id })
        .from(employees).where(eq(employees.nationalId, data.nationalId));
      if (existing) {
        return res.status(409).json({ error: "الرقم الوطني مسجّل مسبقاً في النظام." });
      }
    }

    const clean: any = sanitizeEmployeeData(data);
    const [employee] = await db.insert(employees).values({
      ...clean,
      childrenCount: clean.childrenCount ? parseInt(clean.childrenCount) : null,
      wivesCount: clean.wivesCount ? parseInt(clean.wivesCount) : null,
      submittedAt: new Date(),
    }).returning();

    await db.insert(auditLog).values({
      employeeId: employee.id,
      changedBy: (req.session as any).userId || "admin",
      action: "create",
      changesJson: data,
    });

    // Google Sheets sync (non-blocking)
    appendToSheet(employee).then(async (rowIndex) => {
      if (rowIndex) {
        await db.update(employees).set({ sheetsRowIndex: rowIndex }).where(eq(employees.id, employee.id));
      }
    }).catch(console.error);

    res.json({ ok: true, employee });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET employees list with search/filter/pagination
router.get("/employees", requireAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const gender = req.query.gender as string;
    const status = req.query.status as string;
    const governorate = req.query.governorate as string;
    const jobCategory = req.query.jobCategory as string;
    const employmentStatus = req.query.employmentStatus as string;
    const orgLevel1 = req.query.orgLevel1 as string;

    let query = db.select().from(employees);
    const conditions: any[] = [];

    if (search) {
      conditions.push(or(
        ilike(employees.firstName, `%${search}%`),
        ilike(employees.fatherName, `%${search}%`),
        ilike(employees.familyName, `%${search}%`),
        ilike(employees.nationalId, `%${search}%`),
        ilike(employees.employeeRefId, `%${search}%`),
        ilike(employees.mobile, `%${search}%`),
      ));
    }
    if (gender) conditions.push(eq(employees.gender, gender));
    if (status) conditions.push(eq(employees.status, status));
    if (governorate) conditions.push(eq(employees.workGovernorate, governorate));
    if (jobCategory) conditions.push(eq(employees.jobCategory, jobCategory));
    if (employmentStatus) conditions.push(eq(employees.employmentStatus, employmentStatus));
    if (orgLevel1) conditions.push(ilike(employees.orgLevel1, `%${orgLevel1}%`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(employees)
      .where(whereClause);

    const rows = await db.select().from(employees)
      .where(whereClause)
      .orderBy(desc(employees.submittedAt))
      .limit(limit).offset(offset);

    res.json({ data: rows, total: Number(totalResult?.count || 0), page, limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET employee by id
router.get("/employees/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const [emp] = await db.select().from(employees).where(eq(employees.id, (req.params.id as string)));
    if (!emp) return res.status(404).json({ error: "الموظف غير موجود" });

    const logs = await db.select().from(auditLog)
      .where(eq(auditLog.employeeId, emp.id))
      .orderBy(desc(auditLog.changedAt)).limit(20);

    res.json({ employee: emp, auditLog: logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH employee (editor or admin)
router.patch("/employees/:id", requireEditorOrAdmin, async (req: Request, res: Response) => {
  try {
    const [existing] = await db.select().from(employees).where(eq(employees.id, (req.params.id as string)));
    if (!existing) return res.status(404).json({ error: "الموظف غير موجود" });

    const data = req.body;
    const clean: any = sanitizeEmployeeData(data);
    const [updated] = await db.update(employees).set({
      ...clean,
      childrenCount: clean.childrenCount ? parseInt(clean.childrenCount) : null,
      wivesCount: clean.wivesCount ? parseInt(clean.wivesCount) : null,
      updatedAt: new Date(),
    }).where(eq(employees.id, (req.params.id as string))).returning();

    await db.insert(auditLog).values({
      employeeId: (req.params.id as string),
      changedBy: (req.session as any).userId,
      action: "update",
      changesJson: data,
    });

    if (updated.sheetsRowIndex) {
      updateSheetRow(updated.sheetsRowIndex, updated).catch(console.error);
    } else {
      // لم يكن الموظف في الـ Sheet من قبل — أضفه الآن
      appendToSheet(updated).then(async (rowIndex) => {
        if (rowIndex) {
          await db.update(employees).set({ sheetsRowIndex: rowIndex }).where(eq(employees.id, updated.id));
        }
      }).catch(console.error);
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE employee (editor or admin)
router.delete("/employees/:id", requireEditorOrAdmin, async (req: Request, res: Response) => {
  try {
    const [emp] = await db.select({ sheetsRowIndex: employees.sheetsRowIndex })
      .from(employees).where(eq(employees.id, (req.params.id as string)));
    await db.delete(employees).where(eq(employees.id, (req.params.id as string)));

    if (emp?.sheetsRowIndex) {
      const deletedRow = emp.sheetsRowIndex;
      // Delete row from Google Sheets (non-blocking)
      deleteSheetRow(deletedRow).then(ok => {
        if (ok) {
          // Shift all subsequent rows' index down by 1
          db.update(employees)
            .set({ sheetsRowIndex: sql`${employees.sheetsRowIndex} - 1` })
            .where(gt(employees.sheetsRowIndex, deletedRow))
            .catch(console.error);
        }
      }).catch(console.error);
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE multiple employees (editor or admin)
router.post("/employees/bulk-delete", requireEditorOrAdmin, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids: string[] };

    // Fetch all row indices first, sorted descending so we delete from bottom up
    const emps = await Promise.all(
      ids.map(id => db.select({ id: employees.id, sheetsRowIndex: employees.sheetsRowIndex })
        .from(employees).where(eq(employees.id, id)).then(r => r[0]))
    );
    const sorted = emps.filter(Boolean).sort((a, b) => (b?.sheetsRowIndex ?? 0) - (a?.sheetsRowIndex ?? 0));

    // Delete from DB
    for (const id of ids) {
      await db.delete(employees).where(eq(employees.id, id));
    }

    // Delete rows from Sheets bottom-up (so indices above don't shift before we process them)
    ;(async () => {
      for (const emp of sorted) {
        if (!emp?.sheetsRowIndex) continue;
        const deletedRow = emp.sheetsRowIndex;
        const ok = await deleteSheetRow(deletedRow).catch(() => false);
        if (ok) {
          await db.update(employees)
            .set({ sheetsRowIndex: sql`${employees.sheetsRowIndex} - 1` })
            .where(gt(employees.sheetsRowIndex, deletedRow))
            .catch(console.error);
        }
      }
    })().catch(console.error);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET stats
router.get("/stats", requireAuth, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total] = await db.select({ count: count() }).from(employees);
    const [today] = await db.select({ count: count() }).from(employees).where(gte(employees.submittedAt, startOfDay));
    const [week] = await db.select({ count: count() }).from(employees).where(gte(employees.submittedAt, startOfWeek));
    const [month] = await db.select({ count: count() }).from(employees).where(gte(employees.submittedAt, startOfMonth));

    // Distribution by governorate
    const allEmps = await db.select({ workGovernorate: employees.workGovernorate, gender: employees.gender }).from(employees);
    
    const byGovernorate: Record<string, number> = {};
    const byGender: Record<string, number> = { "ذكر": 0, "أنثى": 0 };
    
    for (const e of allEmps) {
      if (e.workGovernorate) byGovernorate[e.workGovernorate] = (byGovernorate[e.workGovernorate] || 0) + 1;
      if (e.gender) byGender[e.gender] = (byGender[e.gender] || 0) + 1;
    }

    res.json({
      total: Number(total?.count || 0),
      today: Number(today?.count || 0),
      week: Number(week?.count || 0),
      month: Number(month?.count || 0),
      byGovernorate: Object.entries(byGovernorate).map(([name, value]) => ({ name, value })),
      byGender: Object.entries(byGender).map(([name, value]) => ({ name, value })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export Excel
// Column definitions for flexible export
const EXPORT_COL_DEFS = [
  { header: "م", key: "seq", width: 8, field: (e: any) => e.sequentialNumber },
  { header: "المستوى التنظيمي الاول", key: "orgLevel1", width: 22, field: (e: any) => e.orgLevel1 },
  { header: "التصنيف/ الجهة المرتبطة", key: "orgClassification", width: 22, field: (e: any) => e.orgClassification },
  { header: "المستوى التنظيمي الثاني", key: "orgLevel2", width: 22, field: (e: any) => e.orgLevel2 },
  { header: "المستوى التنظيمي الثالث", key: "orgLevel3", width: 22, field: (e: any) => e.orgLevel3 },
  { header: "المستوى التنظيمي الرابع", key: "orgLevel4", width: 22, field: (e: any) => e.orgLevel4 },
  { header: "المستوى التنظيمي الخامس", key: "orgLevel5", width: 22, field: (e: any) => e.orgLevel5 },
  { header: "محافظة العمل", key: "workGovernorate", width: 16, field: (e: any) => e.workGovernorate },
  { header: "الرقم الذاتي", key: "employeeRefId", width: 15, field: (e: any) => e.employeeRefId },
  { header: "مسمى العمل", key: "jobTitle", width: 20, field: (e: any) => e.jobTitle },
  { header: "تاريخ التولد", key: "birthDate", width: 15, field: (e: any) => e.birthDate },
  { header: "تاريخ بدء العمل بالدولة", key: "workStartDate", width: 22, field: (e: any) => e.workStartDate },
  { header: "تاريخ التثبيت في الدولة", key: "permanentDate", width: 22, field: (e: any) => e.permanentDate },
  { header: "تاريخ التعاقد في الدولة", key: "contractDate", width: 22, field: (e: any) => e.contractDate },
  { header: "الاسم", key: "firstName", width: 15, field: (e: any) => e.firstName },
  { header: "اسم الأب", key: "fatherName", width: 15, field: (e: any) => e.fatherName },
  { header: "النسبة", key: "familyName", width: 15, field: (e: any) => e.familyName },
  { header: "اسم الأم الكامل", key: "motherFullName", width: 20, field: (e: any) => e.motherFullName },
  { header: "الرقم الوطني", key: "nationalId", width: 15, field: (e: any) => e.nationalId },
  { header: "الجنس", key: "gender", width: 10, field: (e: any) => e.gender },
  { header: "رقم الجوال", key: "mobile", width: 15, field: (e: any) => e.mobile },
  { header: "منطقة السكن", key: "residenceArea", width: 16, field: (e: any) => e.residenceArea },
  { header: "تفصيل مكان السكن", key: "residenceDetail", width: 20, field: (e: any) => e.residenceDetail },
  { header: "الوضع العائلي", key: "maritalStatus", width: 15, field: (e: any) => e.maritalStatus },
  { header: "الفئة الوظيفية", key: "jobCategory", width: 16, field: (e: any) => e.jobCategory },
  { header: "مثبت أو متعاقد", key: "employmentStatus", width: 16, field: (e: any) => e.employmentStatus },
  { header: "نمط التعيين أو التعاقد", key: "appointmentPattern", width: 22, field: (e: any) => e.appointmentPattern },
  { header: "تفاصيل دمج", key: "mergeDetails", width: 15, field: (e: any) => e.mergeDetails },
  { header: "هل لديك إعاقة", key: "hasDisability", width: 16, field: (e: any) => e.hasDisability },
  { header: "نوع الإعاقة", key: "disabilityType", width: 16, field: (e: any) => e.disabilityType },
  { header: "بطاقة الإعاقة", key: "disabilityCard", width: 15, field: (e: any) => e.disabilityCard },
  { header: "رقم القيد", key: "registryNumber", width: 15, field: (e: any) => e.registryNumber },
  { header: "مكان القيد", key: "registryPlace", width: 15, field: (e: any) => e.registryPlace },
  { header: "دولة الولادة", key: "birthCountry", width: 15, field: (e: any) => e.birthCountry },
  { header: "المحافظة", key: "governorate", width: 15, field: (e: any) => e.governorate },
  { header: "المنطقة_المدينة", key: "cityDistrict", width: 16, field: (e: any) => e.cityDistrict },
  { header: "الناحية", key: "subDistrict", width: 15, field: (e: any) => e.subDistrict },
  { header: "آخر مؤهل علمي معين على أساسه", key: "lastQualification", width: 28, field: (e: any) => e.lastQualification },
  { header: "الحالة", key: "status", width: 12, field: (e: any) => e.status },
  { header: "تفصيل الحالة", key: "statusDetail", width: 16, field: (e: any) => e.statusDetail },
  { header: "حساب شام كاش", key: "shamCashAccount", width: 18, field: (e: any) => e.shamCashAccount },
  { header: "عدد الأبناء", key: "childrenCount", width: 13, field: (e: any) => e.childrenCount },
  { header: "عدد الزوجات", key: "wivesCount", width: 13, field: (e: any) => e.wivesCount },
  { header: "ملاحظات مركزية", key: "centralNotes", width: 25, field: (e: any) => e.centralNotes },
];

function buildExportWhere(query: any) {
  const conditions: any[] = [];
  if (query.governorate) conditions.push(eq(employees.workGovernorate, query.governorate));
  if (query.status) conditions.push(eq(employees.status, query.status));
  if (query.gender) conditions.push(eq(employees.gender, query.gender));
  if (query.employmentStatus) conditions.push(eq(employees.employmentStatus, query.employmentStatus));
  if (query.jobCategory) conditions.push(eq(employees.jobCategory, query.jobCategory));
  if (query.dateFrom) conditions.push(gte(employees.submittedAt, new Date(query.dateFrom as string)));
  if (query.dateTo) {
    const to = new Date(query.dateTo as string);
    to.setHours(23, 59, 59, 999);
    conditions.push(lte(employees.submittedAt, to));
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

// GET export preview (count + stats)
router.get("/export/preview", requireAuth, async (req: Request, res: Response) => {
  try {
    const where = buildExportWhere(req.query);
    const [{ total }] = await db.select({ total: count() }).from(employees).where(where);
    const genderRows = await db.select({ gender: employees.gender, cnt: count() })
      .from(employees).where(where).groupBy(employees.gender);
    const male = Number(genderRows.find(g => g.gender === "ذكر")?.cnt || 0);
    const female = Number(genderRows.find(g => g.gender === "أنثى")?.cnt || 0);
    res.json({ total: Number(total), male, female });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET export (xlsx / csv) with filters + column selection
router.get("/export", requireAuth, async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || "xlsx";
    const colsParam = req.query.columns as string;
    const sheetPerGov = req.query.sheetPerGov === "true";
    const customName = (req.query.filename as string) || "";

    const where = buildExportWhere(req.query);
    const filteredEmployees = await db.select().from(employees)
      .where(where).orderBy(desc(employees.submittedAt));

    const selectedCols = colsParam
      ? EXPORT_COL_DEFS.filter(c => colsParam.split(",").includes(c.key))
      : EXPORT_COL_DEFS;

    const safeFilename = customName.replace(/[^a-zA-Z0-9_\u0600-\u06FF\s-]/g, "").trim() || "كوادر_صحية";

    if (format === "csv") {
      const headers = selectedCols.map(c => c.header);
      const rows = filteredEmployees.map(e => selectedCols.map(c => String(c.field(e) ?? "")));
      const csv = [headers, ...rows].map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(safeFilename)}.csv"`);
      res.send("\ufeff" + csv);
      return;
    }

    const workbook = new ExcelJS.Workbook();

    const addSheet = (name: string, data: typeof filteredEmployees) => {
      const sheet = workbook.addWorksheet(name, { views: [{ rightToLeft: true }] });
      sheet.columns = selectedCols.map(c => ({ header: c.header, key: c.key, width: c.width }));
      const headerRow = sheet.getRow(1);
      headerRow.height = 30;
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { theme: 9, tint: -0.249977111117893 } as any };
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12, name: "Arial" };
      headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      headerRow.border = {
        bottom: { style: "medium", color: { argb: "FF000000" } },
      };
      for (const emp of data) {
        const rowData: any = {};
        for (const col of selectedCols) rowData[col.key] = col.field(emp);
        sheet.addRow(rowData);
      }
    };

    if (sheetPerGov) {
      const govGroups = new Map<string, typeof filteredEmployees>();
      for (const emp of filteredEmployees) {
        const gov = emp.workGovernorate || "غير محدد";
        if (!govGroups.has(gov)) govGroups.set(gov, []);
        govGroups.get(gov)!.push(emp);
      }
      if (govGroups.size === 0) addSheet("نموذج منصة نواة", filteredEmployees);
      else govGroups.forEach((data, gov) => addSheet(gov, data));
    } else {
      addSheet("نموذج منصة نواة لمديريات الصحة والهيئات", filteredEmployees);
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(safeFilename)}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST import from Google Sheets (editor or admin)
router.post("/import-from-sheets", requireEditorOrAdmin, async (req: Request, res: Response) => {
  try {
    const syncDeletes = req.body?.syncDeletes === true;
    const { rows } = await importFromSheet();

    let inserted = 0, updated = 0, skipped = 0, deleted = 0;

    // Build set of national IDs present in the Sheet
    const sheetNationalIds = new Set(
      rows.map((r: any) => r.nationalId).filter((id: any) => id && !id.startsWith("NO-ID-"))
    );

    // Import rows into DB
    for (const row of rows) {
      const { _sheetRowIndex, ...data } = row;
      try {
        const [existing] = await db.select({ id: employees.id })
          .from(employees)
          .where(eq(employees.nationalId, data.nationalId));

        const cleanRow: any = sanitizeEmployeeData(data);
        if (existing) {
          await db.update(employees).set({
            ...cleanRow,
            sheetsRowIndex: _sheetRowIndex,
            updatedAt: new Date(),
          }).where(eq(employees.id, existing.id));
          updated++;
        } else {
          await db.insert(employees).values({
            ...cleanRow,
            sheetsRowIndex: _sheetRowIndex,
            submittedAt: new Date(),
          });
          inserted++;
        }
      } catch {
        skipped++;
      }
    }

    // حذف الموظفين المحذوفين من الـ Sheet
    // يحذف أي موظف في قاعدة البيانات لا يوجد رقمه الوطني في الـ Sheet الحالي
    if (syncDeletes) {
      const allDbEmps = await db
        .select({ id: employees.id, nationalId: employees.nationalId })
        .from(employees);

      for (const emp of allDbEmps) {
        if (emp.nationalId && !sheetNationalIds.has(emp.nationalId)) {
          await db.delete(employees).where(eq(employees.id, emp.id));
          deleted++;
        }
      }
    }

    res.json({ inserted, updated, skipped, deleted, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Users management (admin only)
router.get("/users", requireAdmin, async (_req, res) => {
  const allUsers = await db.select({ id: users.id, fullName: users.fullName, email: users.email, role: users.role, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt }).from(users);
  res.json(allUsers);
});

router.patch("/users/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { fullName, email, role } = req.body;
    await db.update(users).set({ fullName, email, role }).where(eq(users.id, (req.params.id as string)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/users/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const adminUsers = await db.select({ count: count() }).from(users).where(eq(users.role, "admin"));
    if (Number(adminUsers[0]?.count || 0) <= 1) {
      const [target] = await db.select().from(users).where(eq(users.id, (req.params.id as string)));
      if (target?.role === "admin") {
        return res.status(400).json({ error: "لا يمكن حذف آخر مدير" });
      }
    }
    await db.delete(users).where(eq(users.id, (req.params.id as string)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
