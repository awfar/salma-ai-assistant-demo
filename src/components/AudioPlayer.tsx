
import React, { forwardRef, useRef, useEffect, useImperativeHandle, useState } from "react";

interface AudioPlayerProps {
  audioSource?: string;
  audioStream?: MediaSource | AudioBufferSourceNode | null;
  autoPlay?: boolean;
  onPlay?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  isMuted?: boolean;
  volume?: number;
  useStreaming?: boolean;
}

const AudioPlayer = forwardRef<
  { pause: () => void; play: () => Promise<void>; isPlaying: boolean },
  AudioPlayerProps
>((props, ref) => {
  const {
    audioSource,
    audioStream,
    autoPlay = false,
    onPlay,
    onEnded,
    onError,
    isMuted = false,
    volume = 1.0,
    useStreaming = true
  } = props;

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);
  const previousSourceRef = useRef<string | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Setup reference methods
  useImperativeHandle(
    ref,
    () => ({
      pause: () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
          console.log("🔇 Audio manually paused");
        }
      },
      play: async () => {
        if (audioRef.current) {
          try {
            console.log("🔊 Attempting to play audio explicitly");
            
            // Create and initialize AudioContext for iOS unlock if needed
            if (!audioContextRef.current) {
              const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
              audioContextRef.current = new AudioContextClass();
              
              // Create and play a short silent sound to unlock audio on mobile
              const silentBuffer = audioContextRef.current.createBuffer(1, 1, 22050);
              const source = audioContextRef.current.createBufferSource();
              source.buffer = silentBuffer;
              source.connect(audioContextRef.current.destination);
              source.start();
            }
            
            // Resume AudioContext if suspended
            if (audioContextRef.current.state === "suspended") {
              console.log("⚠️ Resuming suspended AudioContext before playing");
              await audioContextRef.current.resume();
            }
            
            // Force reload the audio
            audioRef.current.load();
            
            // Make sure to set the current time to 0 to start from the beginning
            audioRef.current.currentTime = 0;
            
            // Wait a small amount of time to ensure the audio is loaded
            if (audioRef.current.readyState < 2) { // HAVE_CURRENT_DATA or higher
              await new Promise<void>((resolve) => {
                const handleCanPlay = () => {
                  audioRef.current?.removeEventListener('canplay', handleCanPlay);
                  resolve();
                };
                audioRef.current.addEventListener('canplay', handleCanPlay, { once: true });
                
                // Set a timeout in case canplay never fires
                setTimeout(() => {
                  audioRef.current?.removeEventListener('canplay', handleCanPlay);
                  resolve();
                }, 1000);
              });
            }
            
            // Finally play the audio
            const playPromise = audioRef.current.play();
            
            if (playPromise !== undefined) {
              await playPromise;
              setIsPlaying(true);
              if (onPlay) onPlay();
              console.log("✅ Audio started playing successfully");
            }
            
          } catch (error) {
            console.error("❌ Error playing audio:", error);
            setIsPlaying(false);
            if (onError && error instanceof Error) {
              onError(error);
            }
            
            // Try one more time after a short delay
            setTimeout(async () => {
              try {
                if (audioRef.current) {
                  console.log("🔄 Retry playing audio after error");
                  await audioRef.current.play();
                  setIsPlaying(true);
                  if (onPlay) onPlay();
                }
              } catch (retryError) {
                console.error("❌ Retry also failed:", retryError);
                if (onError && retryError instanceof Error) {
                  onError(retryError);
                }
              }
            }, 300);
          }
        }
      },
      isPlaying
    }),
    [isPlaying, onError, onPlay]
  );
  
  // Initialize audio context for better audio handling
  useEffect(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      try {
        console.log("🔊 Initializing AudioContext for AudioPlayer");
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
        
        // Create and play a short silent sound to unlock audio
        const silentBuffer = audioContextRef.current.createBuffer(1, 1, 22050);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = silentBuffer;
        source.connect(audioContextRef.current.destination);
        source.start(0);
        
        console.log("✅ AudioPlayer AudioContext initialized");
      } catch (err) {
        console.error("❌ Error initializing AudioContext for AudioPlayer:", err);
      }
    }
    
    // Clean up on component unmount
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => {
          console.error("❌ Error closing AudioContext:", err);
        });
      }
    };
  }, []);

  // Handle source changes
  useEffect(() => {
    if (audioRef.current) {
      // Detect if source has changed
      if (previousSourceRef.current !== audioSource) {
        console.log("🔄 Audio source changed");
        previousSourceRef.current = audioSource;
        
        // Reset the audio element when source changes
        if (audioSource) {
          audioRef.current.src = audioSource;
          audioRef.current.load();
          console.log("🔊 New audio source loaded");
          
          // Set initialized flag after source is set
          if (!hasInitialized) {
            setHasInitialized(true);
          }
        }
      }
      
      // Update mute status and volume
      audioRef.current.muted = isMuted;
      audioRef.current.volume = volume;
    }
  }, [audioSource, isMuted, volume, hasInitialized]);
  
  // Handle autoplay when source changes
  useEffect(() => {
    const playAudio = async () => {
      if (
        audioRef.current && 
        audioSource && 
        autoPlay && 
        !isMuted
      ) {
        try {
          console.log("🎵 Auto-playing audio");
          
          // Ensure audio context is resumed
          if (audioContextRef.current && audioContextRef.current.state === "suspended") {
            try {
              await audioContextRef.current.resume();
              console.log("✅ Resumed AudioContext for autoplay");
            } catch (err) {
              console.error("❌ Failed to resume AudioContext:", err);
            }
          }
          
          // Force loading
          audioRef.current.load();
          
          // Try to play after a short delay
          setTimeout(async () => {
            try {
              if (audioRef.current) {
                await audioRef.current.play();
                setIsPlaying(true);
                if (onPlay) onPlay();
                console.log("✅ Audio autoplay successful");
              }
            } catch (delayedPlayError) {
              console.error("❌ Delayed autoplay failed:", delayedPlayError);
              
              // Try one more time
              setTimeout(async () => {
                try {
                  if (audioRef.current) {
                    await audioRef.current.play();
                    setIsPlaying(true);
                    if (onPlay) onPlay();
                    console.log("✅ Second attempt autoplay successful");
                  }
                } catch (error) {
                  console.error("❌ Second autoplay attempt also failed:", error);
                  if (onError) onError(new Error("Could not play audio automatically"));
                }
              }, 500);
            }
          }, 200);
          
        } catch (error) {
          console.error("❌ Error in auto play:", error);
          setIsPlaying(false);
          if (onError && error instanceof Error) {
            onError(error);
          }
        }
      }
    };
    
    playAudio();
  }, [audioSource, autoPlay, isMuted, onPlay, onError]);
  
  // Listen for audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleEnded = () => {
      console.log("🎵 Audio playback ended");
      setIsPlaying(false);
      if (onEnded) onEnded();
    };
    
    const handleError = () => {
      // Create useful error info
      let errorMessage = "Unknown audio error";
      
      if (audio.error) {
        console.error("❌ Audio error:", audio.error.code, audio.error.message);
        errorMessage = audio.error.message || "Unknown audio error";
      }
      
      const error = new Error(`Audio playback error: ${errorMessage}`);
      console.error("❌ Error playing audio:", error);
      
      setIsPlaying(false);
      if (onError) onError(error);
    };
    
    const handlePlay = () => {
      console.log("🎵 Audio started playing");
      setIsPlaying(true);
      if (onPlay) onPlay();
    };
    
    const handleCanPlay = () => {
      console.log("✅ Audio can play now");
    };
    
    // Register event handlers
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("canplay", handleCanPlay);
    
    // Clean up event handlers
    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [onEnded, onError, onPlay]);

  // Initialize audio on first user interaction
  useEffect(() => {
    const initializeAudio = () => {
      try {
        if (audioRef.current && !hasInitialized) {
          // For iOS Safari, needs to be called during a user action
          console.log("🔊 Initializing audio on user interaction");
          
          // Create a short silent sound and play it to unlock audio
          if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContext();
            const silentBuffer = audioContextRef.current.createBuffer(1, 1, 22050);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = silentBuffer;
            source.connect(audioContextRef.current.destination);
            source.start(0);
          }
          
          if (audioContextRef.current.state === "suspended") {
            audioContextRef.current.resume().then(() => {
              console.log("✅ AudioContext resumed on user interaction");
            });
          }
          
          audioRef.current.load();
          setHasInitialized(true);
          
          console.log("✅ Audio initialized successfully on user interaction");
        }
      } catch (error) {
        console.error("❌ Error initializing audio:", error);
      }
    };
    
    // Add event listeners for user interaction
    document.addEventListener("click", initializeAudio, { once: true });
    document.addEventListener("touchstart", initializeAudio, { once: true });
    document.addEventListener("keydown", initializeAudio, { once: true });
    
    // Try to initialize immediately for non-iOS browsers
    initializeAudio();
    
    return () => {
      document.removeEventListener("click", initializeAudio);
      document.removeEventListener("touchstart", initializeAudio);
      document.removeEventListener("keydown", initializeAudio);
    };
  }, [hasInitialized]);

  return (
    <audio
      ref={audioRef}
      src={audioSource}
      muted={isMuted}
      preload="auto"
      crossOrigin="anonymous"
      style={{ display: "none" }}
      controls // Add controls for debugging (hidden but accessible)
      playsInline // Important for iOS
      onContextMenu={(e) => e.preventDefault()} // Prevent context menu
    />
  );
});

AudioPlayer.displayName = "AudioPlayer";

export default AudioPlayer;
