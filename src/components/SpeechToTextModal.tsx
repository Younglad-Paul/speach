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
  const [retryCount, setRetryCount] = useState(0);
  const [lastProcessedText, setLastProcessedText] = useState('');
  const [lastProcessedTime, setLastProcessedTime] = useState(0);
  const [userStopped, setUserStopped] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Clear any existing errors first
      setError(null);

      // Detect browser type and device
      const isBrave = (navigator as any).brave && (navigator as any).brave.isBrave;
      const userAgent = navigator.userAgent.toLowerCase();
      const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
      const isEdge = userAgent.includes('edg');
      const isFirefox = userAgent.includes('firefox');
      const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
      const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isAndroid = /android/i.test(userAgent);

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        let browserMessage = 'Speech recognition is not supported in this browser.';
        if (isFirefox) {
          browserMessage = 'Speech recognition is not supported in Firefox. Please use Chrome, Edge, or Brave.';
        } else if (isSafari) {
          browserMessage = 'Speech recognition is not supported in Safari. Please use Chrome, Edge, or Brave.';
        } else {
          browserMessage = 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Brave.';
        }
        setError(browserMessage);
        return;
      }

      // Brave-specific warnings
      if (isBrave) {
        console.log('Brave browser detected - checking privacy settings');
      }

      const recognition = new SpeechRecognition();
      
      // Mobile devices handle continuous differently - disable to prevent duplicates
      recognition.continuous = !isMobile;
      // Disable interim results on mobile to prevent rapid-fire duplicate events
      recognition.interimResults = !isMobile;
      recognition.lang = 'en-US';
      
      // Additional configuration for better speech recognition
      
      // Mobile-specific logging
      if (isMobile) {
        console.log('Mobile device detected - using non-continuous mode and no interim results to prevent duplicates');
      }

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
          const currentTime = Date.now();
          const cleanTranscript = finalTranscript.trim().toLowerCase();
          
          // Enhanced duplicate detection for mobile devices
          if (isMobile) {
            // Check if this is the same text processed recently (within 2 seconds)
            const timeDiff = currentTime - lastProcessedTime;
            const isRecentDuplicate = timeDiff < 2000 && lastProcessedText.includes(cleanTranscript);
            
            if (isRecentDuplicate) {
              console.log('Duplicate text detected on mobile, skipping:', cleanTranscript);
              return;
            }
            
            // Update tracking variables
            setLastProcessedText(prev => prev + cleanTranscript + ' ');
            setLastProcessedTime(currentTime);
          }
          
          // On mobile, add space between words to prevent concatenation issues
          const formattedTranscript = isMobile ? finalTranscript + ' ' : finalTranscript;
          setTranscript(prev => prev + formattedTranscript);
          setInterimTranscript('');
        } else {
          setInterimTranscript(interimTranscript);
        }
      };

      recognition.onerror = (event) => {
        // Detect browser for specific error messages
        const isBrave = (navigator as any).brave && (navigator as any).brave.isBrave;
        
        let errorMessage = '';
        switch (event.error) {
          case 'not-allowed':
            if (isBrave) {
              errorMessage = 'Microphone access denied. In Brave: Click the shield icon → Site settings → Allow microphone access.';
            } else {
              errorMessage = 'Microphone access denied. Please allow microphone permissions and try again.';
            }
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking louder or closer to the microphone.';
            break;
          case 'network':
            if (isBrave) {
              errorMessage = 'Network error. Brave may be blocking Google services. Try: Brave settings → Privacy → Disable "Block trackers & ads" for this site.';
            } else {
              errorMessage = 'Network error. This might be temporary. Please try again in a few seconds.';
            }
            break;
          case 'service-not-allowed':
            if (isBrave) {
              errorMessage = 'Speech service blocked. In Brave: Click shield icon → Turn off "Block trackers & ads" for this site.';
            } else {
              errorMessage = 'Speech recognition service not allowed. Please try again.';
            }
            break;
          case 'aborted':
            errorMessage = 'Speech recognition was interrupted. Please try again.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}. Please try again.`;
        }
        setError(errorMessage);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        
        // On mobile, automatically restart if continuous was disabled AND user didn't manually stop
        if (isMobile && !recognition.continuous && !userStopped) {
          // Small delay to prevent immediate restart
          setTimeout(() => {
            if (recognitionRef.current && !userStopped) {
              try {
                recognitionRef.current.start();
              } catch (err) {
                // Ignore restart errors on mobile
                console.log('Mobile auto-restart failed:', err);
              }
            }
          }, 100);
        }
      };

      recognitionRef.current = recognition;
      
      // If we get here, speech recognition is ready
      console.log('Speech recognition initialized successfully');
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setError(null);
      setUserStopped(false); // Reset the user stopped flag
      recognitionRef.current.start();
    }
  };

  const retrySpeechRecognition = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.log('Retry attempt:', retryCount + 1);
        setError('Still having network issues. Try refreshing the page or using a different browser.');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      setUserStopped(true); // Mark that user manually stopped
      recognitionRef.current.stop();
      
      // On mobile, also abort to prevent auto-restart
      const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
      if (isMobile) {
        try {
          recognitionRef.current.abort();
        } catch (err) {
          // Ignore abort errors
        }
      }
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    setLastProcessedText('');
    setLastProcessedTime(0);
    setUserStopped(false);
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
                {error.includes('Network error') && (
                  <div className="text-xs text-red-500 dark:text-red-400">
                    <p className="font-medium mb-2">Network issues can be temporary:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Wait a few seconds and try again</li>
                      <li>Check your internet connection</li>
                      <li>Try refreshing the page</li>
                      <li>Speech recognition uses Google's servers - they might be temporarily unavailable</li>
                    </ul>
                    <div className="mt-3">
                      <button
                        onClick={retrySpeechRecognition}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                      >
                        Retry ({retryCount}/3)
                      </button>
                    </div>
                  </div>
                )}
                {error.includes('Brave') && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                    <p className="font-medium mb-2">🔒 Brave Browser Privacy Settings:</p>
                    <p className="mb-2">Brave's privacy features may block speech recognition. Try these steps:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Click the <strong>shield icon</strong> in the address bar</li>
                      <li>Turn off <strong>"Block trackers & ads"</strong> for this site</li>
                      <li>Allow <strong>microphone access</strong> when prompted</li>
                      <li>Refresh the page and try again</li>
                    </ol>
                    <p className="mt-2 text-xs opacity-75">Alternative: Try Chrome or Edge for best compatibility</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {isListening ? 'Listening...' : 'Ready to listen'}
                </span>
                {/android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase()) && (
                  <span className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                    📱 Mobile Mode
                  </span>
                )}
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
