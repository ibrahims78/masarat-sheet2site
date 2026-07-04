# قرارات تحسين المنصة

> هذا الملف يُبنى تدريجياً بناءً على الاختيارات المتفق عليها، ثم يُنفَّذ دفعة واحدة.

---

## النقطة 1 — زر تعديل دور المستخدم (الأولوية: عالية 🔴)

**المشكلة:** المدير لا يستطيع تغيير دور مستخدم موجود (admin / editor / viewer) من لوحة التحكم، رغم أن الـ API جاهز تماماً في الخادم.

**القرار:** _(في انتظار الإجابة)_

---

## النقطة 2 — حذف الملفات الميتة (الأولوية: متوسطة 🟡)

**المشكلة:** 9 ملفات صفحات قديمة غير مسجّلة في التطبيق + 3 ملفات routes فارغة تماماً.

**الملفات المعنية:**
- `client/src/pages/admin/Dashboard.tsx`
- `client/src/pages/admin/EmployeeList.tsx`
- `client/src/pages/admin/EmployeeEdit.tsx`
- `client/src/pages/admin/EmployeeDetails.tsx`
- `client/src/pages/admin/AdminAddEmployee.tsx`
- `client/src/pages/admin/Export.tsx`
- `client/src/pages/admin/Settings.tsx`
- `client/src/pages/Register.tsx`
- `client/src/pages/EditForm.tsx`
- `server/routes/admin.ts` (فارغ)
- `server/routes/form.ts` (فارغ)
- `server/routes/settings.ts` (فارغ)

**القرار:** _(في انتظار الإجابة)_

---
