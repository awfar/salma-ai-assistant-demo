
import React, { useState, useEffect, useCallback } from "react";
import SoundWave from "@/components/SoundWave";
import CallButton from "@/components/CallButton";
import AudioPlayer from "@/components/AudioPlayer";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AICallDemo = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [conversationText, setConversationText] = useState("مرحباً، أنا سلمى. يمكنني مساعدتك اليوم؟");
  const [audioSource, setAudioSource] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // المحادثات النموذجية
  const demoResponses = [
    "مرحباً، أنا سلمى. يمكنني مساعدتك اليوم؟",
    "يمكنك الاستعلام عن حالة المعاش من خلال رقم البطاقة على الموقع الرسمي",
    "لتقديم طلب معاش جديد، يجب زيارة أقرب مكتب تابع للوزارة مع المستندات المطلوبة",
    "يمكنني مساعدتك في الإجابة على استفساراتك حول خدمات وزارة التضامن الاجتماعي"
  ];

  // دالة لتحويل النص إلى كلام باستخدام Eleven Labs
  const speakText = useCallback(async (text: string) => {
    if (!text || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: { text },
      });
      
      if (error) throw error;
      
      if (data && data.audio) {
        setIsSpeaking(true);
        // تحويل Base64 إلى مصدر صوتي
        const audioDataUrl = `data:audio/mp3;base64,${data.audio}`;
        setAudioSource(audioDataUrl);
      }
    } catch (error) {
      console.error("خطأ في تحويل النص إلى كلام:", error);
      toast({
        title: "حدث خطأ",
        description: "لم نتمكن من تشغيل الصوت، يرجى المحاولة مرة أخرى",
        duration: 3000,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, toast]);

  // عند انتهاء الصوت
  const handleAudioEnded = () => {
    setIsSpeaking(false);
  };

  // تبديل الحالة عند كل استجابة جديدة
  useEffect(() => {
    let currentIndex = 0;
    const textInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % demoResponses.length;
      const newText = demoResponses[currentIndex];
      setConversationText(newText);
      
      // تحويل النص الجديد إلى كلام
      speakText(newText);
    }, 20000); // زيادة الفترة بين الرسائل لإتاحة وقت أطول للتحدث

    // تحويل النص الأول إلى كلام عند التحميل
    speakText(demoResponses[0]);

    return () => clearInterval(textInterval);
  }, [speakText]);

  const handleMuteClick = () => {
    setIsMuted(!isMuted);
    toast({
      title: isMuted ? "تم تشغيل الميكروفون" : "تم كتم الميكروفون",
      duration: 2000,
    });
  };

  const handleEndCallClick = () => {
    toast({
      title: "تم إنهاء المكالمة",
      description: "شكراً لاستخدامك خدمة سلمى المساعد الذكي",
      duration: 3000,
    });
    // في التطبيق الحقيقي، هذا سينتقل بعيدًا أو يعيد تعيين حالة المكالمة
  };

  const handleVolumeClick = () => {
    toast({
      title: "التحكم في مستوى الصوت",
      description: "سيتم إضافة شريط التحكم في مستوى الصوت في الإصدار القادم",
      duration: 2000,
    });
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-ministry-light">
      {/* شعار الوزارة */}
      <div className="w-full flex justify-between items-start p-4">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <img 
            src="/lovable-uploads/f36695b0-0f89-46fe-a680-25254c206da0.png" 
            alt="وزارة التضامن الاجتماعي" 
            className="h-16 w-auto"
          />
          <h1 className="text-2xl font-bold text-right hidden md:block">وزارة التضامن الاجتماعي</h1>
        </div>
        <div className="bg-gray-800 text-white px-4 py-2 rounded-md">
          <p className="text-sm">Salma AI Demo</p>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-4">
        {/* صورة المساعد الافتراضي */}
        <div className="relative w-full">
          <div className="aspect-[9/16] max-h-[60vh] overflow-hidden rounded-lg bg-black shadow-xl">
            <img 
              src="/lovable-uploads/11c9fc05-dbe2-4818-bf45-0427f0c08e8f.png" 
              alt="سلمى المساعد الافتراضي" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* نص كلام المساعد الافتراضي */}
          <div className="absolute bottom-24 left-0 right-0 mx-auto w-[80%]">
            <div className="bg-ministry-dark bg-opacity-80 text-white p-4 rounded-xl animate-fade-in mb-8">
              <p className="text-xl text-right">{conversationText}</p>
            </div>
          </div>
        </div>

        {/* مرئيات موجة الصوت */}
        <div className="w-full max-w-md bg-ministry-dark rounded-lg p-4 mt-6">
          <SoundWave isActive={isSpeaking} className="h-12 mb-4" />

          {/* أزرار التحكم بالمكالمة */}
          <div className="flex items-center justify-center space-x-4 rtl:space-x-reverse">
            <CallButton 
              type="mute" 
              onClick={handleMuteClick} 
              active={isMuted}
            />
            <CallButton 
              type="end_call" 
              onClick={handleEndCallClick} 
              className="p-5" 
            />
            <CallButton 
              type="volume" 
              onClick={handleVolumeClick} 
            />
          </div>
        </div>
      </div>

      {/* تذييل */}
      <div className="w-full text-center py-4">
        <p className="text-gray-600 text-sm">
          سلمى - الموظفة الذكية من وزارة التضامن © 2025
        </p>
      </div>

      {/* مشغل الصوت (مخفي) */}
      <AudioPlayer 
        audioSource={audioSource} 
        autoPlay={!isMuted} 
        onEnded={handleAudioEnded}
      />
    </div>
  );
};

export default AICallDemo;
