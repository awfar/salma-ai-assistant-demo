
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
  const [sourceChanged, setSourceChanged] = useState<boolean>(false);
  const previousSourceRef = useRef<string | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementInitialized = useRef<boolean>(false);

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
            // Always force load before playing to ensure the audio is ready
            audioRef.current.load();
            
            if (audioRef.current.readyState >= 2) {
              await audioRef.current.play();
              setIsPlaying(true);
              console.log("✅ Audio started playing successfully");
            } else {
              // Add an event listener to play when audio becomes ready
              audioRef.current.addEventListener('canplaythrough', async () => {
                try {
                  await audioRef.current?.play();
                  setIsPlaying(true);
                  console.log("✅ Audio started playing on canplaythrough");
                } catch (playError) {
                  console.error("❌ Error playing audio on canplaythrough:", playError);
                }
              }, { once: true });
              
              // Force loading
              audioRef.current.load();
            }
          } catch (error) {
            console.error("❌ Error playing audio:", error);
            setIsPlaying(false);
            if (onError && error instanceof Error) {
              onError(error);
            }
          }
        }
      },
      isPlaying
    }),
    [isPlaying, onError]
  );
  
  // Initialize audio context for better audio handling
  useEffect(() => {
    if (!audioContextRef.current && !audioElementInitialized.current && typeof window !== 'undefined') {
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
        source.stop(0.001);
        
        audioElementInitialized.current = true;
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
        console.log("🔄 تم اكتشاف تغيير في مصدر الصوت");
        console.log("🎵 تعيين مصدر الصوت:", audioSource?.substring(0, 50) + "...");
        setSourceChanged(true);
        previousSourceRef.current = audioSource;
        
        // Reset the audio element when source changes
        audioRef.current.src = audioSource || "";
        
        if (audioSource) {
          console.log("🔊 بدأ تحميل الصوت");
          audioRef.current.load();
          setHasInitialized(true);
        }
      }
      
      // Update mute status and volume
      audioRef.current.muted = isMuted;
      audioRef.current.volume = volume;
    }
  }, [audioSource, isMuted, volume]);
  
  // Handle autoplay when source changes
  useEffect(() => {
    const playAudio = async () => {
      if (
        audioRef.current && 
        audioSource && 
        autoPlay && 
        !isMuted && 
        sourceChanged
      ) {
        try {
          console.log("🎵 تشغيل الصوت تلقائياً");
          setSourceChanged(false);
          
          // Always force load before playing to ensure the audio is ready
          audioRef.current.load();
          
          // Ensure audio context is resumed
          if (audioContextRef.current && audioContextRef.current.state === "suspended") {
            try {
              await audioContextRef.current.resume();
              console.log("✅ Resumed AudioContext in AudioPlayer");
            } catch (err) {
              console.error("❌ Failed to resume AudioContext:", err);
            }
          }
          
          // Useful for mobile browsers - try to play after a short delay
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
              
              // Try one more time with user interaction simulation
              const playPromise = audioRef.current?.play();
              if (playPromise !== undefined) {
                playPromise
                  .then(() => {
                    setIsPlaying(true);
                    if (onPlay) onPlay();
                    console.log("✅ Audio autoplay successful on second attempt");
                  })
                  .catch(error => {
                    console.error("❌ Second autoplay attempt failed:", error);
                    if (onError) onError(new Error("Could not play audio automatically. Please interact with the page to enable audio."));
                  });
              }
            }
          }, 200);
          
        } catch (error) {
          console.error("❌ خطأ في التشغيل التلقائي للصوت:", error);
          setIsPlaying(false);
          if (onError && error instanceof Error) {
            onError(error);
          }
        }
      }
    };
    
    playAudio();
  }, [audioSource, autoPlay, isMuted, onPlay, onError, sourceChanged]);
  
  // Listen for audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleEnded = () => {
      console.log("🎵 انتهى تشغيل الصوت");
      setIsPlaying(false);
      if (onEnded) onEnded();
    };
    
    const handleError = (e: ErrorEvent) => {
      // Create useful error info
      let errorMessage = "خطأ غير معروف";
      let errorDetail = "";
      
      if (audio.error) {
        console.error("❌ خطأ في الصوت:", errorMessage);
        console.error("❌ رمز الخطأ:", audio.error.code);
        console.error("❌ رسالة الخطأ:", audio.error.message);
        
        errorMessage = audio.error.message || "خطأ غير معروف";
        errorDetail = `رمز الخطأ: ${audio.error.code}`;
      }
      
      const error = new Error(`MEDIA_ELEMENT_ERROR: ${errorMessage} ${errorDetail}`);
      console.error("❌ خطأ في تشغيل الصوت:", error);
      
      setIsPlaying(false);
      if (onError) onError(error);
    };
    
    const handlePlay = () => {
      console.log("🎵 بدأ تشغيل الصوت");
      setIsPlaying(true);
      if (onPlay) onPlay();
    };
    
    const handleCanPlay = () => {
      console.log("✅ Audio can play now");
    };
    
    // Register event handlers
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError as unknown as EventListener);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("canplay", handleCanPlay);
    
    // Clean up event handlers
    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError as unknown as EventListener);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [onEnded, onError, onPlay]);

  // Initialize the audio context on first user interaction
  useEffect(() => {
    const initializeAudio = () => {
      if (hasInitialized) return;
      
      try {
        if (audioRef.current) {
          // For iOS Safari, needs to be called during a user action
          console.log("🔊 Initializing audio on user interaction");
          
          // Create a short silent sound and play it to unlock audio
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          const audioContext = new AudioContext();
          const silentBuffer = audioContext.createBuffer(1, 1, 22050);
          const source = audioContext.createBufferSource();
          source.buffer = silentBuffer;
          source.connect(audioContext.destination);
          source.start(0);
          
          audioRef.current.load();
          setHasInitialized(true);
          
          console.log("✅ Audio initialized successfully");
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
