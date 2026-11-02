import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Diyetisyenin daha önce girdiği yiyecekler + danışanın kendi listesi (otomatik tamamlama için)
export const usePlanSuggestions = (clientId: string | undefined, refreshKey = 0) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: planNames }, { data: clientFoods }] = await Promise.all([
        supabase.from('plan_items').select('name').order('created_at', { ascending: false }).limit(400),
        clientId ? supabase.from('custom_foods').select('name').eq('user_id', clientId) : Promise.resolve({ data: [] as { name: string }[] }),
      ]);
      if (cancelled) return;
      const seen = new Set<string>();
      const out: string[] = [];
      for (const row of [...(clientFoods ?? []), ...(planNames ?? [])]) {
        const key = row.name.trim().toLocaleLowerCase('tr-TR');
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(row.name.trim());
      }
      setSuggestions(out.sort((a, b) => a.localeCompare(b, 'tr')));
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, refreshKey]);

  return suggestions;
};
