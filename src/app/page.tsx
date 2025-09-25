'use client';

import { useState } from 'react';
import DocumentEditor from '@/components/DocumentEditor';
import SpeechToTextModal from '@/components/SpeechToTextModal';

export default function Home() {
  const [isSpeechModalOpen, setIsSpeechModalOpen] = useState(false);
  const [documentContent, setDocumentContent] = useState('');

  const handleOpenSpeechModal = () => {
    setIsSpeechModalOpen(true);
  };

  const handleCloseSpeechModal = () => {
    setIsSpeechModalOpen(false);
  };

  const handleTextUpdate = (text: string) => {
    setDocumentContent(prev => prev + (prev ? ' ' : '') + text);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Speech to Text Editor
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Create documents effortlessly using voice input. Click the microphone button to start dictating your text.
          </p>
        </div>

        {/* Document Editor */}
        <DocumentEditor 
          onOpenSpeechModal={handleOpenSpeechModal}
          content={documentContent}
          onContentChange={setDocumentContent}
        />

        {/* Speech Modal */}
        <SpeechToTextModal
          isOpen={isSpeechModalOpen}
          onClose={handleCloseSpeechModal}
          onTextUpdate={handleTextUpdate}
        />
      </div>
    </div>
  );
}
