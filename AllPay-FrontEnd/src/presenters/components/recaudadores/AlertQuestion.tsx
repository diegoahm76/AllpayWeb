// components/AlertQuestion.tsx
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Button } from '../ui/AnimatedButton';
import { useTheme } from 'next-themes';

interface AlertQuestionProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  questionText: string;
  answerAfirmative?: string;
  answerNegative?: string;
}

const PORTAL_ID = 'alert-question-portal-root';

const AlertQuestion: React.FC<AlertQuestionProps> = ({
  isOpen,
  onClose,
  onConfirm,
  questionText,
  answerAfirmative = 'Sí',
  answerNegative = 'No'
}) => {
  const portalRef = useRef<HTMLElement | null>(null);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let el = document.getElementById(PORTAL_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = PORTAL_ID;
      el.style.zIndex = '9999';
      document.body.appendChild(el);
    }
    portalRef.current = el;

    // Bloquear scroll del body cuando el modal está abierto
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup al desmontar
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (typeof window === 'undefined' || !isOpen || !mounted) return null;

  const isDarkMode = theme === 'dark';

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-transparent backdrop-blur-sm" />

      <div className="relative z-[10000] animate-modalFadeScale">
        <div
          className={`m-auto rounded-xl p-6 ${
            isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'
          }`}
        >
          <div className={`w-full max-w-[95vw] md:w-[500px] max-h-[90vh] overflow-y-auto rounded-lg p-6 shadow-lg text-center ${
            isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'
          }`}>
            <div className="w-48 mx-auto mb-4">
              <Image
                src={isDarkMode ? "/images/corporate/logo-white.png" : "/images/corporate/logo.png"}
                alt="Federación Nacional de Cacaoteros"
                width={200}
                height={100}
                style={{ width: '100%', height: 'auto' }}
                priority
              />
            </div>

            <h2 className={`font-bold text-lg mb-2 ${
              isDarkMode ? 'text-white' : 'text-[#562707]'
            }`}>
              SEÑOR(A) RECAUDOR(A)
            </h2>

            <p className={`mb-6 font-semibold max-w-xs mx-auto ${
              isDarkMode ? 'text-white' : 'text-[#562707]'
            }`}>{questionText}</p>

            <div className="flex flex-row justify-center gap-4">
              <Button
                title={answerAfirmative}
                onClick={onConfirm}
                className="bg-[#4D750F] hover:bg-[#3a5a0a]"
                
              />
              <Button
                title={answerNegative}
                onClick={onClose}
                className="bg-[#4D750F] hover:bg-[#3a5a0a]"
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes modalFadeScale {
          0% {
            opacity: 0;
            transform: scale(0.85);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-modalFadeScale {
          animation: modalFadeScale 0.25s ease-out both;
        }
      `}</style>
    </div>
  );

  return portalRef.current ? createPortal(content, portalRef.current) : content;
};

export default AlertQuestion;
