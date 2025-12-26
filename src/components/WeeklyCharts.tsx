import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Dumbbell } from 'lucide-react';

interface DayData {
  date: string;
  totalCalories: number;
  targetCalories: number;
  totalExercise: number;
}

interface WeeklyChartsProps {
  data: DayData[];
}

export const WeeklyCharts = ({ data }: WeeklyChartsProps) => {
  // Take last 7 days and reverse for chronological order
  const weekData = data.slice(0, 7).reverse().map((day) => ({
    ...day,
    dayLabel: new Date(day.date).toLocaleDateString('tr-TR', { weekday: 'short' }),
  }));

  const avgCalories = Math.round(
    weekData.reduce((sum, d) => sum + d.totalCalories, 0) / weekData.length || 0
  );
  const totalExercise = weekData.reduce((sum, d) => sum + d.totalExercise, 0);
  const targetCalories = weekData[0]?.targetCalories || 1500;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Calorie Chart */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-5 w-5 text-orange-500" />
            Haftalık Kalori
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Ortalama: <span className="font-medium text-foreground">{avgCalories} kcal</span>
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="dayLabel" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [`${value} kcal`, 'Kalori']}
                />
                <ReferenceLine 
                  y={targetCalories} 
                  stroke="hsl(var(--primary))" 
                  strokeDasharray="3 3"
                  strokeOpacity={0.7}
                />
                <Bar 
                  dataKey="totalCalories" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Exercise Chart */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-5 w-5 text-green-500" />
            Haftalık Spor
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Toplam: <span className="font-medium text-foreground">{totalExercise} dk</span>
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="dayLabel" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [`${value} dk`, 'Spor']}
                />
                <Bar 
                  dataKey="totalExercise" 
                  fill="#22c55e" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
