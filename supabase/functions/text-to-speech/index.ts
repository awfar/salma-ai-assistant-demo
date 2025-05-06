
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ELEVEN_LABS_API_KEY = Deno.env.get("ELEVEN_LABS_API_KEY");

// هذه المعرفات الصوتية من Eleven Labs التي يمكننا استخدامها (لتغييرها لاحقًا)
// نستخدم افتراضيًا صوت Sarah - لأنثى عربية
const VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; 

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
    const { text, voice = VOICE_ID } = await req.json();

    if (!text) {
      throw new Error("لم يتم توفير نص للتحويل");
    }

    console.log("محاولة تحويل النص:", text);
    console.log("استخدام صوت ElevenLabs ID:", voice);

    // إرسال طلب إلى Eleven Labs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVEN_LABS_API_KEY || "",
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.65,
            similarity_boost: 0.9,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("خطأ من Eleven Labs API:", errorText);
      throw new Error(`فشل في تحويل النص إلى كلام: ${response.status}`);
    }

    console.log("تم تحويل النص إلى كلام بنجاح، جاري معالجة البيانات الصوتية");

    // الحصول على البيانات الصوتية وتحويلها إلى Base64
    const audioArrayBuffer = await response.arrayBuffer();
    const audioBase64 = btoa(
      String.fromCharCode(...new Uint8Array(audioArrayBuffer))
    );

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
