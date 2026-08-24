import { useCallback, useEffect, useRef, useState } from 'react';

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

const ERROR_MESSAGES: Record<string, string> = {
  'no-speech': '음성이 들리지 않았습니다. 다시 말씀해 주세요.',
  'audio-capture': '마이크를 찾을 수 없습니다.',
  'not-allowed': '마이크 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요.',
  aborted: '음성 인식이 중단되었습니다.',
  network: '음성 인식 네트워크 오류가 발생했습니다.',
};

export function useSpeechRecognition() {
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
    recognition.lang = 'ko-KR';
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
        setError(ERROR_MESSAGES[event.error] ?? `음성 인식 오류: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      if (!gotResultRef.current) {
        setError((current) => current ?? '음성을 인식하지 못했습니다. 다시 말하거나 텍스트로 입력해 주세요.');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [isSupported]);

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
      setError('음성 인식을 다시 시작할 수 없습니다. 잠시 후 다시 눌러 주세요.');
      setIsListening(false);
    }
  }, []);

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
