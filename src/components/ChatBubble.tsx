
import React from "react";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  message: string;
  sender: "user" | "assistant";
  className?: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ 
  message, 
  sender, 
  className 
}) => {
  return (
    <div className={cn(
      "w-full max-w-[85%] mx-auto mb-4 animate-fade-in",
      sender === "user" ? "self-end" : "self-start",
      className
    )}>
      <div className={cn(
        "p-3 rounded-xl",
        sender === "user" 
          ? "bg-ministry-dark/90 text-white mr-auto rounded-tr-none border border-ministry-dark/30" 
          : "bg-white/20 backdrop-blur-md text-white ml-auto rounded-tl-none border border-white/30"
      )}>
        <p className={cn(
          "text-sm sm:text-base",
          sender === "user" ? "text-left" : "text-right"
        )}>
          {message}
        </p>
      </div>
    </div>
  );
};

export default ChatBubble;
