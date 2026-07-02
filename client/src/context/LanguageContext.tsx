import React, { createContext, useContext, useState, useEffect } from "react";

type Lang = "ar" | "en";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  dir: "rtl" | "ltr";
}

const translations: Record<string, Record<Lang, string>> = {
  // Common
  "app.name": { ar: "منصة مسار", en: "Masar Platform" },
  "app.subtitle": { ar: "منصة مسار — إدارة نماذج التسجيل والبيانات", en: "Masar — Forms & Data Management" },
  "btn.next": { ar: "متابعة", en: "Next" },
  "btn.back": { ar: "رجوع", en: "Back" },
  "btn.submit": { ar: "إرسال البيانات", en: "Submit" },
  "btn.print": { ar: "طباعة / PDF", en: "Print / PDF" },
  "btn.edit": { ar: "تعديل", en: "Edit" },
  "btn.save": { ar: "حفظ", en: "Save" },
  "btn.cancel": { ar: "إلغاء", en: "Cancel" },
  "btn.delete": { ar: "حذف", en: "Delete" },
  "btn.copy": { ar: "نسخ", en: "Copy" },
  "btn.logout": { ar: "تسجيل خروج", en: "Logout" },
  "btn.login": { ar: "تسجيل الدخول", en: "Login" },
  "btn.confirm": { ar: "تأكيد", en: "Confirm" },
  // Steps
  "step.1": { ar: "رمز الدعوة", en: "Invite Code" },
  "step.2": { ar: "التنظيمي والوظيفي", en: "Organizational" },
  "step.3": { ar: "الشخصية والإقامة", en: "Personal Info" },
  "step.4": { ar: "المراجعة والطباعة", en: "Review & Print" },
  // Register
  "register.enter_code": { ar: "أدخل رمز الدعوة للمتابعة", en: "Enter invitation code to continue" },
  "register.code_placeholder": { ar: "رمز الدعوة", en: "Invitation Code" },
  "register.restricted": { ar: "هذا النموذج مخصص للمسجّلين المرخّصين فقط", en: "This form is for authorized registrants only" },
  "register.success": { ar: "تم استلام بياناتك بنجاح!", en: "Your data has been submitted successfully!" },
  "register.edit_link": { ar: "رابط التعديل الشخصي", en: "Personal Edit Link" },
  "register.edit_warning": { ar: "⏱️ هذا الرابط صالح لـ 48 ساعة فقط — يظهر مرة واحدة فقط، احتفظ به الآن", en: "⏱️ This link is valid for 48 hours only — save it now" },
  // Fields
  "field.firstName": { ar: "الاسم", en: "First Name" },
  "field.fatherName": { ar: "اسم الأب", en: "Father's Name" },
  "field.familyName": { ar: "النسبة", en: "Family Name" },
  "field.nationalId": { ar: "الرقم الوطني", en: "National ID" },
  "field.gender": { ar: "الجنس", en: "Gender" },
  "field.birthDate": { ar: "تاريخ التولد", en: "Birth Date" },
  "field.mobile": { ar: "رقم الجوال", en: "Mobile" },
  "field.jobTitle": { ar: "مسمى العمل", en: "Job Title" },
  "field.status": { ar: "الحالة", en: "Status" },
  "field.governorate": { ar: "المحافظة", en: "Governorate" },
  // Admin
  "admin.dashboard": { ar: "الرئيسية", en: "Dashboard" },
  "admin.employees": { ar: "الموظفون", en: "Employees" },
  "admin.export": { ar: "التصدير", en: "Export" },
  "admin.settings": { ar: "الإعدادات", en: "Settings" },
  "admin.total": { ar: "إجمالي الكوادر", en: "Total Staff" },
  "admin.today": { ar: "اليوم", en: "Today" },
  "admin.week": { ar: "هذا الأسبوع", en: "This Week" },
  "admin.month": { ar: "هذا الشهر", en: "This Month" },
  "admin.search": { ar: "بحث بالاسم أو الرقم الوطني...", en: "Search by name or national ID..." },
  // Auth
  "auth.login": { ar: "تسجيل الدخول", en: "Sign In" },
  "auth.email": { ar: "البريد الإلكتروني", en: "Email" },
  "auth.password": { ar: "كلمة المرور", en: "Password" },
  "auth.remember": { ar: "تذكرني 30 يوم", en: "Remember me 30 days" },
  "auth.setup_title": { ar: "إعداد النظام — أول استخدام", en: "System Setup — First Use" },
};

const LanguageContext = createContext<LangCtx>({
  lang: "ar", setLang: () => {}, t: (k) => k, dir: "rtl"
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("lang") as Lang) || "ar");

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const t = (key: string) => translations[key]?.[lang] || key;
  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
