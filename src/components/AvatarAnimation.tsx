
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import SoundWave from "./SoundWave";

interface AvatarAnimationProps {
  isActive?: boolean;
  isListening?: boolean;
  audioLevel?: number;
  className?: string;
}

const AvatarAnimation: React.FC<AvatarAnimationProps> = ({ 
  isActive = false, 
  isListening = false,
  audioLevel = 0,
  className 
}) => {
  const avatarRef = useRef<HTMLDivElement>(null);
  const mouthRef = useRef<HTMLDivElement>(null);
  const eyesRef = useRef<HTMLDivElement[]>([]);

  // Add simple movement when speaking
  useEffect(() => {
    const avatar = avatarRef.current;
    if (!avatar) return;

    let animationFrame: number;
    if (isActive) {
      let scale = 1.0;
      let increasing = true;
      const pulsate = () => {
        if (increasing) {
          scale += 0.0005;
          if (scale >= 1.01) increasing = false;
        } else {
          scale -= 0.0005;
          if (scale <= 1.0) increasing = true;
        }
        
        if (avatar) {
          avatar.style.transform = `scale(${scale})`;
        }
        
        animationFrame = requestAnimationFrame(pulsate);
      };
      
      animationFrame = requestAnimationFrame(pulsate);
    }
    
    return () => {
      cancelAnimationFrame(animationFrame);
      if (avatar) {
        avatar.style.transform = "scale(1)";
      }
    };
  }, [isActive]);

  // Enhanced mouth movement when speaking - sync lips with audio
  useEffect(() => {
    if (!mouthRef.current) return;
    
    let animationFrame: number;
    if (isActive) {
      // Create a more synchronized lip pattern with audio
      const mouthPatterns = [
        { height: 1, width: 12, opacity: 0.6 },  // closed
        { height: 2, width: 11, opacity: 0.7 },  // slightly open
        { height: 4, width: 10, opacity: 0.8 },  // medium open
        { height: 5, width: 9, opacity: 0.9 },   // wide open
        { height: 4, width: 10, opacity: 0.85 }, // medium
        { height: 2, width: 11, opacity: 0.75 }, // small
      ];
      
      let patternIndex = 0;
      let speed = 0;
      
      const animateMouth = () => {
        if (mouthRef.current) {
          // Update mouth shape based on current pattern
          const pattern = mouthPatterns[patternIndex % mouthPatterns.length];
          
          mouthRef.current.style.height = `${pattern.height}px`;
          mouthRef.current.style.opacity = `${pattern.opacity}`;
          mouthRef.current.style.width = `${pattern.width}%`;
          
          // Move to next pattern
          patternIndex++;
          
          // Variable speed for pattern transition to simulate natural speech
          speed = Math.random() * 60 + 50; // Between 50-110ms
          
          setTimeout(() => {
            animationFrame = requestAnimationFrame(animateMouth);
          }, speed);
        }
      };
      
      // Start mouth movement immediately
      animationFrame = requestAnimationFrame(animateMouth);
    } else {
      // Mouth closed when not speaking
      mouthRef.current.style.height = "1px";
      mouthRef.current.style.opacity = "0.6";
      mouthRef.current.style.width = "12%";
    }
    
    return () => {
      cancelAnimationFrame(animationFrame);
      if (mouthRef.current) {
        mouthRef.current.style.height = "1px";
        mouthRef.current.style.opacity = "0.6";
        mouthRef.current.style.width = "12%";
      }
    };
  }, [isActive]);

  // Eye movement when listening or speaking
  useEffect(() => {
    const blinkEyes = () => {
      eyesRef.current.forEach(eye => {
        if (eye) {
          eye.style.height = "1px";
          eye.style.opacity = "0.2";
          
          setTimeout(() => {
            if (eye) {
              eye.style.height = "4px";
              eye.style.opacity = "1";
            }
          }, 200);
        }
      });
    };
    
    let blinkInterval: NodeJS.Timeout;
    if (isActive || isListening) {
      // Random blink time between 2-6 seconds
      const getRandomBlinkTime = () => Math.floor(Math.random() * 4000) + 2000;
      const setupNextBlink = () => {
        blinkInterval = setTimeout(() => {
          blinkEyes();
          setupNextBlink();
        }, getRandomBlinkTime());
      };
      
      setupNextBlink();
    }
    
    return () => {
      if (blinkInterval) clearTimeout(blinkInterval);
    };
  }, [isActive, isListening]);

  return (
    <div 
      ref={avatarRef} 
      className={cn(
        "relative w-full h-full flex items-center justify-center transition-transform duration-500", 
        className
      )}
    >
      <div className="relative">
        <img 
          src="/lovable-uploads/03798977-4494-41de-b034-de18ed7e25a9.png" 
          alt="سلمى المساعد الافتراضي" 
          className={cn(
            "object-cover max-h-full w-auto transition-all", 
            isActive ? "animate-subtle-pulse" : ""
          )}
        />
        
        {/* Mouth and eye animations are disabled for the new avatar since it's a realistic photo */}
      </div>
      
      {/* Listening state - enhanced with audio level waves */}
      {isListening && (
        <div className="absolute bottom-16 flex items-center justify-center w-full">
          <div className="flex items-center justify-center bg-green-500/20 backdrop-blur-sm p-2 rounded-full">
            <SoundWave isActive={true} type="listening" className="h-8 w-20" audioLevel={audioLevel} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AvatarAnimation;
