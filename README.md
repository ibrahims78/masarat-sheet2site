<div align="center">

# 🏥 نظام بيانات الكوادر الصحية
### Nawah Healthcare Staff Management System

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

نظام ويب متكامل لتسجيل وإدارة بيانات الكوادر الصحية لمنصة نواة،  
مع لوحة تحكم إدارية، تكامل مع Google Sheets، وإشعارات Telegram.

**A full-stack web application for healthcare staff data registration and management,**  
**featuring an admin dashboard, Google Sheets integration, and Telegram notifications.**

[العربية](#-نظرة-عامة) • [English](#-overview) • [التثبيت](#-التثبيت) • [Screenshots](#-screenshots)

</div>

---

## 📋 نظرة عامة

نظام **نواة لإدارة الكوادر الصحية** هو منصة رقمية متكاملة تُتيح:

- **للموظفين:** تسجيل بياناتهم الوظيفية والشخصية عبر نموذج ذكي متعدد الخطوات
- **للمشرفين:** الاطلاع على جميع البيانات وإدارتها وتصديرها
- **للمدراء:** الوصول الكامل مع صلاحيات التعديل والحذف وضبط الإعدادات

---

## 🌟 المميزات الرئيسية

### واجهة التسجيل العامة
- ✅ **نموذج متعدد الخطوات (4 خطوات)** مع شريط تقدم مرئي
- ✅ **رمز الدعوة** — يمنع التسجيل غير المصرح به
- ✅ **رابط تعديل شخصي** — يُرسل للموظف بعد التسجيل (صالح 48 ساعة)
- ✅ **التحقق الفوري** من المدخلات مع رسائل خطأ واضحة

### لوحة التحكم الإدارية
- 📊 **Dashboard** مع إحصائيات مباشرة ورسوم بيانية تفاعلية
- 👥 **قائمة الموظفين** مع بحث + تصفية + تحديد متعدد + حذف دفعي
- 📄 **تفاصيل الموظف** وسجل التعديلات الكامل
- ✏️ **تعديل بيانات الموظف** (للمدراء فقط)
- 📤 **تصدير Excel/CSV** مع اختيار الحقول

### الإعدادات والتكاملات
- 🔗 **Google Sheets** — مزامنة تلقائية للبيانات
- 📱 **Telegram** — إشعارات فورية عند كل تسجيل جديد
- 📧 **SMTP** — إعدادات البريد الإلكتروني
- 👤 **إدارة المستخدمين** — إنشاء مستخدمين بأدوار (مدير / مشرف)

### الأمان والجودة
- 🔐 **تشفير AES-256-GCM** للمعلومات الحساسة
- 🛡️ **Rate Limiting** لمنع الهجمات
- 🌙 **Dark / Light Mode**
- 🌍 **ثنائي اللغة:** عربي (RTL) + إنجليزي

---

## 🔍 Overview

**Nawah Health Cadres System** is a full-stack web platform for managing healthcare staff data across organizations. It provides a public multi-step registration form secured by invite codes, a powerful admin dashboard for data management, and integrations with Google Sheets and Telegram.

---

## 🛠️ التقنيات المستخدمة | Tech Stack

| الطبقة | التقنية |
|--------|---------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v3 |
| **UI Components** | Radix UI, shadcn/ui, Lucide Icons, Recharts |
| **State Management** | TanStack Query v5, React Context |
| **Routing** | Wouter |
| **Forms** | React Hook Form + Zod |
| **Backend** | Node.js, Express 4, TypeScript, tsx |
| **Database** | PostgreSQL + Drizzle ORM |
| **Auth** | Express Session + bcryptjs |
| **Integrations** | Google Sheets API, Telegram Bot API, Nodemailer |
| **Security** | Helmet, CORS, express-rate-limit, crypto-js |
| **Export** | ExcelJS |

---

## 📁 بنية المشروع | Project Structure

```
nawah-health-cadres-system/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/        # UI Components (shadcn/ui)
│   │   │   ├── ui/            # Base components
│   │   │   ├── FormStepper.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── LanguageToggle.tsx
│   │   ├── contexts/          # React Contexts
│   │   │   ├── AuthContext.tsx
│   │   │   └── LanguageContext.tsx
│   │   ├── pages/             # Page Components
│   │   │   ├── Register.tsx   # Public registration form
│   │   │   ├── EditForm.tsx   # Staff self-edit page
│   │   │   ├── Setup.tsx      # First-run admin setup
│   │   │   └── admin/
│   │   │       ├── Login.tsx
│   │   │       ├── Dashboard.tsx
│   │   │       ├── EmployeeList.tsx
│   │   │       ├── EmployeeDetails.tsx
│   │   │       ├── EmployeeEdit.tsx
│   │   │       ├── Export.tsx
│   │   │       └── Settings.tsx
│   │   ├── steps/             # Form step components
│   │   │   ├── Step1InviteCode.tsx
│   │   │   ├── Step2OrgInfo.tsx
│   │   │   ├── Step3PersonalInfo.tsx
│   │   │   └── Step4Review.tsx
│   │   └── styles/
│   │       └── globals.css
│   └── index.html
├── server/                    # Express Backend
│   ├── index.ts               # Server entry point
│   ├── db.ts                  # Database connection + init
│   ├── middleware/
│   │   └── auth.ts            # Session auth middleware
│   ├── routes/
│   │   ├── auth.ts            # Login/logout/me
│   │   ├── form.ts            # Public registration
│   │   ├── admin.ts           # Employee CRUD
│   │   └── settings.ts        # System settings
│   └── services/
│       ├── crypto.ts          # AES-256 encryption
│       ├── sheets.ts          # Google Sheets sync
│       ├── telegram.ts        # Telegram notifications
│       └── email.ts           # SMTP email
├── shared/
│   └── schema.ts              # Drizzle ORM schema + Zod validators
├── vite.config.ts
├── package.json
└── tsconfig.json
```

---

## ⚡ التثبيت والتشغيل | Installation

### المتطلبات | Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 1. استنساخ المستودع

```bash
git clone https://github.com/ibrahims78/nawah-health-cadres-system_V1.git
cd nawah-health-cadres-system_V1
```

### 2. تثبيت الحزم

```bash
npm install
```

### 3. إعداد متغيرات البيئة

أنشئ ملف `.env` في جذر المشروع:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nawah_health

# Session
SESSION_SECRET=your-strong-random-secret-here

# Optional: Google Sheets Integration
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id

# Optional: Telegram Notifications
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# Optional: Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-app-password
```

### 4. تشغيل التطبيق

```bash
npm run dev       # تشغيل الخادم والواجهة معاً
npm run server    # الخادم فقط (Express على port 3001)
npm run client    # الواجهة فقط (Vite على port 5000)
```

### 5. الإعداد الأولي

افتح المتصفح على `http://localhost:5000` وستُوجَّه تلقائياً إلى صفحة **إعداد النظام** لإنشاء حساب المدير الأول.

---

## 🗂️ نموذج التسجيل | Registration Flow

```
الخطوة 1: رمز الدعوة
    ↓ (NAWAH-2026 افتراضياً)
الخطوة 2: البيانات التنظيمية
    ↓ (الوزارة، المنشأة، القسم، المسمى الوظيفي)
الخطوة 3: البيانات الشخصية
    ↓ (الاسم، الهوية، التواصل، الإقامة)
الخطوة 4: المراجعة والتأكيد
    ↓
✅ تسجيل ناجح + رابط تعديل شخصي (48 ساعة)
```

---

## 🔐 نظام الأدوار | Role System

| الدور | الصلاحيات |
|-------|-----------|
| **Admin (مدير)** | عرض + تعديل + حذف + إعدادات + إنشاء مستخدمين |
| **Viewer (مشرف)** | عرض + تصدير فقط (بدون تعديل أو حذف) |

---

## 📡 API Endpoints

### المصادقة
| Method | Endpoint | الوصف |
|--------|----------|-------|
| `POST` | `/api/auth/login` | تسجيل الدخول |
| `POST` | `/api/auth/logout` | تسجيل الخروج |
| `GET` | `/api/auth/me` | بيانات المستخدم الحالي |

### التسجيل العام
| Method | Endpoint | الوصف |
|--------|----------|-------|
| `POST` | `/api/form/register` | تسجيل موظف جديد |
| `GET` | `/api/form/edit/:token` | جلب البيانات بالتوكن |
| `PUT` | `/api/form/edit/:token` | تعديل البيانات بالتوكن |

### لوحة الإدارة
| Method | Endpoint | الوصف |
|--------|----------|-------|
| `GET` | `/api/admin/employees` | قائمة الموظفين |
| `GET` | `/api/admin/employees/:id` | تفاصيل موظف |
| `PUT` | `/api/admin/employees/:id` | تعديل موظف |
| `DELETE` | `/api/admin/employees/:id` | حذف موظف |
| `GET` | `/api/admin/stats` | إحصائيات عامة |
| `GET` | `/api/admin/export` | تصدير البيانات |

### الإعدادات
| Method | Endpoint | الوصف |
|--------|----------|-------|
| `GET` | `/api/settings` | جلب الإعدادات |
| `PUT` | `/api/settings` | تحديث الإعدادات |
| `GET` | `/api/settings/users` | قائمة المستخدمين |
| `POST` | `/api/settings/users` | إنشاء مستخدم |

---

## 🚀 النشر | Deployment

### متغيرات بيئة الإنتاج

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=strong-production-secret
```

### بناء للإنتاج

```bash
npm run build
npm start
```

---

## 🤝 المساهمة | Contributing

المساهمات مرحب بها! يُرجى:

1. Fork المستودع
2. إنشاء branch جديد: `git checkout -b feature/amazing-feature`
3. Commit التغييرات: `git commit -m 'feat: add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. فتح Pull Request

---

## 📄 الرخصة | License

هذا المشروع مرخص تحت رخصة **MIT** — راجع ملف [LICENSE](LICENSE) للتفاصيل.

---

<div align="center">

صُنع بـ ❤️ لمنصة **نواة**

Made with ❤️ for **Nawah Platform**

</div>
