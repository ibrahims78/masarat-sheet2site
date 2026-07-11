/**
 * FormSubmitted — شاشة موحّدة لما بعد إرسال النموذج.
 *
 * تغطي ثلاث حالات:
 *   1. "success" — إرسال/تحديث ناجح، مع رابط تعديل اختياري (نموذج التسجيل العام)
 *   2. "success-no-link" — إرسال ناجح بدون رابط تعديل (نموذج المشاركين)
 *   3. "locked" — انقضاء فترة التعديل أو القفل الإداري
 *
 * الفروقات الوظيفية الحقيقية (كتفعيل تيليغرام، حالة المشارك) تبقى خارج هذا المكوّن
 * في الصفحة الأصلية، ويمكن إدراجها عبر `children`.
 */
import { CheckCircle, Lock, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DesignerCredit } from "@/components/DesignerCredit";
import { cn } from "@/lib/utils";

export interface FormSubmittedProps {
  isAr: boolean;
  /** "success" = إرسال/تحديث ناجح | "locked" = مقفول */
  type: "success" | "locked";
  /** عنوان بديل (اختياري — يُستخدم الافتراضي إن حُذف) */
  title?: string;
  /** رسالة فرعية (اختياري) */
  message?: string;
  /** رابط التعديل الشخصي (يظهر فقط عند تمريره) */
  editLink?: string;
  /** ساعات صلاحية الرابط */
  tokenHours?: number;
  /** موعد انتهاء التعديل (Date) */
  editDeadline?: Date | null;
  /** هل تم النسخ (لحالة الرابط) */
  copied?: boolean;
  /** callback عند الضغط على "نسخ الرابط" */
  onCopyLink?: () => void;
  /** محتوى إضافي يظهر أسفل البطاقة (اختياري — مثل إشعار تيليغرام) */
  children?: React.ReactNode;
}

export function FormSubmitted({
  isAr,
  type,
  title,
  message,
  editLink,
  tokenHours,
  editDeadline,
  copied,
  onCopyLink,
  children,
}: FormSubmittedProps) {
  const isLocked = type === "locked";

  const defaultTitle = isLocked
    ? (isAr ? "شكراً لك! 🎉" : "Thank You! 🎉")
    : (isAr ? "تم الإرسال بنجاح! 🎉" : "Submitted Successfully! 🎉");

  const defaultMessage = isLocked
    ? (isAr ? "تم تسجيل بياناتك. انتهت فترة التعديل." : "Your data was recorded. The editing period has ended.")
    : (isAr ? "شكراً لك على تعبئة النموذج." : "Thank you for filling out the form.");

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4"
      dir={isAr ? "rtl" : "ltr"}
    >
      <Card className="p-8 max-w-sm w-full text-center space-y-5 shadow-lg">
        {/* أيقونة الحالة */}
        <div
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mx-auto",
            isLocked
              ? "bg-slate-100 dark:bg-slate-800"
              : "bg-green-100 dark:bg-green-900/30",
          )}
        >
          {isLocked ? (
            <Lock className="h-10 w-10 text-slate-400" />
          ) : (
            <CheckCircle className="h-12 w-12 text-green-500" />
          )}
        </div>

        {/* العنوان والرسالة */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {title ?? defaultTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{message ?? defaultMessage}</p>
        </div>

        {/* رابط التعديل (للنموذج العام فقط) */}
        {!isLocked && editLink && (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2 text-start">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {isAr ? "رابط التعديل الخاص بك" : "Your personal edit link"}
            </p>
            <p className="text-[11px] font-mono break-all text-slate-500 dark:text-slate-400 leading-relaxed">
              {editLink}
            </p>
            {tokenHours != null && (
              <p className="text-[11px] text-muted-foreground">
                {isAr ? `صالح لمدة ${tokenHours} ساعة` : `Valid for ${tokenHours} hours`}
              </p>
            )}
          </div>
        )}

        {/* موعد انتهاء التعديل (لنموذج المشاركين) */}
        {!isLocked && editDeadline && !editLink && (
          <p className="text-xs text-muted-foreground">
            {isAr
              ? `يمكنك التعديل حتى: ${editDeadline.toLocaleString("ar")}`
              : `Editable until: ${editDeadline.toLocaleString()}`}
          </p>
        )}

        {/* زر نسخ الرابط */}
        {!isLocked && editLink && onCopyLink && (
          <Button
            onClick={onCopyLink}
            className="w-full gap-2"
            variant={copied ? "secondary" : "default"}
            data-testid="button-copy-link"
          >
            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied
              ? (isAr ? "تم النسخ!" : "Copied!")
              : (isAr ? "نسخ رابط التعديل" : "Copy edit link")}
          </Button>
        )}

        {/* محتوى إضافي (مثل إشعار تيليغرام) */}
        {children}
      </Card>

      <div className="mt-4">
        <DesignerCredit />
      </div>
    </div>
  );
}
