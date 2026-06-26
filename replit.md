# نظام بيانات الكوادر الصحية

نظام ويب متكامل لتسجيل وإدارة بيانات الكوادر الصحية لمنصة نواة.

## التشغيل

- الواجهة: `http://localhost:5173`
- الخادم: `http://localhost:5000`

```bash
npm run dev   # تشغيل الخادم والواجهة معاً
npm run server  # الخادم فقط
npm run client  # الواجهة فقط
```

## البنية

- `client/` — React 18 + TypeScript + Vite + Tailwind
- `server/` — Express.js + TypeScript
- `shared/` — Drizzle ORM Schema
- `server/services/` — Sheets, Telegram, Email, Crypto

## User preferences

- اللغة: العربية (RTL) افتراضياً
- الثيم: Light/Dark mode مدعوم
- الوضع الافتراضي: Arabic RTL
