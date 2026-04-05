

# DeepSet 360 --- Sistema Inteligente Multi-Area

## Visao Geral

Transformar o DeepSet de um protocolo fixo de 21 dias em um **sistema de inteligencia adaptativa 360** que cobre todas as areas da vida. O usuario escolhe a area de foco (negocio, financas, relacionamento, saude, etc.), a IA gera perguntas personalizadas, diagnostico, protocolo de 21 dias e fases --- tudo sob medida.

O sistema se retroalimenta: acumula dados de todos os usuarios, aprende o que funciona, e fica progressivamente mais assertivo e personalizado.

---

## Arquitetura da Mudanca

```text
ANTES (fixo):
  Diagnostico (5 perguntas fixas) -> Mapa -> Protocolo 21 dias (fixo) -> Relatorio

DEPOIS (adaptativo):
  Selecao de Area -> Perguntas Geradas por IA -> Diagnostico Personalizado
  -> Protocolo 21 dias GERADO por IA (personalizado)
  -> Fases geradas sob demanda -> Retroalimentacao continua
```

---

## PARTE 1: Banco de Dados --- Novas Tabelas e Alteracoes

### 1A. Nova tabela `life_areas`
Areas de vida que o usuario pode escolher:
- `id`, `key` (business, finance, relationships, health, spirituality, positioning, sales, habits, etc.)
- `name`, `description`, `icon`, `sort_order`

### 1B. Alterar `diagnostic_responses`
Adicionar coluna `life_area` (text) para saber qual area o diagnostico aborda.

### 1C. Alterar `diagnostic_results`
Adicionar coluna `life_area` (text) + `generated_protocol` (jsonb) --- o protocolo de 21 dias gerado pela IA para aquela area.

### 1D. Nova tabela `user_context`
Perfil cumulativo do usuario que o sistema usa para se retroalimentar:
- `user_id`, `area`, `key_insights` (jsonb), `history_summary` (text), `effectiveness_score` (float), `updated_at`
- A cada diagnostico/progresso, o sistema atualiza este perfil

### 1E. Nova tabela `system_patterns`
Padroes do sistema aprendidos globalmente:
- `id`, `area`, `pattern_type`, `pattern_data` (jsonb), `sample_size` (int), `effectiveness` (float), `updated_at`
- Armazena o que funciona melhor por area, tipo de pessoa, etc.

### 1F. Seed `life_areas`
Inserir ~12 areas: Negocios, Financas, Relacionamentos, Saude, Espiritualidade, Posicionamento, Vendas, Habitos, Performance Mental, Lideranca, Carreira, Criatividade.

---

## PARTE 2: Fluxo de Diagnostico Adaptativo

### 2A. Nova Tela de Selecao de Area (antes do Diagnostico)
- Grid visual com as 12+ areas
- Usuario seleciona uma area
- Pode selecionar sub-metas (ex: "Negocios" -> meta de 10K/mes, construir MVP, esteira de produtos)
- Informacoes adicionais contextuais (experiencia, situacao atual, meta financeira se aplicavel)

### 2B. Perguntas Geradas pela IA
- Ao selecionar area, o sistema envia para a Edge Function `ai-diagnostic` a area + sub-metas
- A IA gera 5-7 perguntas PERSONALIZADAS para aquela area
- Frontend exibe as perguntas geradas dinamicamente (nao mais hardcoded)

### 2C. Diagnostico + Protocolo Gerado
- A IA analisa as respostas E gera:
  1. Diagnostico completo (4 camadas, como ja existe)
  2. Protocolo de 21 dias PERSONALIZADO (titulo, acao, desafio, reflexao para cada dia)
  3. Direcionamento estrategico especifico para a area
- O protocolo gerado e salvo em `diagnostic_results.generated_protocol`

### 2D. Atualizar Edge Function `ai-diagnostic`
- Receber `life_area`, `sub_goals`, `context` alem de `responses`
- Prompt adaptado por area (negocios: MVP, esteira, posicionamento; financas: dividas, investimento, etc.)
- Tool call retorna `analysis` + `generated_protocol` (array de 21 dias)
- Buscar `user_context` para enriquecer o prompt com historico

---

## PARTE 3: Protocolo Dinamico

### 3A. Protocolo.tsx Adaptativo
- Se o usuario tem `generated_protocol` no diagnostico, usa ele
- Senao, fallback para `protocol_days` (tabela fixa atual)
- Cada dia mostra a acao, desafio e reflexao gerados pela IA

### 3B. Fases Geradas Sob Demanda
- Ao completar os 21 dias, o sistema pode gerar automaticamente a proxima fase
- Edge Function `ai-generate-phase` cria Momentum/Mastery baseado no progresso real
- Insere em `phase_days` dinamicamente

---

## PARTE 4: Sistema de Retroalimentacao

### 4A. Apos cada dia completado
- Salvar nota + rating de dificuldade
- Edge Function leve que atualiza `user_context` com insights cumulativos

### 4B. Ao final do protocolo
- IA analisa o que funcionou vs nao funcionou
- Atualiza `system_patterns` com dados anonimizados
- Sugere proximo foco baseado em lacunas

### 4C. IA Coach Contextual
- O Coach ja tem acesso ao diagnostico; agora tambem tera acesso a:
  - Area de foco atual
  - Protocolo personalizado
  - Progresso dia-a-dia
  - Historico cumulativo (`user_context`)
- Respostas cada vez mais precisas

---

## PARTE 5: Notificacoes e Alertas

### 5A. Sistema de Alertas no Dashboard
- "Voce nao completou o dia de ontem --- sua streak esta em risco"
- "Seu protocolo recomenda [acao X] hoje"
- "Novo insight desbloqueado baseado no seu progresso"

### 5B. Proximos Passos Inteligentes
- Widget no Dashboard mostrando os 3 proximos passos recomendados pela IA
- Baseado no progresso + area + user_context

---

## PARTE 6: Negocios e Metas Financeiras

Quando a area for "Negocios" ou "Financas":
- Perguntas incluem: experiencia, nicho, publico, meta financeira, canais
- Protocolo gera acoes praticas: definir MVP, criar oferta, prospectar, posicionar
- Mapa inclui: esteira de produtos, posicionamento, plano de receita
- Coach orienta sobre execucao especifica do negocio

---

## Ordem de Execucao

1. **Migration**: Criar `life_areas`, `user_context`, `system_patterns`, alterar `diagnostic_responses` e `diagnostic_results`
2. **Seed**: Popular `life_areas` com 12 areas
3. **Tela de Selecao de Area**: Nova pagina/step antes do diagnostico
4. **Edge Function `ai-diagnostic` v2**: Receber area, gerar perguntas + protocolo personalizado
5. **Diagnostic.tsx**: Fluxo dinamico (selecao -> perguntas geradas -> envio)
6. **Protocol.tsx**: Usar protocolo gerado quando disponivel
7. **Dashboard**: Alertas inteligentes + proximos passos
8. **AI Coach**: Contexto expandido
9. **Retroalimentacao**: user_context + system_patterns
10. **Notificacoes visuais**: Streak alerts, recomendacoes

---

## Detalhes Tecnicos

- **Edge Functions**: `ai-diagnostic` expandida, nova `ai-generate-phase`
- **Frontend**: ~4 paginas alteradas (Diagnostic, Protocol, Dashboard, AI Coach)
- **Banco**: 3 novas tabelas, 2 colunas novas
- **IA**: Prompts adaptativos por area com tool calling para output estruturado
- **Sem breaking changes**: Usuarios existentes continuam funcionando (fallback para protocolo fixo)

