# تقرير الأمن الشامل — منصة مسارات
# Comprehensive Security Report — Masarat Platform

**التاريخ:** 2026-07-04  
**نطاق الفحص:** كامل المنصة (Backend + Frontend + Database Layer)  
**المنهجية:** مراجعة الكود المصدري الكاملة + تحليل المعمارية الأمنية  
**الحالة:** قبل تطبيق الإصلاحات

---

## ملخص تنفيذي

| الخطورة | العدد |
|---|---|
| 🔴 عالية | 4 |
| 🟠 متوسطة | 6 |
| 🟡 منخفضة | 4 |
| ℹ️ معلوماتية | 3 |
| **الإجمالي** | **17** |

---

## قسم 1 — الثغرات العالية الخطورة (HIGH)

---

### H-01 · تثبيت الجلسة (Session Fixation)

| الحقل | التفاصيل |
|---|---|
| **الخطورة** | 🔴 HIGH |
| **الملف** | `server/routes/auth.ts` — السطر 57–78 |
| **التصنيف** | CWE-384: Session Fixation |

**الوصف:**  
عند تسجيل الدخول الناجح، لا يتم استدعاء `req.session.regenerate()`. يعني هذا أن معرّف الجلسة (`session ID`) الذي كان موجوداً قبل تسجيل الدخول يبقى كما هو بعده. يمكن لمهاجم يتحكم في جلسة المستخدم أن يستغل هذا لاختطاف الجلسة المصادق عليها.

**الكود الحالي (مشكل):**
```typescript
// server/routes/auth.ts:65
(req.session as any).userId = user.id;
(req.session as any).role = user.role;
(req.session as any).fullName = user.fullName;
res.json({ ok: true, role: user.role, fullName: user.fullName });
```

**الإصلاح المطلوب:**
```typescript
// server/routes/auth.ts — دالة /login
router.post("/login", loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "بريد إلكتروني أو كلمة مرور خاطئة" });
    }

    // ✅ إعادة توليد معرّف الجلسة بعد المصادقة الناجحة
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: "خطأ في الجلسة" });

      (req.session as any).userId = user.id;
      (req.session as any).role = user.role;
      (req.session as any).fullName = user.fullName;

      if (rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        db.update(users)
          .set({ rememberMeToken: token, rememberMeExpiresAt: expiresAt, lastLoginAt: new Date() })
          .where(eq(users.id, user.id))
          .catch(console.error);
      } else {
        db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id)).catch(console.error);
      }

      req.session.save(() => res.json({ ok: true, role: user.role, fullName: user.fullName }));
    });
  } catch (err: any) {
    res.status(500).json({ error: "خطأ داخلي في الخادم" });
  }
});
```

نفس الإصلاح يُطبَّق على `/setup` و`/register-invite`.

---

### H-02 · غياب تحديد معدل الطلبات على نقطة تسجيل الدعوة

| الحقل | التفاصيل |
|---|---|
| **الخطورة** | 🔴 HIGH |
| **الملف** | `server/routes/auth.ts` — السطر 97 |
| **التصنيف** | CWE-307: Improper Restriction of Excessive Authentication Attempts |

**الوصف:**  
نقطة `/api/auth/register-invite` لا تحتوي على أي rate limiting. رموز الدعوة هي UUID v4 (128 بت) — لكن إذا تسرّب رمز (عبر البريد، اللوغز، أو المتصفح)، يمكن تجربة كلمات مرور متعددة بلا قيود. كذلك، النقطة `/api/auth/setup` (إنشاء أول مدير) لا حماية عليها من التسابق والهجمات المتزامنة.

**الإصلاح المطلوب:**
```typescript
// server/routes/auth.ts — أضف في أعلى الملف

const setupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // نافذة ساعة واحدة
  max: 5,
  message: { error: "محاولات كثيرة — حاول بعد ساعة" },
  standardHeaders: true,
  legacyHeaders: false,
});

const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 دقيقة
  max: 10,
  message: { error: "محاولات كثيرة — حاول بعد 15 دقيقة" },
  standardHeaders: true,
  legacyHeaders: false,
});

// طبّق على النقاط المعنية:
router.post("/setup", setupLimiter, async (req, res) => { ... });
router.post("/register-invite", inviteLimiter, async (req, res) => { ... });
```

