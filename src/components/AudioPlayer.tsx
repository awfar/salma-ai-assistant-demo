
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react";

interface AudioPlayerProps {
  audioSource?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
}

const AudioPlayer = forwardRef<{ pause: () => void } | null, AudioPlayerProps>(
  ({ audioSource, autoPlay = true, onEnded }, ref) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // إتاحة التحكم في تشغيل الصوت من الخارج
    useImperativeHandle(ref, () => ({
      pause: () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }
    }));

    useEffect(() => {
      if (audioSource && audioRef.current) {
        try {
          audioRef.current.src = audioSource;
          if (autoPlay) {
            audioRef.current.play().catch((e) => {
              console.error("خطأ في تشغيل الصوت:", e);
            });
          }
        } catch (e) {
          console.error("خطأ في تعيين مصدر الصوت:", e);
        }
      }
    }, [audioSource, autoPlay]);

    return (
      <audio 
        ref={audioRef} 
        onEnded={onEnded}
        style={{ display: "none" }}
      />
    );
  }
);

AudioPlayer.displayName = "AudioPlayer";

export default AudioPlayer;
