# DeepSet — Expansão Completa + PDF Premium

## PARTE 1: Expansão do Sistema (Gamificação + Fases + IA)

### 1A. Banco de Dados — Novas Tabelas
Criar via migration:
- `achievements` — badges/conquistas desbloqueáveis (id, key, title, description, icon, xp_reward, condition_type, condition_value)
- `user_achievements` — conquistas do usuário (user_id, achievement_id, unlocked_at)
- `user_stats` — XP, level, total_streak_best (user_id, xp, level, best_streak, total_days_completed, current_phase)
- `phases` — fases do sistema (id, order, name, description, days_count, unlock_condition)
- `phase_days` — dias de cada fase (id, phase_id, day_number, title, action, challenge, reflection)
- `user_phase_progress` — progresso do usuário por fase (user_id, phase_id, day_number, completed, notes, completed_at)
- `ai_conversations` — histórico de conversas com IA coach (user_id, messages JSONB, created_at)

### 1B. Fases do Sistema
1. **DeepSet Original** (21 dias) — Reset → Recalibração → Domínio
2. **DeepSet Momentum** (14 dias) — Desbloqueia após completar Original. Foco em manter hábitos
3. **DeepSet Mastery** (21 dias) — Nível avançado, desafios mais intensos
4. **DeepSet Infinity** (contínuo) — Desafios semanais rotativos, nunca acaba

### 1C. Sistema de Gamificação
- **XP**: Ganhar XP por completar dias, streaks, conquistas
- **Níveis**: 1-50 com nomes temáticos (Despertar, Foco, Domínio, Mestre, Lenda)
- **Conquistas**: ~15 badges (Primeiro Dia, Streak 7, Streak 21, Fase Completa, etc.)
- **Streak System**: Multiplicador de XP por streak consecutiva

### 1D. IA Coach Nativa
- Chat com IA integrado ao contexto do usuário (diagnóstico + progresso)
- Edge function `ai-coach` que recebe mensagem + contexto e responde
- Custo: 1 crédito por conversa

### 1E. Novas Páginas/Componentes
- Refatorar Dashboard com XP, nível, conquistas
- Nova seção "Conquistas" no menu
- Nova seção "Fases" que mostra todas as fases e progresso
- Chat com IA coach acessível de qualquer página

---

## PARTE 2: Sistema de PDF Premium

### 2A. Abordagem
- Usar **reportlab** (Python) via script local para gerar PDF server-side
- OU usar **jsPDF + html2canvas** client-side
- **Escolha: Client-side com jsPDF** — mais prático, sem dependência de servidor Python

### 2B. Implementação
- Instalar `jspdf` e `html2canvas`
- Criar componente `PremiumPDFExporter` reutilizável
- Gerar PDFs para:
  - **Mapa da Pessoa** (diagnóstico completo)
  - **Relatório Final** (evolução + análise)
- Cada PDF terá:
  - Capa com logo DEEPSET + subtítulo
  - Página de abertura
  - Sumário
  - Conteúdo em seções com cards escuros, destaques laranja
  - Footer com branding

### 2C. Visual do PDF
- Background: #0A0A0A
- Cards: #1A1A1A com border sutil
- Texto: #FFFFFF
- Destaques: #FF6A00
- Tipografia: hierarquia clara H1/H2/H3
- Elementos visuais: barras, ícones, separadores

---

## Ordem de Execução
1. Migration do banco (novas tabelas + seed de fases/conquistas)
2. Sistema de PDF Premium (jsPDF)
3. Gamificação (XP, níveis, conquistas)
4. Novas fases além dos 21 dias
5. IA Coach
6. Dashboard expandido
7. Testes e deploy
