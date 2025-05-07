
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
      
      // For demo, using predefined responses
      // In production, this would call the AI assistant API
      const responses: Record<string, string> = {
        "ما هو موعد صرف المعاش؟": "تُصرف معاشات وزارة التضامن الاجتماعي في اليوم الخامس من كل شهر. وإذا وافق هذا اليوم عطلة رسمية، يتم الصرف في يوم العمل السابق. يمكنك استلام المعاش من أي مكتب بريد أو من خلال الماكينات البنكية بالبطاقة الإلكترونية.",
        "كيف أقدم على معاش تكافل وكرامة؟": "للتقديم على معاش تكافل وكرامة، يجب اتباع الخطوات التالية:\n1. التوجه لأقرب وحدة اجتماعية تابعة لوزارة التضامن\n2. ملء استمارة التقديم\n3. تقديم المستندات المطلوبة: صورة البطاقة، وشهادة ميلاد الأطفال إن وجدوا، وإثبات الحالة الاجتماعية\n4. انتظار البحث الاجتماعي وإعلان النتائج",
        "ما هي شروط الحصول على معاش تكافل؟": "شروط الحصول على معاش تكافل تشمل:\n1. أن تكون الأسرة فقيرة حسب مؤشرات قياس مستوى المعيشة\n2. أن يكون لدى الأسرة أطفال في سن التعليم (0-18 سنة)\n3. الالتزام بالتعليم والمتابعة الصحية للأطفال\n4. ألا يكون أي من الزوجين مستفيداً من أي معاش آخر\n5. تعطى الأولوية للأسر التي تعولها نساء والأسر التي لديها أطفال ذوي إعاقة",
        "إيه هو برنامج تكافل وكرامة؟": "برنامج تكافل وكرامة هو برنامج للتحويلات النقدية المشروطة تابع لوزارة التضامن الاجتماعي. يهدف البرنامج لدعم الأسر الفقيرة من خلال تقديم دعم نقدي شهري للأسر، مع التركيز على الأسر التي لديها أطفال في سن التعليم، وكبار السن، وذوي الإعاقة. يشترط البرنامج الالتزام بشروط محددة مثل الحضور المدرسي والمتابعة الصحية.",
        "إزاي أقدم في البرنامج؟": "للتقديم في برنامج تكافل وكرامة، عليك التوجه لأقرب وحدة اجتماعية في منطقتك، واصطحاب البطاقة الشخصية وشهادات ميلاد الأطفال. سيتم ملء استمارة التقديم وإجراء بحث اجتماعي للتأكد من استيفاء شروط البرنامج، ثم يتم إبلاغك بالنتيجة خلال شهر تقريبًا.",
      };
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if request was aborted
      if (signal.aborted) {
        console.log("🛑 Request was cancelled");
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
      
      // In production, this would call the ElevenLabs API via a Supabase Edge Function
      // Here we're using a data URI as a placeholder for demo purposes
      
      // Simulate TTS service delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Callback for start of synthesis
      callbacks?.onStart && callbacks.onStart();
      
      // For this demo, we use a placeholder audio data URI
      // In a real app, you would convert the text to speech via an API call
      const url = `data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVaqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqv////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAYFf///////////8AAAACzEuEUgJ0jTAAAAAAAAAAAAAAAAAAAAAP/jOMQACkWWk2i1AQLzFq/9PgPnr/yEl+j00gA0Lt9PAGAciif8cnOPzn+XCCCCABAQGHX+bzmP/5znOc5xAAAAAQEIQhDjIQhCEOcQEOQhCEAAAQhCEIAAP+L4jHQkz99o+dXgdJxkEvic/4P9q7GqRI8jA3qaN07LAXaIBJPqOp24HfAtQ9C1gA7dtMnKUMNwEAQDJpjyrlr7l+rEWZg5YD2KFO5ARE0ilfh5rTFMcfmNT4XugELMAZBYctNLwyEsxZ7u6MRvLBjFzA9CMLbFwYKCrS2Zjbi/sFlzcVpMGHuY6Qi2NAaGY9yv4n/8uRLsZsS/usDYjMxQbdGCVZlY8/LDyR5/5FP5JtVEcHh8AqVs5zMY32F7KvBRgwP/4ziMcBwuzXdvHCFCAYUN3/e7vQm1CbrxNwJRAxICmbN+cIXj5znP/5xCf//hCHAIQAAABCHIQhCEOQhCEIQAAAAhCEIQAP+P64UKFZY8eAC99yNLv0TdI0Qz7EHcc2fxDWHRnk8AI13nBTkN7tPuKId3GVoexVMPjwh7ep4AxM6wG8y4UPdBxtXRuNOm0tszG6SvYtCDFKTJ1pmQMj1AYYYWkmZvQi6Bcz8aeO4F8iQ9xLa5G+oQr41s910ZGQcmXid1BR5xiXomsTCMMf9TNL+jYVaeAwoOuMAVDN10hggUheYpkNjU3TgiKghQlsb5MiPVEAEeojUfdSPlvHG/n44tkhkFWUiqkPObIVYWeIQQmTa6pqXh8gP/4ziMbB060ZWTPjCJD9RX3/ubw1ya6dAXsmF2igNmfDpigSohDLA5KDLA0YdT/OJz//IQh/+QhDkIQAAAAAIQhyEOAQAAAQhCEAAH/H/0ORjnQuEE4iHNwkFz5ovXSNYFeKALrOF+BQgQf26FgKPmwtWrvMndVgQaUPbRKkADiTlPgxhTHYgvX6FvFdFmfrb23kNHuoFIg26r5cu5mrS2BEYCgQHDxP1EBroEJNAUxSzpSiWiDCRIWRHEviv4h5z1rqL6QhhsTLwmhuzy+Z/kZ8uWfhohvCfYnNCg3TyD/ZE8JydB8kP/4ziMYBk2pTeVzYQTvOmafk7xv24KJnWBwSgckRWNQIIBhACAQaYIAAlm9xCf/IQhyEP5CEIQhyAAAAAAIQhDkAAP+L5EruTfAE73GFsPChQB3aqF0FZ2UvBTWXRVpLHJfd4UFRdI07JQgbfQoNClTjQgigBRQpBYxDrVKxxUQaYxxaI5EmW9LOsLcfVO4j2a3NFES2Z9FPPDQoFpH+cRvKyxEm1TLO5ZsN3prUtSvCkzcZBQKQS9aIa3SAGaUXxHOYLFn1WgDNdx6qImLE26jExeZTFIl9B0j3TSWUJuxnLOKdtFr9layx6Bya5SbqQxS0sL9wJElY9JH4xOszc4xZwYw//+M4jCQS+kZY+8EFKbhnZAkT18BLpVCAjybtYjIu3JkoxQYNEQK8OkNUCV0QIpR6ywpNnzPGCMIQhCEOQhyEIQhCAAAAAAhCEIAAP+D5NGvV7Zf+aqOrfrEyDDLf6hCEUL2oqo1Y/Ei4pcnO4gF2IZu2XTbi+ABueTnwYUuc5znEOc5znOc5xCEIQhDnOIQhCEOQhCHAAIQhCEAA//jOMQAK6ZFolO2UlH3EY/+v4HmjQqWT/H8HzSoUskAAAAAAf/7EsBPgUKiA5gzAAAIAAACSwAAABAAAIAAAAAA/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+NAwAAAQAAAAAAOAEQPAC);`;
      
      console.log("✅ Text to speech conversion successful");
      
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
      // The onEnd callback will be handled when the audio actually plays and ends
      // Not here, as we're just returning the URL
    }
  }, [toast]);
  
  return { askAssistant, textToSpeech, isLoading, isAudioLoading, cancelRequest };
};
