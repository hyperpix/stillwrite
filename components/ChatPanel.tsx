
import React, { useState, useEffect, useRef } from 'react';
import { Button, ScrollArea } from './ui/primitives';
import { Icons } from './Icons';
import { ChatMessage } from '../types';
import { getChatModel, sendMessageToGemini } from '../services/geminiService';
import { Chat } from "@google/genai";

interface ChatPanelProps {
  contextText: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ contextText }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize chat session when component mounts or context drastically changes
    // For now, we keep the session alive.
    if (!chatSessionRef.current) {
        try {
             chatSessionRef.current = getChatModel("");
             // Initial greeting
             setMessages([{ role: 'model', text: "Hi! I'm Flow AI. I'm reading along. How can I help with your writing today?" }]);
        } catch (e) {
            console.error("Failed to init Gemini", e);
            setMessages([{ role: 'model', text: "AI configuration missing (API Key). Please check settings." }]);
        }
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || !chatSessionRef.current) return;

    const userMsg = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const response = await sendMessageToGemini(chatSessionRef.current, userMsg, contextText);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full text-sm">
      <div className="px-4 py-4 border-b flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
            <Icons.MessageSquare className="w-4 h-4" />
            Flow Assistant
        </h2>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef} data-lenis-prevent>
        <div className="flex flex-col gap-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg max-w-[90%] ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground self-end ml-auto'
                  : 'bg-secondary text-secondary-foreground self-start'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>
          ))}
          {isLoading && (
             <div className="bg-secondary text-secondary-foreground self-start p-3 rounded-lg">
                 <Icons.Loader className="w-4 h-4 animate-spin" />
             </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <div className="relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your text..."
              className="w-full min-h-[80px] p-3 pr-10 rounded-md border bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-ring scrollbar-hide text-sm"
            />
            <Button 
                size="icon" 
                variant="ghost"
                className="absolute right-2 bottom-2 h-8 w-8 hover:bg-muted"
                onClick={handleSend}
                disabled={isLoading || !inputValue.trim()}
            >
                <Icons.Send className="w-4 h-4" />
            </Button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground text-center">
            Gemini 2.5 Flash
        </div>
      </div>
    </div>
  );
};
