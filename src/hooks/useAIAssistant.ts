
import { useState, useCallback, useRef, useEffect } from "react";
import { useToast } from "./use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TextToSpeechCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onChunk?: (chunk: ArrayBuffer) => void;
  onStreamStart?: (mediaSource: MediaSource | AudioBufferSourceNode) => void;
}

interface UseAIAssistantReturn {
  askAssistant: (question: string) => Promise<string | null>;
  textToSpeech: (text: string, callbacks?: TextToSpeechCallbacks) => Promise<string | null>;
  streamToSpeech: (text: string, callbacks?: TextToSpeechCallbacks) => Promise<void>;
  isLoading: boolean;
  isAudioLoading: boolean;
  cancelRequest?: () => void;
}

export const useAIAssistant = (): UseAIAssistantReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Initialize AudioContext
  useEffect(() => {
    // Defer creating AudioContext until there's user interaction
    const initAudioContext = () => {
      try {
        if (!audioContextRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContextClass();
          console.log("✅ AudioContext successfully created");
        }
      } catch (err) {
        console.error("❌ Failed to create AudioContext:", err);
      }
    };

    // Add event handlers for user interaction
    const handleUserInteraction = () => {
      initAudioContext();
      
      // If AudioContext is suspended, resume it
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }
    };

    // Add handlers for various events that indicate user interaction
    window.addEventListener("click", handleUserInteraction, { once: true });
    window.addEventListener("touchstart", handleUserInteraction, { once: true });
    window.addEventListener("keydown", handleUserInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      
      // Clean up AudioContext when component unmounts
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => {
          console.error("❌ Error closing AudioContext:", err);
        });
      }
    };
  }, []);
  
  // Cancel any in-progress requests
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      console.log("🛑 Canceling in-progress request");
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsAudioLoading(false);
    }
  }, []);
  
  // Ask the AI assistant
  const askAssistant = useCallback(async (question: string): Promise<string | null> => {
    // Cancel any existing request
    cancelRequest();
    
    // Create a new abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      setIsLoading(true);
      
      console.log("🤖 Sending question to AI assistant:", question);
      
      // Use the AI assistant Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { userMessage: question }
      });
      
      if (error) {
        console.error("Error asking assistant:", error);
        throw new Error(error.message);
      }
      
      if (!data || !data.response) {
        console.error("No response received from AI assistant");
        throw new Error("Could not get a response from the AI assistant");
      }
      
      console.log("✅ Received response from AI assistant:", data.response.substring(0, 50) + "...");
      
      return data.response;
    } catch (error) {
      console.error("Error asking assistant:", error);
      
      if (error instanceof Error && error.name === "AbortError") {
        console.log("🛑 Request was canceled");
        return null;
      }
      
      toast({
        title: "Connection Error",
        description: "Could not connect to the AI assistant. Please try again.",
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast, cancelRequest]);
  
  // New method to stream audio directly from ElevenLabs
  const streamToSpeech = useCallback(async (text: string, callbacks?: TextToSpeechCallbacks): Promise<void> => {
    if (!text.trim()) {
      console.error("❌ Text is empty, cannot convert to speech");
      return;
    }

    try {
      setIsAudioLoading(true);
      
      // Ensure we have an audio context
      if (!audioContextRef.current) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContextClass();
          console.log("✅ Created AudioContext for streaming audio playback");
        } catch (err) {
          console.error("❌ Failed to create AudioContext:", err);
          throw new Error("Cannot create audio context. Please check your browser supports Web Audio API.");
        }
      }

      // If AudioContext is suspended, resume it
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
        console.log("✅ Resumed AudioContext");
      }

      console.log("🔊 Starting text to speech streaming:", text.substring(0, 50) + "...");
      callbacks?.onStart?.();

      // Get the authentication session
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      // Get the Supabase project URL
      const { host, protocol } = window.location;
      const baseUrl = host.includes('localhost')
        ? `${protocol}//${host}`
        : `${protocol}//${host}`;
      
      const endpoint = `${baseUrl}/functions/v1/text-to-speech`;
      
      console.log("🔄 Calling text-to-speech endpoint at:", endpoint);

      // Prepare headers with authentication if available
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          text, 
          stream: true
        })
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(`Failed to stream text to speech: ${response.status} ${errorText}`);
      }

      console.log("✅ Started receiving audio stream from server");

      // Create a reader for the stream
      const reader = response.body.getReader();
      
      // Process the audio chunks
      const processingAudio = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log("✅ Audio stream complete");
              break;
            }
            
            // Process the audio chunk and play it
            if (audioContextRef.current && value) {
              try {
                // Decode the audio data
                const audioBuffer = await audioContextRef.current.decodeAudioData(value.buffer.slice(0));
                
                // Create a buffer source
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);
                
                // Notify that we're starting to stream audio
                if (callbacks?.onStreamStart) {
                  callbacks.onStreamStart(source);
                }
                
                // Play the audio
                source.start(0);
                
                // Wait for this chunk to finish playing
                await new Promise<void>((resolve) => {
                  source.onended = () => resolve();
                });
                
                // Notify about the chunk
                if (callbacks?.onChunk) {
                  callbacks.onChunk(value.buffer);
                }
              } catch (decodeError) {
                console.error("❌ Error decoding audio chunk:", decodeError);
              }
            }
          }
          
          // Audio stream complete
          callbacks?.onEnd?.();
        } catch (error) {
          console.error("❌ Error processing audio stream:", error);
          callbacks?.onEnd?.();
        } finally {
          setIsAudioLoading(false);
        }
      };
      
      // Start processing audio
      processingAudio();
      
      return;
    } catch (error) {
      console.error("❌ Error in text-to-speech streaming:", error);
      setIsAudioLoading(false);
      callbacks?.onEnd?.();
      
      toast({
        title: "Error Converting Text to Speech",
        description: error instanceof Error ? error.message : "An error occurred while converting text to speech",
        variant: "destructive",
      });
    }
  }, [toast]);
  
  // Convert text to speech (old method for compatibility)
  const textToSpeech = useCallback(async (text: string, callbacks?: TextToSpeechCallbacks): Promise<string | null> => {
    try {
      setIsAudioLoading(true);
      
      // Create a new abort controller
      if (!abortControllerRef.current) {
        abortControllerRef.current = new AbortController();
      }
      
      console.log("🔊 Converting text to speech:", text.substring(0, 50) + "...");
      
      // Call the text-to-speech Edge Function
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, stream: false }
      });
      
      if (error || !data) {
        console.error("Error in text-to-speech:", error || "No data returned");
        throw new Error(error?.message || "Failed to convert text to speech");
      }
      
      if (!data.audio) {
        console.error("No audio data returned");
        throw new Error("No audio data returned");
      }
      
      console.log("✅ Successfully received audio data. Data length:", data.audio.length);
      
      // Create audio URL from base64
      const audioUrl = `data:audio/mp3;base64,${data.audio}`;
      console.log("✅ Successfully converted text to speech and created audio URL");
      
      // Validate audio data before returning
      if (!isValidBase64(data.audio)) {
        console.error("❌ Received audio data is not valid base64 format");
        throw new Error("Invalid audio data");
      }
      
      // Test preloading the audio
      try {
        const preloadAudio = new Audio();
        preloadAudio.src = audioUrl;
        
        // Set a temporary listener to make sure the audio can play
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Audio loading timeout"));
          }, 3000);
          
          preloadAudio.oncanplaythrough = () => {
            clearTimeout(timeout);
            resolve();
          };
          
          preloadAudio.onerror = (e) => {
            clearTimeout(timeout);
            reject(new Error(`Audio loading failed: ${e}`));
          };
          
          // Preload
          preloadAudio.load();
        });
        
        // Successfully loaded
        console.log("✅ Validated audio file is playable");
      } catch (preloadError) {
        console.error("❌ Audio preload test failed:", preloadError);
        // Continue despite the error, but log it
      }
      
      // Callback for start of synthesis
      callbacks?.onStart && callbacks.onStart();
      
      return audioUrl;
    } catch (error) {
      console.error("Error in text-to-speech:", error);
      toast({
        title: "Error Converting Text to Speech",
        description: "Could not convert the response to speech. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsAudioLoading(false);
      // The onEnd callback will be handled when the audio actually plays and ends
      // Not here, as we're just returning the URL
    }
  }, [toast]);
  
  // Validate base64 data
  const isValidBase64 = (str: string): boolean => {
    try {
      // Check if string is empty
      if (!str || str.trim() === '') return false;
      
      // Check if length is appropriate for base64 (must be multiple of 4)
      if (str.length % 4 !== 0) return false;
      
      // Check if string contains only base64 characters
      return /^[A-Za-z0-9+/=]+$/.test(str);
    } catch (e) {
      return false;
    }
  };
  
  return { askAssistant, textToSpeech, streamToSpeech, isLoading, isAudioLoading, cancelRequest };
};
