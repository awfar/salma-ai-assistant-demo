
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
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Initialize audio system on load
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        console.log("🎤 Initializing audio and microphone...");
        
        // Initialize AudioContext first to wake up audio system
        if (!audioContextInitialized.current) {
          try {
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
              await audioContextRef.current.resume();
            }
            
            audioContextInitialized.current = true;
            console.log("✅ Audio system successfully initialized");
          } catch (err) {
            console.error("❌ Failed to initialize audio system:", err);
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
            
            // Release the microphone immediately after checking permission
            stream.getTracks().forEach(track => track.stop());
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
      }
    };
    
    // Try to initialize on component mount
    initializeAudio();
    
    // Also attach to user interaction events to help mobile browsers
    const initOnUserInteraction = () => {
      initializeAudio();
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
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Release the microphone immediately after confirming permission
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
