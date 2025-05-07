
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

// Process base64 in chunks to prevent memory issues
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
  console.log("🎤 Voice-to-text function called");
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audio, language = 'ar' } = await req.json()
    
    if (!audio) {
      console.error("❌ No audio data provided");
      throw new Error('لم يتم توفير بيانات صوتية')
    }

    console.log("🔄 Received audio data for transcription, size:", audio.length);

    // Verify API key is available
    if (!OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY environment variable is not set");
      throw new Error('مفتاح API غير متوفر (OPENAI_API_KEY)')
    }

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio)
    
    // Additional verification of audio data
    if (binaryAudio.length < 500) {
      console.error("❌ Audio data too small:", binaryAudio.length, "bytes");
      throw new Error("بيانات الصوت غير كافية للتحويل");
    }
    
    console.log("🔄 Processing audio data of size:", binaryAudio.length, "bytes");
    
    // Setup FormData
    const formData = new FormData()
    
    // Use mp3 for compatibility with OpenAI
    const blob = new Blob([binaryAudio], { type: 'audio/mp3' })
    formData.append('file', blob, 'audio.mp3')
    formData.append('model', 'whisper-1')
    formData.append('language', language) // Explicitly set Arabic language
    formData.append('response_format', 'json')
    formData.append('temperature', '0.0') // Lower value for higher accuracy
    formData.append('prompt', 'هذا تسجيل صوتي باللغة العربية يحتوي على أسئلة واستفسارات متعلقة ببرنامج تكافل وكرامة ووزارة التضامن الاجتماعي المصرية') // Context prompt to help accuracy

    console.log("🔄 Sending request to OpenAI Whisper API...");
    console.log("🔤 With language:", language);
    console.log("📦 File size:", blob.size, "bytes");

    // Send to OpenAI with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ OpenAI API error: ${errorText}`);
        throw new Error(`خطأ في OpenAI API: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ Successfully converted audio to text:", result.text);

      return new Response(
        JSON.stringify({ text: result.text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error("❌ Request timeout");
        throw new Error('انتهت مهلة معالجة الصوت. يرجى المحاولة مرة أخرى.');
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('❌ Error in voice-to-text:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