---

### H-03 · عدم تطبيق علامة `mustChangePassword` على مستوى الخادم

| الحقل | التفاصيل |
|---|---|
| **الخطورة** | 🔴 HIGH |
| **الملف** | `server/middleware/auth.ts` |
| **التصنيف** | CWE-285: Improper Authorization |

**الوصف:**  
عند إنشاء مستخدم جديد أو إعادة تعيين كلمة مروره، يُعيَّن `mustChangePassword: true` في قاعدة البيانات. لكن هذه العلامة لا يتحقق منها أي middleware على مستوى الخادم، مما يعني أن المستخدم يمكنه الوصول إلى كامل لوحة الإدارة دون تغيير كلمة المرور، متجاوزاً الحماية المطلوبة.

**الإصلاح المطلوب:**
```typescript
// server/middleware/auth.ts — أضف middleware جديد

export async function requirePasswordNotExpired(
  req: Request, res: Response, next: NextFunction
) {
  const userId = (req.session as any)?.userId;
  if (!userId) return next(); // requireAuth سيرفض الطلب بعده

  const [user] = await db
    .select({ mustChangePassword: users.mustChangePassword })
    .from(users)
    .where(eq(users.id, userId));

  if (user?.mustChangePassword) {
    // السماح فقط بنقطة تغيير كلمة المرور
    if (req.path === "/api/auth/change-password") return next();
    return res.status(403).json({
      error: "يجب تغيير كلمة المرور أولاً",
      mustChangePassword: true,
    });
  }
  next();
}

// server/index.ts — طبّق على جميع مسارات /api/projects
app.use("/api/projects", requireAuth, requirePasswordNotExpired, projectsRoutes);
```

---

### H-04 · رمز "تذكرني" مُخزَّن بدون تجزئة (Unhashed Remember-Me Token)

| الحقل | التفاصيل |
|---|---|
| **الخطورة** | 🔴 HIGH |
| **الملف** | `server/routes/auth.ts` — السطر 72-73 |
| **التصنيف** | CWE-312: Cleartext Storage of Sensitive Information |

**الوصف:**  
رمز "تذكرني" (`rememberMeToken`) يُخزَّن كنص عادي في عمود `users.remember_me_token`. في حال حدوث اختراق لقاعدة البيانات (SQL dump، backup غير مؤمَّن)، يمكن للمهاجم استخدام هذه الرموز مباشرة للمصادقة دون الحاجة لكلمة مرور. الأصح هو تخزين تجزئة الرمز.

> **ملاحظة:** هذا النظام حالياً لا يستخدم الرمز لتسجيل الدخول التلقائي (لا يوجد middleware يتحقق منه عند كل طلب)، مما يجعل هذا العمود عديم الأثر أمنياً حالياً. الحل يشمل إما تنفيذه بشكل صحيح أو إزالته.

**الإصلاح المطلوب:**
```typescript
// الخيار أ: تخزين التجزئة
import { createHash } from "crypto";
const tokenHash = createHash("sha256").update(token).digest("hex");
await db.update(users).set({ rememberMeToken: tokenHash, ... });

// الخيار ب: حذف العمود بالكامل إذا لم تكن الميزة مُنفَّذة فعلياً
// وإزالة: rememberMeToken, rememberMeExpiresAt من users table
```

---

## قسم 2 — الثغرات المتوسطة الخطورة (MEDIUM)

---

### M-01 · كشف رسائل أخطاء الخادم الداخلية

| الحقل | التفاصيل |
|---|---|
| **الخطورة** | 🟠 MEDIUM |
| **الملف** | جميع ملفات `server/routes/` |
| **التصنيف** | CWE-209: Information Exposure Through an Error Message |

**الوصف:**  
جميع كتل `catch` في المسارات ترجع `err.message` خاماً إلى العميل:
```typescript
res.status(500).json({ error: err.message });
```
هذا يمكن أن يكشف: أسماء جداول قاعدة البيانات، أعمدة مفقودة، مسارات الملفات، إصدارات المكتبات، وتفاصيل البنية الداخلية للنظام.

