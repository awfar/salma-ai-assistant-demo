
import React from "react";
import { cn } from "@/lib/utils";
import { MicOff, PhoneOff, Volume2, Mic, Phone } from "lucide-react";

interface CallButtonProps {
  type: "mute" | "end_call" | "volume" | "start_call";
  onClick: () => void;
  active?: boolean;
  className?: string;
}

const CallButton = ({ type, onClick, active = false, className }: CallButtonProps) => {
  const getButtonStyle = () => {
    switch (type) {
      case "end_call":
        return "bg-ministry-red hover:bg-red-600 shadow-lg shadow-red-500/30";
      case "start_call":
        return "bg-ministry-green hover:bg-green-600 shadow-lg shadow-green-500/30";
      default:
        return active 
          ? "bg-ministry-green text-white shadow-lg shadow-green-500/30" 
          : "bg-gray-800 hover:bg-gray-700 shadow-md";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "mute":
        return active ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />;
      case "end_call":
        return <PhoneOff className="h-6 w-6" />;
      case "volume":
        return <Volume2 className="h-6 w-6" />;
      case "start_call":
        return <Phone className="h-6 w-6" />;
      default:
        return null;
    }
  };

  const getTooltip = () => {
    switch (type) {
      case "mute":
        return active ? "تشغيل الميكروفون" : "كتم الصوت";
      case "end_call":
        return "إنهاء المكالمة";
      case "volume":
        return "الصوت";
      case "start_call":
        return "بدء المكالمة";
      default:
        return "";
    }
  };

  return (
    <button
      className={cn(
        "relative flex items-center justify-center rounded-full p-4 text-white transition-all transform hover:scale-105 active:scale-95",
        getButtonStyle(),
        className
      )}
      onClick={onClick}
      title={getTooltip()}
    >
      {getIcon()}
      <span className="sr-only">{getTooltip()}</span>
      
      {/* تأثير نبض عند التفعيل */}
      {active && (type === "start_call" || type !== "end_call") && (
        <span className="absolute inset-0 rounded-full bg-ministry-green animate-ping opacity-25"></span>
      )}
    </button>
  );
};

export default CallButton;
