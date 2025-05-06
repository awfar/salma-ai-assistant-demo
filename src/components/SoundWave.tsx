
import React from "react";
import { cn } from "@/lib/utils";

interface SoundWaveProps {
  isActive: boolean;
  className?: string;
}

const SoundWave = ({ isActive, className }: SoundWaveProps) => {
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {Array.from({ length: 9 }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "w-1 bg-ministry-green rounded-full transition-all duration-300",
            isActive ? "animate-wave" : "h-1",
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
