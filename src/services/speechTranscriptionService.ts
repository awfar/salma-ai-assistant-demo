
import { supabase } from '@/integrations/supabase/client';
import { blobToBase64 } from '@/utils/audioUtils';

/**
 * Service for transcribing speech to text
 */
export const speechTranscriptionService = {
  /**
   * Transcribe audio to text using Supabase Edge Function
   */
  async transcribeAudio(audioBlob: Blob): Promise<string | null> {
    try {
      console.log("🎤 بدء تحويل الصوت إلى نص...", "حجم الملف:", Math.round(audioBlob.size / 1024), "كيلوبايت");
      console.log("🎤 نوع الملف الصوتي:", audioBlob.type);
      
      // Validate audio blob size
      if (audioBlob.size < 1000) {
        console.warn("⚠️ ملف الصوت صغير جدًا، قد لا يحتوي على كلام قابل للتمييز");
        throw new Error("لم يتم اكتشاف صوت واضح. يرجى المحاولة مرة أخرى والتحدث بصوت أعلى.");
      }
      
      // Make sure we have MP3 format for compatibility with OpenAI Whisper API
      console.log("🔄 تحويل تنسيق الصوت إلى mp3...");
      
      // Initialize with the original blob as a fallback
      let processedBlob = audioBlob;
      
      // Force MP3 MIME type to ensure compatibility
      try {
        processedBlob = new Blob([await audioBlob.arrayBuffer()], { type: 'audio/mp3' });
        console.log("✅ تم تحويل التنسيق:", processedBlob.type);
      } catch (e) {
        console.error("❌ فشل تحويل التنسيق:", e);
      }
      
      this.logAudioBlobInfo(processedBlob);
      
      // Convert audio to base64
      console.log("🔄 تحويل الصوت إلى صيغة Base64...");
      const audioBase64 = await blobToBase64(processedBlob);
      
      if (!audioBase64) {
        throw new Error("فشل في تحويل الصوت إلى صيغة Base64.");
      }
      
      console.log("🔄 إرسال الصوت للتحويل إلى نص...", "طول البيانات:", audioBase64.length);
      
      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { 
          audio: audioBase64,
          language: "ar" // Explicitly set Arabic language
        }
      });

      if (error) {
        console.error('❌ خطأ في تحويل الصوت إلى نص:', error);
        throw new Error(error.message || 'فشل في تحويل الصوت إلى نص. يرجى المحاولة مرة أخرى.');
      }

      if (data?.error) {
        console.error('❌ خطأ من خدمة تحويل الصوت:', data.error);
        throw new Error(data.error || 'فشل في تحويل الصوت إلى نص. يرجى المحاولة مرة أخرى.');
      }

      if (data && data.text) {
        console.log("✅ تم تحويل الصوت إلى نص بنجاح:", data.text);
        return data.text.trim();
      } else {
        console.error('❌ لم يتم العثور على نص في الاستجابة', data);
        throw new Error('لم نتمكن من تحويل الصوت إلى نص. يرجى المحاولة مرة أخرى.');
      }
    } catch (err) {
      console.error('❌ خطأ في معالجة الصوت:', err);
      throw err;
    }
  },
  
  /**
   * Log debug information about an audio blob
   */
  logAudioBlobInfo(blob: Blob): void {
    console.log(`
      🔍 معلومات ملف الصوت:
      - الحجم: ${blob.size} بايت (${Math.round(blob.size / 1024)} كيلوبايت)
      - النوع: ${blob.type}
      - الوقت: ${new Date().toISOString()}
    `);
  }
};
