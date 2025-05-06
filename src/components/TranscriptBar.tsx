
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TranscriptBarProps {
  text: string;
  isActive: boolean;
  className?: string;
}

const TranscriptBar: React.FC<TranscriptBarProps> = ({
  text,
  isActive,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (text && isActive) {
      setIsVisible(true);
      
      // إخفاء النص تلقائيًا بعد انتهاء التحدث بثانية أو ثانيتين
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [text, isActive]);
  
  if (!text) return null;
  
  return (
    <div 
      className={cn(
        "py-3 px-4 bg-ministry-dark/30 backdrop-blur-lg rounded-lg max-w-md mx-auto transition-all duration-500 text-center",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
        className
      )}
    >
      <p className="text-white text-sm md:text-base">{text}</p>
    </div>
  );
};

export default TranscriptBar;
