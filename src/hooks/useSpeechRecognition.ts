import { useCallback, useEffect, useRef, useState } from 'react';
import { t, type Locale, type MessageKey } from '../i18n';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

function speechErrorKey(error: string): MessageKey {
  switch (error) {
    case 'no-speech':
      return 'speechNoSpeech';
    case 'audio-capture':
      return 'speechNoMic';
    case 'not-allowed':
      return 'speechNotAllowed';
    case 'aborted':
      return 'speechAborted';
    case 'network':
      return 'speechNetwork';
    default:
      return 'speechError';
  }
}

export function useSpeechRecognition(locale: Locale = 'ko') {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const gotResultRef = useRef(false);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = locale === 'en' ? 'en-US' : 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0]?.transcript ?? '';
        } else {
          interimText += result[0]?.transcript ?? '';
        }
      }
      if (interimText) {
        setInterimTranscript(interimText);
      }
      if (finalText.trim()) {
        gotResultRef.current = true;
        setTranscript(finalText.trim());
        setInterimTranscript('');
        setIsListening(false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted') {
        setError(t(speechErrorKey(event.error), { error: event.error }, locale));
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      if (!gotResultRef.current) {
        setError((current) => current ?? t('speechUnrecognized', undefined, locale));
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [isSupported, locale]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    gotResultRef.current = false;
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch {
      setError(t('speechRestartFailed', undefined, locale));
      setIsListening(false);
    }
  }, [locale]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    clearTranscript: () => {
      setTranscript('');
      setInterimTranscript('');
    },
    clearError: () => setError(null),
  };
}
