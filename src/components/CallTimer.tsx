
import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CallTimerProps {
  isActive: boolean;
  startTime?: Date;
  className?: string;
}

const CallTimer: React.FC<CallTimerProps> = ({ isActive, startTime = new Date(), className }) => {
  const [elapsedTime, setElapsedTime] = useState<string>("00:00");
  
  useEffect(() => {
    if (!isActive) {
      setElapsedTime("00:00");
      return;
    }
    
    const calculateTime = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000); // الفرق بالثواني
      
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };
    
    setElapsedTime(calculateTime());
    
    const timer = setInterval(() => {
      setElapsedTime(calculateTime());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isActive, startTime]);
  
  return (
    <div className={`flex items-center gap-1.5 text-white/90 ${className}`}>
      <Clock className="w-3.5 h-3.5" />
      <span className="text-sm font-medium">{elapsedTime}</span>
    </div>
  );
};

export default CallTimer;
