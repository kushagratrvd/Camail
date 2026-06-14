"use client";

import { useChat } from '@ai-sdk/react';
import { useRef, useEffect, useState } from 'react';

export function AiChatPanel() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-[600px] border border-gray-200 rounded-md p-4">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-gray-500 italic">Start chatting with your AI assistant to manage your emails and calendar.</p>
        ) : (
          messages.map(message => (
            <div key={message.id} className={`whitespace-pre-wrap ${message.role === 'user' ? 'text-blue-600 text-right' : 'text-gray-800'}`}>
              <span className="font-bold">{message.role === 'user' ? 'You: ' : 'AI: '}</span>
              
              {message.parts.map((part, i) => {
                switch (part.type) {
                  case 'text':
                    return <div key={`${message.id}-${i}`}>{part.text}</div>;
                  default:
                    if (part.type.startsWith('tool-')) {
                      return (
                        <pre key={`${message.id}-${i}`} className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto text-left text-gray-600">
                          {JSON.stringify(part, null, 2)}
                        </pre>
                      );
                    }
                    return null;
                }
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form 
        className="flex gap-2"
        onSubmit={e => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }}
      >
        <input
          value={input}
          placeholder="Ask something about your emails or calendar..."
          onChange={e => setInput(e.currentTarget.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
        />
        <button 
          type="submit" 
          disabled={!input.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
