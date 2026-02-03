'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cacaoIAAsk } from '@cacaoia/adapter';
import { useSession } from 'next-auth/react';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

export default function FloatingChat() {
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatOpen]);

  const sendMessage = async (questionText?: string) => {
    const question = questionText || input.trim();
    if (!question || loading) return;
    if (!questionText) setInput('');

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: question };
    const placeholderId = crypto.randomUUID();
    const placeholder: ChatMessage = { id: placeholderId, role: 'assistant', content: '...' };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    setLoading(true);

    try {
      const response = await cacaoIAAsk({ question }, token);
      setMessages((prev) => prev.map((m) => (m.id === placeholderId ? { ...m, content: response.answer || 'Sin respuesta' } : m)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al consultar IA';
      setMessages((prev) => prev.map((m) => (m.id === placeholderId ? { ...m, content: `Error: ${msg}` } : m)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse sm:flex-row items-end gap-3">
      {chatOpen && (
        <div className="w-[min(92vw,720px)] h-[min(70vh,440px)] sm:w-[720px] sm:h-[440px] rounded-xl sm:rounded-2xl border border-[rgb(var(--green))] bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--green))] text-white">
            <div className="h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-full bg-transparent pt-0.5 sm:pt-1">
              <Image src="/images/logo-chatbot.png" alt="CacaoBot" width={60} height={60} className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
            <div className="flex flex-col leading-snug">
              <span className="text-base sm:text-lg font-semibold">CacaoBot</span>
              <span className="text-[11px] sm:text-xs opacity-90">Asistente Inteligente de FEDECACAO</span>
            </div>
            <div className="ml-auto">
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                aria-label="Cerrar chat"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 mt-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex h-[calc(100%-56px)] flex-col">
            {/* Messages area */}
            <div className="flex-1 bg-white overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={
                      m.role === 'user'
                        ? 'max-w-[85%] rounded-2xl bg-[rgb(var(--green))] text-white px-4 py-2 shadow-sm'
                        : 'max-w-[85%] rounded-2xl bg-gray-100 text-gray-800 px-4 py-2 shadow-sm'
                    }
                  >
                    {m.content === '...' ? (
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Quick actions */}
            <div className="px-4 sm:px-5 pt-3">
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                <button type="button" onClick={() => sendMessage('¿Que es CacaoBot ?')} className="rounded-full border border-[rgb(var(--green))] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-[rgb(var(--green))] transition-all duration-150 hover:text-sm sm:hover:text-base hover:bg-[rgb(var(--green))] hover:text-white">¿Que es CacaoBot ?</button>
                <button type="button" onClick={() => sendMessage('¿Que es AllPay ?')} className="rounded-full border border-[rgb(var(--green))] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-[rgb(var(--green))] transition-all duration-150 hover:text-sm sm:hover:text-base hover:bg-[rgb(var(--green))] hover:text-white">¿Que es AllPay ?</button>
                <button type="button" onClick={() => sendMessage('¿Módulos de AllPay ?')} className="rounded-full border border-[rgb(var(--green))] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-[rgb(var(--green))] transition-all duration-150 hover:text-sm sm:hover:text-base hover:bg-[rgb(var(--green))] hover:text-white">¿Módulos de AllPay ?</button>
              </div>
            </div>

            {/* Input */}
            <div className="px-4 sm:px-5 py-3 sm:py-4">
              <div className="flex items-center gap-2 sm:gap-3 rounded-xl border-2 border-[rgb(var(--green))] px-3 sm:px-4 py-2.5 sm:py-3">
                <input
                  type="text"
                  disabled={!chatOpen}
                  placeholder="Escribe algo..."
                  className="flex-1 bg-transparent text-[14px] sm:text-[15px] text-gray-800 placeholder-gray-500
             border-0 !border-0 focus:border-0 focus:!border-0 outline-none focus:outline-none
             ring-0 focus:ring-0 focus-visible:ring-0 appearance-none shadow-none"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => sendMessage()} disabled={loading || !input.trim()} className="text-[rgb(var(--green))] disabled:opacity-40">
                    <Image src="/images/enviar.png" alt="Enviar" width={20} height={20} className="rotate-315 h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setChatOpen((prev) => !prev)}
        aria-label={chatOpen ? 'Ocultar chat' : 'Mostrar chat'}
        className="inline-flex items-center justify-center rounded-full bg-transparent transition hover:scale-105 focus:outline-none"
      >
        <Image
          src="/images/logo-chatbot.png"
          alt="Abrir chat"
          width={100}
          height={100}
          priority
          className="pointer-events-none select-none drop-shadow-lg"
        />
      </button>
    </div>
  );
}


