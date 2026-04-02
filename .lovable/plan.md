

# PROTOCOLO DE ALTA PERFORMANCE — Plano Completo

## Visão Geral
SaaS premium com tema dark, mobile-first, sistema de diagnóstico com IA, protocolo de 21 dias, gamificação e painel admin completo.

## Design System
- **Background**: #0B0B0B (principal), #121212 (cards)
- **Accent**: #FF6A00 (laranja vibrante)
- **Text**: #FFFFFF
- **Dark mode obrigatório**, animações suaves com Framer Motion

## Autenticação & Segurança (Lovable Cloud)
- Login/cadastro com email e senha
- RLS em todas as tabelas (isolamento total entre usuários)
- Tabela `user_roles` separada (admin/user)
- Super Admin definido por email configurável

## Banco de Dados (Tabelas principais)
- **profiles** — nome, avatar, status ativo/inativo
- **user_roles** — admin/user
- **credits** — saldo, histórico de consumo
- **diagnostic_responses** — respostas do formulário
- **diagnostic_results** — análise gerada pela IA
- **protocol_days** — 21 dias de conteúdo (ação, desafio, reflexão)
- **user_progress** — check diário, inputs, completude
- **llm_settings** — configuração global e por usuário de qual LLM usar
- **api_keys** — chaves de API de LLMs externas (criptografadas)

## Módulos do Usuário

### 1. Diagnóstico Inicial
- Formulário multi-step com perguntas sobre dores, frustrações, objetivos, identidade, medos
- IA gera: análise comportamental, padrão identificado, bloqueio principal, previsão futura, direcionamento
- Consome créditos

### 2. Mapa da Pessoa
- Tela visual com resultado do diagnóstico
- Opção de download como imagem/PDF

### 3. Protocolo 21 Dias
- Calendário visual com os 21 dias
- Cada dia: ação prática, micro desafio, reflexão
- Botão "Concluído" com input rápido
- Progresso visual (barra, porcentagem)
- Conteúdo base pré-definido, personalizado por IA baseado no diagnóstico

### 4. Dashboard do Usuário
- KPIs: consistência %, dias consecutivos, execução, evolução
- Gráficos de progresso ao longo dos dias
- Score de performance (Iniciante → Inconsistente → Disciplinado → Alta Performance)
- Sistema de streak com alertas visuais

### 5. Relatório Final
- Antes vs depois, padrões, evolução, recomendação
- Gerado por IA (consome créditos)
- Download em PDF personalizado

### 6. Gamificação & Retenção
- Streak de dias consecutivos
- Alertas: "Você está perdendo consistência", "Faltam X dias"
- Progresso visual em todas as telas

## Painel Super Admin

### Gestão de Usuários
- Listar todos os usuários com busca/filtro
- Criar, editar, ativar/desativar usuários
- Visualizar dados de qualquer usuário (modo admin)

### Sistema de Créditos
- Ver saldo de cada usuário
- Adicionar/remover créditos manualmente
- Histórico completo de consumo
- Configurar créditos iniciais padrão

### Configuração de LLMs
- Adicionar API keys de: OpenAI (GPT), Anthropic (Claude), Google (Gemini), Groq, DeepSeek, Perplexity, e Lovable AI nativa
- Escolher LLM padrão global
- Definir LLM específico por usuário (override)
- Toggle para usar Lovable AI nativa como fallback

## Telas (8 telas principais)
1. **Login / Cadastro** — tela premium com branding
2. **Dashboard** — KPIs, gráficos, streak, score
3. **Diagnóstico** — formulário multi-step
4. **Mapa da Pessoa** — resultado visual
5. **Protocolo 21 Dias** — calendário + dia atual
6. **Progresso** — gráficos detalhados
7. **Relatório Final** — geração e download PDF
8. **Configurações** — perfil do usuário
9. **Admin Panel** — gestão completa (usuários, créditos, LLMs)

## Tecnologia
- **Frontend**: React + Tailwind + Framer Motion
- **Backend**: Lovable Cloud (Supabase)
- **IA**: Edge Function que roteia para o LLM configurado (Lovable AI, OpenAI, Groq, etc.)
- **PDF**: Geração via reportlab ou similar no edge function
- **Idioma**: Português (BR)

