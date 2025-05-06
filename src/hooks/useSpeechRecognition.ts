
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SpeechRecognitionOptions {
  onResult?: (text: string) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
  language?: string;
}

export const useSpeechRecognition = (options?: SpeechRecognitionOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const { onResult, onError, autoStart = false, language = 'ar' } = options || {};

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
        if (onError) onError('فشل في تحويل الصوت إلى نص');
        return null;
      }

      if (data && data.text) {
        console.log("✅ تم تحويل الصوت إلى نص بنجاح:", data.text);
        setTranscript(data.text);
        if (onResult) onResult(data.text);
        return data.text;
      } else {
        console.error('❌ لم يتم العثور على نص في الاستجابة');
        setError('لم يتم التعرف على أي كلام');
        if (onError) onError('لم يتم التعرف على أي كلام');
      }
      
      return null;
    } catch (err) {
      console.error('❌ خطأ في معالجة الصوت:', err);
      setError('حدث خطأ أثناء معالجة الصوت');
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

  // بدء الاستماع للميكروفون
  const startListening = useCallback(async () => {
    try {
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
      
      console.log("✅ تم الحصول على إذن الوصول إلى الميكروفون");
      
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
          await transcribeAudio(audioBlob);
        } else {
          console.log("⚠️ لم يتم التقاط أي بيانات صوتية");
        }
        
        // إغلاق جميع المسارات
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      
    } catch (err) {
      console.error('❌ خطأ في الوصول إلى الميكروفون:', err);
      setError('لا يمكن الوصول إلى الميكروفون');
      setIsListening(false);
      if (onError) onError('لا يمكن الوصول إلى الميكروفون');
    }
  }, [onError, onResult]);

  // إيقاف الاستماع
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      console.log("🛑 إيقاف التسجيل الصوتي");
      mediaRecorderRef.current.stop();
    }
  }, [isListening]);

  // بدء الاستماع تلقائيًا إذا كان مطلوبًا
  useEffect(() => {
    if (autoStart) {
      console.log("🔄 بدء التسجيل التلقائي");
      startListening();
    }
    
    return () => {
      if (mediaRecorderRef.current && isListening) {
        console.log("🧹 تنظيف مصادر التسجيل الصوتي");
        mediaRecorderRef.current.stop();
      }
    };
  }, [autoStart, startListening, isListening]);

  return {
    isListening,
    startListening,
    stopListening,
    transcript,
    error,
    isProcessing
  };
};
