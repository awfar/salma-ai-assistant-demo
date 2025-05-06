
import React from "react";
import { cn } from "@/lib/utils";
import { MicOff, PhoneOff, Volume } from "lucide-react";

interface CallButtonProps {
  type: "mute" | "end_call" | "volume";
  onClick: () => void;
  active?: boolean;
  className?: string;
}

const CallButton = ({ type, onClick, active = false, className }: CallButtonProps) => {
  const getButtonStyle = () => {
    switch (type) {
      case "end_call":
        return "bg-ministry-red hover:bg-red-600";
      default:
        return active 
          ? "bg-ministry-green text-white" 
          : "bg-gray-800 hover:bg-gray-700";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "mute":
        return <MicOff className="h-6 w-6" />;
      case "end_call":
        return <PhoneOff className="h-6 w-6" />;
      case "volume":
        return <Volume className="h-6 w-6" />;
      default:
        return null;
    }
  };

  const getTooltip = () => {
    switch (type) {
      case "mute":
        return "كتم الصوت";
      case "end_call":
        return "إنهاء المكالمة";
      case "volume":
        return "الصوت";
      default:
        return "";
    }
  };

  return (
    <button
      className={cn(
        "relative flex items-center justify-center rounded-full p-4 text-white transition-all",
        getButtonStyle(),
        className
      )}
      onClick={onClick}
      title={getTooltip()}
    >
      {getIcon()}
    </button>
  );
};

export default CallButton;
