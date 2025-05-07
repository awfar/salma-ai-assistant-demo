
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TranscriptBarProps {
  text: string;
  isActive: boolean; // Explicitly require boolean
  className?: string;
  autoHide?: boolean;
  hideDelay?: number;
}

const TranscriptBar: React.FC<TranscriptBarProps> = ({
  text,
  isActive,
  className,
  autoHide = false,
  hideDelay = 4000
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (text && isActive === true) {
      setIsVisible(true);
      
      // Only auto-hide if explicitly requested
      if (autoHide === true) {
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, hideDelay);
        
        return () => clearTimeout(timer);
      }
    } else if (isActive === false && !text) {
      // Add a slight delay before hiding when isActive becomes false and no text
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [text, isActive, autoHide, hideDelay]);
  
  if (!text) return null;
  
  return (
    <div 
      className={cn(
        "py-3 px-4 bg-ministry-dark/60 backdrop-blur-lg rounded-lg max-w-md mx-auto transition-all duration-500 text-center shadow-lg",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
        className
      )}
    >
      <p className="text-white text-sm md:text-base">{text}</p>
    </div>
  );
};

export default TranscriptBar;
