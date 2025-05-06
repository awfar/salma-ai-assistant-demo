
import React, { useRef, useEffect } from "react";

interface AudioPlayerProps {
  audioSource?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
}

const AudioPlayer = ({ audioSource, autoPlay = true, onEnded }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
};

export default AudioPlayer;
