import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface AudioPlayerProps {
  audioSource?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onPlay?: () => void;
  onError?: (error: any) => void;
}

interface AudioPlayerRef {
  pause: () => void;
  isPlaying: boolean;
  play: () => Promise<void>;
}

const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  ({ audioSource, autoPlay = true, onEnded, onPlay, onError }, ref) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playAttempts, setPlayAttempts] = useState(0);
    const maxPlayAttempts = 5;
    const { toast } = useToast();

    useImperativeHandle(ref, () => ({
      pause: () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsPlaying(false);
        }
      },
      isPlaying,
      play: async () => {
        if (audioRef.current && audioSource) {
          setPlayAttempts(0);
          await playAudio();
        }
      }
    }));

    // Reset when audio source changes
    useEffect(() => {
      if (audioRef.current) {
        // Reset player state
        audioRef.current.pause();
        setIsPlaying(false);
        setPlayAttempts(0);
        
        // Setup new source
        if (audioSource) {
          audioRef.current.src = audioSource;
          
          if (autoPlay === true) {
            // Small delay to ensure audio loads
            const timer = setTimeout(() => playAudio(), 100);
            return () => clearTimeout(timer);
          }
        }
      }
    }, [audioSource, autoPlay]);

    // محاولة تشغيل الصوت مع إعادة المحاولة عند الفشل
    const playAudio = async () => {
      if (!audioRef.current || !audioSource) return;

      console.log("🎵 محاولة تشغيل الصوت...");

      try {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log("✅ بدأ تشغيل الصوت بنجاح");
          setIsPlaying(true);
          setPlayAttempts(0);
          if (onPlay) onPlay();
        }
      } catch (e) {
        console.error("❌ خطأ في تشغيل الصوت:", e);
        
        // إعادة المحاولة إذا كان ذلك ممكنًا
        if (playAttempts < maxPlayAttempts) {
          console.log(`⚠️ محاولة تشغيل الصوت ${playAttempts + 1}/${maxPlayAttempts}`);
          setPlayAttempts(prev => prev + 1);
          // زيادة الفترة الزمنية بين المحاولات
          setTimeout(playAudio, 500 * (playAttempts + 1));
        } else {
          console.error("❌ فشل تشغيل الصوت بعد عدة محاولات");
          setIsPlaying(false);
          
          toast({
            title: "فشل تشغيل الصوت",
            description: "يرجى التأكد من تشغيل الصوت في المتصفح",
            variant: "destructive",
          });
          
          if (onError) onError(e);
          if (onEnded) onEnded();
        }
      }
    };

    // عند بدء التشغيل
    const handlePlay = () => {
      console.log("🎵 بدأ تشغيل الصوت");
      setIsPlaying(true);
      if (onPlay) onPlay();
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
    const handleError = (e: React.SyntheticEvent<HTMLAudioElement>) => {
      const target = e.target as HTMLAudioElement;
      console.error("❌ حدث خطأ أثناء تشغيل الصوت:", e, target.error);
      setIsPlaying(false);
      
      if (onError) onError(target.error);
      if (onEnded) onEnded();
      
      toast({
        title: "خطأ في تشغيل الصوت",
        description: `رمز الخطأ: ${target.error?.code || 'غير معروف'}`,
        variant: "destructive",
      });
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
