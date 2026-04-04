import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { MessageSquare, X, Send, Loader2, Bot, User, Minimize2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AICoach() {
  const { user, credits, refreshCredits } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user || loading) return;
    if (credits < 1) {
      toast.error('Créditos insuficientes para o IA Coach');
      return;
    }

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { message: userMsg.content, history: messages.slice(-10) },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      const assistantMsg: Message = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, assistantMsg]);
      await refreshCredits();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao conversar com IA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full gradient-orange shadow-2xl flex items-center justify-center glow-orange"
          >
            <MessageSquare className="w-6 h-6 text-primary-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-6rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-orange flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-display font-bold">IA Coach DeepSet</p>
                  <p className="text-xs text-muted-foreground">1 crédito por mensagem</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <Bot className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <p className="font-display font-bold">Olá! Sou seu Coach DeepSet.</p>
                  <p className="mt-1 text-xs">Posso te ajudar com dúvidas, estratégias e motivação baseado no seu diagnóstico e progresso.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-secondary text-foreground rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="bg-secondary rounded-2xl rounded-bl-sm px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Digite sua mensagem..."
                  className="min-h-[40px] max-h-[100px] resize-none text-sm"
                  rows={1}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  size="icon"
                  className="gradient-orange text-primary-foreground flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
