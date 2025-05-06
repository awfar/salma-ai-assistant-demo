
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SoundWave from "@/components/SoundWave";
import CallButton from "@/components/CallButton";
import AudioPlayer from "@/components/AudioPlayer";
import CallTimer from "@/components/CallTimer";
import { useToast } from "@/hooks/use-toast";
import AvatarAnimation from "@/components/AvatarAnimation";
import { Settings, Volume2, Volume } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useAIAssistant } from "@/hooks/useAIAssistant";
import ChatBubble from "@/components/ChatBubble";
import TranscriptBar from "@/components/TranscriptBar";
import SuggestedQuestions from "@/components/SuggestedQuestions";

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

const AICallDemo = () => {
  const navigate = useNavigate();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioSource, setAudioSource] = useState<string | undefined>();
  const [callActive, setCallActive] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date>(new Date());
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [isSpeakerOn, setIsSpeakerOn] = useState(true); // إضافة حالة لمكبر الصوت
  const { toast } = useToast();
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioControllerRef = useRef<{ pause: () => void, isPlaying: boolean } | null>(null);
  const firstMessagePlayed = useRef(false);
  
  // الأسئلة المقترحة
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    "ما هو موعد صرف المعاش؟",
    "ما هي شروط تكافل وكرامة؟",
    "كيف أُحدث بياناتي؟",
    "ما هي المستندات المطلوبة للتقديم؟",
    "كيف يمكنني الاستعلام عن معاشي؟",
    "أين أقرب فرع لوزارة التضامن؟"
  ]);

  // الحصول على المساعد الذكي
  const { askAssistant, textToSpeech, isLoading: isAIThinking } = useAIAssistant();
  
  // التعرف على الكلام
  const { 
    isListening,
    startListening,
    stopListening,
    transcript,
    isProcessing: isTranscribing,
    error: speechError
  } = useSpeechRecognition({
    onResult: handleTranscriptResult
  });
  
  // إضافة رسالة جديدة
  const addMessage = (text: string, sender: "user" | "assistant") => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date()
    };
    
    setMessages(prevMessages => [...prevMessages, newMessage]);
    
    // تحديث النص الحالي في شريط الترجمة
    setCurrentTranscript(text);
  };

  // معالجة نتيجة التعرف على الكلام
  async function handleTranscriptResult(text: string) {
    if (!text.trim()) return;
    
    // إضافة رسالة المستخدم
    addMessage(text.trim(), "user");
    
    // الحصول على رد من المساعد الذكي
    const aiResponse = await askAssistant(text.trim());
    
    if (aiResponse) {
      // إضافة رد المساعد
      addMessage(aiResponse, "assistant");
      
      // تحويل النص إلى كلام
      const audioUrl = await textToSpeech(aiResponse);
      if (audioUrl && callActive && !isMuted) {
        setIsSpeaking(true);
        setAudioSource(audioUrl);
      }
    }
  }

  // معالجة اختيار سؤال مقترح
  const handleQuestionSelect = async (question: string) => {
    if (!callActive || isSpeaking || isTranscribing || isAIThinking) return;
    
    // إضافة السؤال كرسالة مستخدم
    addMessage(question, "user");
    
    // الحصول على رد من المساعد الذكي
    const aiResponse = await askAssistant(question);
    
    if (aiResponse) {
      // إضافة رد المساعد
      addMessage(aiResponse, "assistant");
      
      // تحويل النص إلى كلام
      const audioUrl = await textToSpeech(aiResponse);
      if (audioUrl && callActive && !isMuted) {
        setIsSpeaking(true);
        setAudioSource(audioUrl);
      }
    }
  };

  // تحريك لأسفل عند إضافة رسائل جديدة
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // بدء المكالمة مع الترحيب الأولي
  const handleStartCallClick = async () => {
    // طلب إذن الميكروفون قبل بدء المكالمة
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setCallActive(true);
      setCallStartTime(new Date());
      
      toast({
        title: "بدء المكالمة",
        description: "تم الاتصال بالمساعد الذكي سلمى",
        duration: 2000,
      });
      
      // تشغيل الرسالة الترحيبية بعد فترة قصيرة
      setTimeout(async () => {
        const welcomeMessage = "مرحباً، أنا سلمى من وزارة التضامن الاجتماعي. كيف يمكنني مساعدتك اليوم؟";
        addMessage(welcomeMessage, "assistant");
        
        // تحويل النص إلى صوت
        const audioUrl = await textToSpeech(welcomeMessage);
        if (audioUrl && callActive && !isMuted) {
          setIsSpeaking(true);
          setAudioSource(audioUrl);
          firstMessagePlayed.current = true;
        }
      }, 500);
      
    } catch (err) {
      console.error("خطأ في الوصول إلى الميكروفون:", err);
      toast({
        title: "خطأ في الوصول إلى الميكروفون",
        description: "يرجى السماح بالوصول إلى الميكروفون لاستخدام المساعد الذكي",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // عند انتهاء الصوت، ابدأ الاستماع تلقائيًا
  const handleAudioEnded = useCallback(() => {
    setIsSpeaking(false);
    setCurrentTranscript(""); // إزالة النص من شريط الترجمة
    
    if (callActive && !isMuted && firstMessagePlayed.current) {
      // تأخير قصير قبل بدء الاستماع
      setTimeout(() => {
        if (callActive && !isListening && !isTranscribing && !isAIThinking) {
          startListening();
        }
      }, 300);
    }
  }, [callActive, isMuted, isListening, isTranscribing, isAIThinking, startListening]);

  // إيقاف الصوت الحالي
  const stopCurrentAudio = useCallback(() => {
    if (audioControllerRef.current) {
      audioControllerRef.current.pause();
    }
    setIsSpeaking(false);
  }, []);

  // إيقاف الاستماع عند إيقاف المكالمة
  useEffect(() => {
    if (!callActive) {
      if (isListening) {
        stopListening();
      }
      stopCurrentAudio();
    }
  }, [callActive, isListening, stopListening, stopCurrentAudio]);

  // إعادة إعداد الحالة عند تغيير حالة المكالمة
  useEffect(() => {
    if (!callActive) {
      firstMessagePlayed.current = false;
      setMessages([]);
      setCurrentTranscript("");
    }
  }, [callActive]);

  // إيقاف الاستماع إذا كان هناك تفكير من AI أو تحدث
  useEffect(() => {
    if ((isAIThinking || isSpeaking) && isListening) {
      stopListening();
    }
  }, [isAIThinking, isSpeaking, isListening, stopListening]);

  // معالجة النقر على زر كتم الصوت
  const handleMuteClick = () => {
    setIsMuted(!isMuted);
    
    // إذا تم الكتم، إيقاف الصوت الحالي
    if (!isMuted) {
      stopCurrentAudio();
    }
    
    toast({
      title: isMuted ? "تم تشغيل الميكروفون" : "تم كتم الميكروفون",
      duration: 2000,
    });
    
    // إذا تم إلغاء الكتم وليس هناك صوت يعمل، ابدأ الاستماع
    if (isMuted && callActive && !isSpeaking && !isListening && !isTranscribing && !isAIThinking) {
      setTimeout(() => {
        startListening();
      }, 300);
    }
  };

  // معالجة النقر على زر مكبر الصوت
  const handleSpeakerClick = () => {
    setIsSpeakerOn(!isSpeakerOn);
    toast({
      title: isSpeakerOn ? "تم تشغيل مكبر الصوت" : "تم إيقاف مكبر الصوت",
      duration: 2000,
    });
    
    // هنا يمكن إضافة منطق للتحكم في مستوى الصوت إذا لزم الأمر
  };

  // إنهاء المكالمة
  const handleEndCallClick = () => {
    if (isListening) {
      stopListening();
    }
    stopCurrentAudio();
    setCallActive(false);
    
    toast({
      title: "تم إنهاء المكالمة",
      description: "شكراً لاستخدامك خدمة سلمى المساعد الذكي",
      duration: 3000,
    });
  };

  // فتح صفحة الإعدادات
  const handleSettingsClick = () => {
    navigate('/ai-settings');
  };

  // إعداد مرجع للتحكم في مشغل الصوت
  const setupAudioController = useCallback((controller: { pause: () => void, isPlaying: boolean } | null) => {
    audioControllerRef.current = controller;
  }, []);

  // إعادة المحاولة عند وجود خطأ في التعرف على الصوت
  useEffect(() => {
    if (speechError && callActive && !isSpeaking && !isListening && !isTranscribing) {
      console.log("محاولة إعادة تشغيل الميكروفون بعد الخطأ:", speechError);
      setTimeout(() => {
        startListening();
      }, 1000);
    }
  }, [speechError, callActive, isSpeaking, isListening, isTranscribing, startListening]);

  return (
    <div className="flex flex-col min-h-screen bg-ministry-light">
      {/* شعار الوزارة كامل */}
      <div className="w-full flex justify-between items-center p-4 bg-white/80 shadow-sm">
        <div className="flex items-center gap-3 rtl:flex-row-reverse">
          <img 
            src="/lovable-uploads/59b69e9d-ca94-459f-af37-2c5626365a98.png" 
            alt="وزارة التضامن الاجتماعي" 
            className="h-16 w-auto"
          />
          <h1 className="text-xl md:text-2xl font-bold text-ministry-dark">وزارة التضامن الاجتماعي</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSettingsClick}
            className="flex items-center gap-1"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">الإعدادات</span>
          </Button>
          <div className="bg-gray-800 text-white px-3 py-1 rounded-md text-sm">
            <p>Salma AI Demo</p>
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col md:flex-row relative w-full max-w-7xl mx-auto">
        {/* الشاشة الرئيسية */}
        <div className="flex-1 flex flex-col items-center justify-center md:p-6">
          {!callActive ? (
            // شاشة بدء الاتصال
            <div className="relative w-full max-w-md mx-auto p-8 text-center">
              <h2 className="text-2xl font-bold mb-6">اتصل بالمساعد الذكي سلمى</h2>
              <p className="mb-10 text-gray-600">
                انقر على زر الاتصال للتحدث مع المساعد الذكي سلمى والحصول على المساعدة في خدمات وزارة التضامن الاجتماعي
              </p>
              
              <div className="flex justify-center mb-8 overflow-hidden rounded-full border-4 border-ministry-green" style={{width: '140px', height: '140px', margin: '0 auto'}}>
                <img 
                  src="/lovable-uploads/498da759-9d56-403c-b889-7a34fa5734e5.png" 
                  alt="سلمى المساعد الافتراضي" 
                  className="w-full h-full object-cover object-top"
                />
              </div>
              
              <div className="flex justify-center">
                <CallButton 
                  type="start_call" 
                  onClick={handleStartCallClick} 
                  className="p-6" 
                />
              </div>
            </div>
          ) : (
            // شاشة المكالمة النشطة - بتصميم مشابه لمكالمات iPhone
            <div className="relative w-full max-w-md mx-auto aspect-[9/16] md:aspect-auto md:h-[80vh] overflow-hidden rounded-2xl md:rounded-3xl bg-black shadow-xl border-8 border-gray-800 flex flex-col">
              {/* خلفية المكالمة - تحديثها لتكون أكثر شبهاً بمكالمة iPhone */}
              <div className="absolute inset-0 bg-gradient-to-b from-ministry-dark to-black/90"></div>
              
              {/* شريط الحالة أعلى الشاشة - نمط iPhone */}
              <div className="absolute top-0 left-0 right-0 h-12 bg-black/30 backdrop-blur-lg flex items-center justify-center z-10">
                <CallTimer isActive={callActive} startTime={callStartTime} className="text-white font-bold" />
              </div>
              
              {/* منطقة المحادثة - مخفية في واجهة المكالمة، تستخدم فقط للتتبع الداخلي */}
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
              
              {/* الشخصية المتحركة - محاذاة مركز الشاشة */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <AvatarAnimation 
                  isActive={isSpeaking} 
                  isListening={!isSpeaking && isListening && callActive} 
                />
              </div>
              
              {/* شريط النص الحالي (Transcript) - تحت الذقن مباشرة */}
              <div className="absolute bottom-32 left-0 right-0 z-20 px-4">
                <TranscriptBar 
                  text={currentTranscript} 
                  isActive={isSpeaking || isListening} 
                />
              </div>
              
              {/* شريط الأسئلة المقترحة */}
              <div className="absolute bottom-20 left-0 right-0 z-20 px-2">
                <SuggestedQuestions 
                  questions={suggestedQuestions} 
                  onQuestionSelect={handleQuestionSelect} 
                />
              </div>
              
              {/* مؤشرات الحالة */}
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
              
              {/* أزرار التحكم بالمكالمة - نمط iOS */}
              <div className="absolute bottom-4 left-0 right-0 z-30">
                <div className="flex items-center justify-center space-x-5 rtl:space-x-reverse">
                  <CallButton 
                    type="mute" 
                    onClick={handleMuteClick} 
                    active={isMuted}
                  />
                  <CallButton 
                    type="end_call" 
                    onClick={handleEndCallClick} 
                    className="p-5" 
                  />
                  {/* إضافة زر التحكم في الصوت */}
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
                    
                    {/* تأثير نبض عند التفعيل */}
                    {isSpeakerOn && (
                      <span className="absolute inset-0 rounded-full bg-ministry-green animate-ping opacity-25"></span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* تذييل */}
      <div className="w-full text-center py-4">
        <p className="text-gray-600 text-sm">
          سلمى - الموظفة الذكية من وزارة التضامن © 2025
        </p>
      </div>

      {/* مشغل الصوت (مخفي) */}
      <AudioPlayer 
        audioSource={audioSource} 
        autoPlay={!isMuted && callActive} 
        onEnded={handleAudioEnded}
        ref={setupAudioController}
      />
    </div>
  );
};

export default AICallDemo;
