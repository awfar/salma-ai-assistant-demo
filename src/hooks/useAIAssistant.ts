
import { useState, useCallback, useRef, useEffect } from "react";
import { useToast } from "./use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TextToSpeechCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onChunk?: (chunk: ArrayBuffer) => void;
  onStreamStart?: (mediaSource: MediaSource | AudioBufferSourceNode) => void;
}

interface UseAIAssistantReturn {
  askAssistant: (question: string) => Promise<string | null>;
  textToSpeech: (text: string, callbacks?: TextToSpeechCallbacks) => Promise<string | null>;
  streamToSpeech: (text: string, callbacks?: TextToSpeechCallbacks) => Promise<void>;
  isLoading: boolean;
  isAudioLoading: boolean;
  cancelRequest?: () => void;
}

export const useAIAssistant = (): UseAIAssistantReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // تهيئة AudioContext
  useEffect(() => {
    // تأجيل إنشاء AudioContext حتى يكون هناك تفاعل للمستخدم
    const initAudioContext = () => {
      try {
        if (!audioContextRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContextClass();
          console.log("✅ تم إنشاء AudioContext بنجاح");
        }
      } catch (err) {
        console.error("❌ فشل في إنشاء AudioContext:", err);
      }
    };

    // إضافة معالجات أحداث لتفاعل المستخدم
    const handleUserInteraction = () => {
      initAudioContext();
      
      // إذا كان AudioContext متوقفًا، قم بتشغيله
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }
    };

    // إضافة معالجات للأحداث المختلفة التي تشير إلى تفاعل المستخدم
    window.addEventListener("click", handleUserInteraction, { once: true });
    window.addEventListener("touchstart", handleUserInteraction, { once: true });
    window.addEventListener("keydown", handleUserInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      
      // تنظيف AudioContext عند إزالة المكون
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => {
          console.error("❌ خطأ عند إغلاق AudioContext:", err);
        });
      }
    };
  }, []);
  
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
  
  // طريقة جديدة لدفق الصوت مباشرة من ElevenLabs
  const streamToSpeech = useCallback(async (text: string, callbacks?: TextToSpeechCallbacks): Promise<void> => {
    if (!text.trim()) {
      console.error("❌ النص فارغ، لا يمكن تحويله إلى صوت");
      return;
    }

    try {
      setIsAudioLoading(true);
      
      // التأكد من وجود مستمع صوتي
      if (!audioContextRef.current) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContextClass();
          console.log("✅ تم إنشاء AudioContext لتشغيل الصوت المدفق");
        } catch (err) {
          console.error("❌ فشل في إنشاء AudioContext:", err);
          throw new Error("لا يمكن إنشاء سياق صوتي. الرجاء التأكد من أن المتصفح يدعم Web Audio API.");
        }
      }

      // إذا كان AudioContext متوقفًا، قم بتشغيله
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
        console.log("✅ تم استئناف عمل AudioContext");
      }

      console.log("🔊 بدء تدفق النص إلى صوت:", text.substring(0, 50) + "...");
      callbacks?.onStart?.();

      // استدعاء وظيفة دفق النص إلى كلام
      const response = await fetch(`${supabase.functions.url}/text-to-speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabase.auth.session()?.access_token || ''}`,
        },
        body: JSON.stringify({ 
          text, 
          stream: true
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`فشل في دفق النص إلى كلام: ${response.status} ${response.statusText}`);
      }

      console.log("✅ تم بدء استقبال دفق الصوت من الخادم");

      // إنشاء قارئ الدفق
      const reader = response.body.getReader();
      const streamProcessor = new ReadableStream({
        async start(controller) {
          try {
            // معالجة بيانات الدفق
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                console.log("✅ انتهى دفق الصوت");
                controller.close();
                callbacks?.onEnd?.();
                break;
              }
              
              // هذه الدالة تعالج كل قطعة من البيانات الصوتية وتشغلها
              await processAudioChunk(value, audioContextRef.current!);
              callbacks?.onChunk?.(value);
              
              // إرسال البيانات للتحكم في الدفق
              controller.enqueue(value);
            }
          } catch (error) {
            console.error("❌ خطأ في معالجة دفق الصوت:", error);
            controller.error(error);
          } finally {
            setIsAudioLoading(false);
          }
        }
      });

      // بدء معالجة الدفق
      const stream = new Response(streamProcessor);
      
      // معالجة البيانات الصوتية من الدفق
      async function processAudioChunk(chunk: Uint8Array, audioContext: AudioContext) {
        try {
          // تحويل البيانات إلى AudioBuffer
          const audioBuffer = await audioContext.decodeAudioData(chunk.buffer);
          
          // إنشاء مصدر صوتي
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.destination);
          
          // إخطار بأننا بدأنا تدفق الصوت
          if (callbacks?.onStreamStart) {
            callbacks.onStreamStart(source);
          }
          
          // تشغيل الصوت
          source.start(0);
          
          // الانتظار حتى انتهاء تشغيل هذه القطعة
          return new Promise<void>((resolve) => {
            source.onended = () => resolve();
          });
        } catch (error) {
          console.error("❌ خطأ في معالجة قطعة الصوت:", error);
        }
      }

      // ابدأ تشغيل الدفق
      return await stream.arrayBuffer();
      
    } catch (error) {
      console.error("❌ خطأ في تدفق النص إلى كلام:", error);
      setIsAudioLoading(false);
      callbacks?.onEnd?.();
      
      toast({
        title: "خطأ في تحويل النص إلى صوت",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء تحويل النص إلى صوت",
        variant: "destructive",
      });
    }
  }, [toast, supabase]);
  
  // Convert text to speech (old method for compatibility)
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
        body: { text, stream: false }
      });
      
      if (error || !data) {
        console.error("خطأ في تحويل النص إلى كلام:", error || "لا توجد بيانات");
        throw new Error(error?.message || "فشل في تحويل النص إلى كلام");
      }
      
      if (!data.audio) {
        console.error("لم يتم إرجاع أي بيانات صوتية");
        throw new Error("لم يتم إرجاع أي بيانات صوتية");
      }
      
      console.log("✅ تم استلام بيانات صوتية بنجاح. طول البيانات:", data.audio.length);
      
      // Create audio URL from base64
      const audioUrl = `data:audio/mp3;base64,${data.audio}`;
      console.log("✅ تم تحويل النص إلى كلام بنجاح وإنشاء رابط الصوت");
      
      // تحقق من صحة البيانات الصوتية قبل إرجاعها
      if (!isValidBase64(data.audio)) {
        console.error("❌ بيانات الصوت المستلمة ليست بتنسيق base64 صالح");
        throw new Error("بيانات الصوت غير صالحة");
      }
      
      // اختبار تحميل الصوت مسبقًا
      try {
        const preloadAudio = new Audio();
        preloadAudio.src = audioUrl;
        
        // وضع مستمع مؤقت للتأكد من أن الصوت قابل للتشغيل
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("انتهت مهلة تحميل الصوت"));
          }, 3000);
          
          preloadAudio.oncanplaythrough = () => {
            clearTimeout(timeout);
            resolve();
          };
          
          preloadAudio.onerror = (e) => {
            clearTimeout(timeout);
            reject(new Error(`فشل تحميل الصوت: ${e}`));
          };
          
          // التحميل المسبق
          preloadAudio.load();
        });
        
        // تم التحميل بنجاح
        console.log("✅ تم التحقق من صلاحية ملف الصوت للتشغيل");
      } catch (preloadError) {
        console.error("❌ فشل اختبار تحميل الصوت:", preloadError);
        // نستمر على الرغم من الخطأ، لكن نسجله
      }
      
      // Callback for start of synthesis
      callbacks?.onStart && callbacks.onStart();
      
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
  
  // التحقق من صحة البيانات بتنسيق base64
  const isValidBase64 = (str: string): boolean => {
    try {
      // التحقق من أن السلسلة ليست فارغة
      if (!str || str.trim() === '') return false;
      
      // التحقق من أن الطول مناسب لـ base64 (يجب أن يكون مضاعف 4)
      if (str.length % 4 !== 0) return false;
      
      // التحقق من أن السلسلة تحتوي على أحرف base64 فقط
      return /^[A-Za-z0-9+/=]+$/.test(str);
    } catch (e) {
      return false;
    }
  };
  
  return { askAssistant, textToSpeech, streamToSpeech, isLoading, isAudioLoading, cancelRequest };
};
