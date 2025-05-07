
import { useState, useRef, useCallback } from "react";
import { useAIAssistant } from "@/hooks/useAIAssistant";

interface UseAudioPlaybackProps {
  onAudioEnd: () => void;
  isSpeakerOn: boolean;
  audioMuted: boolean;
}

interface UseAudioPlaybackReturn {
  isSpeaking: boolean;
  audioSource: string | undefined;
  audioStreamRef: React.MutableRefObject<MediaSource | AudioBufferSourceNode | null>;
  setupAudioController: (controller: { 
    pause: () => void;
    play: () => Promise<void>;
    isPlaying: boolean;
  } | null) => void;
  stopCurrentAudio: () => void;
  playTextAsAudio: (text: string, useStreaming: boolean) => Promise<void>;
}

export const useAudioPlayback = ({
  onAudioEnd,
  isSpeakerOn,
  audioMuted
}: UseAudioPlaybackProps): UseAudioPlaybackReturn => {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [audioSource, setAudioSource] = useState<string | undefined>();
  
  // References
  const audioControllerRef = useRef<{ 
    pause: () => void;
    play: () => Promise<void>;
    isPlaying: boolean; 
  } | null>(null);
  const audioStreamRef = useRef<MediaSource | AudioBufferSourceNode | null>(null);
  
  // The AI assistant hook
  const { 
    textToSpeech,
    streamToSpeech
  } = useAIAssistant();
  
  // Stop current audio playback and reset speech state
  const stopCurrentAudio = useCallback(() => {
    if (audioControllerRef.current && audioControllerRef.current.isPlaying) {
      console.log("🛑 إيقاف تشغيل الصوت الحالي");
      audioControllerRef.current.pause();
      setIsSpeaking(false);
    }
  }, []);
  
  // Setup audio controller reference
  const setupAudioController = useCallback((controller: { 
    pause: () => void;
    play: () => Promise<void>;
    isPlaying: boolean; 
  } | null) => {
    audioControllerRef.current = controller;
  }, []);
  
  // Play text as audio
  const playTextAsAudio = useCallback(async (text: string, useStreaming: boolean) => {
    if (!isSpeakerOn || audioMuted) {
      console.log("🔇 تخطي تشغيل الصوت (مكتوم أو غير نشط)");
      onAudioEnd();
      return;
    }
    
    console.log("🔊 تحويل النص إلى كلام...");
    
    if (useStreaming) {
      // استخدام طريقة الدفق الجديدة
      console.log("🔊 استخدام تقنية تدفق الصوت ElevenLabs...");
      setIsSpeaking(true);
      
      try {
        await streamToSpeech(text, {
          onStart: () => {
            console.log("🔊 بدء تدفق الصوت");
            setIsSpeaking(true);
          },
          onStreamStart: (source) => {
            console.log("🔊 تم بدء مصدر الصوت");
            audioStreamRef.current = source;
          },
          onChunk: (chunk) => {
            // يمكننا تتبع تقدم الدفق هنا إذا احتجنا لذلك
          },
          onEnd: () => {
            console.log("🔊 انتهى تدفق الصوت");
            audioStreamRef.current = null;
            setIsSpeaking(false);
            onAudioEnd();
          }
        });
      } catch (e) {
        console.error("❌ حدث خطأ أثناء تدفق الصوت:", e);
        setIsSpeaking(false);
        onAudioEnd();
        
        // Try falling back to regular audio if streaming fails
        console.log("🔄 المحاولة بالطريقة التقليدية بعد فشل الدفق...");
        
        const audioUrl = await textToSpeech(text, {
          onStart: () => {
            console.log("🔊 بدء تشغيل الصوت (الطريقة التقليدية)");
            setIsSpeaking(true);
          },
          onEnd: () => {
            console.log("🔊 انتهى تشغيل الصوت (الطريقة التقليدية)");
            setIsSpeaking(false);
            onAudioEnd();
          }
        });
        
        if (audioUrl) {
          console.log("🔊 تم الحصول على رابط الصوت:", audioUrl.substring(0, 50) + "...");
          setAudioSource(audioUrl);
        } else {
          console.error("❌ فشل الحصول على رابط الصوت");
          onAudioEnd(); 
        }
      }
      
    } else {
      // الطريقة القديمة - استخدام ملف صوتي كامل
      const audioUrl = await textToSpeech(text, {
        onStart: () => {
          console.log("🔊 بدء تشغيل الصوت");
          setIsSpeaking(true);
        },
        onEnd: () => {
          console.log("🔊 انتهى تشغيل الصوت");
          setIsSpeaking(false);
          onAudioEnd();
        }
      });
      
      if (audioUrl) {
        console.log("🔊 تم الحصول على رابط الصوت:", audioUrl.substring(0, 50) + "...");
        setAudioSource(audioUrl);
      } else {
        console.error("❌ فشل الحصول على رابط الصوت");
        onAudioEnd(); 
      }
    }
  }, [audioMuted, isSpeakerOn, onAudioEnd, streamToSpeech, textToSpeech]);
  
  return {
    isSpeaking,
    audioSource,
    audioStreamRef,
    setupAudioController,
    stopCurrentAudio,
    playTextAsAudio
  };
};
