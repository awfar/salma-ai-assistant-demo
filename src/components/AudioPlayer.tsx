
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
          audioRef.current.src = audioSource;
          if (autoPlay) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  setIsPlaying(true);
                })
                .catch((e) => {
                  console.error("خطأ في تشغيل الصوت:", e);
                  setIsPlaying(false);
                });
            }
          }
        } catch (e) {
          console.error("خطأ في تعيين مصدر الصوت:", e);
          setIsPlaying(false);
        }
      }
    }, [audioSource, autoPlay]);

    // عند بدء التشغيل
    const handlePlay = () => {
      setIsPlaying(true);
    };

    // عند إيقاف التشغيل
    const handlePause = () => {
      setIsPlaying(false);
    };

    // عند انتهاء الصوت
    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };

    return (
      <audio 
        ref={audioRef} 
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        style={{ display: "none" }}
      />
    );
  }
);

AudioPlayer.displayName = "AudioPlayer";

export default AudioPlayer;
