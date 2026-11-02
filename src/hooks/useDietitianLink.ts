import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LinkedDietitian {
  linkId: string;
  dietitianId: string;
  displayName: string | null;
}

// Danışan tarafı: bağlı diyetisyen, kodla bağlanma ve bağı koparma
export const useMyDietitian = (userId: string | undefined) => {
  const [dietitian, setDietitian] = useState<LinkedDietitian | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const { toast } = useToast();

  const refetch = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: link } = await supabase
        .from('dietitian_clients')
        .select('id, dietitian_id')
        .eq('client_id', userId)
        .eq('status', 'active')
        .maybeSingle();
      if (!link) {
        setDietitian(null);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', link.dietitian_id)
        .maybeSingle();
      setDietitian({ linkId: link.id, dietitianId: link.dietitian_id, displayName: profile?.display_name ?? null });
    } catch (error) {
      console.error('Error fetching dietitian link:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const linkWithCode = useCallback(async (code: string) => {
    setWorking(true);
    try {
      const { data, error } = await supabase.rpc('link_dietitian', { p_code: code.trim() });
      if (error) throw error;
      const result = data as { dietitian_id: string; display_name: string | null };
      toast({ title: 'Bağlandı', description: `${result.display_name ?? 'Diyetisyeniniz'} artık planınızı yönetebilir.` });
      await refetch();
      return true;
    } catch (error) {
      toast({
        title: 'Bağlanamadı',
        description: error instanceof Error ? error.message : 'Kod geçersiz.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setWorking(false);
    }
  }, [refetch, toast]);

  const unlink = useCallback(async () => {
    if (!dietitian) return;
    setWorking(true);
    try {
      const { error } = await supabase.from('dietitian_clients').delete().eq('id', dietitian.linkId);
      if (error) throw error;
      toast({ title: 'Bağlantı kaldırıldı' });
      setDietitian(null);
    } catch (error) {
      toast({ title: 'Hata', description: 'Bağlantı kaldırılamadı.', variant: 'destructive' });
    } finally {
      setWorking(false);
    }
  }, [dietitian, toast]);

  return { dietitian, loading, working, linkWithCode, unlink, refetch };
};

export interface ClientSummary {
  linkId: string;
  clientId: string;
  displayName: string | null;
  currentWeightKg: number | null;
  targetCalories: number | null;
  linkedAt: string;
}

// Diyetisyen tarafı: danışan listesi ve davet kodu
export const useDietitianClients = (dietitianId: string | undefined) => {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const refetch = useCallback(async () => {
    if (!dietitianId) return;
    try {
      const [{ data: links }, { data: invite }] = await Promise.all([
        supabase.from('dietitian_clients').select('id, client_id, created_at').eq('dietitian_id', dietitianId).eq('status', 'active').order('created_at'),
        supabase.from('dietitian_invites').select('code').eq('dietitian_id', dietitianId).maybeSingle(),
      ]);
      setInviteCode(invite?.code ?? null);
      const ids = (links ?? []).map((l) => l.client_id);
      const { data: profiles } = ids.length
        ? await supabase.from('profiles').select('user_id, display_name, current_weight_kg, target_calories').in('user_id', ids)
        : { data: [] as any[] };
      const byId = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      setClients((links ?? []).map((l) => {
        const p = byId.get(l.client_id);
        return {
          linkId: l.id,
          clientId: l.client_id,
          displayName: p?.display_name ?? null,
          currentWeightKg: p?.current_weight_kg != null ? Number(p.current_weight_kg) : null,
          targetCalories: p?.target_calories ?? null,
          linkedAt: l.created_at,
        };
      }));
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  }, [dietitianId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createInvite = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('create_dietitian_invite');
      if (error) throw error;
      setInviteCode(data as string);
    } catch (error) {
      toast({ title: 'Hata', description: error instanceof Error ? error.message : 'Kod oluşturulamadı.', variant: 'destructive' });
    }
  }, [toast]);

  const removeClient = useCallback(async (linkId: string) => {
    try {
      const { error } = await supabase.from('dietitian_clients').delete().eq('id', linkId);
      if (error) throw error;
      toast({ title: 'Danışan kaldırıldı' });
      await refetch();
    } catch {
      toast({ title: 'Hata', description: 'Danışan kaldırılamadı.', variant: 'destructive' });
    }
  }, [refetch, toast]);

  return { clients, inviteCode, loading, createInvite, removeClient, refetch };
};
