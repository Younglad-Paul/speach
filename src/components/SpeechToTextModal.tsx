'use client';

import { useState, useRef, useEffect } from 'react';

interface SpeechToTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTextUpdate: (text: string) => void;
}

const SpeechToTextModal = ({ isOpen, onClose, onTextUpdate }: SpeechToTextModalProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Clear any existing errors first
      setError(null);

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
          setInterimTranscript('');
        } else {
          setInterimTranscript(interimTranscript);
        }
      };

      recognition.onerror = (event) => {
        let errorMessage = '';
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone permissions and try again.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking louder or closer to the microphone.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your internet connection and try again.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed. Please try again.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        setError(errorMessage);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      
      // If we get here, speech recognition is ready
      console.log('Speech recognition initialized successfully');
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
  };

  const insertText = () => {
    const fullText = transcript + interimTranscript;
    if (fullText.trim()) {
      onTextUpdate(fullText);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Speech to Text
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col">
          {/* Status */}
          <div className="mb-6">
            {error ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-600 dark:text-red-400 text-sm mb-3">{error}</p>
                {error.includes('Microphone access denied') && (
                  <div className="text-xs text-red-500 dark:text-red-400">
                    <p className="font-medium mb-2">To fix this:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Click the microphone icon in your browser's address bar</li>
                      <li>Select "Allow" for microphone access</li>
                      <li>Refresh the page and try again</li>
                    </ol>
                  </div>
                )}
                {error.includes('Microphone access denied') && (
                  <div className="text-xs text-red-500 dark:text-red-400">
                    <p className="font-medium mb-2">To fix this:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Click the microphone icon in your browser's address bar</li>
                      <li>Select "Allow" for microphone access</li>
                      <li>Refresh the page and try again</li>
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {isListening ? 'Listening...' : 'Ready to listen'}
                </span>
              </div>
            )}
          </div>

          {/* Transcript Display */}
          <div className="flex-1 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
              <div className="text-gray-900 dark:text-white whitespace-pre-wrap">
                {transcript}
                {interimTranscript && (
                  <span className="text-gray-500 dark:text-gray-400 italic">
                    {interimTranscript}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={!!error && !error.includes('Microphone access denied')}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } ${error && !error.includes('Microphone access denied') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isListening ? 'Stop Listening' : 'Start Listening'}
            </button>
            
            <button
              onClick={clearTranscript}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Clear
            </button>
            
            <button
              onClick={insertText}
              disabled={!transcript.trim() && !interimTranscript.trim()}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Insert Text
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeechToTextModal;
