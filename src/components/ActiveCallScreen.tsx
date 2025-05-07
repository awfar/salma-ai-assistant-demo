
import React, { useState, useEffect, useRef, useCallback } from "react";
import { PhoneOff, Volume2, Volume } from "lucide-react";
import CallTimer from "@/components/CallTimer";
import AudioPlayer from "@/components/AudioPlayer";
import AvatarAnimation from "@/components/AvatarAnimation";
import CallButton from "@/components/CallButton";
import ChatBubble from "@/components/ChatBubble";
import TranscriptBar from "@/components/TranscriptBar";
import SuggestedQuestions from "@/components/SuggestedQuestions";
import { useAIAssistant } from "@/hooks/useAIAssistant";
import { useToast } from "@/hooks/use-toast";
import { useCallMessages } from "@/hooks/useCallMessages";
import { speechTranscriptionService } from "@/services/speechTranscriptionService";
import PushToTalkButton from "@/components/PushToTalkButton";
import { createVoiceRecorder, VoiceRecorderInterface } from "@/utils/voiceRecorder";

interface ActiveCallScreenProps {
  callStartTime: Date;
  onEndCall: () => void;
}

const ActiveCallScreen: React.FC<ActiveCallScreenProps> = ({ 
  callStartTime, 
  onEndCall 
}) => {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const { toast } = useToast();
  
  // References
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioControllerRef = useRef<{ 
    pause: () => void;
    play: () => Promise<void>;
    isPlaying: boolean; 
  } | null>(null);
  const firstMessagePlayed = useRef<boolean>(false);
  const recorderRef = useRef<VoiceRecorderInterface | null>(null);
  const processingUserInputRef = useRef<boolean>(false);
  const noSpeechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // Initialize the voice recorder
  useEffect(() => {
    recorderRef.current = createVoiceRecorder({
      onAudioLevel: (level) => {
        setAudioLevel(level);
      }
    });

    return () => {
      // Clean up
      if (recorderRef.current && recorderRef.current.isRecording()) {
        recorderRef.current.cancelRecording();
      }
    };
  }, []);

  // Process user input from voice recording or text
  const processUserInput = async (text: string) => {
    if (!text.trim() || processingUserInputRef.current) return;
    
    try {
      console.log("🔄 Processing user input:", text);
      processingUserInputRef.current = true;
      
      // Stop any current audio
      stopCurrentAudio();
      
      // Show current transcript
      setCurrentTranscript(text.trim());
      
      // Add user message
      console.log("👤 User message:", text.trim());
      addMessage(text.trim(), "user");
      
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
            handleAudioEnded(); 
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
      }
    } finally {
      processingUserInputRef.current = false;
    }
  };
  
  // Handle start of recording
  const handleStartRecording = useCallback(async () => {
    try {
      if (processingUserInputRef.current) return;
      
      // Stop any playing audio
      stopCurrentAudio();
      
      // Start recording
      if (!recorderRef.current) {
        recorderRef.current = createVoiceRecorder({
          onAudioLevel: (level) => {
            setAudioLevel(level);
          }
        });
      }
      
      await recorderRef.current.startRecording();
      setIsRecording(true);
      setCurrentTranscript("جاري الاستماع...");
      
      // Set a timeout to check if no speech is detected
      noSpeechTimeoutRef.current = setTimeout(() => {
        if (audioLevel < 0.1) {
          console.log("⚠️ No speech detected within timeout period");
          handleStopRecording(true);
        }
      }, 6500); // Check just before 7 second max recording time

    } catch (err) {
      console.error("❌ Error starting recording:", err);
      setIsRecording(false);
      toast({
        title: "خطأ في تسجيل الصوت",
        description: "لم نتمكن من تشغيل الميكروفون. يرجى التأكد من السماح بالوصول.",
        variant: "destructive",
      });
    }
  }, [stopCurrentAudio, audioLevel]);
  
  // Handle end of recording
  const handleStopRecording = useCallback(async (noSpeechDetected = false) => {
    try {
      if (!recorderRef.current || !recorderRef.current.isRecording()) {
        setIsRecording(false);
        return;
      }
      
      // Clear no speech timeout
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
        noSpeechTimeoutRef.current = null;
      }
      
      setIsRecording(false);
      setCurrentTranscript("جاري معالجة الصوت...");
      
      // Stop the recording and get the audio blob
      const audioBlob = await recorderRef.current.stopRecording();
      
      // If we detected no speech, show a message
      if (noSpeechDetected || audioBlob.size < 1000) {
        setCurrentTranscript("لم يتم التقاط صوت، حاول مرة أخرى");
        setTimeout(() => {
          setCurrentTranscript("");
        }, 2000);
        return;
      }
      
      // Transcribe the audio
      const text = await speechTranscriptionService.transcribeAudio(audioBlob);
      
      if (!text) {
        throw new Error("Failed to transcribe speech");
      }
      
      // Process the transcribed text
      await processUserInput(text);
      
    } catch (err) {
      console.error("❌ Error stopping recording:", err);
      setIsRecording(false);
      setCurrentTranscript("");
      
      toast({
        title: "خطأ في معالجة الصوت",
        description: "لم نتمكن من تحويل الصوت إلى نص. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [processUserInput]);

  // Handle suggested question selection
  const handleQuestionSelect = (question: string) => {
    console.log("🖱️ Quick question clicked:", question);
    if (isSpeaking) {
      console.log("🛑 Stopping AI speech to process question");
      stopCurrentAudio();
    }
    
    if (isRecording) {
      console.log("🛑 Stopping recording to process question");
      recorderRef.current?.cancelRecording();
      setIsRecording(false);
    }
    
    // Add a small delay to ensure everything is reset
    setTimeout(() => {
      processUserInput(question);
    }, 200);
  };

  // Audio source state
  const [audioSource, setAudioSource] = useState<string | undefined>();

  // When audio ends
  const handleAudioEnded = useCallback(() => {
    setIsSpeaking(false);
    setCurrentTranscript(""); // Clear transcript bar text
  }, []);

  // Handle speaker button click - controls audio output
  const handleSpeakerClick = () => {
    const newSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(newSpeakerState);
    setAudioMuted(!newSpeakerState);
    
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
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.isRecording()) {
        recorderRef.current.cancelRecording();
      }
      
      stopCurrentAudio();
      
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
      }
    };
  }, [stopCurrentAudio]);

  // Play welcome message on first render - ONLY ONCE
  useEffect(() => {
    // Play welcome message after a short delay
    const welcomeTimer = setTimeout(async () => {
      if (firstMessagePlayed.current) {
        return;
      }
      
      const welcomeMessage = "أهلا بيك في وزارة التضامن الاجتماعي، معاك سلمى مساعدتك الذكية أنا هنا عشان اجاوبك على كل الاستفسارات. اضغط على زر الميكروفون واستمر بالضغط عليه وانت بتتكلم.";
      console.log("🤖 Welcome message:", welcomeMessage);
      addMessage(welcomeMessage, "assistant");
      
      // Convert text to speech
      if (isSpeakerOn) {
        console.log("🔊 Converting welcome message to audio...");
        const audioUrl = await textToSpeech(welcomeMessage, {
          onStart: () => setIsSpeaking(true),
          onEnd: () => {
            setIsSpeaking(false);
            console.log("👋 Welcome message finished");
          }
        });
        
        if (audioUrl) {
          setAudioSource(audioUrl);
          // Mark first message as played to prevent repeating
          firstMessagePlayed.current = true;
        } else {
          // If text-to-speech fails, mark as played
          firstMessagePlayed.current = true;
          handleAudioEnded();
        }
      } else {
        firstMessagePlayed.current = true;
        handleAudioEnded();
      }
    }, 500);
    
    return () => clearTimeout(welcomeTimer);
  }, [textToSpeech, addMessage, isSpeakerOn, handleAudioEnded]);

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
          isListening={isRecording}
          audioLevel={audioLevel}
        />
      </div>
      
      {/* Current transcript bar - under chin */}
      <div className="absolute bottom-32 left-0 right-0 z-20 px-4">
        <TranscriptBar 
          text={currentTranscript} 
          isActive={Boolean(currentTranscript)} 
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
      
      {/* Push to Talk and Call control buttons */}
      <div className="absolute bottom-4 left-0 right-0 z-30">
        <div className="flex items-center justify-center space-x-5 rtl:space-x-reverse">
          {/* Push to talk button (bigger, in center) */}
          <div className="relative flex-1 flex justify-center">
            <PushToTalkButton 
              onStartRecording={handleStartRecording} 
              onStopRecording={() => handleStopRecording(false)}
              isRecording={isRecording}
              audioLevel={audioLevel}
              disabled={isAIThinking || processingUserInputRef.current}
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
        isMuted={audioMuted}
        volume={1.0}
      />
    </div>
  );
};

export default ActiveCallScreen;
