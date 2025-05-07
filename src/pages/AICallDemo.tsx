
import React, { useEffect, useRef } from "react";
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
  const [callActive, setCallActive] = React.useState(false);
  const [callStartTime, setCallStartTime] = React.useState<Date>(new Date());
  const [micPermissionGranted, setMicPermissionGranted] = React.useState(false);
  const [audioInitialized, setAudioInitialized] = React.useState(false);
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
            console.log("✅ Audio system successfully initialized");
            
            // Play a verification sound to ensure audio is working
            setTimeout(async () => {
              const soundPlayed = await playVerificationSound(true);
              console.log(soundPlayed ? "✅ Audio system verified with sound" : "❌ Audio verification failed");
            }, 1000);
            
            // Test audio output
            const audioOutputWorks = await testAudioOutput(true);
            console.log("🔊 Audio output test:", audioOutputWorks ? "successful" : "failed");
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
      
      {/* Initial audio unlock button (more visible for troubleshooting) */}
      <button 
        className="fixed bottom-4 left-4 z-50 bg-green-600 text-white px-3 py-1 rounded text-xs shadow-md"
        onClick={() => {
          // Force unlock audio with user feedback
          toast({
            title: "Audio System",
            description: "Attempting to activate audio...",
            duration: 2000,
          });
          
          if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().then(() => {
              console.log("✅ AudioContext resumed via button");
              playVerificationSound(false);
              toast({
                title: "Audio Activated",
                description: "Audio system has been activated successfully.",
                duration: 2000,
              });
            }).catch(err => {
              console.error("❌ Failed to resume audio context:", err);
              toast({
                title: "Audio Error",
                description: "Failed to activate audio. Try tapping the screen.",
                variant: "destructive",
                duration: 3000,
              });
            });
          } else {
            // Initialize audio context if it doesn't exist
            try {
              const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
              audioContextRef.current = new AudioContext();
              
              // Play a test sound
              testAudioOutput(true).then(success => {
                if (success) {
                  toast({
                    title: "Audio Activated",
                    description: "Audio system has been activated successfully.",
                    duration: 2000,
                  });
                } else {
                  toast({
                    title: "Audio Warning",
                    description: "Audio test failed. Check your device settings.",
                    variant: "destructive", 
                    duration: 3000,
                  });
                }
              });
            } catch (err) {
              console.error("❌ Error creating AudioContext:", err);
              toast({
                title: "Audio Error",
                description: "Could not initialize audio system.",
                variant: "destructive",
                duration: 3000,
              });
            }
          }
        }}
        aria-label="Activate audio"
      >
        🔊 Activate Audio
      </button>
    </div>
  );
};

export default AICallDemo;
