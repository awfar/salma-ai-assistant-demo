
import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import SoundWave from "./SoundWave";

interface PushToTalkButtonProps {
  onStartRecording: () => void;
  onStopRecording: () => void;
  audioLevel?: number;
  isRecording?: boolean;
  disabled?: boolean;
  className?: string;
}

const PushToTalkButton: React.FC<PushToTalkButtonProps> = ({
  onStartRecording,
  onStopRecording,
  audioLevel = 0,
  isRecording = false,
  disabled = false,
  className,
}) => {
  const [isPressing, setIsPressing] = useState(false);
  const [showRings, setShowRings] = useState(false);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRecordingTimeRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording on pointer down (handles both mouse and touch)
  const handleStart = (e: React.PointerEvent) => {
    if (disabled) return;
    
    // Prevent default behavior for touch events to avoid scrolling
    e.preventDefault();
    
    setIsPressing(true);
    setShowRings(true);
    
    // Start recording after a short delay to avoid accidental taps
    longPressTimeoutRef.current = setTimeout(() => {
      console.log("🎤 زر التحدث: بدء التسجيل");
      onStartRecording();
      
      // Set a maximum recording time (7 seconds)
      maxRecordingTimeRef.current = setTimeout(() => {
        console.log("⏱️ زر التحدث: تم الوصول للحد الأقصى لوقت التسجيل");
        handleStop();
      }, 7000);
    }, 200);
  };

  // Stop recording on pointer up
  const handleStop = () => {
    if (disabled) return;
    
    setIsPressing(false);
    
    // Clear timeouts
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    
    if (maxRecordingTimeRef.current) {
      clearTimeout(maxRecordingTimeRef.current);
      maxRecordingTimeRef.current = null;
    }
    
    // If we were actually recording (not just a quick tap)
    if (isRecording) {
      console.log("🎤 زر التحدث: توقف التسجيل");
      onStopRecording();
    }
    
    // Hide rings with a slight delay for visual effect
    setTimeout(() => setShowRings(false), 150);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
      
      if (maxRecordingTimeRef.current) {
        clearTimeout(maxRecordingTimeRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      {/* Animation rings */}
      {showRings && (
        <>
          <span 
            className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-10"
            style={{ animationDuration: '1.5s' }}
          />
          <span 
            className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-10"
            style={{ animationDuration: '1.8s', animationDelay: '0.2s' }}
          />
          <span 
            className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-10" 
            style={{ animationDuration: '2.2s', animationDelay: '0.4s' }}
          />
        </>
      )}
      
      {/* Main button */}
      <button
        className={cn(
          "relative flex items-center justify-center rounded-full p-5 text-white transition-all transform",
          isPressing ? "bg-ministry-green scale-95" : "bg-gray-800 hover:bg-gray-700",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95",
          // إضافة خصائص لمنع التحديد واللمس
          "select-none touch-action-manipulation mic-button",
          "-webkit-user-select-none -webkit-touch-callout-none",
          className
        )}
        onPointerDown={handleStart}
        onPointerUp={handleStop}
        onPointerLeave={handleStop}
        onPointerCancel={handleStop}
        disabled={disabled}
        aria-label="اضغط للتحدث"
      >
        {isRecording ? (
          <Mic className="h-7 w-7 animate-pulse" />
        ) : (
          <MicOff className="h-7 w-7" />
        )}
        
        {/* Sound wave visualization for recording state */}
        {isRecording && audioLevel > 0.05 && (
          <div className="absolute -top-12">
            <SoundWave isActive={true} type="listening" className="h-8 w-20" audioLevel={audioLevel} />
          </div>
        )}
      </button>
      
      {/* Label */}
      <div className="text-center text-white text-xs mt-2 opacity-80">
        {isRecording ? "تحدث الآن..." : "اضغط للتحدث"}
      </div>
    </div>
  );
};

export default PushToTalkButton;
