
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

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
    
    useImperativeHandle(ref, () => ({
      play: async () => {
        try {
          if (audioRef.current) {
            console.log("▶️ تشغيل الصوت");
            // Reset to beginning before playing to ensure playback starts from the start
            audioRef.current.currentTime = 0;
            await audioRef.current.play();
            isPlayingRef.current = true;
            if (onPlay) onPlay();
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
          audioRef.current.pause();
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
        if (!audioRef.current) {
          audioRef.current = new Audio();
          
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
        }
        
        // Set the new source
        audioRef.current.src = audioSource;
        audioRef.current.load();
        audioRef.current.volume = isMuted ? 0 : volume;
        
        console.log("🔊 تم تعيين مصدر صوت جديد");
        
        // Auto-play if enabled
        if (autoPlay && !isMuted) {
          try {
            console.log("▶️ تشغيل تلقائي للصوت");
            await audioRef.current.play();
            isPlayingRef.current = true;
            if (onPlay) onPlay();
          } catch (error) {
            console.error("❌ فشل التشغيل التلقائي:", error);
            isPlayingRef.current = false;
            if (onError) onError(error instanceof Error ? error : new Error('فشل في التشغيل التلقائي للصوت'));
          }
        }
      };
      
      setupAudio();
    }, [audioSource, autoPlay, onPlay, onError, onEnded, isMuted, volume]);
    
    // Handle volume changes and muting
    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.volume = isMuted ? 0 : volume;
        
        // If muted during playback, pause the audio
        if (isMuted && isPlayingRef.current) {
          audioRef.current.pause();
          isPlayingRef.current = false;
        }
      }
    }, [volume, isMuted]);
    
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
