
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AskAssistantOptions {
  prompt?: string;
  systemMessage?: string;
  onResponse?: (text: string) => void;
  onError?: (error: string) => void;
}

export const useAIAssistant = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string>('');

  // طلب رد من OpenAI
  const askAssistant = useCallback(async (userMessage: string, options?: AskAssistantOptions) => {
    const { 
      prompt = "أنت مساعد سلمى من وزارة التضامن الاجتماعي في مصر. أجب على استفسارات المواطنين بأسلوب رسمي ولطيف. قدم إجابات دقيقة وواضحة عن خدمات وزارة التضامن.", 
      systemMessage = "", 
      onResponse, 
      onError 
    } = options || {};

    try {
      setIsLoading(true);
      setError(null);
      
      // استخدام Supabase Edge Function للتواصل مع OpenAI
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { 
          userMessage,
          systemMessage: prompt + "\n" + systemMessage 
        }
      });

      if (error) {
        console.error('خطأ في التواصل مع المساعد الذكي:', error);
        setError('فشل في الحصول على رد من المساعد الذكي');
        if (onError) onError('فشل في الحصول على رد من المساعد الذكي');
        return null;
      }

      if (data && data.response) {
        setResponse(data.response);
        if (onResponse) onResponse(data.response);
        return data.response;
      }
      
      return null;
    } catch (err) {
      console.error('خطأ في التواصل مع المساعد الذكي:', err);
      setError('حدث خطأ أثناء التواصل مع المساعد الذكي');
      if (onError) onError('حدث خطأ أثناء التواصل مع المساعد الذكي');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // تحويل النص إلى كلام
  const textToSpeech = useCallback(async (text: string, voice?: string) => {
    try {
      // قراءة إعدادات الصوت من localStorage إن وجدت
      const savedSettings = localStorage.getItem('aiSettings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      const voiceId = voice || settings.voiceId || "EXAVITQu4vr4xnSDxMaL"; // استخدام صوت افتراضي
      
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: { text, voice: voiceId },
      });
      
      if (error) throw error;
      
      if (data && data.audio) {
        // تحويل Base64 إلى مصدر صوتي
        const audioDataUrl = `data:audio/mp3;base64,${data.audio}`;
        return audioDataUrl;
      }

      return null;
    } catch (error) {
      console.error("خطأ في تحويل النص إلى كلام:", error);
      setError("فشل في تحويل النص إلى كلام");
      return null;
    }
  }, []);

  return {
    askAssistant,
    textToSpeech,
    isLoading,
    error,
    response
  };
};
