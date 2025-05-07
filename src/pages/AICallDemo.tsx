
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
  
  // Check for microphone permission on load - with improved initialization
  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        console.log("🎤 التحقق من إذن الميكروفون...");
        // Use a more direct approach to check microphone permissions
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        console.log("✅ تم الحصول على إذن الميكروفون بنجاح");
        setMicPermissionGranted(true);
        
        // Test that we're actually getting audio
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        
        // Test for audio level
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        
        const average = sum / dataArray.length;
        console.log("🎤 مستوى صوت الميكروفون الأولي:", average);
        
        // Clean up the test stream
        source.disconnect();
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
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
    
    checkMicPermission();
  }, [toast]);
  
  // Handle starting call - with more aggressive mic handling
  const handleStartCallClick = async () => {
    try {
      console.log("🎤 طلب إذن الوصول إلى الميكروفون وتهيئة المكالمة...");
      
      // Create audio context and attempt to warm it up
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Request microphone permission with optimized settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        } 
      });
      
      // Create an analyzer and check audio levels
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 1024; // Higher resolution
      source.connect(analyser);
      
      // Check audio input is working with better sensitivity
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      // Sample audio multiple times to ensure we're getting data
      let hasAudio = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        
        const average = sum / dataArray.length;
        console.log(`🎤 Test microphone level (attempt ${attempt+1}):`, average);
        
        if (average > 0) {
          hasAudio = true;
          break;
        }
        
        // Wait a bit before next sample
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Clean up test resources
      source.disconnect();
      stream.getTracks().forEach(track => track.stop());
      audioContext.close();
      
      // Start call
      setMicPermissionGranted(true);
      setCallActive(true);
      setCallStartTime(new Date());
      
      toast({
        title: "بدء المكالمة",
        description: "تم الاتصال بالمساعد الذكي سلمى",
        duration: 2000,
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
