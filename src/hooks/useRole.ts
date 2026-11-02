import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'client' | 'dietitian';

const cache = new Map<string, UserRole>();

export const useRole = (userId: string | undefined) => {
  const [role, setRole] = useState<UserRole | null>(userId ? cache.get(userId) ?? null : null);
  const [loading, setLoading] = useState(!!userId && !cache.has(userId));

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }
    if (cache.has(userId)) {
      setRole(cache.get(userId)!);
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const r: UserRole = data?.role === 'dietitian' ? 'dietitian' : 'client';
        cache.set(userId, r);
        setRole(r);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { role, isDietitian: role === 'dietitian', loading };
};
