
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, Volume } from "lucide-react";
import CallTimer from "@/components/CallTimer";
import AudioPlayer from "@/components/AudioPlayer";
import AvatarAnimation from "@/components/AvatarAnimation";
import CallButton from "@/components/CallButton";
import SoundWave from "@/components/SoundWave";
import ChatBubble from "@/components/ChatBubble";
import TranscriptBar from "@/components/TranscriptBar";
import SuggestedQuestions from "@/components/SuggestedQuestions";
import { useAIAssistant } from "@/hooks/useAIAssistant";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useToast } from "@/hooks/use-toast";
import { useCallMessages } from "@/hooks/useCallMessages";

interface ActiveCallScreenProps {
  callStartTime: Date;
  onEndCall: () => void;
}

const ActiveCallScreen: React.FC<ActiveCallScreenProps> = ({ 
  callStartTime, 
  onEndCall 
}) => {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioSource, setAudioSource] = useState<string | undefined>();
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);
  const { toast } = useToast();
  
  // References
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioControllerRef = useRef<{ 
    pause: () => void;
    play: () => Promise<void>;
    isPlaying: boolean; 
  } | null>(null);
  const firstMessagePlayed = useRef<boolean>(false);
  const autoListenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxListeningTimeRef = useRef<NodeJS.Timeout | null>(null);
  const lastAudioLevelTimestampRef = useRef<number>(Date.now());
  
  // The AI assistant hook
  const { 
    askAssistant, 
    textToSpeech, 
    isLoading: isAIThinking,
    isAudioLoading 
  } = useAIAssistant();
  
  // Call messages state management
  const { messages, addMessage } = useCallMessages();
  
  // The suggested questions
  const [suggestedQuestions] = useState<string[]>([
    "إيه هو برنامج تكافل وكرامة؟",
    "إزاي أقدم في البرنامج؟",
    "إيه هي المستندات المطلوبة؟",
    "أنا أرملة.. هل ممكن أستفيد من البرنامج؟",
    "مواعيد صرف الدعم إمتى؟",
    "عندي سؤال عن برنامج كرامة",
  ]);

  // Process user input (from voice or button)
  const processUserInput = async (text: string) => {
    if (!text.trim()) return;
    
    // Show current transcript
    setCurrentTranscript(text.trim());
    
    // Add user message
    console.log("👤 رسالة المستخدم:", text.trim());
    addMessage(text.trim(), "user");
    resetTranscript();
    
    // Get response from AI assistant
    console.log("🤖 جاري إرسال الطلب إلى المساعد الذكي...");
    const aiResponse = await askAssistant(text.trim());
    
    if (aiResponse) {
      console.log("🤖 تم استلام رد المساعد الذكي:", aiResponse);
      
      // Add assistant response
      addMessage(aiResponse, "assistant");
      
      // Convert text to speech
      if (!isMuted && isSpeakerOn) {
        console.log("🔊 جاري تحويل النص إلى كلام...");
        const audioUrl = await textToSpeech(aiResponse, {
          onStart: () => {
            console.log("🔊 بدء تشغيل الصوت");
            setIsSpeaking(true);
          },
          onEnd: () => {
            console.log("🔊 انتهاء تشغيل الصوت");
            setIsSpeaking(false);
          }
        });
        
        if (audioUrl) {
          console.log("🔊 تم الحصول على رابط الصوت:", audioUrl.substring(0, 50) + "...");
          setAudioSource(audioUrl);
        } else {
          console.error("❌ فشل في الحصول على URL للصوت");
          handleAudioEnded(); // Call this to ensure program flow continues
        }
      } else {
        // If sound is disabled, skip audio phase
        console.log("🔇 تخطي تشغيل الصوت (مكتوم أو غير نشط)");
        handleAudioEnded();
      }
    } else {
      console.error("❌ لم يتم الحصول على رد من المساعد الذكي");
      toast({
        title: "خطأ في الحصول على الرد",
        description: "لم نتمكن من الحصول على رد من المساعد الذكي. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
      
      // Start listening again
      if (!isMuted) {
        scheduleListening(1000);
      }
    }
  };

  // Speech recognition handling - directly use processUserInput
  const handleTranscriptResult = (text: string) => {
    processUserInput(text);
  };

  // Reset silence detection when audio level changes
  const handleAudioLevelChange = useCallback((level: number) => {
    // If we detect sound above threshold, reset silence timeout
    if (level > 0.05) {
      lastAudioLevelTimestampRef.current = Date.now();
      
      // Clear existing silence timeout if there is one
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    } else if (!silenceTimeoutRef.current) {
      // No significant audio for a while, start silence timeout
      const timeSinceLastSound = Date.now() - lastAudioLevelTimestampRef.current;
      
      // Only set silence timeout if it's been silent for a bit
      if (timeSinceLastSound > 300) {
        silenceTimeoutRef.current = setTimeout(() => {
          console.log("🔇 تم اكتشاف صمت لمدة طويلة، إيقاف الاستماع");
          if (isListening) {
            stopListening();
          }
          silenceTimeoutRef.current = null;
        }, 1500); // Stop after 1.5 seconds of silence
      }
    }
  }, []);
  
  // Speech recognition hook with silence detection
  const { 
    isListening,
    startListening,
    stopListening,
    transcript,
    isProcessing: isTranscribing,
    error: speechError,
    resetTranscript,
    audioLevel
  } = useSpeechRecognition({
    onResult: handleTranscriptResult,
    onListeningChange: (listening) => {
      console.log("🎤 حالة الاستماع:", listening ? "نشط" : "متوقف");
    },
    onProcessingChange: (processing) => {
      console.log("🎤 حالة المعالجة:", processing ? "جاري المعالجة" : "متوقف");
    },
    onAudioLevelChange: handleAudioLevelChange
  });

  // Update transcript and monitor audio level during listening
  useEffect(() => {
    if (isListening) {
      // Update current transcript during listening
      if (transcript) {
        setCurrentTranscript(transcript);
      }
      
      // Set maximum listening time (8 seconds) as safety
      if (!maxListeningTimeRef.current) {
        maxListeningTimeRef.current = setTimeout(() => {
          console.log("⏱️ تجاوز الحد الأقصى لوقت الاستماع، إيقاف الاستماع");
          if (isListening) {
            stopListening();
          }
          maxListeningTimeRef.current = null;
        }, 8000);
      }
    } else {
      // Clear timeout when not listening
      if (maxListeningTimeRef.current) {
        clearTimeout(maxListeningTimeRef.current);
        maxListeningTimeRef.current = null;
      }
    }
  }, [transcript, isListening, stopListening]);

  // Schedule listening after a delay
  const scheduleListening = (delay: number = 500) => {
    if (autoListenTimeoutRef.current) {
      clearTimeout(autoListenTimeoutRef.current);
    }
    
    autoListenTimeoutRef.current = setTimeout(() => {
      if (!isListening && !isTranscribing && !isAIThinking && !isSpeaking && !isMuted) {
        console.log("🔄 جدولة بدء الاستماع تلقائيًا");
        startListening();
      }
    }, delay);
  };

  // Handle suggested question selection - use processUserInput directly
  const handleQuestionSelect = (question: string) => {
    if (isSpeaking || isTranscribing || isAIThinking || isListening) {
      console.log("❌ لا يمكن معالجة السؤال المقترح الآن:", {
        isSpeaking,
        isTranscribing,
        isAIThinking,
        isListening
      });
      return;
    }
    
    // Stop current listening if any
    if (isListening) {
      stopListening();
    }
    
    console.log("📝 معالجة سؤال مقترح:", question);
    
    // Process the question directly using the same pipeline as voice input
    processUserInput(question);
  };

  // When audio ends, start listening automatically
  const handleAudioEnded = useCallback(() => {
    setIsSpeaking(false);
    setCurrentTranscript(""); // Clear transcript bar text
    
    if (!isMuted && firstMessagePlayed.current) {
      // Short delay before starting to listen
      scheduleListening(800);
    }
  }, [isMuted]);

  // Stop current audio
  const stopCurrentAudio = useCallback(() => {
    if (audioControllerRef.current) {
      audioControllerRef.current.pause();
    }
    setIsSpeaking(false);
  }, []);

  // Handle mute button click
  const handleMuteClick = () => {
    setIsMuted(!isMuted);
    
    // If muting, stop current audio and listening
    if (!isMuted) {
      stopCurrentAudio();
      if (isListening) {
        stopListening();
      }
      
      toast({
        title: "تم كتم الميكروفون",
        duration: 2000,
      });
    } else {
      toast({
        title: "تم تشغيل الميكروفون",
        duration: 2000,
      });
      
      // If unmuting and no audio is playing, start listening
      if (!isSpeaking && !isListening && !isTranscribing && !isAIThinking) {
        scheduleListening(800);
      }
    }
  };

  // Handle speaker button click
  const handleSpeakerClick = () => {
    setIsSpeakerOn(!isSpeakerOn);
    toast({
      title: isSpeakerOn ? "تم إيقاف مكبر الصوت" : "تم تشغيل مكبر الصوت",
      duration: 2000,
    });
    
    // Stop current audio if turning speaker off
    if (isSpeakerOn && isSpeaking) {
      stopCurrentAudio();
      handleAudioEnded();
    }
  };

  // Setup audio controller reference
  const setupAudioController = useCallback((controller: { 
    pause: () => void;
    play: () => Promise<void>;
    isPlaying: boolean; 
  } | null) => {
    audioControllerRef.current = controller;
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Stop listening when stopping call
  useEffect(() => {
    if (isListening) {
      stopListening();
    }
    stopCurrentAudio();
    
    // Clean up all timeouts
    if (autoListenTimeoutRef.current) {
      clearTimeout(autoListenTimeoutRef.current);
    }
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    if (maxListeningTimeRef.current) {
      clearTimeout(maxListeningTimeRef.current);
    }
  }, [isListening, stopListening, stopCurrentAudio]);

  // Stop listening if AI is thinking or speaking
  useEffect(() => {
    if ((isAIThinking || isSpeaking) && isListening) {
      stopListening();
    }
  }, [isAIThinking, isSpeaking, isListening, stopListening]);

  // Retry on speech recognition error
  useEffect(() => {
    if (speechError && !isSpeaking && !isListening && !isTranscribing && !isAIThinking) {
      console.log("محاولة إعادة تشغيل الميكروفون بعد الخطأ:", speechError);
      scheduleListening(2000);
    }
  }, [speechError, isSpeaking, isListening, isTranscribing, isAIThinking]);

  // Clean up timers when unmounting
  useEffect(() => {
    return () => {
      if (autoListenTimeoutRef.current) {
        clearTimeout(autoListenTimeoutRef.current);
      }
      
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      
      if (maxListeningTimeRef.current) {
        clearTimeout(maxListeningTimeRef.current);
      }
    };
  }, []);

  // Retry playing audio if source exists but not playing
  useEffect(() => {
    if (audioSource && !isSpeaking && !isMuted && isSpeakerOn && audioControllerRef.current) {
      // Short delay then try playing audio again if not already playing
      const timer = setTimeout(() => {
        if (audioControllerRef.current && !audioControllerRef.current.isPlaying) {
          console.log("🔄 محاولة إعادة تشغيل الصوت");
          audioControllerRef.current.play().catch(() => {
            console.error("❌ فشل في إعادة تشغيل الصوت");
            handleAudioEnded();
          });
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [audioSource, isSpeaking, isMuted, isSpeakerOn, handleAudioEnded]);

  // Pre-initialize microphone
  useEffect(() => {
    // Pre-request microphone permissions
    navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } 
    })
      .then(() => console.log("✅ تم الحصول على إذن الميكروفون مسبقًا"))
      .catch(err => console.error("❌ خطأ في الوصول إلى الميكروفون:", err));
  }, []);

  // Play welcome message on first render - ONLY ONCE
  useEffect(() => {
    // Play welcome message after a short delay
    const welcomeTimer = setTimeout(async () => {
      if (firstMessagePlayed.current) {
        // If we've already played the welcome message, just start listening
        scheduleListening(800);
        return;
      }
      
      const welcomeMessage = "أهلا بيك في وزارة التضامن الاجتماعي، معاك سلمى مساعدتك الذكية أنا هنا عشان اجاوبك على كل الاستفسارات ازاي اقدر اساعدك؟";
      console.log("🤖 رسالة الترحيب:", welcomeMessage);
      addMessage(welcomeMessage, "assistant");
      
      // Convert text to speech
      if (isSpeakerOn) {
        console.log("🔊 جاري تحويل رسالة الترحيب إلى صوت...");
        const audioUrl = await textToSpeech(welcomeMessage, {
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false)
        });
        
        if (audioUrl) {
          setAudioSource(audioUrl);
          // Mark first message as played to prevent repeating
          firstMessagePlayed.current = true;
        } else {
          // If text-to-speech fails, mark as played and start listening
          firstMessagePlayed.current = true;
          handleAudioEnded();
        }
      } else {
        firstMessagePlayed.current = true;
        handleAudioEnded();
      }
    }, 500);
    
    return () => clearTimeout(welcomeTimer);
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[9/16] md:aspect-auto md:h-[80vh] overflow-hidden rounded-2xl md:rounded-3xl bg-black shadow-xl border-8 border-gray-800 flex flex-col">
      {/* Call background */}
      <div className="absolute inset-0 bg-gradient-to-b from-ministry-dark to-black/90"></div>
      
      {/* Status bar at top */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-black/30 backdrop-blur-lg flex items-center justify-center z-10">
        <CallTimer isActive={true} startTime={callStartTime} className="text-white font-bold" />
      </div>
      
      {/* Chat container - hidden in call UI, used for internal tracking */}
      <div 
        ref={chatContainerRef}
        className="opacity-0 absolute inset-0 overflow-y-auto"
      >
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message.text}
            sender={message.sender}
          />
        ))}
      </div>
      
      {/* Animated avatar - center of screen */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <AvatarAnimation 
          isActive={isSpeaking} 
          isListening={!isSpeaking && isListening}
          audioLevel={audioLevel}
        />
      </div>
      
      {/* Current transcript bar - under chin */}
      <div className="absolute bottom-32 left-0 right-0 z-20 px-4">
        <TranscriptBar 
          text={currentTranscript} 
          isActive={Boolean(isSpeaking || (isListening && transcript))} 
          autoHide={false}
        />
      </div>
      
      {/* Suggested questions bar */}
      <div className="absolute bottom-24 left-0 right-0 z-20 px-2">
        <SuggestedQuestions 
          questions={suggestedQuestions} 
          onQuestionSelect={handleQuestionSelect} 
        />
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
      
      {isTranscribing && (
        <div className="absolute bottom-40 left-0 right-0 z-10 flex justify-center">
          <div className="bg-ministry-dark/50 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
            <div className="text-white text-xs">جاري معالجة الصوت</div>
            <SoundWave isActive={true} type="listening" className="h-4 w-16" />
          </div>
        </div>
      )}
      
      {isListening && (
        <div className="absolute top-16 right-4 flex items-center gap-2 animate-pulse">
          <div className="flex space-x-1 rtl:space-x-reverse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div 
                key={i} 
                className="w-2 h-2 bg-green-500 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              ></div>
            ))}
          </div>
          <span className="text-xs text-white bg-green-500/80 px-2 py-0.5 rounded-full">جاري الاستماع</span>
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
      
      {/* Call control buttons - iOS style */}
      <div className="absolute bottom-4 left-0 right-0 z-30">
        <div className="flex items-center justify-center space-x-5 rtl:space-x-reverse">
          <CallButton 
            type="mute" 
            onClick={handleMuteClick} 
            active={isMuted}
          />
          <CallButton 
            type="end_call" 
            onClick={onEndCall} 
            className="p-5" 
          />
          {/* Speaker control button */}
          <button
            className={`relative flex items-center justify-center rounded-full p-4 text-white transition-all transform hover:scale-105 active:scale-95
              ${isSpeakerOn ? 'bg-ministry-green shadow-lg shadow-green-500/30' : 'bg-gray-800 hover:bg-gray-700 shadow-md'}`}
            onClick={handleSpeakerClick}
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
      
      {/* Hidden audio player */}
      <AudioPlayer 
        audioSource={audioSource} 
        autoPlay={Boolean(isSpeakerOn && !isMuted)}
        onEnded={handleAudioEnded}
        onPlay={() => {
          setIsSpeaking(true);
          console.log("🎵 بدأ تشغيل الصوت");
        }}
        onError={(e) => {
          console.error("❌ خطأ في تشغيل الصوت:", e);
          handleAudioEnded();
        }}
        ref={setupAudioController}
      />
    </div>
  );
};

export default ActiveCallScreen;
