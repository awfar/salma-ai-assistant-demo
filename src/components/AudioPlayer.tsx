
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

  // Setup reference methods
  useImperativeHandle(
    ref,
    () => ({
      pause: () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      },
      play: async () => {
        if (audioRef.current) {
          try {
            await audioRef.current.play();
            setIsPlaying(true);
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
          await audioRef.current.play();
          setIsPlaying(true);
          if (onPlay) onPlay();
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
    
    // Register event handlers
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError as unknown as EventListener);
    audio.addEventListener("play", handlePlay);
    
    // Clean up event handlers
    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError as unknown as EventListener);
      audio.removeEventListener("play", handlePlay);
    };
  }, [onEnded, onError, onPlay]);

  // Initialize the audio context on first user interaction
  useEffect(() => {
    const initializeAudio = () => {
      if (hasInitialized) return;
      
      try {
        if (audioRef.current) {
          // For iOS Safari, needs to be called during a user action
          audioRef.current.load();
          setHasInitialized(true);
        }
      } catch (error) {
        console.error("❌ Error initializing audio:", error);
      }
    };
    
    // Add event listeners for user interaction
    document.addEventListener("click", initializeAudio, { once: true });
    document.addEventListener("touchstart", initializeAudio, { once: true });
    
    return () => {
      document.removeEventListener("click", initializeAudio);
      document.removeEventListener("touchstart", initializeAudio);
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
    />
  );
});

AudioPlayer.displayName = "AudioPlayer";

export default AudioPlayer;
