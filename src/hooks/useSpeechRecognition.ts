
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SpeechRecognitionOptions {
  onResult?: (text: string) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
  language?: string;
  onListeningChange?: (isListening: boolean) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
}

export const useSpeechRecognition = (options?: SpeechRecognitionOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const { toast } = useToast();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const { 
    onResult, 
    onError, 
    autoStart = false, 
    language = 'ar',
    onListeningChange,
    onProcessingChange
  } = options || {};

  // Update external listening state
  useEffect(() => {
    if (onListeningChange) {
      onListeningChange(isListening);
    }
  }, [isListening, onListeningChange]);

  // Update external processing state
  useEffect(() => {
    if (onProcessingChange) {
      onProcessingChange(isProcessing);
    }
  }, [isProcessing, onProcessingChange]);

  // تحليل مستوى الصوت
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // حساب متوسط قوة الصوت
    let sum = 0;
    for (const value of dataArray) {
      sum += value;
    }
    const avg = sum / dataArray.length;
    
    // تعديل المستوى من 0 إلى 1
    const normalizedLevel = Math.min(1, avg / 128);
    setAudioLevel(normalizedLevel);
    
    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  }, []);

  // تحويل الصوت إلى نص باستخدام Supabase Edge Function
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      
      console.log("🎤 بدء تحويل الصوت إلى نص...");
      
      // تحويل الصوت إلى قاعدة64
      const audioBase64 = await blobToBase64(audioBlob);
      
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: audioBase64 }
      });

      if (error) {
        console.error('❌ خطأ في تحويل الصوت إلى نص:', error);
        setError('فشل في تحويل الصوت إلى نص');
        toast({
          title: "خطأ في التعرف على الصوت",
          description: error.message || "فشل في تحويل الصوت إلى نص",
          variant: "destructive",
        });
        if (onError) onError('فشل في تحويل الصوت إلى نص');
        return null;
      }

      if (data && data.text) {
        console.log("✅ تم تحويل الصوت إلى نص بنجاح:", data.text);
        if (data.text.trim()) {
          setTranscript(data.text);
          if (onResult) onResult(data.text);
          return data.text;
        } else {
          console.log("⚠️ تم استلام نص فارغ من خدمة التعرف على الكلام");
          toast({
            title: "لم نتمكن من سماعك",
            description: "الرجاء المحاولة مرة أخرى والتحدث بوضوح",
            variant: "default",
          });
        }
      } else {
        console.error('❌ لم يتم العثور على نص في الاستجابة');
        setError('لم يتم التعرف على أي كلام');
        toast({
          title: "لم نتمكن من فهم كلامك",
          description: "الرجاء المحاولة مرة أخرى",
          variant: "default",
        });
        if (onError) onError('لم يتم التعرف على أي كلام');
      }
      
      return null;
    } catch (err) {
      console.error('❌ خطأ في معالجة الصوت:', err);
      setError('حدث خطأ أثناء معالجة الصوت');
      toast({
        title: "خطأ في معالجة الصوت",
        description: "حدث خطأ أثناء تحويل الصوت إلى نص",
        variant: "destructive",
      });
      if (onError) onError('حدث خطأ أثناء معالجة الصوت');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  // تحويل Blob إلى Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // استخلاص البيانات من الـ data URL
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // تنظيف الموارد
  const cleanupResources = useCallback(() => {
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
      } catch (e) {
        console.error('Error stopping media recorder:', e);
      }
    }
    
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      } catch (e) {
        console.error('Error stopping media tracks:', e);
      }
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
        audioContextRef.current = null;
        analyserRef.current = null;
      } catch (e) {
        console.error('Error closing audio context:', e);
      }
    }

    audioChunksRef.current = [];
    setAudioLevel(0);
  }, []);

  // بدء الاستماع للميكروفون
  const startListening = useCallback(async () => {
    try {
      // تنظيف أي موارد سابقة أولاً
      cleanupResources();
      
      setError(null);
      audioChunksRef.current = [];

      console.log("🎤 طلب إذن الوصول إلى الميكروفون...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;
      console.log("✅ تم الحصول على إذن الوصول إلى الميكروفون");
      
      // إنشاء AudioContext لتحليل مستوى الصوت
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      // إنشاء AnalyserNode لقياس مستوى الصوت
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      
      // توصيل مصدر الصوت بالمحلل
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      // بدء تحليل مستوى الصوت
      analyzeAudio();
      
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.onstart = () => {
        console.log("🎤 بدأ التسجيل الصوتي");
        audioChunksRef.current = [];
        setIsListening(true);
      };
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log("🎤 توقف التسجيل الصوتي، جاري معالجة البيانات...");
        setIsListening(false);
        
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log("✅ تم إنشاء ملف صوتي بحجم:", audioBlob.size, "بايت");
          if (audioBlob.size > 1000) { // Only process if there's actually audio data
            await transcribeAudio(audioBlob);
          } else {
            console.log("⚠️ الملف الصوتي صغير جدًا، يبدو أنه لم يتم التقاط أي صوت");
            toast({
              title: "لم نتمكن من سماعك",
              description: "الرجاء المحاولة مرة أخرى والتحدث بوضوح",
            });
          }
        } else {
          console.log("⚠️ لم يتم التقاط أي بيانات صوتية");
          toast({
            title: "لم يتم التقاط أي صوت",
            description: "الرجاء التأكد من أن الميكروفون يعمل بشكل صحيح",
            variant: "default",
          });
        }
        
        // تنظيف الموارد بعد الاستخدام
        cleanupResources();
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('❌ خطأ في التسجيل الصوتي:', event);
        setError('حدث خطأ أثناء التسجيل الصوتي');
        setIsListening(false);
        cleanupResources();
      };
      
      mediaRecorder.start();
      
    } catch (err) {
      console.error('❌ خطأ في الوصول إلى الميكروفون:', err);
      setError('لا يمكن الوصول إلى الميكروفون');
      setIsListening(false);
      toast({
        title: "خطأ في الوصول إلى الميكروفون",
        description: "الرجاء السماح بالوصول إلى الميكروفون في إعدادات المتصفح",
        variant: "destructive",
      });
      if (onError) onError('لا يمكن الوصول إلى الميكروفون');
      cleanupResources();
    }
  }, [cleanupResources, onError, toast, analyzeAudio]);

  // إيقاف الاستماع
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      console.log("🛑 إيقاف التسجيل الصوتي");
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("❌ خطأ في إيقاف التسجيل الصوتي:", err);
        setIsListening(false);
        cleanupResources();
      }
    }
  }, [isListening, cleanupResources]);

  // بدء الاستماع تلقائيًا إذا كان مطلوبًا
  useEffect(() => {
    if (autoStart) {
      console.log("🔄 بدء التسجيل التلقائي");
      startListening();
    }
    
    return () => {
      cleanupResources();
    };
  }, [autoStart, startListening, cleanupResources]);

  return {
    isListening,
    startListening,
    stopListening,
    transcript,
    error,
    isProcessing,
    audioLevel,
    resetTranscript: () => setTranscript('')
  };
};
