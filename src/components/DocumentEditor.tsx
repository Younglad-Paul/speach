'use client';

import { useState } from 'react';

interface DocumentEditorProps {
  onOpenSpeechModal: () => void;
  content?: string;
  onContentChange?: (content: string) => void;
}

const DocumentEditor = ({ onOpenSpeechModal, content = '', onContentChange }: DocumentEditorProps) => {
  const handleContentChange = (newContent: string) => {
    onContentChange?.(newContent);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Document Editor
          </h1>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {content.length} characters
          </div>
        </div>
        
        <button
          onClick={onOpenSpeechModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Voice Input
        </button>
      </div>

      {/* Editor */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Start typing or use voice input to create your document..."
          className="w-full h-[500px] p-6 text-gray-900 dark:text-white bg-transparent resize-none focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={() => handleContentChange('')}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Clear Document
        </button>
        
        <button
          onClick={() => {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'document.txt';
            a.click();
            URL.revokeObjectURL(url);
          }}
          disabled={!content.trim()}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Download
        </button>
      </div>
    </div>
  );
};

export default DocumentEditor;
