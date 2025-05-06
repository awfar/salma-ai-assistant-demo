
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
      
      // تحويل الصوت إلى قاعدة64
      const audioBase64 = await blobToBase64(audioBlob);
      
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: audioBase64 }
      });

      if (error) {
        console.error('خطأ في تحويل الصوت إلى نص:', error);
        setError('فشل في تحويل الصوت إلى نص');
        if (onError) onError('فشل في تحويل الصوت إلى نص');
        return null;
      }

      if (data && data.text) {
        setTranscript(data.text);
        if (onResult) onResult(data.text);
        return data.text;
      }
      
      return null;
    } catch (err) {
      console.error('خطأ في معالجة الصوت:', err);
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

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.onstart = () => {
        audioChunksRef.current = [];
        setIsListening(true);
      };
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        setIsListening(false);
        
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await transcribeAudio(audioBlob);
        }
        
        // إغلاق جميع المسارات
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      
    } catch (err) {
      console.error('خطأ في الوصول إلى الميكروفون:', err);
      setError('لا يمكن الوصول إلى الميكروفون');
      setIsListening(false);
      if (onError) onError('لا يمكن الوصول إلى الميكروفون');
    }
  }, [onError, onResult]);

  // إيقاف الاستماع
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
    }
  }, [isListening]);

  // بدء الاستماع تلقائيًا إذا كان مطلوبًا
  useEffect(() => {
    if (autoStart) {
      startListening();
    }
    
    return () => {
      if (mediaRecorderRef.current && isListening) {
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
