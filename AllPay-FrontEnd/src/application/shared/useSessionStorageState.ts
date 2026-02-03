// // hooks/useSessionStorageState.ts
// import { useEffect, useState } from 'react';

// export default function useSessionStorageState<T>(
//   key: string,
//   initialValue: T
// ) {
//   const [state, setState] = useState<T>(() => {
//     if (typeof window === 'undefined') return initialValue;
//     const stored = sessionStorage.getItem(key);
//     return stored ? (JSON.parse(stored) as T) : initialValue;
//   });

//   useEffect(() => {
//     sessionStorage.setItem(key, JSON.stringify(state));
//   }, [key, state]);

//   return [state, setState] as const;
// }
