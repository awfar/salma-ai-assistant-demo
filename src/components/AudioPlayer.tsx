
import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from "react";

interface AudioPlayerProps {
  audioSource?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
}

interface AudioPlayerRef {
  pause: () => void;
  isPlaying: boolean;
}

const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  ({ audioSource, autoPlay = true, onEnded }, ref) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playAttempts, setPlayAttempts] = useState(0);
    const maxPlayAttempts = 3;

    // إتاحة التحكم في تشغيل الصوت من الخارج
    useImperativeHandle(ref, () => ({
      pause: () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsPlaying(false);
        }
      },
      isPlaying
    }));

    useEffect(() => {
      if (audioSource && audioRef.current) {
        try {
          console.log("🔊 تحميل مصدر صوتي جديد");
          audioRef.current.src = audioSource;
          setPlayAttempts(0);

          if (autoPlay) {
            playAudio();
          }
        } catch (e) {
          console.error("❌ خطأ في تعيين مصدر الصوت:", e);
          setIsPlaying(false);
          if (onEnded) onEnded();
        }
      }
    }, [audioSource, autoPlay]);

    // محاولة تشغيل الصوت مع إعادة المحاولة عند الفشل
    const playAudio = () => {
      if (!audioRef.current) return;

      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("✅ بدأ تشغيل الصوت بنجاح");
            setIsPlaying(true);
            setPlayAttempts(0);
          })
          .catch((e) => {
            console.error("❌ خطأ في تشغيل الصوت:", e);
            setIsPlaying(false);
            
            // إعادة المحاولة إذا كان ذلك ممكنًا
            if (playAttempts < maxPlayAttempts) {
              console.log(`⚠️ محاولة تشغيل الصوت ${playAttempts + 1}/${maxPlayAttempts}`);
              setPlayAttempts(prev => prev + 1);
              setTimeout(playAudio, 300);
            } else {
              console.error("❌ فشل تشغيل الصوت بعد عدة محاولات");
              if (onEnded) onEnded();
            }
          });
      }
    };

    // عند بدء التشغيل
    const handlePlay = () => {
      console.log("🎵 بدأ تشغيل الصوت");
      setIsPlaying(true);
    };

    // عند إيقاف التشغيل
    const handlePause = () => {
      console.log("⏸️ توقف تشغيل الصوت");
      setIsPlaying(false);
    };

    // عند انتهاء الصوت
    const handleEnded = () => {
      console.log("🏁 انتهى تشغيل الصوت");
      setIsPlaying(false);
      if (onEnded) onEnded();
    };

    // معالجة الأخطاء
    const handleError = (e: Event) => {
      console.error("❌ حدث خطأ أثناء تشغيل الصوت:", e);
      setIsPlaying(false);
      if (onEnded) onEnded();
    };

    return (
      <audio 
        ref={audioRef} 
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        style={{ display: "none" }}
      />
    );
  }
);

AudioPlayer.displayName = "AudioPlayer";

export default AudioPlayer;