**الإصلاح المطلوب:**
```typescript
// server/utils/errorHandler.ts — أنشئ ملفاً مركزياً

export function handleError(res: Response, err: unknown, context?: string): void {
  const error = err as any;

  // معالجة أخطاء قاعدة البيانات المعروفة
  if (error.code === "23505") {
    res.status(409).json({ error: "البيانات المدخلة مستخدمة بالفعل" });
    return;
  }
  if (error.code === "23503") {
    res.status(400).json({ error: "مرجع غير موجود" });
    return;
  }
  if (error.code === "22P02") {
    res.status(400).json({ error: "صيغة البيانات غير صحيحة" });
    return;
  }

  // لا تكشف تفاصيل الخطأ الداخلي في الإنتاج
  const isDev = process.env.NODE_ENV !== "production";
  console.error(`[ERROR]${context ? ` [${context}]` : ""}:`, err);
  res.status(500).json({
    error: "خطأ داخلي في الخادم",
    ...(isDev && { detail: error.message }),
  });
}

// الاستخدام في كل مسار:
} catch (err) {
  handleError(res, err, "POST /api/auth/login");
}
```

---

### M-02 · غياب Content Security Policy (CSP)

| الحقل | التفاصيل |
|---|---|
| **الخطورة** | 🟠 MEDIUM |
| **الملف** | `server/index.ts` — السطر 51 |
| **التصنيف** | CWE-693: Protection Mechanism Failure |

**الوصف:**  
Helmet مُعطَّل بالكامل للـ CSP:
```typescript
app.use(helmet({ contentSecurityPolicy: false, frameguard: false }));
```
غياب CSP يجعل التطبيق عرضة لهجمات XSS إذا تم حقن محتوى عبر ثغرة مستقبلية. كذلك تعطيل `frameguard` يفتح الباب لهجمات Clickjacking.

**الإصلاح المطلوب:**
```typescript
// server/index.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // مطلوب لـ Vite في التطوير
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],  // يمنع Clickjacking
    },
  },
  frameguard: { action: "deny" },  // ✅ فعّل حماية الـ frame
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  xssFilter: true,
  noSniff: true,
}));
```

---

### M-03 · الملفات المرفوعة متاحة بلا مصادقة

| الحقل | التفاصيل |
|---|---|
| **الخطورة** | 🟠 MEDIUM |
| **الملف** | `server/index.ts` — السطر 80 |
| **التصنيف** | CWE-284: Improper Access Control |

**الوصف:**  
```typescript
app.use("/uploads", express.static(uploadsDir));
```
أي شخص يعرف اسم الملف (وهو UUID يصعب تخمينه لكن ليس مستحيلاً) يستطيع الوصول للملف مباشرة دون أي مصادقة. إذا تم تسريب رابط ملف (في رسالة، في اللوغز، في تاريخ المتصفح)، يصبح الملف مكشوفاً للجميع.

**الإصلاح المطلوب:**
```typescript
// server/index.ts — استبدل السطر 80 بـ middleware محمي

import { requireAuth } from "./middleware/auth.js";
import { createReadStream } from "fs";
import { join } from "path";

app.get("/uploads/:filename", requireAuth, (req, res) => {
  const filename = path.basename(req.params.filename); // منع path traversal
  const filePath = path.join(uploadsDir, filename);

  // تحقق من أن الملف موجود
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "الملف غير موجود" });
  }

  res.sendFile(filePath);
});
```

> **ملاحظة:** النماذج العامة تستخدم رفع الملفات أيضاً (pform.ts). لو أضفت الحماية هنا، يجب أن تتحقق من الحاجة لمنطق استثناء للنماذج العامة.

---

### M-04 · عدم التحقق من نوع MIME للملفات المرفوعة

| الحقل | التفاصيل |
|---|---|
| **الخطورة** | 🟠 MEDIUM |
| **الملف** | `server/middleware/upload.ts` — السطر 34–41 |
| **التصنيف** | CWE-434: Unrestricted Upload of File with Dangerous Type |

**الوصف:**  
الفلتر الحالي يتحقق فقط من امتداد الملف (`.jpg`, `.pdf`, إلخ) لكن لا يتحقق من محتواه الفعلي (MIME type). يمكن لمهاجم رفع ملف HTML أو SVG أو JavaScript بامتداد `.jpg` لتجاوز الفلتر. إذا أُتيحت الملفات عبر HTTP، يمكن تنفيذ XSS.

