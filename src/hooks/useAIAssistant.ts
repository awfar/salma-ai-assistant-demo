
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TextToSpeechOptions {
  onStart?: () => void;
  onEnd?: () => void;
}

export const useAIAssistant = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  // إرسال طلب للمساعد الذكي مع رسالة المستخدم
  const askAssistant = useCallback(async (userMessage: string) => {
    try {
      setIsLoading(true);

      const systemMessage = `You are Salma, a kind and informative assistant from the Ministry of Social Solidarity. Always reply in Arabic with accurate and clear answers.

المعلومات الأساسية عن وزارة التضامن:
- معاشات الضمان الاجتماعي: تُصرف يوم 10 من كل شهر
- برنامج تكافل وكرامة: برنامج للدعم النقدي المشروط للأسر الأكثر احتياجًا
- مبادرة حياة كريمة: تهدف لتطوير القرى الأكثر احتياجًا
- دار الرعاية: توفر رعاية للمسنين وذوي الاحتياجات الخاصة
- خدمات الرعاية الاجتماعية: تشمل المساعدات المادية والعينية للفئات المستحقة

أجيبي بشكل مختصر ومفيد باللغة العربية الفصحى البسيطة. قدمي معلومات دقيقة ومفيدة للمواطنين.`;

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { 
          userMessage,
          systemMessage
        }
      });

      if (error) {
        console.error('خطأ في الحصول على الرد من المساعد الذكي:', error);
        return null;
      }

      return data?.response || null;
    } catch (err) {
      console.error('خطأ غير متوقع في المساعد الذكي:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // تحويل النص إلى كلام باستخدام ElevenLabs
  const textToSpeech = useCallback(async (text: string, options?: TextToSpeechOptions) => {
    try {
      setIsAudioLoading(true);
      if (options?.onStart) {
        options.onStart();
      }

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text, 
          voice: "EXAVITQu4vr4xnSDxMaL",  // Sarah voice ID
          voiceSettings: {
            stability: 0.65,
            similarity_boost: 0.85
          }
        }
      });

      if (error) {
        console.error('خطأ في تحويل النص إلى كلام:', error);
        if (options?.onEnd) {
          options.onEnd();
        }
        return null;
      }

      // إنشاء URL للصوت من البيانات Base64
      const audioBase64 = data.audio;
      if (!audioBase64) {
        console.error('لم يتم استلام بيانات صوتية');
        if (options?.onEnd) {
          options.onEnd();
        }
        return null;
      }

      const audioBlob = base64ToBlob(audioBase64, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);

      return audioUrl;
    } catch (err) {
      console.error('خطأ غير متوقع في تحويل النص إلى كلام:', err);
      if (options?.onEnd) {
        options.onEnd();
      }
      return null;
    } finally {
      setIsAudioLoading(false);
    }
  }, []);

  // تحويل Base64 إلى Blob
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: mimeType });
  };

  return {
    askAssistant,
    textToSpeech,
    isLoading,
    isAudioLoading
  };
};
