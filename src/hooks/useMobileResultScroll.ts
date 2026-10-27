import { useEffect, useRef } from 'react';

export function useMobileResultScroll(isVisible: boolean) {
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const result = resultRef.current;
    if (!isVisible || !result || !window.matchMedia('(max-width: 767px)').matches) {
      return;
    }

    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [isVisible]);

  return resultRef;
}
