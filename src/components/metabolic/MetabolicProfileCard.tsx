import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MetabolicProfile } from '@/hooks/useMetabolicProfile';
import { Activity, Flame, Scale, Ruler, User } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Props {
  profile: MetabolicProfile | null;
}

export const MetabolicProfileCard = ({ profile }: Props) => {
  const navigate = useNavigate();

  if (!profile) return null;

  const isIncomplete = !profile.age || !profile.gender || !profile.heightCm || !profile.currentWeight;

  if (isIncomplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profil Eksik
          </CardTitle>
          <CardDescription>
            Metabolik hesaplamalar için yaş, cinsiyet, boy ve kilo bilgileriniz gerekli.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/settings')} className="w-full">
            Ayarları Güncelle
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { icon: Flame, label: 'BMR', value: profile.bmr ? `${profile.bmr} kcal` : '—', desc: 'Bazal Metabolizma Hızı' },
    { icon: Activity, label: 'TDEE', value: profile.tdee ? `${profile.tdee} kcal` : '—', desc: 'Toplam Günlük Enerji' },
    { icon: Scale, label: 'BMI', value: profile.bmi ? `${profile.bmi}` : '—', desc: profile.bmiCategory || '' },
    { icon: Ruler, label: 'Boy', value: profile.heightCm ? `${profile.heightCm} cm` : '—', desc: '' },
  ];

  const bmiPercent = profile.bmi ? Math.min((profile.bmi / 40) * 100, 100) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Dijital İkiz Profili
          </CardTitle>
          <CardDescription>
            {profile.gender === 'male' ? 'Erkek' : 'Kadın'}, {profile.age} yaş, {profile.currentWeight} kg
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-secondary/50 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <s.icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{s.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                {s.desc && <p className="text-xs text-muted-foreground">{s.desc}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {profile.bmi && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">BMI Skalası</span>
              <span className="font-semibold text-foreground">{profile.bmi} — {profile.bmiCategory}</span>
            </div>
            <div className="relative">
              <Progress value={bmiPercent} className="h-3" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Zayıf</span>
                <span>Normal</span>
                <span>Kilolu</span>
                <span>Obez</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
