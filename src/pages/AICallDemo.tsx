
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
  const audioContextInitialized = useRef(false);
  
  // Check for microphone permission and initialize audio on load
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        console.log("🎤 Initializing audio and microphone...");
        
        if (micInitialized.current && audioContextInitialized.current) {
          return;
        }
        
        // Initialize AudioContext first to wake up audio system
        if (!audioContextInitialized.current) {
          try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContext();
            
            // Create a short silent buffer and play it to unblock audio
            const silentBuffer = audioContext.createBuffer(1, 1, 22050);
            const source = audioContext.createBufferSource();
            source.buffer = silentBuffer;
            source.connect(audioContext.destination);
            source.start();
            
            // Resume the audio context if it's suspended
            if (audioContext.state === 'suspended') {
              await audioContext.resume();
            }
            
            audioContextInitialized.current = true;
            console.log("✅ Audio system successfully initialized");
          } catch (err) {
            console.error("❌ Failed to initialize audio system:", err);
          }
        }
        
        // Request microphone permission with optimal settings for Arabic speech
        if (!micInitialized.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000
            } 
          });
          
          console.log("✅ Microphone permission granted successfully");
          setMicPermissionGranted(true);
          micInitialized.current = true;
          
          // Release the microphone immediately after checking permission
          // Individual recordings will request it again as needed
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.error("❌ Error checking input devices:", err);
        toast({
          title: "Warning",
          description: "Could not access microphone. Please allow access to continue.",
          variant: "destructive",
          duration: 5000,
        });
      }
    };
    
    // Try to initialize on component mount
    initializeAudio();
    
    // Also attach to user interaction events to help mobile browsers
    const initOnUserInteraction = () => {
      initializeAudio();
    };
    
    window.addEventListener('touchstart', initOnUserInteraction, { once: true });
    window.addEventListener('click', initOnUserInteraction, { once: true });
    
    return () => {
      window.removeEventListener('touchstart', initOnUserInteraction);
      window.removeEventListener('click', initOnUserInteraction);
    };
  }, [toast]);
  
  // Handle starting call with push-to-talk mode
  const handleStartCallClick = async () => {
    try {
      console.log("🎤 Requesting microphone permission and initializing call...");
      
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
