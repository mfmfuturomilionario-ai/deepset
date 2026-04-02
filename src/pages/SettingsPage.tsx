import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Settings as SettingsIcon, User, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('user_id', user.id);
      if (error) throw error;
      toast.success('Perfil atualizado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-primary" /> Configurações
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie seu perfil</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <User className="w-4 h-4" /> Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled />
            </div>
            <div>
              <Label>Nome completo</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="gradient-orange text-primary-foreground">
              <Save className="w-4 h-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
