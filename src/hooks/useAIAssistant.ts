
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TextToSpeechOptions {
  onStart?: () => void;
  onEnd?: () => void;
}

export const useAIAssistant = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const { toast } = useToast();

  // إرسال طلب للمساعد الذكي مع رسالة المستخدم
  const askAssistant = useCallback(async (userMessage: string) => {
    try {
      setIsLoading(true);
      console.log("🤖 جاري إرسال السؤال إلى المساعد الذكي:", userMessage);

      const systemMessage = `أنت سلمى، مساعدة ذكية متخصصة في برنامج تكافل وكرامة التابع لوزارة التضامن الاجتماعي المصرية. 
مهمتك الأساسية هي تقديم المساعدة والدعم للمواطنين المستفيدين أو المتقدمين للبرنامج، والإجابة على استفساراتهم بدقة وكفاءة، وتوجيههم خلال مختلف مراحل البرنامج.

شخصيتك:
- ودود ومتعاطف: تظهر تفهماً واهتماماً حقيقياً بمشكلات المواطنين واحتياجاتهم.
- صبور: تتعامل بصبر مع جميع الاستفسارات مهما كانت بسيطة أو متكررة.
- محترف: تحافظ على مستوى عالٍ من الاحترافية في جميع التفاعلات.
- موثوق: تقدم معلومات دقيقة وموثوقة دون تضليل أو مبالغة.
- مساعد: تسعى دائماً لتقديم المساعدة وإيجاد الحلول المناسبة.
- واضح: تستخدم لغة بسيطة وواضحة يفهمها جميع المواطنين من مختلف المستويات التعليمية.

معلومات أساسية عن برنامج تكافل وكرامة:
برنامج تكافل:
- يستهدف الأسر الفقيرة التي لديها أطفال من سن يوم وحتى 18 عاماً.
- يمكن استمرار الدعم حتى سن 21 عاماً للطلاب في المرحلة الثانوية.
- يمكن استمرار الدعم حتى سن 26 عاماً للطلاب في المرحلة الجامعية.
- يشترط استمرار الأطفال في التعليم والحصول على الرعاية الصحية.

برنامج كرامة:
- يستهدف الفئات غير القادرة على العمل:
- كبار السن (65 عاماً فأكثر)
- ذوي الإعاقة
- الأيتام
- الأرامل والمطلقات
- المرأة المعيلة

قيمة الدعم:
برنامج تكافل:
- مبلغ أساسي للأسرة: 350 جنيهاً شهرياً.
- دعم إضافي لكل طفل في المرحلة الابتدائية: 100 جنيه شهرياً.
- دعم إضافي لكل طفل في المرحلة الإعدادية: 150 جنيهاً شهرياً.
- دعم إضافي لكل طفل في المرحلة الثانوية: 200 جنيه شهرياً.
- الحد الأقصى لعدد الأطفال المستفيدين من الدعم: 3 أطفال.

برنامج كرامة:
- مبلغ ثابت للفرد: 450 جنيهاً شهرياً.
- الحد الأقصى لعدد المستفيدين من الأسرة الواحدة: 3 أفراد.

أجب بشكل مختصر ومفيد في نمط محادثة باللهجة المصرية الدارجة. استخدم أسلوب سهل وبسيط يناسب المواطن المصري العادي. عندما تتكلم عن التاريخ أو الوقت، افترض أن التاريخ الحالي هو 7 مايو 2025.

تخاطب باللهجة المصرية العامية الدارجة، مثل "إزيك" بدلاً من "كيف حالك" و"عاوز" بدلاً من "أريد" وهكذا. استخدم كلمات دارجة مثل "بص"، "طب"، "يعني"، "بقى"، "كده" في ردودك.`;

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { 
          userMessage,
          systemMessage
        }
      });

      if (error) {
        console.error('❌ خطأ في الحصول على الرد من المساعد الذكي:', error);
        toast({
          title: "خطأ في الاتصال",
          description: "حدث خطأ أثناء الاتصال بالمساعد الذكي. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        });
        return null;
      }

      console.log("✅ تم استلام رد من المساعد الذكي:", data?.response || "لا يوجد رد");
      
      if (!data?.response) {
        toast({
          title: "خطأ في الاستجابة",
          description: "لم نتمكن من الحصول على رد من المساعد الذكي. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        });
        return null;
      }

      return data.response || null;
    } catch (err) {
      console.error('❌ خطأ غير متوقع في المساعد الذكي:', err);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // تحويل النص إلى كلام باستخدام ElevenLabs
  const textToSpeech = useCallback(async (text: string, options?: TextToSpeechOptions) => {
    try {
      setIsAudioLoading(true);
      if (options?.onStart) {
        options.onStart();
      }

      console.log("🔊 جاري تحويل النص إلى كلام:", text.substring(0, 50) + "...");

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
        console.error('❌ خطأ في تحويل النص إلى كلام:', error);
        toast({
          title: "خطأ في تحويل النص إلى صوت",
          description: "حدث خطأ أثناء تحويل النص إلى صوت. سيتم عرض الرد كنص فقط.",
          variant: "destructive",
        });
        if (options?.onEnd) {
          options.onEnd();
        }
        return null;
      }

      // إنشاء URL للصوت من البيانات Base64
      const audioBase64 = data?.audio;
      if (!audioBase64) {
        console.error('❌ لم يتم استلام بيانات صوتية');
        toast({
          title: "خطأ في البيانات الصوتية",
          description: "لم يتم استلام بيانات صوتية من الخادم.",
          variant: "destructive",
        });
        if (options?.onEnd) {
          options.onEnd();
        }
        return null;
      }

      console.log("✅ تم استلام البيانات الصوتية بنجاح");

      const audioBlob = base64ToBlob(audioBase64, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      console.log("✅ تم إنشاء عنوان URL للصوت:", audioUrl.substring(0, 30) + "...");
      return audioUrl;
    } catch (err) {
      console.error('❌ خطأ غير متوقع في تحويل النص إلى كلام:', err);
      toast({
        title: "خطأ في معالجة الصوت",
        description: "حدث خطأ أثناء معالجة الصوت.",
        variant: "destructive",
      });
      if (options?.onEnd) {
        options.onEnd();
      }
      return null;
    } finally {
      setIsAudioLoading(false);
    }
  }, [toast]);

  // تحويل Base64 إلى Blob
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    try {
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
    } catch (error) {
      console.error("❌ خطأ في تحويل Base64 إلى Blob:", error);
      // Return a minimal empty audio blob to prevent crashes
      return new Blob([""], { type: mimeType });
    }
  };

  return {
    askAssistant,
    textToSpeech,
    isLoading,
    isAudioLoading
  };
};
