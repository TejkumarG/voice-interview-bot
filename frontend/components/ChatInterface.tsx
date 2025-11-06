'use client';

import { useState } from 'react';
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sourcesUsed?: boolean;
}

interface ChatInterfaceProps {
  selectedDocId: string | null;
  voiceInput: string;
  onVoiceInputProcessed: () => void;
}

export default function ChatInterface({ selectedDocId, voiceInput, onVoiceInputProcessed }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.chat(messageText, selectedDocId || undefined);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        sourcesUsed: response.sources_used,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        sourcesUsed: false,
      };
      setMessages((prev) => [...prev, errorMessage]);
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (voiceInput && voiceInput !== input) {
    setInput(voiceInput);
    sendMessage(voiceInput);
    onVoiceInputProcessed();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <Bot className="w-10 h-10 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Voice Interview Assistant
            </h2>
            <p className="text-gray-600 max-w-md">
              Upload your interview preparation documents and ask questions using voice or text.
              I'll help you prepare for your interview!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 animate-fadeIn ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-6 h-6 text-primary-600" />
                </div>
              )}

              <div
                className={`
                  max-w-[70%] rounded-2xl px-5 py-3
                  ${message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                  }
                `}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>

                {message.role === 'assistant' && message.sourcesUsed && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <Sparkles className="w-3 h-3" />
                    <span>Answer from documents</span>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-4 animate-fadeIn">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-6 h-6 text-primary-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl px-5 py-3">
              <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
            </div>
          </div>
        )}
      </div>

      <div className="border-t bg-white p-6">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            disabled={loading}
            className="
              flex-1 px-4 py-3 border border-gray-300 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
            "
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="
              px-6 py-3 bg-primary-600 text-white rounded-lg font-medium
              hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            "
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
