
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ELEVEN_LABS_API_KEY = Deno.env.get("ELEVEN_LABS_API_KEY");

// Use a verified working voice ID from ElevenLabs
// Arabic female voice - Leila (multilingual)
const VOICE_ID = "Yko7PKHZNXotIFUBdGjp"; // Leila voice ID - Arabic female voice

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

serve(async (req) => {
  console.log("🔊 Text-to-speech function called");
  
  // Handle CORS requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the text to convert to speech
    const { text, voice = VOICE_ID, stream = true } = await req.json();

    if (!text) {
      console.error("❌ No text provided for conversion");
      throw new Error("No text provided for conversion");
    }

    console.log("🔄 Converting text to speech:", text.substring(0, 50) + "...");
    console.log("🎤 Using ElevenLabs voice ID:", voice);
    console.log("🔄 Using streaming mode:", stream);

    // Verify API key is available
    if (!ELEVEN_LABS_API_KEY) {
      console.error("❌ ELEVEN_LABS_API_KEY environment variable is not set");
      throw new Error("ELEVEN_LABS_API_KEY environment variable is not set");
    }

    // Common request settings
    const requestBody = JSON.stringify({
      text: text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.75, // Increased for more consistent output
        similarity_boost: 0.85,
        style: 0.5,
        use_speaker_boost: true,
      },
    });

    const headers = {
      "Accept": stream ? "audio/mpeg" : "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": ELEVEN_LABS_API_KEY,
      // Add User-Agent header to avoid potential blocking
      "User-Agent": "ElevenLabsSupabaseFunction/1.0",
    };

    if (stream) {
      // Use the streaming endpoint with higher optimization for lower latency
      const streamUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?optimize_streaming_latency=4`;
      console.log("🔊 Using streaming API endpoint:", streamUrl);

      const response = await fetch(streamUrl, {
        method: "POST",
        headers: headers,
        body: requestBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error from Eleven Labs API:", errorText);
        throw new Error(`Failed to stream text to speech: ${response.status} ${errorText}`);
      }

      console.log("✅ Successfully started audio streaming");

      // Stream the audio data directly to the browser with explicit CORS and no-cache headers
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    } else {
      // Use the regular endpoint (for compatibility)
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
        console.error("❌ Error from Eleven Labs API:", errorText);
        throw new Error(`Failed to convert text to speech: ${response.status} ${errorText}`);
      }

      console.log("✅ Successfully converted text to speech, processing audio data");

      // Get the audio data
      const audioArrayBuffer = await response.arrayBuffer();
      
      // Verify audio data is not empty
      if (!audioArrayBuffer || audioArrayBuffer.byteLength === 0) {
        throw new Error("Empty audio data received from Eleven Labs API");
      }
      
      console.log(`✅ Received audio data of size: ${audioArrayBuffer.byteLength} bytes`);
      
      // Convert ArrayBuffer to Base64 safely
      const audioBase64 = bufferToBase64(audioArrayBuffer);
      
      console.log(`✅ Successfully converted audio data to Base64, length: ${audioBase64.length}`);

      return new Response(
        JSON.stringify({
          audio: audioBase64,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        }
      );
    }
  } catch (error) {
    console.error("❌ Error in text-to-speech conversion:", error);
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

// Convert ArrayBuffer to Base64 safely and efficiently
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
