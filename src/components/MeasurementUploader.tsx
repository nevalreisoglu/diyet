import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, Loader2, X, Scale, Dna } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBodyMeasurements, BodyMeasurement } from '@/hooks/useBodyMeasurements';
import { UPLOAD_ACCEPT } from '@/lib/filePayload';

interface MeasurementUploaderProps {
  userId?: string;
}

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

const summaryItems = (m: BodyMeasurement) =>
  [
    m.weight_kg !== null && { label: 'Kilo', value: `${m.weight_kg} kg` },
    m.body_fat_pct !== null && { label: 'Yağ', value: `%${m.body_fat_pct}` },
    m.muscle_mass_kg !== null && { label: 'Kas', value: `${m.muscle_mass_kg} kg` },
    m.visceral_fat_level !== null && { label: 'İç yağ', value: `${m.visceral_fat_level}` },
    m.waist_cm !== null && { label: 'Bel', value: `${m.waist_cm} cm` },
    m.bmr_kcal !== null && { label: 'BMR', value: `${m.bmr_kcal} kcal` },
  ].filter(Boolean) as { label: string; value: string }[];

export const MeasurementUploader = ({ userId }: MeasurementUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { measurements, latest, loading, uploading, uploadFile, deleteMeasurement } = useBodyMeasurements(userId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await uploadFile(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Ölçüm Sonuçlarım
        </CardTitle>
        <CardDescription>
          InBody/Tanita çıktısı, akıllı tartı raporu veya diyetisyen ölçüm formunu yükleyin (PDF, fotoğraf, Excel, Word, metin).
          Değerler kaydedilir, profilinizdeki kilo güncellenir ve metabolik ikiziniz bu ölçümlere göre hesaplanır.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input ref={inputRef} type="file" accept={UPLOAD_ACCEPT} className="hidden" onChange={handleFileChange} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => inputRef.current?.click()} disabled={uploading || !userId} className="gap-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            {uploading ? 'İşleniyor...' : 'Ölçüm Yükle'}
          </Button>
          {measurements.length > 0 && (
            <Button variant="outline" onClick={() => navigate('/metabolic-twin')} className="gap-2">
              <Dna className="h-4 w-4" />
              Metabolik İkizde Gör
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !latest ? (
          <p className="text-sm text-muted-foreground">Henüz ölçüm yüklenmedi.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Son ölçüm · {formatDate(latest.measured_at)}</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {summaryItems(latest).map((item) => (
                  <div key={item.label} className="bg-secondary/50 rounded-xl p-2.5">
                    <p className="text-[11px] text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
              {latest.notes && <p className="text-xs text-muted-foreground mt-2">{latest.notes}</p>}
            </div>

            {measurements.length > 1 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Geçmiş</p>
                <div className="space-y-1">
                  {measurements.slice(1, 6).map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-background/60">
                      <span className="text-muted-foreground">{formatDate(m.measured_at)}</span>
                      <span className="text-foreground">
                        {[
                          m.weight_kg !== null && `${m.weight_kg} kg`,
                          m.body_fat_pct !== null && `%${m.body_fat_pct}`,
                        ].filter(Boolean).join(' · ') || '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteMeasurement(m.id)}
                        className="p-1 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label="Ölçümü sil"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => deleteMeasurement(latest.id)}
              className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-2"
            >
              Son ölçümü sil
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
