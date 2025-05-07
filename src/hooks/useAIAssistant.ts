
import { useState, useCallback, useRef } from "react";
import { useToast } from "./use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TextToSpeechCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
}

interface UseAIAssistantReturn {
  askAssistant: (question: string) => Promise<string | null>;
  textToSpeech: (text: string, callbacks?: TextToSpeechCallbacks) => Promise<string | null>;
  isLoading: boolean;
  isAudioLoading: boolean;
  cancelRequest?: () => void;
}

export const useAIAssistant = (): UseAIAssistantReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Cancel any in-progress requests
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      console.log("🛑 إلغاء الطلب الجاري معالجته");
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsAudioLoading(false);
    }
  }, []);
  
  // Ask the AI assistant
  const askAssistant = useCallback(async (question: string): Promise<string | null> => {
    // Cancel any existing request
    cancelRequest();
    
    // Create a new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    try {
      setIsLoading(true);
      
      console.log("🤖 إرسال سؤال إلى المساعد الذكي:", question);
      
      // Use the AI assistant Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { userMessage: question }
      });
      
      if (error) {
        console.error("خطأ في سؤال المساعد:", error);
        throw new Error(error.message);
      }
      
      if (!data || !data.response) {
        console.error("لم يتم استلام أي رد من المساعد الذكي");
        throw new Error("لم نتمكن من الحصول على رد من المساعد الذكي");
      }
      
      console.log("✅ تم استلام رد من المساعد الذكي:", data.response.substring(0, 50) + "...");
      
      return data.response;
    } catch (error) {
      console.error("خطأ في سؤال المساعد:", error);
      
      if (error instanceof Error && error.name === "AbortError") {
        console.log("🛑 تم إلغاء الطلب");
        return null;
      }
      
      toast({
        title: "خطأ في الاتصال",
        description: "لم نتمكن من الاتصال بالمساعد الذكي. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast, cancelRequest]);
  
  // Convert text to speech
  const textToSpeech = useCallback(async (text: string, callbacks?: TextToSpeechCallbacks): Promise<string | null> => {
    try {
      setIsAudioLoading(true);
      
      // Create a new abort controller
      if (!abortControllerRef.current) {
        abortControllerRef.current = new AbortController();
      }
      
      console.log("🔊 تحويل النص إلى كلام:", text.substring(0, 50) + "...");
      
      // Call the text-to-speech Edge Function
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text }
      });
      
      if (error || !data) {
        console.error("خطأ في تحويل النص إلى كلام:", error || "لا توجد بيانات");
        throw new Error(error?.message || "فشل في تحويل النص إلى كلام");
      }
      
      if (!data.audio) {
        console.error("لم يتم إرجاع أي بيانات صوتية");
        throw new Error("لم يتم إرجاع أي بيانات صوتية");
      }
      
      // Callback for start of synthesis
      callbacks?.onStart && callbacks.onStart();
      
      // Create audio URL from base64
      const audioUrl = `data:audio/mp3;base64,${data.audio}`;
      
      console.log("✅ تم تحويل النص إلى كلام بنجاح");
      
      return audioUrl;
    } catch (error) {
      console.error("خطأ في تحويل النص إلى كلام:", error);
      toast({
        title: "خطأ في تحويل النص إلى صوت",
        description: "لم نتمكن من تحويل الرد إلى صوت. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsAudioLoading(false);
      // The onEnd callback will be handled when the audio actually plays and ends
      // Not here, as we're just returning the URL
    }
  }, [toast]);
  
  return { askAssistant, textToSpeech, isLoading, isAudioLoading, cancelRequest };
};
