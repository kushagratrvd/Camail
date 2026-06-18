'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type VoiceState = 'idle' | 'listening' | 'error';

// Strict TypeScript interfaces for the Web Speech API
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition?: {
      new (): SpeechRecognition;
    };
  }
}

export function useVoiceInput() {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognitionConstructor) {
        const recognition = new SpeechRecognitionConstructor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setState('listening');
          setError(null);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result) {
              const alternative = result[0];
              if (alternative) {
                currentTranscript += alternative.transcript;
              }
            }
          }
          setTranscript(currentTranscript);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.warn('Voice recognition error event:', event.error);
          setError(event.error);
          setState('error');
        };

        recognition.onend = () => {
          // If we ended because of an error, preserve the error state
          setState((prev) => (prev === 'error' ? 'error' : 'idle'));
        };

        recognitionRef.current = recognition;
      } else {
        setIsSupported(false);
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setError(null);
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.error('Error stopping speech recognition:', err);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (state === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  }, [state, startListening, stopListening]);

  return {
    state,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    setTranscript
  };
}
