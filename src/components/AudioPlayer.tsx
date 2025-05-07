
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

interface AudioPlayerProps {
  audioSource?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onPlay?: () => void;
  onError?: (error: Error) => void;
  volume?: number;
}

interface AudioPlayerRef {
  play: () => Promise<void>;
  pause: () => void;
  isPlaying: boolean;
}

const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  ({ audioSource, autoPlay = true, onEnded, onPlay, onError, volume = 1 }, ref) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isPlayingRef = useRef(false);
    
    useImperativeHandle(ref, () => ({
      play: async () => {
        try {
          if (audioRef.current) {
            console.log("▶️ Playing audio");
            await audioRef.current.play();
            isPlayingRef.current = true;
            if (onPlay) onPlay();
          }
        } catch (error) {
          console.error("❌ Audio play error:", error);
          isPlayingRef.current = false;
          if (onError) onError(error instanceof Error ? error : new Error('Failed to play audio'));
        }
      },
      pause: () => {
        if (audioRef.current) {
          console.log("⏸️ Pausing audio");
          audioRef.current.pause();
          audioRef.current.currentTime = 0; // Reset position to start
          isPlayingRef.current = false;
          // Manually trigger onended to signal complete stop
          if (onEnded) onEnded();
        }
      },
      get isPlaying() {
        return isPlayingRef.current;
      }
    }));
    
    // Handle audio source changes
    useEffect(() => {
      if (!audioSource) return;
      
      const setupAudio = async () => {
        if (audioRef.current) {
          audioRef.current.src = audioSource;
          audioRef.current.load();
          
          if (autoPlay) {
            try {
              console.log("▶️ Auto-playing audio");
              await audioRef.current.play();
              isPlayingRef.current = true;
              if (onPlay) onPlay();
            } catch (error) {
              console.error("❌ Auto-play failed:", error);
              isPlayingRef.current = false;
              if (onError) onError(error instanceof Error ? error : new Error('Failed to auto-play audio'));
            }
          }
        }
      };
      
      setupAudio();
    }, [audioSource, autoPlay, onPlay, onError]);
    
    // Handle volume changes
    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.volume = volume;
      }
    }, [volume]);
    
    // Create audio element
    useEffect(() => {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        
        // Set event listeners
        audioRef.current.onended = () => {
          console.log("🔊 Audio playback ended");
          isPlayingRef.current = false;
          if (onEnded) onEnded();
        };
        
        audioRef.current.onerror = (event) => {
          console.error("❌ Audio error:", event);
          isPlayingRef.current = false;
          if (onError) {
            const error = new Error("Audio playback error");
            onError(error);
          }
        };
        
        // Set initial volume
        audioRef.current.volume = volume;
      }
      
      return () => {
        // Clean up audio element
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
          audioRef.current.onended = null;
          audioRef.current.onerror = null;
          isPlayingRef.current = false;
        }
      };
    }, [onEnded, onError, volume]);
    
    return null; // Audio player is not visible
  }
);

AudioPlayer.displayName = "AudioPlayer";

export default AudioPlayer;
