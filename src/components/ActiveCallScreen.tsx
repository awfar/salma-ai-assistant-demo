
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
  const [audioMuted, setAudioMuted] = useState<boolean>(false); // State to track audio muting separately
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
  const processingUserInputRef = useRef<boolean>(false);
  
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

  // Stop current audio playback and reset speech state
  const stopCurrentAudio = useCallback(() => {
    if (audioControllerRef.current && audioControllerRef.current.isPlaying) {
      console.log("🛑 Stopping current audio playback");
      audioControllerRef.current.pause();
      setIsSpeaking(false);
    }
  }, []);

  // Handle user speech detection - stop AI from talking when user speaks
  const handleSpeechDetected = useCallback(() => {
    console.log("🔊👂 User speech detected while AI is speaking");
    if (isSpeaking && !processingUserInputRef.current) {
      console.log("🛑 Interrupting AI speech to listen to user");
      stopCurrentAudio();
      
      // Small delay before starting to listen again
      setTimeout(() => {
        if (!processingUserInputRef.current) {
          console.log("🎤 Starting listening after interruption");
          startListening();
        }
      }, 300);
    }
  }, [isSpeaking, stopCurrentAudio]);

  // Process user input (from voice or button)
  const processUserInput = async (text: string) => {
    if (!text.trim() || processingUserInputRef.current) return;
    
    try {
      console.log("🔄 Processing user input:", text);
      processingUserInputRef.current = true;
      
      // Stop any current audio and listening
      stopCurrentAudio();
      if (isListening) {
        stopListening();
      }
      
      // Show current transcript
      setCurrentTranscript(text.trim());
      
      // Add user message
      console.log("👤 User message:", text.trim());
      addMessage(text.trim(), "user");
      resetTranscript();
      
      // Get response from AI assistant
      console.log("🤖 Sending request to AI assistant...");
      const aiResponse = await askAssistant(text.trim());
      
      if (aiResponse) {
        console.log("🤖 Received response from AI assistant:", aiResponse);
        
        // Add assistant response
        addMessage(aiResponse, "assistant");
        
        // Convert text to speech
        if (!audioMuted && isSpeakerOn) {
          console.log("🔊 Converting text to speech...");
          const audioUrl = await textToSpeech(aiResponse, {
            onStart: () => {
              console.log("🔊 Starting audio playback");
              setIsSpeaking(true);
            },
            onEnd: () => {
              console.log("🔊 Audio playback ended");
              setIsSpeaking(false);
              handleAudioEnded();
            }
          });
          
          if (audioUrl) {
            console.log("🔊 Got audio URL:", audioUrl.substring(0, 50) + "...");
            setAudioSource(audioUrl);
          } else {
            console.error("❌ Failed to get audio URL");
            handleAudioEnded(); // Call this to ensure program flow continues
          }
        } else {
          // If sound is disabled, skip audio phase
          console.log("🔇 Skipping audio playback (muted or inactive)");
          handleAudioEnded();
        }
      } else {
        console.error("❌ No response from AI assistant");
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
    } finally {
      processingUserInputRef.current = false;
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
    } 
  }, []);
  
  // Speech recognition hook with improved sensitivity
  const { 
    isListening,
    startListening,
    stopListening,
    transcript,
    isProcessing: isTranscribing,
    error: speechError,
    resetTranscript,
    audioLevel,
    hasSpeechBeenDetected
  } = useSpeechRecognition({
    onResult: handleTranscriptResult,
    onListeningChange: (listening) => {
      console.log("🎤 Listening state:", listening ? "active" : "inactive");
    },
    onProcessingChange: (processing) => {
      console.log("🎤 Processing state:", processing ? "processing" : "inactive");
    },
    onAudioLevelChange: handleAudioLevelChange,
    onSpeechDetected: handleSpeechDetected,
    silenceThreshold: 0.02, // Lower threshold to detect more audio
    silenceTimeout: 800, // Silent timeout as requested (800ms)
    minSpeechLevel: 0.06  // Lower threshold to consider as speech
  });

  // Update transcript and monitor audio level during listening
  useEffect(() => {
    if (isListening) {
      // Update current transcript during listening
      if (transcript) {
        console.log("🎤 Live transcript:", transcript);
        setCurrentTranscript(transcript);
      }
      
      // Set maximum listening time (8 seconds) as safety
      if (!maxListeningTimeRef.current) {
        maxListeningTimeRef.current = setTimeout(() => {
          console.log("⏱️ Max listening time reached, stopping listening");
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
      if (!isListening && !isTranscribing && !isAIThinking && !isSpeaking && !isMuted && !processingUserInputRef.current) {
        console.log("🔄 Auto-scheduling listening");
        startListening();
      }
    }, delay);
  };

  // Handle suggested question selection - use processUserInput directly
  const handleQuestionSelect = (question: string) => {
    console.log("🖱️ Quick question clicked:", question);
    if (isSpeaking) {
      console.log("🛑 Stopping AI speech to process question");
      stopCurrentAudio();
    }
    
    if (isListening) {
      console.log("🛑 Stopping listening to process question");
      stopListening();
    }
    
    // Add a small delay to ensure everything is reset
    setTimeout(() => {
      processUserInput(question);
    }, 200);
  };

  // When audio ends, start listening automatically
  const handleAudioEnded = useCallback(() => {
    setIsSpeaking(false);
    setCurrentTranscript(""); // Clear transcript bar text
    
    if (!isMuted && firstMessagePlayed.current) {
      console.log("🔄 Audio ended, scheduling listening");
      // Short delay before starting to listen
      scheduleListening(800);
    }
  }, [isMuted]);

  // Handle mute button click - Only mute the microphone, not speaker
  const handleMuteClick = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (newMutedState) {
      // If muting, stop listening only
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

  // Handle speaker button click - controls audio output
  const handleSpeakerClick = () => {
    const newSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(newSpeakerState);
    setAudioMuted(!newSpeakerState); // This controls the audio element muting
    
    toast({
      title: newSpeakerState ? "تم تشغيل مكبر الصوت" : "تم إيقاف مكبر الصوت",
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
    return () => {
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
    };
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
      console.log("Attempting to restart microphone after error:", speechError);
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
    if (audioSource && !isSpeaking && !audioMuted && isSpeakerOn && audioControllerRef.current) {
      // Short delay then try playing audio again if not already playing
      const timer = setTimeout(() => {
        if (audioControllerRef.current && !audioControllerRef.current.isPlaying) {
          console.log("🔄 Attempting to play audio again");
          audioControllerRef.current.play().catch(() => {
            console.error("❌ Failed to play audio again");
            handleAudioEnded();
          });
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [audioSource, isSpeaking, audioMuted, isSpeakerOn, handleAudioEnded]);

  // Pre-initialize microphone with force start
  useEffect(() => {
    // Force microphone initialization immediately
    const initializeMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
        
        console.log("✅ Microphone permission granted and initialized");
        
        // Create temporary audio context to analyze mic input
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        
        // Check if we're getting audio input
        const testAudioLevel = () => {
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avgLevel = sum / dataArray.length / 256;
          console.log(`🎤 Initial microphone test level: ${avgLevel.toFixed(4)}`);
          
          // Try to start listening after permissions are granted
          if (!isSpeaking) {
            setTimeout(() => {
              console.log("🎤 Auto-start listening after mic test");
              startListening();
              
              // Clean up test resources
              source.disconnect();
              stream.getTracks().forEach(track => track.stop());
              audioContext.close();
            }, 500);
          }
        };
        
        // Test mic once
        setTimeout(testAudioLevel, 100);
      } catch (err) {
        console.error("❌ Error accessing microphone:", err);
        toast({
          title: "لم نتمكن من الوصول للميكروفون",
          description: "يرجى السماح بالوصول إلى الميكروفون لاستخدام المساعد الذكي",
          variant: "destructive",
          duration: 5000,
        });
      }
    };
    
    initializeMic();
  }, [startListening]);

  // Play welcome message on first render - ONLY ONCE
  useEffect(() => {
    // Play welcome message after a short delay
    const welcomeTimer = setTimeout(async () => {
      if (firstMessagePlayed.current) {
        // If we've already played the welcome message, just start listening
        console.log("🎤 Welcome message already played, starting to listen");
        scheduleListening(800);
        return;
      }
      
      const welcomeMessage = "أهلا بيك في وزارة التضامن الاجتماعي، معاك سلمى مساعدتك الذكية أنا هنا عشان اجاوبك على كل الاستفسارات ازاي اقدر اساعدك؟";
      console.log("🤖 Welcome message:", welcomeMessage);
      addMessage(welcomeMessage, "assistant");
      
      // Convert text to speech
      if (isSpeakerOn) {
        console.log("🔊 Converting welcome message to audio...");
        const audioUrl = await textToSpeech(welcomeMessage, {
          onStart: () => setIsSpeaking(true),
          onEnd: () => {
            setIsSpeaking(false);
            console.log("👋 Welcome message finished, ready to listen");
            // Schedule listening after welcome message
            scheduleListening(800);
          }
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
      
      {/* Enhanced Audio level indicator with better visibility */}
      {isListening && (
        <div 
          className="absolute top-16 left-4 animate-pulse w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            transform: `scale(${1 + audioLevel * 3.5})`, // Increased scaling for better visibility
            opacity: Math.min(1, audioLevel + 0.5), // Higher base opacity
            backgroundColor: `rgba(52, 211, 153, ${audioLevel * 0.9})`, // More vibrant color
            transition: 'transform 100ms ease-out, opacity 100ms ease-out',
            boxShadow: `0 0 ${20 * audioLevel}px rgba(52, 211, 153, ${audioLevel * 0.9})`,
          }}
        >
          <div className="w-5 h-5 bg-green-400 rounded-full" />
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
      
      {/* Hidden audio player with updated muting control */}
      <AudioPlayer 
        audioSource={audioSource} 
        autoPlay={Boolean(isSpeakerOn)}
        onEnded={handleAudioEnded}
        onPlay={() => {
          setIsSpeaking(true);
          console.log("🎵 Audio playback started");
        }}
        onError={(e) => {
          console.error("❌ Audio playback error:", e);
          handleAudioEnded();
        }}
        ref={setupAudioController}
        isMuted={audioMuted} // Use separate audio mute state
        volume={1.0} // Default to full volume, let isMuted control actual playback
      />
    </div>
  );
};

export default ActiveCallScreen;
