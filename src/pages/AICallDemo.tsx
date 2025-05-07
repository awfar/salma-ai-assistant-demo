
import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import CallHeader from "@/components/CallHeader";
import CallStartScreen from "@/components/CallStartScreen";
import ActiveCallScreen from "@/components/ActiveCallScreen";
import CallFooter from "@/components/CallFooter";

const AICallDemo = () => {
  const navigate = useNavigate();
  const [callActive, setCallActive] = React.useState(false);
  const [callStartTime, setCallStartTime] = React.useState<Date>(new Date());
  const [micPermissionGranted, setMicPermissionGranted] = React.useState(false);
  const { toast } = useToast();
  const micInitialized = useRef(false);
  
  // Check for microphone permission on load with improved initialization
  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        console.log("🎤 التحقق من إذن الميكروفون...");
        
        if (micInitialized.current) {
          return;
        }
        
        // Request microphone permission explicitly to wake up the audio system
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        console.log("✅ تم الحصول على إذن الميكروفون بنجاح");
        setMicPermissionGranted(true);
        micInitialized.current = true;
        
        // Release the microphone immediately after checking permission
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error("❌ خطأ في التحقق من أجهزة الإدخال:", err);
        toast({
          title: "تحذير",
          description: "لم نتمكن من الوصول إلى الميكروفون. يرجى السماح بالوصول للمتابعة.",
          variant: "destructive",
          duration: 5000,
        });
      }
    };
    
    // Run immediately
    checkMicPermission();
  }, [toast]);
  
  // Handle starting call with push-to-talk mode
  const handleStartCallClick = async () => {
    try {
      console.log("🎤 طلب إذن الوصول إلى الميكروفون وتهيئة المكالمة...");
      
      // Request microphone permission for push-to-talk
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Release the microphone immediately after confirming permission
      // Individual recordings will request it again as needed
      stream.getTracks().forEach(track => track.stop());
      
      // Start call
      setMicPermissionGranted(true);
      setCallActive(true);
      setCallStartTime(new Date());
      
      toast({
        title: "بدء المكالمة",
        description: "تم الاتصال بالمساعد الذكي سلمى. اضغط على زر الميكروفون للتحدث.",
        duration: 3000,
      });
      
    } catch (err) {
      console.error("❌ خطأ في الوصول إلى الميكروفون:", err);
      toast({
        title: "خطأ في الوصول إلى الميكروفون",
        description: "يرجى السماح بالوصول إلى الميكروفون لاستخدام المساعد الذكي",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Handle ending call
  const handleEndCallClick = () => {
    setCallActive(false);
    
    toast({
      title: "تم إنهاء المكالمة",
      description: "شكراً لاستخدامك خدمة سلمى المساعد الذكي",
      duration: 3000,
    });
  };

  // Handle settings click
  const handleSettingsClick = () => {
    navigate('/ai-settings');
  };

  return (
    <div className="flex flex-col min-h-screen bg-ministry-light">
      {/* Header with ministry logo */}
      <CallHeader onSettingsClick={handleSettingsClick} />

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row relative w-full max-w-7xl mx-auto">
        <div className="flex-1 flex flex-col items-center justify-center md:p-6">
          {!callActive ? (
            <CallStartScreen onStartCall={handleStartCallClick} />
          ) : (
            <ActiveCallScreen 
              callStartTime={callStartTime}
              onEndCall={handleEndCallClick}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <CallFooter />
    </div>
  );
};

export default AICallDemo;
