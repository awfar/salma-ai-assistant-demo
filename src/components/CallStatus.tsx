
import React from "react";
import CallTimer from "@/components/CallTimer";

interface CallStatusProps {
  callStartTime: Date;
  isAIThinking: boolean;
  isAudioLoading: boolean;
}

const CallStatus: React.FC<CallStatusProps> = ({ 
  callStartTime, 
  isAIThinking, 
  isAudioLoading 
}) => {
  return (
    <>
      {/* Status bar at top */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-black/30 backdrop-blur-lg flex items-center justify-center z-10">
        <CallTimer isActive={true} startTime={callStartTime} className="text-white font-bold" />
      </div>
      
      {/* Status indicators */}
      {isAIThinking && (
        <div className="absolute bottom-40 left-0 right-0 z-10 flex justify-center">
          <div className="bg-ministry-dark/50 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
            <div className="text-white text-xs">جاري التفكير</div>
            <div className="flex space-x-1 rtl:space-x-reverse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div 
                  key={i} 
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 200}ms` }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Audio processing icon */}
      {isAudioLoading && (
        <div className="absolute top-16 left-4 flex items-center gap-2 animate-pulse">
          <div className="flex space-x-1 rtl:space-x-reverse">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
          </div>
          <span className="text-xs text-white bg-blue-400/80 px-2 py-0.5 rounded-full">جاري تجهيز الصوت</span>
        </div>
      )}
    </>
  );
};

export default CallStatus;
