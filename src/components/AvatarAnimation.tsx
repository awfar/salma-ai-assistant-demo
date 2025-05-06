
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AvatarAnimationProps {
  isActive?: boolean;
  className?: string;
}

const AvatarAnimation: React.FC<AvatarAnimationProps> = ({ isActive = false, className }) => {
  const avatarRef = useRef<HTMLDivElement>(null);

  // إضافة حركة بسيطة عند التحدث
  useEffect(() => {
    const avatar = avatarRef.current;
    if (!avatar) return;

    let animationFrame: number;
    if (isActive) {
      let scale = 1.0;
      let increasing = true;
      const pulsate = () => {
        if (increasing) {
          scale += 0.001;
          if (scale >= 1.03) increasing = false;
        } else {
          scale -= 0.001;
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

  return (
    <div 
      ref={avatarRef} 
      className={cn(
        "relative w-full h-full flex items-center justify-center transition-transform duration-300", 
        className
      )}
    >
      <img 
        src="/lovable-uploads/11c9fc05-dbe2-4818-bf45-0427f0c08e8f.png" 
        alt="سلمى المساعد الافتراضي" 
        className={cn(
          "object-cover max-h-full w-auto transition-all", 
          isActive ? "animate-subtle-pulse" : ""
        )}
      />
      
      {/* إضافة تأثير للإشارة بأن المساعد يتحدث */}
      {isActive && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center justify-center gap-1">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className="bg-ministry-green w-2 h-2 rounded-full opacity-80"
                style={{
                  animation: `pulse 1.5s infinite ease-in-out ${i * 0.15}s`
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AvatarAnimation;
