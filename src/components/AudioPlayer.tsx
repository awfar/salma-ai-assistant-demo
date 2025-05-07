
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
    const [audioPlayAttempted, setAudioPlayAttempted] = useState(false);
    const audioSourceRef = useRef<string | undefined>(audioSource);
    
    // Track changes to audioSource to detect new audio
    useEffect(() => {
      audioSourceRef.current = audioSource;
    }, [audioSource]);
    
    useImperativeHandle(ref, () => ({
      play: async () => {
        try {
          if (!audioRef.current) {
            console.error("❌ عنصر الصوت غير موجود");
            return;
          }
          
          console.log("▶️ محاولة تشغيل الصوت");
          
          // Reset to beginning before playing
          audioRef.current.currentTime = 0;
          setAudioPlayAttempted(true);
          
          // Try to play with proper error handling
          const playPromise = audioRef.current.play();
          
          if (playPromise !== undefined) {
            await playPromise;
            isPlayingRef.current = true;
            if (onPlay) onPlay();
            console.log("✅ تشغيل الصوت ناجح");
          } else {
            console.warn("⚠️ وعد التشغيل غير معرّف");
          }
        } catch (error) {
          console.error("❌ خطأ في تشغيل الصوت:", error);
          
          // Check for common errors
          const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
          if (errorMessage.includes("user didn't interact") || errorMessage.includes("user gesture")) {
            console.log("👆 مطلوب تفاعل المستخدم لتشغيل الصوت");
            
            // Will be handled by user interaction handlers
            document.addEventListener("click", handleUserInteraction, { once: true });
            document.addEventListener("touchstart", handleUserInteraction, { once: true });
          }
          
          isPlayingRef.current = false;
          if (onError) onError(error instanceof Error ? error : new Error('فشل في تشغيل الصوت'));
        }
      },
      pause: () => {
        if (!audioRef.current) return;
        
        console.log("⏸️ إيقاف الصوت");
        try {
          // Only pause if audio is actually playing
          if (!audioRef.current.paused) {
            audioRef.current.pause();
          }
          audioRef.current.currentTime = 0; // إعادة تعيين الموضع إلى البداية
          isPlayingRef.current = false;
          // تشغيل onended يدويًا للإشارة إلى التوقف التام
          if (onEnded) onEnded();
        } catch (e) {
          console.error("❌ خطأ أثناء إيقاف الصوت:", e);
        }
      },
      get isPlaying() {
        return isPlayingRef.current;
      }
    }));
    
    // Unified user interaction handler for audio unlocking
    const handleUserInteraction = async () => {
      console.log("👆 تم اكتشاف تفاعل المستخدم، محاولة فتح قفل الصوت");
      
      try {
        // Create and start a silent audio context to unlock audio on mobile
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          oscillator.connect(audioContext.destination);
          oscillator.start(0);
          oscillator.stop(0.001);
        }
        
        // If we have audio to play, try playing it again
        if (audioRef.current && audioSourceRef.current && !isPlayingRef.current && audioPlayAttempted) {
          console.log("🔄 إعادة محاولة تشغيل الصوت بعد تفاعل المستخدم");
          
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
            isPlayingRef.current = true;
            if (onPlay) onPlay();
            console.log("✅ نجح تشغيل الصوت بعد تفاعل المستخدم");
          }
        }
      } catch (e) {
        console.error("❌ فشلت محاولة فتح قفل الصوت بعد تفاعل المستخدم:", e);
      }
    };
    
    // Handle audio source changes with better error handling
    useEffect(() => {
      if (!audioSource) {
        setAudioLoaded(false);
        return;
      }
      
      console.log("🔄 تم اكتشاف تغيير في مصدر الصوت");
      
      const setupAudio = () => {
        // Clean up previous audio instance
        if (audioRef.current) {
          try {
            audioRef.current.pause();
            audioRef.current.removeAttribute('src');
            audioRef.current.load();
          } catch (e) {
            console.error("❌ خطأ أثناء تنظيف مثيل الصوت السابق:", e);
          }
        }
        
        // Create new audio element
        const audio = new Audio();
        audio.onended = () => {
          console.log("🔊 انتهى تشغيل الصوت");
          isPlayingRef.current = false;
          if (onEnded) onEnded();
        };
        
        audio.onerror = (event) => {
          const error = event as ErrorEvent;
          console.error("❌ خطأ في الصوت:", error.message || "خطأ غير معروف");
          isPlayingRef.current = false;
          
          // Try to log more detailed error info
          if (audio.error) {
            console.error("❌ رمز الخطأ:", audio.error.code);
            console.error("❌ رسالة الخطأ:", audio.error.message);
          }
          
          if (onError) {
            const errorMsg = audio.error?.message || "خطأ في تشغيل الصوت";
            onError(new Error(errorMsg));
          }
        };
        
        audio.onloadeddata = () => {
          console.log("🔊 تم تحميل بيانات الصوت");
          setAudioLoaded(true);
        };
        
        audio.oncanplaythrough = () => {
          console.log("🔊 الصوت جاهز للتشغيل من البداية إلى النهاية دون توقف");
          setAudioLoaded(true);
          
          // Autoplay if requested and not muted
          if (autoPlay && !isMuted && !isPlayingRef.current) {
            console.log("🔄 محاولة التشغيل التلقائي بعد جاهزية الصوت");
            setTimeout(async () => {
              try {
                const playPromise = audio.play();
                setAudioPlayAttempted(true);
                
                if (playPromise !== undefined) {
                  await playPromise;
                  isPlayingRef.current = true;
                  if (onPlay) onPlay();
                  console.log("✅ التشغيل التلقائي ناجح");
                }
              } catch (err) {
                console.error("❌ فشل التشغيل التلقائي:", err);
                
                // Check if it's autoplay policy restriction
                if (err instanceof Error && 
                    (err.message.includes("user gesture") || 
                     err.message.includes("user interaction"))) {
                  console.log("👆 مطلوب تفاعل المستخدم للتشغيل - سيتم المحاولة عند التفاعل التالي");
                }
              }
            }, 100);
          }
        };
        
        // Set the new source
        console.log("🎵 تعيين مصدر الصوت:", audioSource.substring(0, 50) + "...");
        audio.src = audioSource;
        audio.volume = isMuted ? 0 : volume;
        audio.preload = "auto";
        
        // Store the audio element
        audioRef.current = audio;
        
        // Start loading
        try {
          audio.load();
          console.log("🔊 بدأ تحميل الصوت");
        } catch (loadErr) {
          console.error("❌ خطأ أثناء تحميل الصوت:", loadErr);
        }
      };
      
      setupAudio();
      
    }, [audioSource, autoPlay, isMuted, volume, onEnded, onPlay, onError]);
    
    // Add event listeners for user interaction to unlock audio on iOS/mobile
    useEffect(() => {
      console.log("🔄 إعداد معالجات تفاعل المستخدم لفتح قفل الصوت");
      
      // Common touch/click events that indicate user interaction
      const events = ["touchstart", "touchend", "click", "keydown"];
      
      events.forEach(event => {
        document.addEventListener(event, handleUserInteraction, { once: true, capture: true });
      });
      
      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleUserInteraction, { capture: true });
        });
      };
    }, []);
    
    // Monitor volume changes
    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.volume = isMuted ? 0 : volume;
        console.log(`🔊 تم تحديث مستوى الصوت: ${isMuted ? "كتم" : volume}`);
      }
    }, [volume, isMuted]);
    
    // Clean up on unmount
    useEffect(() => {
      return () => {
        if (audioRef.current) {
          try {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current.load();
            isPlayingRef.current = false;
          } catch (e) {
            console.error("❌ خطأ أثناء التنظيف:", e);
          }
        }
      };
    }, []);
    
    // Use DOM APIs to inject an audio element into the document body for iOS 
    // compatibility - this helps with audio on Safari
    useEffect(() => {
      if (!audioSource) return;
      
      // Create a hidden audio element in the DOM for iOS Safari
      const domAudio = document.createElement('audio');
      domAudio.style.display = 'none';
      domAudio.src = audioSource;
      domAudio.preload = 'auto';
      document.body.appendChild(domAudio);
      
      return () => {
        document.body.removeChild(domAudio);
      };
    }, [audioSource]);
    
    return null; // Audio player is not visible
  }
);

AudioPlayer.displayName = "AudioPlayer";

export default AudioPlayer;