**الإصلاح المطلوب:**
```typescript
// server/middleware/upload.ts
import { fileTypeFromBuffer } from "file-type"; // npm install file-type

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

export const fileUpload = multer({
  storage: multer.memoryStorage(), // نقرأ في الذاكرة أولاً للفحص
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: async (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error("نوع الملف غير مدعوم"));
    }
    cb(null, true);
  },
});

// Middleware للتحقق من MIME type بعد الرفع
export async function validateMimeType(req: Request, res: Response, next: NextFunction) {
  if (!req.file) return next();
  const detected = await fileTypeFromBuffer(req.file.buffer);
  if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
    return res.status(400).json({ error: "محتوى الملف لا يتطابق مع امتداده" });
  }
  // احفظ الملف على القرص بعد التحقق
  const ext = path.extname(req.file.originalname).toLowerCase();
  const filename = `${uuidv4()}${ext}`;
  const dest = path.join(uploadsDir, filename);
  await fs.promises.writeFile(dest, req.file.buffer);
  req.file.filename = filename;
  next();
}
```

---

### M-05 · حجم JSON Body البالغ 10MB يُسهّل هجمات DoS

| الحقل | التفاصيل |
|---|---|
| **الخطورة** | 🟠 MEDIUM |
| **الملف** | `server/index.ts` — السطر 60 |
| **التصنيف** | CWE-400: Uncontrolled Resource Consumption |

**الوصف:**  
```typescript
app.use(express.json({ limit: "10mb" }));
```
حد 10MB مناسب لرفع الملفات لكنه مفرط للطلبات JSON العادية. يمكن لمهاجم إرسال آلاف الطلبات بحجم 10MB لاستنزاف الذاكرة وتعطيل الخادم.

**الإصلاح المطلوب:**
```typescript
// server/index.ts — حدود مختلفة لأنواع مختلفة من الطلبات
app.use(express.json({ limit: "512kb" }));   // ✅ معقول لبيانات JSON العادية
app.use(express.urlencoded({ extended: true, limit: "512kb" }));

// للمسارات التي تحتاج حجماً أكبر (استيراد Excel، رفع ملفات):
// استخدم multer فقط على تلك المسارات تحديداً كما هو الحال بالفعل
```

---

### M-06 · التوكنات الحساسة مكشوفة في رابط URL

| الحقل | التفاصيل |
|---|---|
| **الخطورة** | 🟠 MEDIUM |
| **الملف** | `client/src/pages/ProjectEditForm.tsx`, `client/src/pages/AdminRegister.tsx` |
| **التصنيف** | CWE-598: Information Exposure Through Query Strings in GET Request |

**الوصف:**  
رابط تعديل السجل يحمل توكن بشكل مباشر:
```
/p/{projectId}/edit/{editToken}
```
ورابط الدعوة:
```
/admin/register/{inviteToken}
```
هذه التوكنات تظهر في:
- سجلات خادم الويب (Nginx/Replit logs)
- تاريخ المتصفح
- رأسية `Referer` عند الانتقال لموقع آخر
- سجلات أي proxy وسيط

**الإصلاح المطلوب:**
```typescript
// 1. قلّص مدة صلاحية التوكن (مُنفَّذ بالفعل، لكن تأكد من القيم المعقولة)
//    editTokenHours: 48 → 24 ساعة كافية

// 2. أضف رأسية Referrer-Policy على الخادم
// server/index.ts
app.use((_req, res, next) => {
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

// 3. استخدام HTTP-only POST للتوكنات البديلة (مستقبلاً):
//    بدلاً من /edit/:token في URL → POST /edit مع token في الـ body
//    (تغيير جوهري يتطلب إعادة تصميم التجربة)
```

---

## قسم 3 — الثغرات المنخفضة الخطورة (LOW)

---

### L-01 · الكشف الصامت عن فشل GCM Authentication Tag

| الحقل | التفاصيل |
|---|---|
| **الخطورة** | 🟡 LOW |
| **الملف** | `server/services/crypto.ts` — السطر 47–49 |
| **التصنيف** | CWE-390: Detection of Error Condition Without Action |

