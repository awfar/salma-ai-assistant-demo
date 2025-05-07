
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import CallHeader from "@/components/CallHeader";
import CallStartScreen from "@/components/CallStartScreen";
import ActiveCallScreen from "@/components/ActiveCallScreen";
import CallFooter from "@/components/CallFooter";
import { testAudioOutput, playVerificationSound } from "@/utils/audioUtils";

const AICallDemo = () => {
  const navigate = useNavigate();
  const [callActive, setCallActive] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date>(new Date());
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [audioInitialization, setAudioInitialization] = useState<'pending' | 'attempting' | 'success' | 'failed'>('pending');
  const { toast } = useToast();
  const micInitialized = useRef(false);
  const audioContextInitialized = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Initialize audio system on load
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        console.log("🎤 Initializing audio and microphone...");
        setAudioInitialization('attempting');
        
        // Initialize AudioContext first to wake up audio system
        if (!audioContextInitialized.current) {
          try {
            console.log("🔊 Creating and initializing AudioContext...");
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContext();
            
            // Create and play a short silent buffer to unblock audio
            const silentBuffer = audioContextRef.current.createBuffer(1, 1, 22050);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = silentBuffer;
            source.connect(audioContextRef.current.destination);
            source.start();
            
            // Resume the audio context if it's suspended
            if (audioContextRef.current.state === 'suspended') {
              console.log("🔊 Resuming suspended AudioContext...");
              await audioContextRef.current.resume();
            }
            
            audioContextInitialized.current = true;
            setAudioInitialized(true);
            setAudioInitialization('success');
            console.log("✅ Audio system successfully initialized");
            
            // Play a verification sound to ensure audio is working
            setTimeout(async () => {
              const soundPlayed = await playVerificationSound(true);
              console.log(soundPlayed ? "✅ Audio system verified with sound" : "❌ Audio verification failed");
            }, 1000);
            
            // Test audio output
            const audioOutputWorks = await testAudioOutput(true);
            console.log("🔊 Audio output test:", audioOutputWorks ? "successful" : "failed");
            
            if (!audioOutputWorks) {
              setAudioInitialization('failed');
              toast({
                title: "مشكلة في الصوت",
                description: "لم نتمكن من تشغيل الصوت. انقر على زر التنشيط الأخضر الكبير في الأسفل.",
                variant: "destructive",
                duration: 10000,
              });
            }
          } catch (err) {
            console.error("❌ Failed to initialize audio system:", err);
            setAudioInitialization('failed');
          }
        }
        
        // Request and verify microphone permission
        if (!micInitialized.current) {
          try {
            const constraints = { 
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 48000
              } 
            };
            
            console.log("🎤 Requesting microphone with constraints:", constraints);
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            console.log("✅ Microphone permission granted successfully");
            setMicPermissionGranted(true);
            micInitialized.current = true;
            
            // Verify we got audio tracks
            if (stream.getAudioTracks().length === 0) {
              console.warn("⚠️ No audio tracks in stream");
            } else {
              console.log("🎤 Audio tracks:", stream.getAudioTracks().length);
              console.log("🎤 Audio track settings:", stream.getAudioTracks()[0].getSettings());
            }
            
            // Keep the stream active for a moment to ensure it's properly initialized
            setTimeout(() => {
              // Release the microphone after initialization
              stream.getTracks().forEach(track => track.stop());
            }, 1000);
          } catch (err) {
            console.error("❌ Error accessing microphone:", err);
            toast({
              title: "Warning",
              description: "Could not access microphone. Please allow access to continue.",
              variant: "destructive",
              duration: 5000,
            });
          }
        }
      } catch (err) {
        console.error("❌ Error initializing audio:", err);
        setAudioInitialization('failed');
      }
    };
    
    // Try to initialize on component mount
    initializeAudio();
    
    // Also attach to user interaction events to help mobile browsers
    const initOnUserInteraction = () => {
      initializeAudio();
      
      // Play a test sound on interaction
      if (audioContextRef.current) {
        // Create and play a short silent sound to unlock audio on iOS/Safari
        const silentBuffer = audioContextRef.current.createBuffer(1, 1, 22050);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = silentBuffer;
        source.connect(audioContextRef.current.destination);
        source.start();
        
        // Try to resume the audio context if it's suspended
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().then(() => {
            console.log("✅ AudioContext resumed on user interaction");
            // Play a verification sound
            playVerificationSound(false); // Play an audible sound to verify audio is working
          });
        }
      }
    };
    
    window.addEventListener('touchstart', initOnUserInteraction);
    window.addEventListener('click', initOnUserInteraction);
    window.addEventListener('keydown', initOnUserInteraction);
    
    return () => {
      window.removeEventListener('touchstart', initOnUserInteraction);
      window.removeEventListener('click', initOnUserInteraction);
      window.removeEventListener('keydown', initOnUserInteraction);
      
      // Clean up AudioContext when component unmounts
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => {
          console.error("❌ Error closing AudioContext:", err);
        });
      }
    };
  }, [toast]);
  
  // Handle starting call
  const handleStartCallClick = async () => {
    try {
      console.log("🎤 Starting call and initializing audio...");
      
      // Force audio activation first
      await handleActivateAudio();
      
      // Play a sound to verify audio is working when call starts
      await playVerificationSound(false); // Use audible sound for feedback
      
      // Play a silent audio to unlock audio on iOS/Safari
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      // Make sure audio context is running
      if (audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
          console.log("✅ AudioContext resumed on call start");
        } catch (err) {
          console.error("❌ Failed to resume AudioContext:", err);
        }
      }
      
      const silentBuffer = audioContextRef.current.createBuffer(1, 1, 22050);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Keep the microphone active for a short period to properly initialize
      setTimeout(() => {
        // Release the microphone
        stream.getTracks().forEach(track => track.stop());
      }, 1000);
      
      // Start call
      setMicPermissionGranted(true);
      setCallActive(true);
      setCallStartTime(new Date());
      setAudioInitialization('success');
      
      toast({
        title: "Call Started",
        description: "Connected to AI assistant Salma. Press the microphone button to speak.",
        duration: 3000,
      });
      
    } catch (err) {
      console.error("❌ Error accessing microphone:", err);
      toast({
        title: "Microphone Access Error",
        description: "Please allow microphone access to use the AI assistant",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Handle ending call
  const handleEndCallClick = () => {
    setCallActive(false);
    
    toast({
      title: "Call Ended",
      description: "Thank you for using Salma AI assistant",
      duration: 3000,
    });
  };

  // Handle settings click
  const handleSettingsClick = () => {
    navigate('/ai-settings');
  };
  
  // Handle audio activation attempts - Enhanced for better reliability
  const handleActivateAudio = async () => {
    console.log("🔊 Attempting to activate audio system...");
    setAudioInitialization('attempting');
    
    toast({
      title: "تنشيط الصوت",
      description: "جاري محاولة تنشيط نظام الصوت...",
      duration: 2000,
    });
    
    try {
      // iOS devices require user interaction to activate audio
      if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
        console.log("📱 iOS device detected, using special audio activation...");
      }
      
      // Force initialize AudioContext
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
        console.log("✅ Created new AudioContext");
      }
      
      // Resume AudioContext if suspended
      if (audioContextRef.current.state === 'suspended') {
        console.log("⏯️ Resuming suspended AudioContext...");
        await audioContextRef.current.resume();
        console.log("✅ AudioContext resumed via button");
      }
      
      // Play multiple silent sounds to unlock audio system
      for (let i = 0; i < 3; i++) {
        const silentBuffer = audioContextRef.current.createBuffer(1, 1, 22050);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = silentBuffer;
        source.connect(audioContextRef.current.destination);
        source.start();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Play a test tone to verify audio works
      const success = await testAudioOutput(true);
      
      if (success) {
        console.log("✅ Audio activated successfully");
        setAudioInitialized(true);
        setAudioInitialization('success');
        toast({
          title: "تم تنشيط الصوت",
          description: "تم تنشيط نظام الصوت بنجاح. يمكنك الآن استخدام المساعد الصوتي.",
          duration: 3000,
        });
        
        // Force play another test sound after a brief delay
        setTimeout(() => {
          playVerificationSound(false).catch(err => {
            console.error("❌ Error playing second verification sound:", err);
          });
        }, 500);
        
        // Try to get microphone permission while we're at it
        if (!micPermissionGranted) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setMicPermissionGranted(true);
            // Release the stream after getting permission
            setTimeout(() => {
              stream.getTracks().forEach(track => track.stop());
            }, 1000);
          } catch (micErr) {
            console.error("❌ Failed to get microphone permission:", micErr);
          }
        }
        
        return true;
      } else {
        console.error("❌ Audio test failed");
        setAudioInitialization('failed');
        toast({
          title: "فشل تنشيط الصوت",
          description: "لم نتمكن من تنشيط نظام الصوت. يرجى النقر على الشاشة أو التحقق من إعدادات الجهاز.",
          variant: "destructive",
          duration: 5000,
        });
        return false;
      }
    } catch (err) {
      console.error("❌ Error activating audio:", err);
      setAudioInitialization('failed');
      toast({
        title: "خطأ في نظام الصوت",
        description: "حدث خطأ أثناء محاولة تنشيط نظام الصوت. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
        duration: 5000,
      });
      return false;
    }
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
      
      {/* Audio activation guide - ENHANCED */}
      <div className="fixed bottom-28 left-0 right-0 flex justify-center z-50">
        {audioInitialization === 'failed' && (
          <div className="bg-red-100 text-red-800 border-2 border-red-500 rounded-md p-3 shadow-lg max-w-md mx-4 animate-pulse">
            <h3 className="font-bold mb-1 text-center">⚠️ نظام الصوت غير نشط</h3>
            <p className="text-sm mb-2 text-center">لاستخدام المساعد الصوتي، تحتاج إلى تنشيط نظام الصوت. انقر على زر "تنشيط الصوت" أدناه.</p>
            <div className="flex justify-center">
              <Button
                onClick={handleActivateAudio}
                className="bg-red-600 hover:bg-red-700 font-bold text-white px-6 py-3"
              >
                تنشيط الصوت
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Audio debugging message */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed bottom-16 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-70">
            AudioContext: {audioContextInitialized.current ? "Initialized" : "Not initialized"} | 
            Mic: {micPermissionGranted ? "Granted" : "Not granted"} |
            Audio: {audioInitialized ? "Ready" : "Not ready"}
          </div>
        </div>
      )}
      
      {/* ENHANCED Audio activation button - made much more visible and prominent */}
      <button 
        className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 px-8 py-4 rounded-lg shadow-xl flex items-center gap-2 text-base font-bold transition-all hover:scale-105 active:scale-95 
                    ${audioInitialization === 'attempting' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 
                     audioInitialization === 'success' ? 'bg-green-500 hover:bg-green-600 text-white' : 
                     'bg-red-600 hover:bg-red-700 text-white animate-pulse'}`}
        onClick={handleActivateAudio}
        aria-label="Activate audio"
        style={{
          boxShadow: "0 0 25px rgba(34, 197, 94, 0.8)",
        }}
      >
        {audioInitialization === 'attempting' ? (
          <>
            <span className="animate-spin text-xl">⟳</span> جاري تنشيط الصوت...
          </>
        ) : audioInitialization === 'success' ? (
          <>🔊 تم تنشيط الصوت</>
        ) : (
          <>🔊 انقر هنا لتنشيط الصوت</>
        )}
      </button>
    </div>
  );
};

export default AICallDemo;
