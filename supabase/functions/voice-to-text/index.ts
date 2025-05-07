
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// معالجة قاعدة64 بشكل متقطع لمنع مشاكل الذاكرة
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audio, language = 'ar' } = await req.json()
    
    if (!audio) {
      throw new Error('لم يتم توفير بيانات صوتية')
    }

    console.log("استلام بيانات صوتية للتحويل إلى نص، حجم البيانات:", audio.length);

    // معالجة الصوت بشكل متقطع
    const binaryAudio = processBase64Chunks(audio)
    
    // إعداد FormData
    const formData = new FormData()
    
    // Determine appropriate mime type based on data
    const mimeType = 'audio/webm';
    const blob = new Blob([binaryAudio], { type: mimeType })
    formData.append('file', blob, 'audio.webm')
    formData.append('model', 'whisper-1')
    formData.append('language', language) // تحديد اللغة 

    console.log("إرسال الطلب إلى OpenAI Whisper API...");
    console.log("مع اللغة المحددة:", language);

    // إرسال إلى OpenAI
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${errorText}`);
      throw new Error(`خطأ في OpenAI API: ${response.status}`);
    }

    const result = await response.json();
    console.log("تم تحويل الصوت إلى نص بنجاح:", result.text);

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('خطأ في تحويل الصوت إلى نص:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