**الوصف:**  
دالة `decrypt()` تعيد سلسلة فارغة عند أي خطأ بصمت تام، بما في ذلك فشل التحقق من صحة الـ GCM authentication tag (المؤشر الأساسي على العبث بالبيانات):
```typescript
} catch {
  return "";  // ⚠️ يخفي علامات التلاعب بالبيانات المشفرة
}
```

**الإصلاح المطلوب:**
```typescript
// server/services/crypto.ts
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const buffer = Buffer.from(encryptedText, "base64");
    const iv       = buffer.subarray(0, 16);
    const authTag  = buffer.subarray(16, 32);
    const encrypted = buffer.subarray(32);
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY.slice(0, 32), iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch (err) {
    // ✅ سجّل الحدث — قد يكون مؤشراً على العبث بقاعدة البيانات
    console.error("[SECURITY] Decryption failed — possible data tampering:", err);
    return "";
  }
}
```

---

### L-02 · رمز الدعوة الافتراضي قابل للتخمين

| الحقل | التفاصيل |
|---|---|
| **الخطورة** | 🟡 LOW |
| **الملف** | `server/index.ts` — السطر 144، `server/routes/projects.ts` — السطر 148 |
| **التصنيف** | CWE-521: Weak Password Requirements |

**الوصف:**  
الرمز الافتراضي لكل مشروع جديد هو `PROJECT-2026` أو مشتق من اسم المشروع بنمط ثابت:
```typescript
invitationCode: invitationCode || `${name.replace(/\s+/g, "-").toUpperCase()}-2026`
```
يمكن تخمين هذا الرمز بسهولة إذا كان اسم المشروع معروفاً.

**الإصلاح المطلوب:**
```typescript
// server/routes/projects.ts
import { randomBytes } from "crypto";

function generateInvitationCode(name: string): string {
  const prefix = name.replace(/\s+/g, "-").toUpperCase().slice(0, 8);
  const suffix = randomBytes(3).toString("hex").toUpperCase(); // 6 حروف عشوائية
  return `${prefix}-${suffix}`;
}

// الاستخدام:
invitationCode: invitationCode || generateInvitationCode(name),
```

---

### L-03 · بيانات المسودة الحساسة في localStorage

| الحقل | التفاصيل |
|---|---|
| **الخطورة** | 🟡 LOW |
| **الملف** | `client/src/pages/ProjectRegister.tsx` — السطر 74–85 |
| **التصنيف** | CWE-922: Insecure Storage of Sensitive Information |

**الوصف:**  
النموذج يحفظ مسودة البيانات في `localStorage` كاحتياط. إذا احتوى النموذج على بيانات حساسة (أرقام هوية، معلومات طبية، بيانات شخصية)، فهي تبقى في الجهاز حتى بعد إغلاق المتصفح.

**الإصلاح المطلوب:**
```typescript
// client/src/pages/ProjectRegister.tsx
// عند الإرسال الناجح — احذف المسودة المحلية فوراً
const clearDraft = () => {
  localStorage.removeItem(`draft-${projectId}`);
  localStorage.removeItem(`draftId-${projectId}`);
  // ✅ أضف: امسح أيضاً أي بيانات مؤقتة محددة
  sessionStorage.clear(); // للحسابات المؤقتة
};

// ✅ اضبط TTL أقصر في localStorage: 24 ساعة بدلاً من 7 أيام
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const savedTimestamp = localStorage.getItem(`draft-ts-${projectId}`);
if (savedTimestamp && Date.now() - Number(savedTimestamp) > DRAFT_TTL_MS) {
  clearDraft();
}
```

---

### L-04 · استخدام `session as any` يتجاوز نظام الأنواع

| الحقل | التفاصيل |
|---|---|
| **الخطورة** | 🟡 LOW |
| **الملف** | `server/routes/auth.ts`, `server/routes/projects.ts` — متعدد الأسطر |
| **التصنيف** | CWE-704: Incorrect Type Conversion |

**الوصف:**  
```typescript
(req.session as any).userId = user.id;
(req.session as any).role = user.role;
```
استخدام `as any` يعطّل فحص الأنواع في TypeScript، مما يجعل من الممكن حدوث أخطاء في بيانات الجلسة دون رصدها.

