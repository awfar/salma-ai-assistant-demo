
import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from "react";

interface AudioPlayerProps {
  audioSource?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onPlay?: () => void;
  onError?: (error: Error) => void;
  volume?: number;
  isMuted?: boolean; // Prop to separately control audio muting
}

interface AudioPlayerRef {
  play: () => Promise<void>;
  pause: () => void;
  isPlaying: boolean;
}

const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  ({ audioSource, autoPlay = true, onEnded, onPlay, onError, volume = 1, isMuted = false }, ref) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isPlayingRef = useRef(false);
    const [audioLoaded, setAudioLoaded] = useState(false);
    
    useImperativeHandle(ref, () => ({
      play: async () => {
        try {
          if (audioRef.current) {
            console.log("▶️ تشغيل الصوت");
            // Reset to beginning before playing to ensure playback starts from the start
            audioRef.current.currentTime = 0;
            const playPromise = audioRef.current.play();
            
            // Handle the play promise properly
            if (playPromise !== undefined) {
              await playPromise;
              isPlayingRef.current = true;
              if (onPlay) onPlay();
            }
          }
        } catch (error) {
          console.error("❌ خطأ في تشغيل الصوت:", error);
          isPlayingRef.current = false;
          if (onError) onError(error instanceof Error ? error : new Error('فشل في تشغيل الصوت'));
        }
      },
      pause: () => {
        if (audioRef.current) {
          console.log("⏸️ إيقاف الصوت");
          // Only pause if audio is actually playing
          if (!audioRef.current.paused) {
            audioRef.current.pause();
          }
          audioRef.current.currentTime = 0; // إعادة تعيين الموضع إلى البداية
          isPlayingRef.current = false;
          // تشغيل onended يدويًا للإشارة إلى التوقف التام
          if (onEnded) onEnded();
        }
      },
      get isPlaying() {
        return isPlayingRef.current;
      }
    }));
    
    // Handle audio source changes - prevent automatic replaying
    useEffect(() => {
      if (!audioSource) return;
      
      const setupAudio = async () => {
        // Create a new audio instance every time to avoid stale state issues
        if (audioRef.current) {
          try {
            // Clean up previous audio instance
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current.load();
            audioRef.current.onended = null;
            audioRef.current.onerror = null;
          } catch (e) {
            console.log("Error cleaning previous audio:", e);
          }
        }
        
        audioRef.current = new Audio();
        setAudioLoaded(false);
        
        // Set event listeners
        audioRef.current.onended = () => {
          console.log("🔊 انتهى تشغيل الصوت");
          isPlayingRef.current = false;
          if (onEnded) onEnded();
        };
        
        audioRef.current.onerror = (event) => {
          console.error("❌ خطأ في الصوت:", event);
          isPlayingRef.current = false;
          if (onError) {
            const error = new Error("خطأ في تشغيل الصوت");
            onError(error);
          }
        };
        
        audioRef.current.onloadedmetadata = () => {
          setAudioLoaded(true);
          console.log("🔊 تم تحميل بيانات الصوت بنجاح");
        };
        
        // Set the new source
        audioRef.current.src = audioSource;
        audioRef.current.volume = isMuted ? 0 : volume;
        await audioRef.current.load();
        
        console.log("🔊 تم تعيين مصدر صوت جديد:", audioSource.substring(0, 50) + "...");
        
        // Auto-play if enabled and not muted, but with a small delay to ensure loading
        if (autoPlay && !isMuted && audioLoaded) {
          try {
            setTimeout(async () => {
              if (audioRef.current) {
                console.log("▶️ تشغيل تلقائي للصوت");
                const playPromise = audioRef.current.play();
                
                if (playPromise !== undefined) {
                  try {
                    await playPromise;
                    isPlayingRef.current = true;
                    if (onPlay) onPlay();
                    console.log("✅ بدأ تشغيل الصوت بنجاح");
                  } catch (playError) {
                    console.error("❌ فشل الوعد بتشغيل الصوت:", playError);
                    // حاول مرة أخرى إذا كان الخطأ بسبب تفاعل المستخدم
                    if (playError.name === "NotAllowedError") {
                      console.log("⚠️ يحتاج تفاعل المستخدم لتشغيل الصوت");
                    }
                  }
                }
              }
            }, 300);
          } catch (error) {
            console.error("❌ فشل التشغيل التلقائي:", error);
            isPlayingRef.current = false;
            if (onError) onError(error instanceof Error ? error : new Error('فشل في التشغيل التلقائي للصوت'));
          }
        }
      };
      
      setupAudio();
    }, [audioSource, autoPlay, onPlay, onError, onEnded, isMuted, volume, audioLoaded]);
    
    // Handle volume changes and muting
    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.volume = isMuted ? 0 : volume;
        console.log("🔊 ضبط مستوى الصوت:", isMuted ? "مكتوم" : volume);
        
        // If muted during playback, pause the audio
        if (isMuted && isPlayingRef.current) {
          audioRef.current.pause();
          isPlayingRef.current = false;
        }
      }
    }, [volume, isMuted]);
    
    // Fix for mobile devices: try to play audio on first user interaction
    useEffect(() => {
      const handleUserInteraction = async () => {
        // Try to initialize audio context on user interaction
        if (audioRef.current && audioSource && autoPlay && !isMuted) {
          try {
            // Create a silent audio context to wake up audio on iOS
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const silentBuffer = audioContext.createBuffer(1, 1, 22050);
            const source = audioContext.createBufferSource();
            source.buffer = silentBuffer;
            source.connect(audioContext.destination);
            source.start(0);
            
            // Now try to play the actual audio
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
              await playPromise;
              isPlayingRef.current = true;
              if (onPlay) onPlay();
              console.log("✅ بدأ تشغيل الصوت بعد تفاعل المستخدم");
            }
          } catch (e) {
            console.log("محاولة تشغيل الصوت بعد تفاعل المستخدم فشلت:", e);
          }
          
          // Remove listeners after first interaction
          document.removeEventListener('touchstart', handleUserInteraction);
          document.removeEventListener('click', handleUserInteraction);
        }
      };
      
      // Add listeners for user interaction
      document.addEventListener('touchstart', handleUserInteraction, { once: true });
      document.addEventListener('click', handleUserInteraction, { once: true });
      
      return () => {
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('click', handleUserInteraction);
      };
    }, [audioSource, autoPlay, isMuted, onPlay]);
    
    // Clean up on unmount
    useEffect(() => {
      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
          audioRef.current.onended = null;
          audioRef.current.onerror = null;
          isPlayingRef.current = false;
        }
      };
    }, []);
    
    return null; // Audio player is not visible
  }
);

AudioPlayer.displayName = "AudioPlayer";

export default AudioPlayer;
