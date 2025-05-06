
import React, { useState, useEffect } from "react";
import SoundWave from "@/components/SoundWave";
import CallButton from "@/components/CallButton";
import { useToast } from "@/hooks/use-toast";

const AICallDemo = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [conversationText, setConversationText] = useState("مرحباً، أنا سلمى. يمكنني مساعدتك اليوم؟");
  const { toast } = useToast();

  // Toggle speaking state for demo purposes
  useEffect(() => {
    const timer = setInterval(() => {
      setIsSpeaking((prev) => !prev);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // Example responses for the demo
  const demoResponses = [
    "مرحباً، أنا سلمى. يمكنني مساعدتك اليوم؟",
    "يمكنك الاستعلام عن حالة المعاش من خلال رقم البطاقة على الموقع الرسمي",
    "لتقديم طلب معاش جديد، يجب زيارة أقرب مكتب تابع للوزارة مع المستندات المطلوبة",
    "يمكنني مساعدتك في الإجابة على استفساراتك حول خدمات وزارة التضامن الاجتماعي"
  ];

  // Cycle through demo responses for demonstration
  useEffect(() => {
    let currentIndex = 0;
    const textInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % demoResponses.length;
      setConversationText(demoResponses[currentIndex]);
    }, 10000);

    return () => clearInterval(textInterval);
  }, []);

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
    // In a real application, this would navigate away or reset the call state
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
      {/* Ministry Logo */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-4">
        {/* AI Avatar */}
        <div className="relative w-full">
          <div className="aspect-[9/16] max-h-[60vh] overflow-hidden rounded-lg bg-black shadow-xl">
            <img 
              src="/lovable-uploads/11c9fc05-dbe2-4818-bf45-0427f0c08e8f.png" 
              alt="سلمى المساعد الافتراضي" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* AI Speech Text */}
          <div className="absolute bottom-24 left-0 right-0 mx-auto w-[80%]">
            <div className="bg-ministry-dark bg-opacity-80 text-white p-4 rounded-xl animate-fade-in mb-8">
              <p className="text-xl text-right">{conversationText}</p>
            </div>
          </div>
        </div>

        {/* Sound Wave Visualizer */}
        <div className="w-full max-w-md bg-ministry-dark rounded-lg p-4 mt-6">
          <SoundWave isActive={isSpeaking} className="h-12 mb-4" />

          {/* Call Controls */}
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

      {/* Footer */}
      <div className="w-full text-center py-4">
        <p className="text-gray-600 text-sm">
          سلمى - الموظفة الذكية من وزارة التضامن © 2025
        </p>
      </div>
    </div>
  );
};

export default AICallDemo;
