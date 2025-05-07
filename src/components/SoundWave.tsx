
import React from "react";
import { cn } from "@/lib/utils";

interface SoundWaveProps {
  isActive: boolean;
  className?: string;
  type?: "speaking" | "listening";
  audioLevel?: number;
}

const SoundWave = ({ isActive, className, type = "speaking", audioLevel = 0 }: SoundWaveProps) => {
  // تأثيرات مختلفة للتحدث والاستماع
  const waveBars = type === "speaking" ? 9 : 7;
  const animationClass = type === "speaking" ? "animate-wave" : "animate-blink";
  const barColor = type === "speaking" ? "bg-ministry-green" : "bg-green-500";
  
  // Scale heights based on audioLevel for 'listening' type
  const getBarHeight = (index: number) => {
    if (!isActive || type !== "listening" || audioLevel === 0) return "h-1";
    
    // Create a bell curve distribution for visualization
    const middleIndex = Math.floor(waveBars / 2);
    const distFromMiddle = Math.abs(index - middleIndex);
    const multiplier = 1 - (distFromMiddle / middleIndex) * 0.6; // Decrease heights as we move away from center
    
    // Scale by audio level
    const heightLevel = Math.floor((audioLevel * 20) * multiplier);
    return `h-${Math.max(1, Math.min(16, heightLevel))}`;
  };

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {Array.from({ length: waveBars }).map((_, index) => {
        const height = getBarHeight(index);
        
        return (
          <div
            key={index}
            className={cn(
              `w-1 ${barColor} rounded-full transition-all duration-300`,
              isActive ? (type === "listening" ? height : animationClass) : "h-1",
              // Create different animation delays for each bar
              index % 3 === 0 ? "animation-delay-0" : 
              index % 3 === 1 ? "animation-delay-300" : "animation-delay-600"
            )}
            style={{
              animationDelay: `${(index * 100) % 900}ms`,
              height: type === "listening" && isActive ? `${Math.max(2, Math.min(24, audioLevel * 24 * (1 - Math.abs(index - waveBars/2)/(waveBars/2) * 0.7)))}px` : undefined
            }}
          ></div>
        );
      })}
    </div>
  );
};

export default SoundWave;
