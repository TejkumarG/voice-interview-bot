'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onTranscript, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsProcessing(false);
        setIsRecording(false);
        onTranscript(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsProcessing(false);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setIsProcessing(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  return (
    <button
      onClick={toggleRecording}
      disabled={disabled || isProcessing}
      className={`
        relative p-6 rounded-full transition-all duration-300 ease-out
        ${isRecording
          ? 'bg-red-500 hover:bg-red-600 recording-pulse'
          : 'bg-primary-600 hover:bg-primary-700'
        }
        ${(disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'shadow-lg hover:shadow-xl'}
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      {isProcessing ? (
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      ) : isRecording ? (
        <MicOff className="w-8 h-8 text-white" />
      ) : (
        <Mic className="w-8 h-8 text-white" />
      )}

      {isRecording && (
        <span className="absolute -top-2 -right-2 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
        </span>
      )}
    </button>
  );
}