**الإصلاح المطلوب:**
```typescript
// server/types/session.d.ts — أنشئ ملفاً لتعريف أنواع الجلسة
import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: string;
    role: "admin" | "editor" | "viewer";
    fullName: string;
    [key: `code_${string}`]: boolean; // لرموز التحقق من المشاريع
  }
}

// الآن يمكن استخدام:
req.session.userId = user.id;     // ✅ مع فحص النوع الكامل
req.session.role = user.role;
```

---

## قسم 4 — المعلومات الأمنية (INFO)

---

### I-01 · نقطة `/setup-required` تكشف حالة النظام

| الحقل | التفاصيل |
|---|---|
| **الخطورة** | ℹ️ INFO |
| **الملف** | `server/routes/auth.ts` — السطر 21–28 |

النقطة العامة `/api/auth/setup-required` تُرجع `{ required: true/false }` وتكشف إذا كان النظام لم يُعدَّ بعد. بعد الإعداد الأولي، لا قيمة من إبقائها متاحة.

**التوصية:** أضف rate limiting أو قيّد الوصول بعد الإعداد الأول.

---

### I-02 · `/app-info` يكشف بيانات التطبيق العامة

| الحقل | التفاصيل |
|---|---|
| **الخطورة** | ℹ️ INFO |
| **الملف** | `server/routes/projects.ts` — السطر 71–82 |

النقطة العامة `/api/projects/app-info` تُرجع اسم التطبيق وشعاره ولغته الافتراضية. هذا مقصود للصفحات العامة (تسجيل الموظف)، لكن يجب الانتباه لعدم إضافة بيانات إضافية مستقبلاً.

**التوصية:** تأكد من بقاء الـ projection محدوداً بالحقول الحالية فقط: `{ appName, appLogoUrl, defaultLanguage }`.

---

### I-03 · `bcryptjs` أبطأ من `bcrypt` الأصلي

| الحقل | التفاصيل |
|---|---|
| **الخطورة** | ℹ️ INFO |
| **الملف** | `server/routes/auth.ts`, `server/routes/projects.ts` |

`bcryptjs` هو تنفيذ JavaScript خالص أبطأ من `bcrypt` الذي يستخدم C++ addon. الـ cost factor الحالي (12) كافٍ للأمان لكن الأداء أقل.

**التوصية:** للإنتاج على نطاق واسع، انتقل إلى `@node-rs/bcrypt` (Rust-based) أو `bcrypt` (C++ addon). لا تغيير مطلوب الآن.

---

## قسم 5 — جدول الأولويات والتنفيذ

| # | الثغرة | الأثر | الجهد | الأولوية |
|---|---|---|---|---|
| H-01 | تثبيت الجلسة | اختطاف الجلسة | منخفض | 🔴 فوري |
| H-02 | Rate limiting على الدعوة | Brute-force | منخفض | 🔴 فوري |
| H-03 | `mustChangePassword` غير مُطبَّق | تجاوز تغيير كلمة المرور | متوسط | 🔴 فوري |
| H-04 | Remember-me token غير مُجزَّأ | اختراق DB → تسجيل دخول | متوسط | 🔴 قريباً |
| M-01 | كشف رسائل الخطأ | استطلاع البنية الداخلية | متوسط | 🟠 هذا الأسبوع |
| M-02 | غياب CSP | XSS amplification | منخفض | 🟠 هذا الأسبوع |
| M-03 | Uploads بدون auth | كشف ملفات | متوسط | 🟠 هذا الأسبوع |
| M-04 | MIME type لم يُفحص | رفع ملفات خبيثة | عالٍ | 🟠 هذا الأسبوع |
| M-05 | JSON body 10MB | DoS | منخفض | 🟠 هذا الأسبوع |
| M-06 | توكنات في URL | تسرب الرمز | منخفض | 🟠 هذا الشهر |
| L-01 | GCM صامت | إخفاء العبث | منخفض | 🟡 هذا الشهر |
| L-02 | Invitation code قابل للتخمين | وصول غير مصرح | منخفض | 🟡 هذا الشهر |
| L-03 | localStorage حساس | تسرب في جهاز المستخدم | منخفض | 🟡 هذا الشهر |
| L-04 | `session as any` | أخطاء مخفية | منخفض | 🟡 مستقبلاً |
| I-01 | `/setup-required` عام | استطلاع النظام | لا شيء | ℹ️ مستقبلاً |
| I-02 | `/app-info` عام | مقصود | لا شيء | ℹ️ مراقبة |
| I-03 | bcryptjs بدل bcrypt | أداء | لا شيء | ℹ️ اختياري |

