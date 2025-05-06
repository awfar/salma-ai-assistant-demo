
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MessageCircle, Phone, ThumbsUp, HelpCircle, FileText, Clock } from "lucide-react";

const AgentInstructions = () => {
  return (
    <div className="space-y-4 rtl">
      <h2 className="text-xl font-bold text-ministry-dark text-right">إرشادات استخدام مساعد سلمى الذكي</h2>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-right flex items-center justify-end gap-2">
            <span>كيفية التحدث مع سلمى</span>
            <MessageCircle className="h-4 w-4" />
          </CardTitle>
        </CardHeader>
        <CardContent className="text-right">
          <ul className="space-y-2 list-disc pr-5">
            <li>تحدث بصوت واضح ومباشر</li>
            <li>انتظر حتى تنتهي سلمى من الكلام قبل الرد</li>
            <li>استخدم جمل قصيرة ومحددة للحصول على أفضل استجابة</li>
          </ul>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-right flex items-center justify-end gap-2">
            <span>خدمات يمكن لسلمى مساعدتك بها</span>
            <ThumbsUp className="h-4 w-4" />
          </CardTitle>
        </CardHeader>
        <CardContent className="text-right">
          <ul className="space-y-2 list-disc pr-5">
            <li>الاستعلام عن المعاشات والمساعدات الاجتماعية</li>
            <li>معلومات عن برامج الدعم المتاحة</li>
            <li>متطلبات وإجراءات التقديم للخدمات المختلفة</li>
            <li>مواعيد وعناوين مكاتب الوزارة</li>
            <li>الإجابة على الأسئلة المتكررة</li>
          </ul>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-right flex items-center justify-end gap-2">
            <span>أوقات الخدمة</span>
            <Clock className="h-4 w-4" />
          </CardTitle>
        </CardHeader>
        <CardContent className="text-right">
          <p>المساعد متاح على مدار 24 ساعة طوال أيام الأسبوع للرد على استفساراتكم</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-right flex items-center justify-end gap-2">
            <span>للمساعدة والطوارئ</span>
            <HelpCircle className="h-4 w-4" />
          </CardTitle>
        </CardHeader>
        <CardContent className="text-right">
          <p>للتواصل مع موظف بشري يرجى الاتصال بالرقم: <span className="font-bold">16439</span></p>
        </CardContent>
      </Card>

      <div className="bg-ministry-dark/10 p-3 rounded-lg text-right text-sm mt-4">
        <p className="font-bold mb-1">ملاحظة هامة:</p>
        <p>سلمى هي مساعد افتراضي تجريبي وقد تكون بعض المعلومات المقدمة غير دقيقة. يرجى التأكد من المعلومات الرسمية من خلال موقع الوزارة.</p>
      </div>
    </div>
  );
};

export default AgentInstructions;
