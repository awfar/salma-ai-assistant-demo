
import React from "react";
import { cn } from "@/lib/utils";

interface SoundWaveProps {
  isActive: boolean;
  className?: string;
  type?: "speaking" | "listening";
}

const SoundWave = ({ isActive, className, type = "speaking" }: SoundWaveProps) => {
  // تأثيرات مختلفة للتحدث والاستماع
  const waveBars = type === "speaking" ? 9 : 5;
  const animationClass = type === "speaking" ? "animate-wave" : "animate-blink";
  const barColor = type === "speaking" ? "bg-ministry-green" : "bg-green-500";

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {Array.from({ length: waveBars }).map((_, index) => (
        <div
          key={index}
          className={cn(
            `w-1 ${barColor} rounded-full transition-all duration-300`,
            isActive ? animationClass : "h-1",
            // Create different animation delays for each bar
            index % 3 === 0 ? "animation-delay-0" : 
            index % 3 === 1 ? "animation-delay-300" : "animation-delay-600"
          )}
          style={{
            animationDelay: `${(index * 100) % 900}ms`,
          }}
        ></div>
      ))}
    </div>
  );
};

export default SoundWave;