---

## قسم 6 — ما هو آمن بالفعل ✅

| الجانب | التفاصيل |
|---|---|
| **التشفير** | AES-256-GCM مع IV عشوائي + authentication tag — معياري وصحيح |
| **ENCRYPTION_KEY** | يُتحقق منه عند البدء (64 hex chars = 256-bit) — صارم |
| **SESSION_SECRET** | مُوجَّه من Secrets، يوقف السيرفر إذا غاب |
| **كلمات المرور** | bcrypt بـ cost factor 12 — مناسب |
| **CORS** | Allowlist محدودة بنطاقات Replit المعروفة — لا wildcards |
| **SQL Injection** | Drizzle ORM + parameterized queries في جميع الاستعلامات |
| **Path Traversal** | أسماء ملفات UUID — لا originalname في المسار |
| **امتدادات الملفات** | Allowlist صريحة في multer |
| **Bulk Delete IDOR** | محمي بـ projectId scoping في كل عملية حذف |
| **Rate Limiting على تسجيل الدخول** | 5 محاولات / 15 دقيقة |
| **Rate Limiting على النماذج العامة** | 10 طلبات / دقيقة على الإرسال |
| **XSS في الواجهة** | لا استخدام لـ dangerouslySetInnerHTML أو innerHTML |
| **Secrets في الواجهة** | لا VITE_* variables حساسة |
| **DB Init Fail-Fast** | process.exit(1) عند فشل تهيئة قاعدة البيانات |
| **Atomic Sequential Numbers** | Advisory lock يمنع التكرار تحت الضغط |
| **إخفاء Session Cookie** | httpOnly: true — JavaScript لا يستطيع قراءته |
| **حماية بيانات Session** | secure: true في الإنتاج |
| **Session Store** | PostgreSQL (لا in-memory) — متسق عبر عمليات تشغيل متعددة |
| **SameSite Cookie** | "lax" — يحمي من CSRF على معظم هجمات cross-site |

---

## قسم 7 — خطة التنفيذ المقترحة

### المرحلة الأولى (فورية — خلال 48 ساعة)
```
H-01: session.regenerate() بعد تسجيل الدخول
H-02: rate limiting على /register-invite و /setup
H-03: mustChangePassword middleware
```

### المرحلة الثانية (هذا الأسبوع)
```
H-04: تجزئة remember-me token أو إزالة الميزة
M-01: centralized error handler
M-02: تفعيل CSP و frameguard
M-03: حماية /uploads بمصادقة
M-04: فحص MIME type للملفات
M-05: تخفيض JSON body limit إلى 512kb
```

### المرحلة الثالثة (هذا الشهر)
```
M-06: Referrer-Policy header
L-01: تسجيل أخطاء التشفير
L-02: رمز دعوة عشوائي
L-03: تحسين TTL مسودات localStorage
L-04: session type declarations
```

---

## قسم 8 — تقييم الوضع بعد تطبيق جميع الإصلاحات

بعد تطبيق جميع الإصلاحات أعلاه، ستحصل المنصة على:

| المعيار | التقييم |
|---|---|
| OWASP Top 10 | ✅ مغطى بالكامل |
| Authentication Security | ✅ |
| Data Encryption | ✅ AES-256-GCM |
| Input Validation | ✅ Zod + MIME check |
| Access Control | ✅ Role-based + Project-scoped |
| Security Headers | ✅ CSP + HSTS + Frameguard |
| Rate Limiting | ✅ جميع النقاط الحساسة |
| Error Handling | ✅ لا كشف داخلي |
| Session Management | ✅ Regeneration + Secure flags |
| File Security | ✅ MIME + Auth + UUID names |

---

*هذا التقرير أُعدَّ بناءً على مراجعة شاملة للكود المصدري. يُوصى بإعادة الفحص بعد تطبيق كل مرحلة من مراحل الإصلاح.*
