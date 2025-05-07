
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
      
      // Validate audio blob size
      if (audioBlob.size < 500) {
        console.warn("⚠️ ملف الصوت صغير جدًا، قد لا يحتوي على كلام قابل للتمييز");
      }
      
      // Convert audio to base64
      const audioBase64 = await blobToBase64(audioBlob);
      
      console.log("🔄 إرسال الصوت للتحويل إلى نص...");
      
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { 
          audio: audioBase64,
          language: "ar" // Explicitly set Arabic language
        }
      });

      if (error) {
        console.error('❌ خطأ في تحويل الصوت إلى نص:', error);
        throw new Error(error.message || 'فشل في تحويل الصوت إلى نص');
      }

      if (data && data.text) {
        console.log("✅ تم تحويل الصوت إلى نص بنجاح:", data.text);
        return data.text.trim();
      } else {
        console.error('❌ لم يتم العثور على نص في الاستجابة', data);
        return null;
      }
    } catch (err) {
      console.error('❌ خطأ في معالجة الصوت:', err);
      throw new Error('حدث خطأ أثناء معالجة الصوت');
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
