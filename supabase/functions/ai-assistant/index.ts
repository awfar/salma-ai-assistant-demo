
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
    
    // استخدام OpenAI للحصول على رد ذكي
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemMessage || "أنت مساعد سلمى من وزارة التضامن الاجتماعي في مصر. أجب على استفسارات المواطنين بأسلوب رسمي ولطيف."
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.7,
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
