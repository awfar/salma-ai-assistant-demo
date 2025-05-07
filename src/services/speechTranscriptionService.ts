
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
      if (audioBlob.size < 500) {
        console.warn("⚠️ ملف الصوت صغير جدًا، قد لا يحتوي على كلام قابل للتمييز");
        return null;
      }
      
      // Ensure the audio is in a compatible format
      let processedBlob = audioBlob;
      if (!audioBlob.type.includes('webm') && 
          !audioBlob.type.includes('mp3') && 
          !audioBlob.type.includes('wav') && 
          !audioBlob.type.includes('ogg')) {
        console.log("⚠️ تنسيق الصوت غير متوافق مع API. تنسيق الملف:", audioBlob.type);
        
        // Try to convert by re-saving as webm, or use as is
        try {
          console.log("🔄 محاولة تحويل تنسيق الصوت إلى webm...");
          processedBlob = new Blob([await audioBlob.arrayBuffer()], { type: 'audio/webm' });
          console.log("✅ تم تحويل التنسيق:", processedBlob.type);
        } catch (e) {
          console.error("❌ فشل تحويل التنسيق:", e);
          processedBlob = audioBlob; // Use original if conversion fails
        }
      }
      
      this.logAudioBlobInfo(processedBlob);
      
      // Convert audio to base64
      console.log("🔄 تحويل الصوت إلى صيغة Base64...");
      const audioBase64 = await blobToBase64(processedBlob);
      
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
