'use client';

import { MainResource } from '@/application/shared/resources/main-resource';
import { useRouter } from 'next/router';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  if (error.message.includes('AccessDenied')) {
    router.push('/auth/signin');
  }

  return (
    <html>
      <body>
        <h2>{MainResource.ErrorBoundary}</h2>
        <p>{`${error}`}</p>
        <button onClick={() => reset()}>{MainResource.TryAgain}</button>
      </body>
    </html>
  );
}
