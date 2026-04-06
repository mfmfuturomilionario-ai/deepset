import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DiagnosticHistory } from './DiagnosticHistory';
import { BarChart3, Star, TrendingUp, Users, Eye, Brain } from 'lucide-react';

const areaLabels: Record<string, string> = {
  business: '💼 Negócios', finance: '💰 Finanças', relationships: '❤️ Relacionamentos',
  health: '🏋️ Saúde', spirituality: '🧘 Espiritualidade', positioning: '🎯 Posicionamento',
  sales: '📈 Vendas', habits: '⚡ Hábitos', mental_performance: '🧠 Performance Mental',
  leadership: '👑 Liderança', career: '🚀 Carreira', creativity: '🎨 Criatividade',
  general: '🎯 Geral',
};

interface AreaStat {
  area: string;
  count: number;
  avgRating: number;
  rated: number;
}

interface UserDiagStat {
  user_id: string;
  full_name: string;
  diagnostics: number;
  avgRating: number;
  topArea: string;
}

export function AdminAnalytics() {
  const [areaStats, setAreaStats] = useState<AreaStat[]>([]);
  const [userStats, setUserStats] = useState<UserDiagStat[]>([]);
  const [totalDiags, setTotalDiags] = useState(0);
  const [globalAvg, setGlobalAvg] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [diagRes, profileRes] = await Promise.all([
        supabase.from('diagnostic_results').select('user_id, life_area, rating, created_at'),
        supabase.from('profiles').select('user_id, full_name'),
      ]);

      const diags = diagRes.data || [];
      const profiles = profileRes.data || [];

      setTotalDiags(diags.length);

      // Area stats
      const areaMap: Record<string, { count: number; totalRating: number; rated: number }> = {};
      diags.forEach(d => {
        const area = d.life_area || 'general';
        if (!areaMap[area]) areaMap[area] = { count: 0, totalRating: 0, rated: 0 };
        areaMap[area].count++;
        if (d.rating !== null) { areaMap[area].totalRating += d.rating; areaMap[area].rated++; }
      });

      const aStats = Object.entries(areaMap)
        .map(([area, s]) => ({ area, count: s.count, avgRating: s.rated > 0 ? s.totalRating / s.rated : 0, rated: s.rated }))
        .sort((a, b) => b.count - a.count);
      setAreaStats(aStats);

      // Global avg
      const allRated = diags.filter(d => d.rating !== null);
      setGlobalAvg(allRated.length > 0 ? allRated.reduce((s, d) => s + (d.rating || 0), 0) / allRated.length : 0);

      // Per-user stats
      const userMap: Record<string, { count: number; totalRating: number; rated: number; areas: Record<string, number> }> = {};
      diags.forEach(d => {
        if (!userMap[d.user_id]) userMap[d.user_id] = { count: 0, totalRating: 0, rated: 0, areas: {} };
        userMap[d.user_id].count++;
        const area = d.life_area || 'general';
        userMap[d.user_id].areas[area] = (userMap[d.user_id].areas[area] || 0) + 1;
        if (d.rating !== null) { userMap[d.user_id].totalRating += d.rating; userMap[d.user_id].rated++; }
      });

      const uStats = Object.entries(userMap).map(([uid, s]) => {
        const profile = profiles.find(p => p.user_id === uid);
        const topArea = Object.entries(s.areas).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';
        return { user_id: uid, full_name: profile?.full_name || uid.slice(0, 8), diagnostics: s.count, avgRating: s.rated > 0 ? s.totalRating / s.rated : 0, topArea };
      }).sort((a, b) => b.diagnostics - a.diagnostics);
      setUserStats(uStats);

      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="glass-card"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold font-display text-primary">{totalDiags}</p>
          <p className="text-xs text-muted-foreground">Diagnósticos totais</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold font-display">{globalAvg.toFixed(1)}/10</p>
          <p className="text-xs text-muted-foreground">Nota média global</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold font-display">{areaStats[0]?.area ? (areaLabels[areaStats[0].area]?.split(' ').slice(1).join(' ') || areaStats[0].area) : '—'}</p>
          <p className="text-xs text-muted-foreground">Área mais escolhida</p>
        </CardContent></Card>
      </div>

      {/* Area Ranking */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base font-display flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Ranking de Áreas</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>#</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Diagnósticos</TableHead>
              <TableHead>Nota Média</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {areaStats.map((a, i) => (
                <TableRow key={a.area}>
                  <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                  <TableCell>{areaLabels[a.area] || a.area}</TableCell>
                  <TableCell>{a.count}</TableCell>
                  <TableCell>
                    {a.rated > 0 ? (
                      <Badge variant={a.avgRating >= 7 ? 'default' : 'secondary'}><Star className="w-3 h-3 mr-1" />{a.avgRating.toFixed(1)}</Badge>
                    ) : <span className="text-xs text-muted-foreground">Sem notas</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per User */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base font-display flex items-center gap-2"><Users className="w-4 h-4" /> Diagnósticos por Usuário</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Nota Média</TableHead>
              <TableHead>Área Favorita</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {userStats.map(u => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell>{u.diagnostics}</TableCell>
                  <TableCell>{u.avgRating > 0 ? <Badge variant={u.avgRating >= 7 ? 'default' : 'secondary'}>{u.avgRating.toFixed(1)}</Badge> : '—'}</TableCell>
                  <TableCell className="text-sm">{areaLabels[u.topArea] || u.topArea}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost"><Eye className="w-3.5 h-3.5" /></Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Diagnósticos — {u.full_name}</DialogTitle></DialogHeader>
                        <DiagnosticHistory userId={u.user_id} isAdmin userName={u.full_name} />
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
