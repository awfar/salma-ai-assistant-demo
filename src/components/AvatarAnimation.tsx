
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
  const eyesRef = useRef<HTMLDivElement[]>([]);

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

  // حركة الفم عند التحدث
  useEffect(() => {
    if (!mouthRef.current) return;
    
    let animationFrame: number;
    if (isActive) {
      let openness = 0;
      let increasing = true;
      
      const animateMouth = () => {
        if (increasing) {
          openness += 0.3;
          if (openness >= 3) increasing = false;
        } else {
          openness -= 0.3;
          if (openness <= 0) increasing = true;
        }
        
        if (mouthRef.current) {
          mouthRef.current.style.height = `${Math.max(1, openness)}px`;
          mouthRef.current.style.opacity = `${0.6 + (openness / 10)}`;
        }
        
        animationFrame = requestAnimationFrame(animateMouth);
      };
      
      animationFrame = requestAnimationFrame(animateMouth);
    } else {
      // فم مغلق عند عدم التحدث
      mouthRef.current.style.height = "1px";
      mouthRef.current.style.opacity = "0.6";
    }
    
    return () => {
      cancelAnimationFrame(animationFrame);
      if (mouthRef.current) {
        mouthRef.current.style.height = "1px";
        mouthRef.current.style.opacity = "0.6";
      }
    };
  }, [isActive]);

  // حركة العيون عند الاستماع والتحدث
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
      // عشوائية في وقت الرمش بين 2 و 6 ثواني
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
          src="/lovable-uploads/be96669d-e3ce-4c59-9c76-568ee630f046.png" 
          alt="سلمى المساعد الافتراضي" 
          className={cn(
            "object-cover max-h-full w-auto transition-all", 
            isActive ? "animate-subtle-pulse" : ""
          )}
        />
        
        {/* تمثيل الفم للمحاكاة البسيطة */}
        <div 
          className="absolute bottom-[31%] left-1/2 transform -translate-x-1/2"
          style={{ width: '14%' }}
        >
          <div 
            ref={mouthRef}
            className="bg-black/60 rounded-full w-full h-1 transition-all"
            style={{ opacity: 0.6 }}
          ></div>
        </div>
        
        {/* تمثيل العيون للرمش */}
        <div className="absolute top-[38%] left-[43%] transform -translate-x-1/2 -translate-y-1/2">
          <div 
            ref={(el) => { if (el) eyesRef.current[0] = el; }}
            className="bg-black/90 rounded-full w-4 h-4 transition-all duration-200"
          ></div>
        </div>
        <div className="absolute top-[38%] right-[43%] transform translate-x-1/2 -translate-y-1/2">
          <div 
            ref={(el) => { if (el) eyesRef.current[1] = el; }}
            className="bg-black/90 rounded-full w-4 h-4 transition-all duration-200"
          ></div>
        </div>
      </div>
      
      {/* حالة الاستماع */}
      {isListening && (
        <div className="absolute top-8 right-8 flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-white bg-green-500/80 px-2 py-0.5 rounded-full">جاري الاستماع</span>
        </div>
      )}
    </div>
  );
};

export default AvatarAnimation;
