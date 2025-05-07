
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AskAssistantOptions {
  prompt?: string;
  systemMessage?: string;
  onResponse?: (text: string) => void;
  onError?: (error: string) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
}

export const useAIAssistant = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string>('');
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const { toast } = useToast();

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
      
      console.log("🔍 إرسال استفسار إلى المساعد الذكي:", userMessage.substring(0, 50) + "...");
      
      // استخدام Supabase Edge Function للتواصل مع OpenAI
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { 
          userMessage,
          systemMessage: prompt + "\n" + systemMessage 
        }
      });

      if (error) {
        console.error('❌ خطأ في التواصل مع المساعد الذكي:', error);
        setError('فشل في الحصول على رد من المساعد الذكي');
        if (onError) onError('فشل في الحصول على رد من المساعد الذكي');
        return null;
      }

      if (data && data.response) {
        console.log("✅ تم استلام رد من المساعد الذكي بنجاح:", data.response);
        setResponse(data.response);
        if (onResponse) onResponse(data.response);
        return data.response;
      } else {
        console.error('❌ لم يتم استلام رد من المساعد الذكي');
        setError('لم يتم استلام رد من المساعد الذكي');
        if (onError) onError('لم يتم استلام رد من المساعد الذكي');
      }
      
      return null;
    } catch (err) {
      console.error('❌ خطأ في التواصل مع المساعد الذكي:', err);
      setError('حدث خطأ أثناء التواصل مع المساعد الذكي');
      if (onError) onError('حدث خطأ أثناء التواصل مع المساعد الذكي');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // تحويل النص إلى كلام
  const textToSpeech = useCallback(async (text: string, options?: {
    voice?: string;
    onStart?: () => void;
    onEnd?: () => void;
  }) => {
    try {
      setIsAudioLoading(true);
      if (options?.onStart) options.onStart();
      
      console.log("🔊 تحويل النص إلى كلام:", text.substring(0, 50) + "...");
      
      // قراءة إعدادات الصوت من localStorage إن وجدت
      const savedSettings = localStorage.getItem('aiSettings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      const voiceId = options?.voice || settings.voiceId || "EXAVITQu4vr4xnSDxMaL"; // استخدام صوت افتراضي
      
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: { text, voice: voiceId },
      });
      
      if (error) {
        console.error("❌ خطأ في تحويل النص إلى كلام:", error);
        toast({
          title: "خطأ في تحويل النص إلى كلام",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
      
      if (data && data.audio) {
        console.log("✅ تم تحويل النص إلى كلام بنجاح");
        // تحويل Base64 إلى مصدر صوتي
        const audioDataUrl = `data:audio/mp3;base64,${data.audio}`;
        return audioDataUrl;
      }

      console.error("❌ لم يتم استلام بيانات صوتية من الخدمة");
      toast({
        title: "خطأ في تشغيل الصوت",
        description: "لم يتم استلام بيانات صوتية من الخدمة",
        variant: "destructive",
      });
      return null;
    } catch (error: any) {
      console.error("❌ خطأ في تحويل النص إلى كلام:", error);
      setError("فشل في تحويل النص إلى كلام");
      toast({
        title: "خطأ في تشغيل الصوت",
        description: error.message || "حدث خطأ غير معروف",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsAudioLoading(false);
      if (options?.onEnd) options.onEnd();
    }
  }, [toast]);

  return {
    askAssistant,
    textToSpeech,
    isLoading,
    isAudioLoading,
    error,
    response
  };
};
