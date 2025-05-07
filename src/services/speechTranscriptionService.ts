
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
      console.log("🎤 بدء تحويل الصوت إلى نص...");
      
      // Convert audio to base64
      const audioBase64 = await blobToBase64(audioBlob);
      
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: audioBase64 }
      });

      if (error) {
        console.error('❌ خطأ في تحويل الصوت إلى نص:', error);
        throw new Error(error.message || 'فشل في تحويل الصوت إلى نص');
      }

      if (data && data.text) {
        console.log("✅ تم تحويل الصوت إلى نص بنجاح:", data.text);
        return data.text.trim();
      } else {
        console.error('❌ لم يتم العثور على نص في الاستجابة');
        return null;
      }
    } catch (err) {
      console.error('❌ خطأ في معالجة الصوت:', err);
      throw new Error('حدث خطأ أثناء معالجة الصوت');
    }
  }
};
