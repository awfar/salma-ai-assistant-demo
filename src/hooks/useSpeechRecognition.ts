
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { setupAudioLevelAnalysis } from '@/utils/audioUtils';
import { speechTranscriptionService } from '@/services/speechTranscriptionService';
import { MediaRecorderManager } from '@/utils/mediaRecorderManager';

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
  
  const recorderManagerRef = useRef(new MediaRecorderManager());
  const audioAnalysisRef = useRef(setupAudioLevelAnalysis());
  
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

  // Process recorded audio
  const processRecordedAudio = useCallback(async () => {
    console.log("🎤 توقف التسجيل الصوتي، جاري معالجة البيانات...");
    setIsListening(false);
    
    const audioBlob = recorderManagerRef.current.getAudioBlob();
    
    if (!audioBlob) {
      console.log("⚠️ لم يتم التقاط أي بيانات صوتية");
      toast({
        title: "لم يتم التقاط أي صوت",
        description: "الرجاء التأكد من أن الميكروفون يعمل بشكل صحيح",
        variant: "default",
      });
      return;
    }
    
    console.log("✅ تم إنشاء ملف صوتي بحجم:", audioBlob.size, "بايت");
    if (audioBlob.size > 1000) { // Only process if there's actually audio data
      try {
        setIsProcessing(true);
        const text = await speechTranscriptionService.transcribeAudio(audioBlob);
        setIsProcessing(false);
        
        if (text) {
          setTranscript(text);
          if (onResult) onResult(text);
        } else {
          toast({
            title: "لم نتمكن من سماعك",
            description: "الرجاء المحاولة مرة أخرى والتحدث بوضوح",
            variant: "default",
          });
        }
      } catch (err) {
        setIsProcessing(false);
        setError('حدث خطأ أثناء معالجة الصوت');
        toast({
          title: "خطأ في معالجة الصوت",
          description: "حدث خطأ أثناء تحويل الصوت إلى نص",
          variant: "destructive",
        });
        if (onError) onError('حدث خطأ أثناء معالجة الصوت');
      }
    } else {
      console.log("⚠️ الملف الصوتي صغير جدًا، يبدو أنه لم يتم التقاط أي صوت");
      toast({
        title: "لم نتمكن من سماعك",
        description: "الرجاء المحاولة مرة أخرى والتحدث بوضوح",
      });
    }
  }, [onResult, onError, toast]);

  // Clean up resources
  const cleanupResources = useCallback(() => {
    recorderManagerRef.current.cleanup();
    audioAnalysisRef.current.cleanup();
    setAudioLevel(0);
  }, []);

  // Start listening to microphone
  const startListening = useCallback(async () => {
    try {
      // Clean up any previous resources
      cleanupResources();
      
      setError(null);
      
      // Set up new media recorder
      const stream = await recorderManagerRef.current.setupMediaRecorder();
      
      // Initialize audio analyzer
      const { analyzeAudio } = audioAnalysisRef.current;
      audioAnalysisRef.current.initializeAnalyzer(stream);
      
      // Start analyzing audio levels
      analyzeAudio(setAudioLevel);
      
      // Create and configure media recorder
      recorderManagerRef.current.createMediaRecorder(
        stream,
        // onStart
        () => {
          console.log("🎤 بدأ التسجيل الصوتي");
          setIsListening(true);
        },
        // onDataAvailable
        () => {},
        // onStop
        processRecordedAudio,
        // onError
        (event) => {
          console.error('❌ خطأ في التسجيل الصوتي:', event);
          setError('حدث خطأ أثناء التسجيل الصوتي');
          setIsListening(false);
          cleanupResources();
        }
      );
      
      // Start recording
      recorderManagerRef.current.startRecording();
      
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
  }, [cleanupResources, onError, toast, processRecordedAudio]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (isListening) {
      console.log("🛑 إيقاف التسجيل الصوتي");
      try {
        recorderManagerRef.current.stopRecording();
      } catch (err) {
        console.error("❌ خطأ في إيقاف التسجيل الصوتي:", err);
        setIsListening(false);
        cleanupResources();
      }
    }
  }, [isListening, cleanupResources]);

  // Auto-start if requested
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
