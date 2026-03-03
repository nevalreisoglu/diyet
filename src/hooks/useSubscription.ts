import { useState, useEffect } from 'react';

const KEY = 'diyet_premium';

// Module-level pub-sub so all instances on the same page stay in sync
const subscribers = new Set<() => void>();
const notify = () => subscribers.forEach((fn) => fn());

export function useSubscription() {
  const [isPremium, setIsPremium] = useState(() => localStorage.getItem(KEY) === 'true');

  useEffect(() => {
    const handler = () => setIsPremium(localStorage.getItem(KEY) === 'true');
    subscribers.add(handler);
    return () => { subscribers.delete(handler); };
  }, []);

  const activate = () => {
    localStorage.setItem(KEY, 'true');
    setIsPremium(true);
    notify();
  };

  const cancel = () => {
    localStorage.removeItem(KEY);
    setIsPremium(false);
    notify();
  };

  return { isPremium, activate, cancel };
}
