
import React from "react";
import { PhoneOff, Volume2, Volume } from "lucide-react";
import CallButton from "@/components/CallButton";
import PushToTalkButton from "@/components/PushToTalkButton";

interface CallControlsProps {
  isSpeakerOn: boolean;
  isRecording: boolean;
  audioLevel: number;
  processingUserInput: boolean;
  isAIThinking: boolean;
  onSpeakerToggle: () => void;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => Promise<void>;
  onEndCall: () => void;
}

const CallControls: React.FC<CallControlsProps> = ({
  isSpeakerOn,
  isRecording,
  audioLevel,
  processingUserInput,
  isAIThinking,
  onSpeakerToggle,
  onStartRecording,
  onStopRecording,
  onEndCall
}) => {
  return (
    <div className="absolute bottom-4 left-0 right-0 z-30">
      <div className="flex items-center justify-center space-x-5 rtl:space-x-reverse">
        {/* Push to talk button (bigger, in center) */}
        <div className="relative flex-1 flex justify-center">
          <PushToTalkButton 
            onStartRecording={onStartRecording} 
            onStopRecording={onStopRecording}
            isRecording={isRecording}
            audioLevel={audioLevel}
            disabled={isAIThinking || processingUserInput}
          />
        </div>
        
        {/* End call button */}
        <div className="absolute right-4">
          <CallButton 
            type="end_call" 
            onClick={onEndCall} 
          />
        </div>
        
        {/* Speaker control button */}
        <div className="absolute left-4">
          <button
            className={`relative flex items-center justify-center rounded-full p-4 text-white transition-all transform hover:scale-105 active:scale-95
              ${isSpeakerOn ? 'bg-ministry-green shadow-lg shadow-green-500/30' : 'bg-gray-800 hover:bg-gray-700 shadow-md'}`}
            onClick={onSpeakerToggle}
            title={isSpeakerOn ? "إيقاف مكبر الصوت" : "تشغيل مكبر الصوت"}
          >
            {isSpeakerOn ? (
              <Volume2 className="h-6 w-6" />
            ) : (
              <Volume className="h-6 w-6" />
            )}
            <span className="sr-only">{isSpeakerOn ? "إيقاف مكبر الصوت" : "تشغيل مكبر الصوت"}</span>
            
            {/* Pulse effect when active */}
            {isSpeakerOn && (
              <span className="absolute inset-0 rounded-full bg-ministry-green animate-ping opacity-25"></span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallControls;
