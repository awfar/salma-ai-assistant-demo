
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AvatarAnimationProps {
  isActive?: boolean;
  isListening?: boolean;
  className?: string;
}

const AvatarAnimation: React.FC<AvatarAnimationProps> = ({ 
  isActive = false, 
  isListening = false,
  className 
}) => {
  const avatarRef = useRef<HTMLDivElement>(null);
  const mouthRef = useRef<HTMLDivElement>(null);

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

  // حركة الفم عند التحدث
  useEffect(() => {
    if (!mouthRef.current) return;
    
    let animationFrame: number;
    if (isActive) {
      let openness = 0;
      let increasing = true;
      
      const animateMouth = () => {
        if (increasing) {
          openness += 0.5;
          if (openness >= 8) increasing = false;
        } else {
          openness -= 0.5;
          if (openness <= 0) increasing = true;
        }
        
        if (mouthRef.current) {
          mouthRef.current.style.height = `${Math.max(1, openness)}px`;
        }
        
        animationFrame = requestAnimationFrame(animateMouth);
      };
      
      animationFrame = requestAnimationFrame(animateMouth);
    } else {
      // فم مغلق عند عدم التحدث
      mouthRef.current.style.height = "1px";
    }
    
    return () => {
      cancelAnimationFrame(animationFrame);
      if (mouthRef.current) {
        mouthRef.current.style.height = "1px";
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
      <div className="relative">
        <img 
          src="/lovable-uploads/11c9fc05-dbe2-4818-bf45-0427f0c08e8f.png" 
          alt="سلمى المساعد الافتراضي" 
          className={cn(
            "object-cover max-h-full w-auto transition-all", 
            isActive ? "animate-subtle-pulse" : ""
          )}
        />
        
        {/* تمثيل الفم للمحاكاة البسيطة */}
        <div 
          className="absolute bottom-[28%] left-1/2 transform -translate-x-1/2"
          style={{ width: '20%' }}
        >
          <div 
            ref={mouthRef}
            className="bg-black/60 rounded-full w-full h-1 transition-all"
          ></div>
        </div>
      </div>
      
      {/* حالة الاستماع */}
      {isListening && (
        <div className="absolute top-8 right-8">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      )}
      
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
