
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
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
  
  // Check for microphone permission on load
  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        console.log("🎤 التحقق من إذن الميكروفون...");
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasMic = devices.some(device => device.kind === 'audioinput');
        
        if (!hasMic) {
          console.warn("⚠️ لم يتم العثور على أي ميكروفون");
          toast({
            title: "تحذير",
            description: "لم يتم العثور على أي ميكروفون متصل",
            variant: "destructive",
            duration: 5000,
          });
        }
      } catch (err) {
        console.error("❌ خطأ في التحقق من أجهزة الإدخال:", err);
      }
    };
    
    checkMicPermission();
  }, [toast]);
  
  // Handle starting call
  const handleStartCallClick = async () => {
    // Request microphone permission before starting the call
    try {
      console.log("🎤 طلب إذن الوصول إلى الميكروفون...");
      
      // Pre-warm the audio context to avoid delays
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Explicitly request microphone permissions with optimized parameters
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      // Create an analyzer to verify audio input is working
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      // Check that we're actually getting audio data
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      // Test for audio level (just log it)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      console.log("🎤 Initial microphone level:", average);
      
      // Close the test stream
      source.disconnect();
      stream.getTracks().forEach(track => track.stop());
      audioContext.close();
      
      setMicPermissionGranted(true);
      setCallActive(true);
      setCallStartTime(new Date());
      
      toast({
        title: "بدء المكالمة",
        description: "تم الاتصال بالمساعد الذكي سلمى",
        duration: 2000,
      });
      
    } catch (err) {
      console.error("خطأ في الوصول إلى الميكروفون:", err);
      setMicPermissionGranted(false);
      
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
