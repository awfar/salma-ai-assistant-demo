
import { useState, useCallback, useRef, useEffect } from "react";
import { useToast } from "./use-toast";
import { supabase } from "@/integrations/supabase/client";
import { testAudioOutput } from "@/utils/audioUtils";

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
          console.log("🔊 Initializing AudioContext");
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContextClass();
          
          // Create and play a short silent sound to unlock audio on iOS/Safari
          const silentBuffer = audioContextRef.current.createBuffer(1, 1, 22050);
          const source = audioContextRef.current.createBufferSource();
          source.buffer = silentBuffer;
          source.connect(audioContextRef.current.destination);
          source.start(0);
          
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
        audioContextRef.current.resume().then(() => {
          console.log("✅ AudioContext resumed");
          
          // Test audio output after resuming
          testAudioOutput().then(success => {
            if (success) {
              console.log("✅ Audio output test successful");
            } else {
              console.error("❌ Audio output test failed");
            }
          });
        }).catch(err => {
          console.error("❌ Failed to resume AudioContext:", err);
        });
      }
    };

    // Add handlers for various events that indicate user interaction
    window.addEventListener("click", handleUserInteraction);
    window.addEventListener("touchstart", handleUserInteraction);
    window.addEventListener("keydown", handleUserInteraction);
    
    // Try to initialize immediately
    initAudioContext();

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
      callbacks?.onStart?.();
      
      // Get the current origin for building the correct endpoint URL
      const origin = window.location.origin;
      console.log("🌐 Using origin for TTS endpoint:", origin);
      
      // Full URL to text-to-speech edge function
      const ttsEndpoint = `${origin}/functions/v1/text-to-speech`;
      console.log("🔊 TTS endpoint URL:", ttsEndpoint);
      
      console.log("🔊 Starting text to speech streaming:", text.substring(0, 50) + "...");

      // Call the Edge Function with proper content type
      const response = await fetch(ttsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          text, 
          stream: true,
          voice: "EXAVITQu4vr4xnSDxMaL" // Sarah voice - reliable for testing
        })
      });

      if (!response.ok || !response.body) {
        console.error(`❌ TTS streaming failed with status: ${response.status}`);
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`Failed to stream text to speech: ${response.status}`);
      }

      console.log("✅ Started receiving audio stream from server");

      // Ensure we have an audio context
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        console.log("✅ Created new AudioContext for streaming");
      }

      // If AudioContext is suspended, resume it
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
        console.log("✅ Resumed AudioContext");
      }

      // Create a reader for the stream
      const reader = response.body.getReader();
      
      // Process the audio chunks
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log("✅ Audio stream complete");
          break;
        }
        
        if (audioContextRef.current && value) {
          try {
            console.log(`✅ Received audio chunk: ${value.buffer.byteLength} bytes`);
            
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
      return;
      
    } catch (error) {
      console.error("❌ Error in text-to-speech streaming:", error);
      
      // Try falling back to non-streaming mode
      console.log("🔄 Attempting fallback to non-streaming TTS...");
      try {
        callbacks?.onStart?.();
        const audioUrl = await textToSpeech(text);
        if (!audioUrl) {
          throw new Error("Failed to get audio URL in fallback mode");
        }
        console.log("✅ Successfully got audio URL from fallback method");
      } catch (fallbackError) {
        console.error("❌ Fallback TTS also failed:", fallbackError);
        toast({
          title: "Error Converting Text to Speech",
          description: "Could not convert text to speech. Please check your connection and try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsAudioLoading(false);
    }
  }, [toast]);
  
  // Convert text to speech (old method for compatibility)
  const textToSpeech = useCallback(async (text: string, callbacks?: TextToSpeechCallbacks): Promise<string | null> => {
    try {
      setIsAudioLoading(true);
      callbacks?.onStart?.();
      
      // Create a new abort controller
      if (!abortControllerRef.current) {
        abortControllerRef.current = new AbortController();
      }
      
      console.log("🔊 Converting text to speech:", text.substring(0, 50) + "...");
      
      // Get the current origin for building the correct endpoint URL
      const origin = window.location.origin;
      console.log("🌐 Using origin for TTS endpoint:", origin);
      
      // Full URL to text-to-speech edge function
      const ttsEndpoint = `${origin}/functions/v1/text-to-speech`;
      console.log("🔊 TTS endpoint URL:", ttsEndpoint);
      
      // Direct fetch to edge function without supabase client
      const response = await fetch(ttsEndpoint, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text, 
          stream: false,
          voice: "EXAVITQu4vr4xnSDxMaL" // Sarah voice - reliable for testing
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ TTS endpoint error: ${response.status}`, errorText);
        throw new Error(`Failed to convert text to speech: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.audio) {
        console.error("No audio data returned");
        throw new Error("No audio data returned");
      }
      
      console.log("✅ Successfully received audio data. Data length:", data.audio.length);
      
      // Create audio URL from base64
      const audioUrl = `data:audio/mp3;base64,${data.audio}`;
      console.log("✅ Successfully converted text to speech and created audio URL");
      
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
      }
      
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
    }
  }, [toast]);
  
  return { askAssistant, textToSpeech, streamToSpeech, isLoading, isAudioLoading, cancelRequest };
};
