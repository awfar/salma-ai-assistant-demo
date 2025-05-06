
import React, { useState, useEffect, useCallback } from "react";
import SoundWave from "@/components/SoundWave";
import CallButton from "@/components/CallButton";
import AudioPlayer from "@/components/AudioPlayer";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AvatarAnimation from "@/components/AvatarAnimation";
import AgentInstructions from "@/components/AgentInstructions";
import { Mic, Volume2, MessageCircle, Phone, PhoneOff, Info, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const AICallDemo = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [conversationText, setConversationText] = useState("مرحباً، أنا سلمى. يمكنني مساعدتك اليوم؟");
  const [audioSource, setAudioSource] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
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

  const toggleInstructions = () => {
    setShowInstructions(!showInstructions);
  };

  return (
    <div className="flex flex-col min-h-screen bg-ministry-light">
      {/* شعار الوزارة كامل */}
      <div className="w-full flex justify-between items-center p-4 bg-white/80 shadow-sm">
        <div className="flex items-center gap-3 rtl:flex-row-reverse">
          <img 
            src="/lovable-uploads/59b69e9d-ca94-459f-af37-2c5626365a98.png" 
            alt="وزارة التضامن الاجتماعي" 
            className="h-16 w-auto"
          />
          <h1 className="text-xl md:text-2xl font-bold text-ministry-dark">وزارة التضامن الاجتماعي</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleInstructions}
            className="flex items-center gap-1"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">الإرشادات</span>
          </Button>
          <div className="bg-gray-800 text-white px-3 py-1 rounded-md text-sm">
            <p>Salma AI Demo</p>
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col md:flex-row relative w-full max-w-7xl mx-auto">
        {/* الشاشة الرئيسية التي تملأ الهاتف */}
        <div className="flex-1 flex flex-col items-center justify-center md:p-6">
          <div className="relative w-full max-w-md mx-auto aspect-[9/16] md:aspect-auto md:max-h-[80vh] overflow-hidden rounded-2xl md:rounded-3xl bg-black shadow-xl border-8 border-gray-800">
            {/* خلفية تظهر كشاشة هاتف */}
            <div className="absolute inset-0 bg-gradient-to-b from-ministry-dark/90 to-ministry-dark/70"></div>
            
            {/* الشخصية المتحركة */}
            <div className="absolute inset-0 flex items-center justify-center">
              <AvatarAnimation isActive={isSpeaking} />
            </div>

            {/* نص كلام المساعد الافتراضي */}
            <div className="absolute bottom-24 left-0 right-0 mx-auto w-[85%] z-10">
              <div className="bg-white/15 backdrop-blur-lg border border-white/20 text-white p-4 rounded-xl animate-fade-in mb-4">
                <p className="text-xl text-right">{conversationText}</p>
              </div>
            </div>

            {/* شريط الحالة أعلى الشاشة */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-black/30 backdrop-blur-lg flex items-center justify-between px-4">
              <div className="text-white text-xs">09:41</div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <div className="text-white text-xs">مٌتصل</div>
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
        
        {/* الإرشادات الخاصة بالمساعد الذكي */}
        {showInstructions && (
          <div className="md:w-1/3 md:min-w-[300px] bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-lg md:m-6 overflow-auto max-h-[80vh] md:max-h-none">
            <AgentInstructions />
          </div>
        )}
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
