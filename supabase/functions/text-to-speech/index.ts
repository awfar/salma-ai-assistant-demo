
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ELEVEN_LABS_API_KEY = Deno.env.get("ELEVEN_LABS_API_KEY");

// هذه المعرفات الصوتية من Eleven Labs التي يمكننا استخدامها
// نستخدم معرّف الصوت المرتبط بالوكيل
const VOICE_ID = "xBxkQvOKMczEIbvEjnFZ"; 

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
    // استلام النص المراد تحويله إلى كلام
    const { text, voice = VOICE_ID, stream = true } = await req.json();

    if (!text) {
      throw new Error("لم يتم توفير نص للتحويل");
    }

    console.log("محاولة تحويل النص:", text);
    console.log("استخدام صوت ElevenLabs ID:", voice);
    console.log("استخدام وضع الدفق (streaming):", stream);

    // الإعدادات المشتركة للطلب
    const requestBody = JSON.stringify({
      text: text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.65,
        similarity_boost: 0.85,
        style: 0.5,
        use_speaker_boost: true,
      },
    });

    const headers = {
      "Accept": stream ? "audio/mpeg" : "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": ELEVEN_LABS_API_KEY || "",
    };

    if (stream) {
      // استخدام نقطة نهاية الدفق
      const streamUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`;
      console.log("استخدام واجهة برمجة الدفق:", streamUrl);

      const response = await fetch(streamUrl, {
        method: "POST",
        headers: headers,
        body: requestBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("خطأ من Eleven Labs API:", errorText);
        throw new Error(`فشل في دفق النص إلى كلام: ${response.status} ${errorText}`);
      }

      console.log("تم بدء دفق الصوت بنجاح");

      // إعادة دفق البيانات الصوتية مباشرة للمتصفح
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
        },
      });
    } else {
      // استخدام النقطة النهائية العادية (للتوافق)
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
        {
          method: "POST",
          headers: headers,
          body: requestBody,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("خطأ من Eleven Labs API:", errorText);
        throw new Error(`فشل في تحويل النص إلى كلام: ${response.status} ${errorText}`);
      }

      console.log("تم تحويل النص إلى كلام بنجاح، جاري معالجة البيانات الصوتية");

      // الحصول على البيانات الصوتية
      const audioArrayBuffer = await response.arrayBuffer();
      
      // التحقق من أن البيانات الصوتية غير فارغة
      if (!audioArrayBuffer || audioArrayBuffer.byteLength === 0) {
        throw new Error("تم استلام بيانات صوتية فارغة من Eleven Labs API");
      }
      
      console.log(`تم استلام بيانات صوتية بحجم: ${audioArrayBuffer.byteLength} بايت`);
      
      // تحويل ArrayBuffer إلى Base64 بطريقة آمنة
      const audioBase64 = bufferToBase64(audioArrayBuffer);
      
      console.log(`تم تحويل البيانات الصوتية إلى Base64 بنجاح، الطول: ${audioBase64.length}`);

      return new Response(
        JSON.stringify({
          audio: audioBase64,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    console.error("خطأ في تحويل النص إلى كلام:", error);
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

// تحويل ArrayBuffer إلى Base64 بطريقة آمنة ومُحسّنة
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 1024;
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}
