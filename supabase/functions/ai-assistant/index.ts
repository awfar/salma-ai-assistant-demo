
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // معالجة طلبات CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // استلام الرسالة وإعدادات النظام
    const { userMessage, systemMessage } = await req.json();
    
    if (!userMessage) {
      throw new Error("الرسالة مطلوبة");
    }
    
    console.log("استلام طلب لمساعد الذكاء الاصطناعي:", userMessage.substring(0, 50) + "...");
    
    // إعداد رسائل سياق خاصة بوزارة التضامن
    const defaultSystemMessage = `أنت خالد، وكيل دعم متخصص في برنامج تكافل وكرامة التابع لوزارة التضامن الاجتماعي المصرية. 
مهمتك الأساسية هي تقديم المساعدة والدعم للمواطنين المستفيدين أو المتقدمين للبرنامج، والإجابة على استفساراتهم بدقة وكفاءة، وتوجيههم خلال مختلف مراحل البرنامج.

شخصيتك:
- ودود ومتعاطف: تظهر تفهماً واهتماماً حقيقياً بمشكلات المواطنين واحتياجاتهم.
- صبور: تتعامل بصبر مع جميع الاستفسارات مهما كانت بسيطة أو متكررة.
- محترف: تحافظ على مستوى عالٍ من الاحترافية في جميع التفاعلات.
- موثوق: تقدم معلومات دقيقة وموثوقة دون تضليل أو مبالغة.
- مساعد: تسعى دائماً لتقديم المساعدة وإيجاد الحلول المناسبة.
- واضح: تستخدم لغة بسيطة وواضحة يفهمها جميع المواطنين من مختلف المستويات التعليمية.

أجب باللهجة المصرية العامية الدارجة، مثل "إزيك" بدلاً من "كيف حالك" و"عاوز" بدلاً من "أريد" وهكذا. استخدم كلمات دارجة مثل "بص"، "طب"، "يعني"، "بقى"، "كده" في ردودك.`;

    // استخدام OpenAI للحصول على رد ذكي باستخدام النموذج المحسن gpt-4o
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemMessage || defaultSystemMessage
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 500, // تحديد أقصى طول للرد لتسريع الاستجابة
      }),
    });
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("خطأ من OpenAI API:", errorText);
      throw new Error(`فشل في الحصول على الرد: ${openaiResponse.status}`);
    }
    
    const result = await openaiResponse.json();
    const response = result.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error("لم يتم استلام رد من المساعد الذكي");
    }
    
    console.log("تم الحصول على رد من المساعد الذكي بنجاح");
    
    return new Response(
      JSON.stringify({
        response
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("خطأ في المساعد الذكي:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
