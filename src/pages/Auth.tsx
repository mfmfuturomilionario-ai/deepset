import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Flame, Eye, EyeOff } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        toast.success('Login realizado com sucesso!');
        navigate('/dashboard');
      } else {
        await signUp(email, password, fullName);
        toast.success('Conta criada! Verifique seu email.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 gradient-orange rounded-lg flex items-center justify-center">
              <Flame className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold font-display text-gradient">PROTOCOLO</h1>
          </div>
          <p className="text-muted-foreground text-sm">Alta Performance em 21 dias</p>
        </div>

        <div className="glass-card p-6 md:p-8">
          <div className="flex gap-2 mb-6">
            <Button
              variant={isLogin ? 'default' : 'secondary'}
              className="flex-1"
              onClick={() => setIsLogin(true)}
            >
              Entrar
            </Button>
            <Button
              variant={!isLogin ? 'default' : 'secondary'}
              className="flex-1"
              onClick={() => setIsLogin(false)}
            >
              Cadastrar
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Seu nome"
                    required={!isLogin}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full gradient-orange text-primary-foreground font-semibold" disabled={loading}>
              {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
