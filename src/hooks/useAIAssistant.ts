
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
      
      // For demo, using predefined responses
      // In production, this would call the AI assistant API
      const responses: Record<string, string> = {
        "ما هو موعد صرف المعاش؟": "تُصرف معاشات وزارة التضامن الاجتماعي في اليوم الخامس من كل شهر. وإذا وافق هذا اليوم عطلة رسمية، يتم الصرف في يوم العمل السابق. يمكنك استلام المعاش من أي مكتب بريد أو من خلال الماكينات البنكية بالبطاقة الإلكترونية.",
        "كيف أقدم على معاش تكافل وكرامة؟": "للتقديم على معاش تكافل وكرامة، يجب اتباع الخطوات التالية:\n1. التوجه لأقرب وحدة اجتماعية تابعة لوزارة التضامن\n2. ملء استمارة التقديم\n3. تقديم المستندات المطلوبة: صورة البطاقة، وشهادة ميلاد الأطفال إن وجدوا، وإثبات الحالة الاجتماعية\n4. انتظار البحث الاجتماعي وإعلان النتائج",
        "ما هي شروط الحصول على معاش تكافل؟": "شروط الحصول على معاش تكافل تشمل:\n1. أن تكون الأسرة فقيرة حسب مؤشرات قياس مستوى المعيشة\n2. أن يكون لدى الأسرة أطفال في سن التعليم (0-18 سنة)\n3. الالتزام بالتعليم والمتابعة الصحية للأطفال\n4. ألا يكون أي من الزوجين مستفيداً من أي معاش آخر\n5. تعطى الأولوية للأسر التي تعولها نساء والأسر التي لديها أطفال ذوي إعاقة",
        "إيه هو برنامج تكافل وكرامة؟": "برنامج تكافل وكرامة هو برنامج للتحويلات النقدية المشروطة تابع لوزارة التضامن الاجتماعي. يهدف البرنامج لدعم الأسر الفقيرة من خلال تقديم دعم نقدي شهري للأسر، مع التركيز على الأسر التي لديها أطفال في سن التعليم، وكبار السن، وذوي الإعاقة. يشترط البرنامج الالتزام بشروط محددة مثل الحضور المدرسي والمتابعة الصحية.",
        "إزاي أقدم في البرنامج؟": "للتقديم في برنامج تكافل وكرامة، عليك التوجه لأقرب وحدة اجتماعية في منطقتك، واصطحاب البطاقة الشخصية وشهادات ميلاد الأطفال. سيتم ملء استمارة التقديم وإجراء بحث اجتماعي للتأكد من استيفاء شروط البرنامج، ثم يتم إبلاغك بالنتيجة خلال شهر تقريبًا.",
      };
      
      // Simulate network delay - longer delay for more realistic experience
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if request was aborted
      if (signal.aborted) {
        console.log("🛑 تم إلغاء الطلب");
        return null;
      }
      
      // Check for exact matches or partial matches in both directions
      let response = Object.entries(responses).find(([key]) => 
        question.includes(key) || key.includes(question)
      )?.[1];
      
      // If no match found, use default response
      if (!response) {
        response = "أعتذر، ليس لدي معلومات كافية عن هذا الاستفسار. يمكنك التواصل مع خدمة عملاء وزارة التضامن الاجتماعي على الرقم 16439 للحصول على معلومات أكثر دقة.";
      }
      
      // In a production app, we would call the Supabase Edge Function here
      // const { data, error } = await supabase.functions.invoke('ai-assistant', {
      //   body: { userMessage: question }
      // });
      
      // if (error) {
      //   throw new Error(error.message);
      // }
      
      // response = data.response;
      
      return response;
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
      
      // In production, we'd call the ElevenLabs API via a Supabase Edge Function
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
