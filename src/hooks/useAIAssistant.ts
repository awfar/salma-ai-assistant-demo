
import { useState, useCallback, useRef } from "react";
import { useToast } from "./use-toast";

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
      console.log("🛑 Cancelling in-progress AI request");
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
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
      
      // Simulate network delay for demo
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock response for demo - in a real app, you would call an API
      const responses = {
        "ما هو موعد صرف المعاش؟": "تُصرف معاشات وزارة التضامن الاجتماعي في اليوم الخامس من كل شهر. وإذا وافق هذا اليوم عطلة رسمية، يتم الصرف في يوم العمل السابق. يمكنك استلام المعاش من أي مكتب بريد أو من خلال الماكينات البنكية بالبطاقة الإلكترونية.",
        "كيف أقدم على معاش تكافل وكرامة؟": "للتقديم على معاش تكافل وكرامة، يجب اتباع الخطوات التالية:\n1. التوجه لأقرب وحدة اجتماعية تابعة لوزارة التضامن\n2. ملء استمارة التقديم\n3. تقديم المستندات المطلوبة: صورة البطاقة، وشهادة ميلاد الأطفال إن وجدوا، وإثبات الحالة الاجتماعية\n4. انتظار البحث الاجتماعي وإعلان النتائج",
        "ما هي شروط الحصول على معاش تكافل؟": "شروط الحصول على معاش تكافل تشمل:\n1. أن تكون الأسرة فقيرة حسب مؤشرات قياس مستوى المعيشة\n2. أن يكون لدى الأسرة أطفال في سن التعليم (0-18 سنة)\n3. الالتزام بالتعليم والمتابعة الصحية للأطفال\n4. ألا يكون أي من الزوجين مستفيداً من أي معاش آخر\n5. تعطى الأولوية للأسر التي تعولها نساء والأسر التي لديها أطفال ذوي إعاقة",
      };
      
      // Default response for unrecognized questions
      let response = "أعتذر، ليس لدي معلومات كافية عن هذا الاستفسار. يمكنك التواصل مع خدمة عملاء وزارة التضامن الاجتماعي على الرقم 16439 للحصول على معلومات أكثر دقة.";
      
      // Check if we have a specific response for this question
      Object.entries(responses).forEach(([key, value]) => {
        if (question.includes(key) || key.includes(question)) {
          response = value;
        }
      });
      
      // If request was cancelled, return null
      if (signal.aborted) {
        console.log("🛑 Request was cancelled");
        return null;
      }
      
      return response;
    } catch (error) {
      console.error("Error asking assistant:", error);
      
      if (error instanceof Error && error.name === "AbortError") {
        console.log("🛑 Request was aborted");
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
      callbacks?.onStart && callbacks.onStart();
      
      // Simulate TTS service delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // In a real app, you would call a TTS service like ElevenLabs or Google TTS
      // For the demo, we'll use the browser's built-in speech synthesis API
      const url = `data:audio/mp3;base64,SUQzBAAAAAACH1RJVDIAAAAeAAAAVGV4dCB0byBTcGVlY2ggQXVkaW8gU2FtcGxlVFhYWAAAAB9BcnRpZmljaWFsIGZpbGUgZm9yIGRlbW8gcHVycG9zZXNUQUxCAAAAFlRleHQgdG8gU3BlZWNoIFNhbXBsZXNHRU9CAAAABFVTQRBUT0ZMAAAAFVN5bnRoZXNpemVkIHNwZWVjaA==`;
      
      return url;
    } catch (error) {
      console.error("Error in text to speech:", error);
      toast({
        title: "خطأ في تحويل النص إلى صوت",
        description: "لم نتمكن من تحويل الرد إلى صوت. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsAudioLoading(false);
      // We'll let the callback handle the onEnd event
    }
  }, [toast]);
  
  return { askAssistant, textToSpeech, isLoading, isAudioLoading, cancelRequest };
};
