
import React, { useEffect, useRef } from "react";
import { useCallMessages } from "@/hooks/useCallMessages";

interface WelcomeEffectHandlerProps {
  isSpeakerOn: boolean;
  playTextAsAudio: (text: string, useStreaming: boolean) => Promise<void>;
  useStreamingAudio: boolean;
}

const WelcomeEffectHandler: React.FC<WelcomeEffectHandlerProps> = ({
  isSpeakerOn,
  playTextAsAudio,
  useStreamingAudio
}) => {
  const { addMessage } = useCallMessages();
  const firstMessagePlayed = useRef<boolean>(false);
  const welcomeAttempted = useRef<boolean>(false);
  
  // Play welcome message on first render
  useEffect(() => {
    // Don't try to play welcome if we've already done it or attempted it
    if (firstMessagePlayed.current || welcomeAttempted.current) {
      return;
    }

    welcomeAttempted.current = true;
    
    const playWelcomeMessage = async () => {
      try {
        const welcomeMessage = "أهلا بيك في وزارة التضامن الاجتماعي، معاك سلمى مساعدتك الذكية أنا هنا عشان اجاوبك على كل الاستفسارات. اضغط على زر الميكروفون واستمر بالضغط عليه وانت بتتكلم.";
        console.log("🤖 تشغيل رسالة الترحيب:", welcomeMessage);
        
        // Add message to chat history
        addMessage(welcomeMessage, "assistant");
        
        // Only attempt text to speech if speaker is on
        if (isSpeakerOn) {
          await playTextAsAudio(welcomeMessage, useStreamingAudio);
        }
        
        // Mark as played
        firstMessagePlayed.current = true;
      } catch (error) {
        console.error("❌ خطأ في تشغيل رسالة الترحيب:", error);
        // Set as played to prevent retries
        firstMessagePlayed.current = true;
      }
    };
    
    // Play welcome message after a short delay to ensure components are mounted
    const welcomeTimer = setTimeout(playWelcomeMessage, 800);
    
    return () => clearTimeout(welcomeTimer);
  }, [isSpeakerOn, addMessage, playTextAsAudio, useStreamingAudio]);
  
  // This is a side-effect component, no rendering
  return null;
};

export default WelcomeEffectHandler;
