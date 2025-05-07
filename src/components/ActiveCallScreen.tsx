
import React, { useState, useRef, useCallback, useEffect } from "react";
import AvatarAnimation from "@/components/AvatarAnimation";
import ChatBubble from "@/components/ChatBubble";
import TranscriptBar from "@/components/TranscriptBar";
import SuggestedQuestions from "@/components/SuggestedQuestions";
import AudioPlayer from "@/components/AudioPlayer";
import ErrorMessage from "@/components/ErrorMessage";
import CallControls from "@/components/CallControls";
import CallStatus from "@/components/CallStatus";
import WelcomeEffectHandler from "@/components/WelcomeEffectHandler";
import { useAIAssistant } from "@/hooks/useAIAssistant";
import { useToast } from "@/hooks/use-toast";
import { useCallMessages } from "@/hooks/useCallMessages";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";

interface ActiveCallScreenProps {
  callStartTime: Date;
  onEndCall: () => void;
}

const ActiveCallScreen: React.FC<ActiveCallScreenProps> = ({ 
  callStartTime, 
  onEndCall 
}) => {
  // State
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [showErrorMessage, setShowErrorMessage] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [useStreamingAudio, setUseStreamingAudio] = useState<boolean>(true);
  const { toast } = useToast();
  
  // References
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const processingUserInputRef = useRef<boolean>(false);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // The AI assistant hook
  const { 
    askAssistant, 
    cancelRequest,
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

  // Show error message with auto-dismiss
  const showError = useCallback((message: string, duration: number = 5000) => {
    setErrorMessage(message);
    setShowErrorMessage(true);
    
    // Clear any existing timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    
    // Auto-dismiss after duration
    errorTimeoutRef.current = setTimeout(() => {
      setShowErrorMessage(false);
      setErrorMessage("");
      errorTimeoutRef.current = null;
    }, duration);
  }, []);
  
  // Audio playback hook
  const handleAudioEnded = useCallback(() => {
    setCurrentTranscript(""); // Clear transcript bar text
  }, []);
  
  const { 
    isSpeaking, 
    audioSource, 
    audioStreamRef,
    setupAudioController,
    stopCurrentAudio,
    playTextAsAudio
  } = useAudioPlayback({
    onAudioEnd: handleAudioEnded,
    isSpeakerOn,
    audioMuted
  });

  // Process user input from voice recording or text
  const processUserInput = useCallback(async (text: string) => {
    if (!text.trim() || processingUserInputRef.current) return;
    
    try {
      console.log("🔄 معالجة مدخلات المستخدم:", text);
      processingUserInputRef.current = true;
      
      // Stop any current audio
      stopCurrentAudio();
      
      // Cancel any pending requests
      cancelRequest?.();
      
      // Hide any error messages
      setShowErrorMessage(false);
      
      // Show current transcript
      setCurrentTranscript(text.trim());
      
      // Add user message
      console.log("👤 رسالة المستخدم:", text.trim());
      addMessage(text.trim(), "user");
      
      // Get response from AI assistant
      console.log("🤖 إرسال الطلب إلى المساعد الذكي...");
      const aiResponse = await askAssistant(text.trim());
      
      if (aiResponse) {
        console.log("🤖 تم استلام الرد من المساعد الذكي:", aiResponse);
        
        // Add assistant response
        addMessage(aiResponse, "assistant");
        
        // Convert text to speech
        if (!audioMuted && isSpeakerOn) {
          await playTextAsAudio(aiResponse, useStreamingAudio);
        } else {
          // If sound is disabled, skip audio phase
          console.log("🔇 تخطي تشغيل الصوت (مكتوم أو غير نشط)");
          handleAudioEnded();
        }
      } else {
        console.error("❌ لا يوجد رد من المساعد الذكي");
        toast({
          title: "خطأ في الحصول على الرد",
          description: "لم نتمكن من الحصول على رد من المساعد الذكي. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        });
        handleAudioEnded();
      }
    } catch (error) {
      console.error("❌ خطأ في معالجة المدخلات:", error);
      toast({
        title: "خطأ في معالجة المدخلات",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
      handleAudioEnded();
    } finally {
      processingUserInputRef.current = false;
    }
  }, [addMessage, askAssistant, audioMuted, cancelRequest, handleAudioEnded, isSpeakerOn, playTextAsAudio, stopCurrentAudio, toast, useStreamingAudio]);

  // Audio recording hook
  const { 
    isRecording, 
    audioLevel, 
    startRecording, 
    stopRecording,
    recorderRef
  } = useAudioRecording({
    onTranscriptReady: processUserInput,
    onTranscriptChange: setCurrentTranscript
  });

  // Handle suggested question selection
  const handleQuestionSelect = useCallback((question: string) => {
    console.log("🖱️ تم النقر على سؤال سريع:", question);
    if (isSpeaking) {
      console.log("🛑 إيقاف كلام المساعد الذكي لمعالجة السؤال");
      stopCurrentAudio();
    }
    
    if (isRecording) {
      console.log("🛑 إيقاف التسجيل لمعالجة السؤال");
      recorderRef.current?.cancelRecording();
    }
    
    // إضافة تأخير قصير للتأكد من إعادة ضبط كل شيء
    setTimeout(() => {
      processUserInput(question);
    }, 200);
  }, [isSpeaking, isRecording, stopCurrentAudio, recorderRef, processUserInput]);

  // Handle speaker button click - controls audio output
  const handleSpeakerClick = useCallback(() => {
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
  }, [handleAudioEnded, isSpeakerOn, isSpeaking, stopCurrentAudio, toast]);

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
      cancelRequest?.();
      
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [stopCurrentAudio, cancelRequest]);

  // Handle start recording with pre-actions
  const handleStartRecording = useCallback(async () => {
    // If we're already processing or speaking, stop first
    if (processingUserInputRef.current || isSpeaking) {
      console.log("🛑 إيقاف العمليات الجارية قبل البدء في التسجيل الجديد");
      stopCurrentAudio();
      cancelRequest?.();
      // Give a moment for cleanup before starting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Hide any error messages
    setShowErrorMessage(false);
    
    // Start recording
    await startRecording();
  }, [cancelRequest, isSpeaking, startRecording, stopCurrentAudio]);

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[9/16] md:aspect-auto md:h-[80vh] overflow-hidden rounded-2xl md:rounded-3xl bg-black shadow-xl border-8 border-gray-800 flex flex-col">
      {/* Call background */}
      <div className="absolute inset-0 bg-gradient-to-b from-ministry-dark to-black/90"></div>
      
      {/* Status bar and indicators */}
      <CallStatus 
        callStartTime={callStartTime}
        isAIThinking={isAIThinking}
        isAudioLoading={isAudioLoading}
      />
      
      {/* Error message display */}
      <ErrorMessage 
        showError={showErrorMessage}
        errorMessage={errorMessage}
      />
      
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
      
      {/* Call controls (push to talk, speaker, end call) */}
      <CallControls 
        isSpeakerOn={isSpeakerOn}
        isRecording={isRecording}
        audioLevel={audioLevel}
        processingUserInput={processingUserInputRef.current}
        isAIThinking={isAIThinking}
        onSpeakerToggle={handleSpeakerClick}
        onStartRecording={handleStartRecording}
        onStopRecording={() => stopRecording(false)}
        onEndCall={onEndCall}
      />
      
      {/* Welcome message handler */}
      <WelcomeEffectHandler
        isSpeakerOn={isSpeakerOn}
        playTextAsAudio={playTextAsAudio}
        useStreamingAudio={useStreamingAudio}
      />
      
      {/* Hidden audio player with updated muting control */}
      <AudioPlayer 
        audioSource={audioSource}
        audioStream={audioStreamRef.current}
        autoPlay={Boolean(audioSource && isSpeakerOn)}
        onEnded={handleAudioEnded}
        onPlay={() => {
          console.log("🎵 بدأ تشغيل الصوت");
        }}
        onError={(e) => {
          console.error("❌ خطأ في تشغيل الصوت:", e);
          handleAudioEnded();
        }}
        ref={setupAudioController}
        isMuted={audioMuted}
        volume={1.0}
        useStreaming={useStreamingAudio}
      />
    </div>
  );
};

export default ActiveCallScreen;
