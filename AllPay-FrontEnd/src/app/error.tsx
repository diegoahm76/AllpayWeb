// src/app/error.tsx
'use client';

import '@/presenters/css/background.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="background">
          <div className="flex flex-auto items-center justify-center min-h-screen text-center">
            <div>
              <h1 className="text-white font-bold text-3xl">
                Error 500 - ¡Ups! Algo salió mal.
              </h1>
              <p className="text-white mt-2">{error.message}</p>
              <button
                className="mt-4 text-white underline"
                onClick={() => reset()}
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
