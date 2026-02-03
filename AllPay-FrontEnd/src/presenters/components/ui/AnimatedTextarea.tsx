'use client';

import React, { useState } from 'react';

interface AnimatedTextareaProps {
    label: string;
    name: string;
    value: string;
    id?: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    readOnly?: boolean;
    error?: boolean;
    rows?: number;
    disabled?: boolean;
    darkMode?: boolean;
}

export const AnimatedTextarea: React.FC<AnimatedTextareaProps> = ({
    disabled = false,
    label,
    name,
    id,
    value,
    onChange,
    readOnly = false,
    error,
    rows = 4,
    darkMode = false
}) => {
    const [isFocused, setIsFocused] = useState(false);

    const textareaClassNames = `
        w-full p-3 pt-6 rounded-2xl appearance-none transition-all resize-none
        ${error
            ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 focus:ring-red-500 focus:border-red-500'
            : darkMode
                ? disabled
                    ? 'bg-transparent border border-white/30 text-white focus:border-[rgb(var(--green))]'
                    : 'bg-[#260f00] border border-white/30 text-white focus:border-[rgb(var(--green))]'
                : 'bg-white border border-[#562707] text-[#562707]'}
    `;

    const positionClass = isFocused || value ? '-translate-y-4 scale-90' : 'translate-y-2';
    const labelBgClass = error 
        ? 'bg-red-50' 
        : darkMode 
            ? (disabled ? 'bg-transparent' : 'bg-[#260f00]')
            : 'bg-white';
    const labelTextClass = error
        ? 'text-red-700'
        : (isFocused || value)
            ? (darkMode ? 'text-white font-bold' : 'text-[rgb(var(--green))]')
            : (darkMode ? 'text-white' : 'text-gray-500');

    return (
        <div className="relative w-full">
            <textarea
                name={name}
                value={value}
                disabled={disabled}
                id={id}
                onChange={onChange}
                readOnly={readOnly}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(!!value)}
                rows={rows}
                className={textareaClassNames}
                placeholder=" "
            />
            <label
                htmlFor={id}
                className={`
                    absolute left-3 top-1 px-1 text-sm ${labelBgClass} transition-all pointer-events-none
                    ${positionClass} ${labelTextClass}
                `}
            >
                {label}
            </label>
            <style jsx global>{`
                textarea.bg-transparent:disabled,
                textarea.bg-transparent[readonly] {
                    background-color: transparent !important;
                    -webkit-text-fill-color: inherit !important;
                    opacity: 1 !important;
                    background-image: none !important;
                    box-shadow: none !important;
                    -webkit-box-shadow: none !important;
                }

                textarea.bg-transparent.text-white:disabled,
                textarea.bg-transparent.text-white[readonly] {
                    color: white !important;
                    -webkit-text-fill-color: white !important;
                }
            `}</style>
        </div>
    );
};
