'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Mic, MicOff, Play, Square, RotateCcw, Download, Trash2, Shield, AlertTriangle } from 'lucide-react';

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
  const userStoppedRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        
        // Clear any existing restart timeout
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = null;
        }
        
        // On mobile, automatically restart if continuous was disabled AND user didn't manually stop
        if (isMobile && !recognition.continuous && !userStoppedRef.current) {
          // Small delay to prevent immediate restart
          restartTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current && !userStoppedRef.current) {
              try {
                recognitionRef.current.start();
              } catch (err) {
                // Ignore restart errors on mobile
                console.log('Mobile auto-restart failed:', err);
              }
            }
            restartTimeoutRef.current = null;
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
      userStoppedRef.current = false; // Reset the ref as well
      recognitionRef.current.start();
    }
  };

  const retrySpeechRecognition = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setUserStopped(false);
    userStoppedRef.current = false;
    
    // Clear any pending restart timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.log('Retry attempt:', retryCount + 1);
        setError('Still having issues. Try refreshing the page or using a different browser.');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      // Immediately set both state and ref to prevent any auto-restart
      setUserStopped(true);
      userStoppedRef.current = true;
      setIsListening(false);
      
      // Clear any pending restart timeout
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      
      // Try both stop and abort methods for maximum reliability
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.log('Stop failed:', err);
      }
      
      try {
        recognitionRef.current.abort();
      } catch (err) {
        console.log('Abort failed:', err);
      }
      
      console.log('User manually stopped speech recognition');
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    setLastProcessedText('');
    setLastProcessedTime(0);
    setUserStopped(false);
    userStoppedRef.current = false;
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col my-2 sm:my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Speech to Text
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col overflow-y-auto">
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
                    <div className="mt-3">
                      <button
                        onClick={retrySpeechRecognition}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                      >
                        Retry Speech Recognition
                      </button>
                    </div>
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
                    <p className="font-medium mb-2 flex items-center gap-2">
                      <Shield size={16} />
                      Brave Browser Privacy Settings:
                    </p>
                    <p className="mb-2">Brave's privacy features may block speech recognition. Try these steps:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Click the <strong>shield icon</strong> in the address bar</li>
                      <li>Turn off <strong>"Block trackers & ads"</strong> for this site</li>
                      <li>Allow <strong>microphone access</strong> when prompted</li>
                      <li>Refresh the page and try again</li>
                    </ol>
                    <p className="mt-2 text-xs opacity-75">Alternative: Try Chrome or Edge for best compatibility</p>
                    <div className="mt-3">
                      <button
                        onClick={retrySpeechRecognition}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded transition-colors"
                      >
                        Retry Speech Recognition
                      </button>
                    </div>
                  </div>
                )}
                {/* General retry button for any error */}
                <div className="mt-4 pt-3 border-t border-red-200 dark:border-red-800">
                  <button
                    onClick={retrySpeechRecognition}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                  >
                    <RotateCcw size={16} className="inline mr-2" />
                    Retry Speech Recognition
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {isListening ? 'Listening...' : 'Ready to listen'}
                </span>
                {/android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase()) && (
                  <span className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded flex items-center gap-1">
                    <Mic size={12} />
                    Mobile Mode
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Transcript Display */}
          <div className="flex-1 mb-4 sm:mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 min-h-[150px] sm:min-h-[200px] max-h-[250px] sm:max-h-[300px] overflow-y-auto">
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
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={!!error && !error.includes('Microphone access denied')}
              className={`flex-1 py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-medium transition-all text-sm sm:text-base ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } ${error && !error.includes('Microphone access denied') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isListening ? (
                <>
                  <Square size={16} className="inline mr-2" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Play size={16} className="inline mr-2" />
                  Start Listening
                </>
              )}
            </button>
            
            <button
              onClick={clearTranscript}
              className="px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm sm:text-base"
            >
              <Trash2 size={16} className="inline mr-2" />
              Clear
            </button>
            
            <button
              onClick={insertText}
              disabled={!transcript.trim() && !interimTranscript.trim()}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              <Download size={16} className="inline mr-2" />
              Insert Text
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeechToTextModal;
