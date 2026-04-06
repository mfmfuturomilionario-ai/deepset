import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { mode, life_area, sub_goals, context: userContext, responses } = body;

    // MODE 1: Generate questions for a life area
    if (mode === "generate_questions") {
      if (!life_area) throw new Error("Missing life_area");

      // Get user context if exists
      const { data: existingContext } = await supabaseClient
        .from('user_context')
        .select('key_insights, history_summary')
        .eq('user_id', user.id)
        .eq('area', life_area)
        .maybeSingle();

      // Deduct 0 credits for question generation (free)
      const apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      const apiKey = Deno.env.get("LOVABLE_API_KEY")!;

      // Get LLM settings
      const { data: userLLM } = await supabaseClient.from('llm_settings').select('provider, model').eq('scope', 'user').eq('user_id', user.id).eq('is_active', true).limit(1).maybeSingle();
      const { data: globalLLM } = await supabaseClient.from('llm_settings').select('provider, model').eq('scope', 'global').eq('is_active', true).limit(1).maybeSingle();
      const llm = userLLM || globalLLM || { provider: 'lovable', model: 'google/gemini-3-flash-preview' };

      let finalApiUrl = apiUrl;
      let finalApiKey = apiKey;
      let model = llm.model || "google/gemini-3-flash-preview";
      let isAnthropic = false;

      if (llm.provider !== 'lovable') {
        const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data: keyData } = await adminClient.from('api_keys').select('api_key').eq('provider', llm.provider).eq('is_active', true).limit(1).maybeSingle();
        if (keyData) {
          finalApiKey = keyData.api_key;
          switch (llm.provider) {
            case 'openai': finalApiUrl = "https://api.openai.com/v1/chat/completions"; model = model === 'default' ? "gpt-4o-mini" : model; break;
            case 'anthropic': finalApiUrl = "https://api.anthropic.com/v1/messages"; model = model === 'default' ? "claude-3-5-sonnet-20241022" : model; isAnthropic = true; break;
            case 'google': finalApiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"; model = model === 'default' ? "gemini-2.0-flash" : model; break;
            case 'groq': finalApiUrl = "https://api.groq.com/openai/v1/chat/completions"; model = model === 'default' ? "llama-3.3-70b-versatile" : model; break;
            case 'deepseek': finalApiUrl = "https://api.deepseek.com/v1/chat/completions"; model = model === 'default' ? "deepseek-chat" : model; break;
            case 'perplexity': finalApiUrl = "https://api.perplexity.ai/chat/completions"; model = model === 'default' ? "sonar" : model; break;
          }
        } else {
          console.log(`No API key found for provider ${llm.provider}, falling back to Lovable AI`);
          // Fallback to Lovable
        }
      }

      const contextStr = existingContext
        ? `\n\nCONTEXTO PRÉVIO DO USUÁRIO:\nInsights: ${JSON.stringify(existingContext.key_insights)}\nHistórico: ${existingContext.history_summary}`
        : '';

      const qPrompt = `Você é o agente DeepSet 360. O usuário escolheu a área "${life_area}".
Sub-metas: ${sub_goals || 'Não especificadas'}
${contextStr}

Gere 5-7 perguntas profundas e personalizadas para diagnosticar a situação do usuário nesta área.

Cada pergunta deve ser específica para a área escolhida. Por exemplo:
- Para "business": pergunte sobre nicho, experiência, faturamento atual, público-alvo, canais
- Para "finance": pergunte sobre renda, dívidas, investimentos, metas financeiras
- Para "relationships": pergunte sobre padrões relacionais, comunicação, conflitos
- Para "health": pergunte sobre rotina, alimentação, sono, exercícios, energia

As perguntas devem escavar em 4 camadas: sintoma, padrão, estrutura e raiz.`;

      const qResponse = await fetch(finalApiUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${finalApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: qPrompt },
            { role: "user", content: `Gere as perguntas para a área: ${life_area}` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "generate_questions",
              description: "Generate diagnostic questions for a life area",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        key: { type: "string", description: "Unique key like q1, q2..." },
                        title: { type: "string", description: "Short title (2-4 words)" },
                        question: { type: "string", description: "The full question" },
                        placeholder: { type: "string", description: "Placeholder hint for the textarea" },
                      },
                      required: ["key", "title", "question", "placeholder"],
                    },
                  },
                },
                required: ["questions"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "generate_questions" } },
        }),
      });

      if (!qResponse.ok) {
        console.error("AI error generating questions:", qResponse.status);
        throw new Error("Failed to generate questions");
      }

      const qData = await qResponse.json();
      let questions;
      try {
        const toolCall = qData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall) {
          questions = JSON.parse(toolCall.function.arguments).questions;
        } else {
          const content = qData.choices?.[0]?.message?.content || "[]";
          questions = JSON.parse(content).questions || JSON.parse(content);
        }
      } catch {
        // Fallback questions
        questions = [
          { key: "q1", title: "Situação Atual", question: "Descreva sua situação atual nesta área. O que está funcionando e o que não está?", placeholder: "Descreva com detalhes..." },
          { key: "q2", title: "Maiores Dores", question: "Quais são as maiores dores e frustrações que você sente nesta área?", placeholder: "O que te incomoda mais..." },
          { key: "q3", title: "Objetivos", question: "Onde você quer estar nesta área em 90 dias? E em 1 ano?", placeholder: "Seus objetivos..." },
          { key: "q4", title: "Bloqueios", question: "O que te impede de avançar? Quais padrões se repetem?", placeholder: "O que te trava..." },
          { key: "q5", title: "Recursos", question: "Que recursos, habilidades e experiências você já tem que podem te ajudar?", placeholder: "O que você já tem a seu favor..." },
        ];
      }

      return new Response(JSON.stringify({ questions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE 2: Generate diagnosis + protocol (default)
    if (!responses) throw new Error("Missing responses");

    // Deduct credits
    const { data: canDeduct } = await supabaseClient.rpc('deduct_credits', {
      _user_id: user.id,
      _amount: 1,
      _description: `Diagnóstico DeepSet - ${life_area || 'geral'}`
    });

    if (!canDeduct) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get LLM settings
    const { data: userLLM } = await supabaseClient.from('llm_settings').select('provider, model').eq('scope', 'user').eq('user_id', user.id).eq('is_active', true).limit(1).maybeSingle();
    const { data: globalLLM } = await supabaseClient.from('llm_settings').select('provider, model').eq('scope', 'global').eq('is_active', true).limit(1).maybeSingle();
    const llm = userLLM || globalLLM || { provider: 'lovable', model: 'google/gemini-3-flash-preview' };

    let apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
    let apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    let model = llm.model || "google/gemini-3-flash-preview";

    if (llm.provider !== 'lovable') {
      const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: keyData } = await adminClient.from('api_keys').select('api_key').eq('provider', llm.provider).eq('is_active', true).limit(1).maybeSingle();
      if (keyData) {
        apiKey = keyData.api_key;
        switch (llm.provider) {
          case 'openai': apiUrl = "https://api.openai.com/v1/chat/completions"; model = model || "gpt-4o-mini"; break;
          case 'groq': apiUrl = "https://api.groq.com/openai/v1/chat/completions"; model = model || "llama-3.3-70b-versatile"; break;
          case 'deepseek': apiUrl = "https://api.deepseek.com/v1/chat/completions"; model = model || "deepseek-chat"; break;
          case 'perplexity': apiUrl = "https://api.perplexity.ai/chat/completions"; model = model || "sonar"; break;
        }
      }
    }

    // Get user context
    const { data: existingContext } = await supabaseClient
      .from('user_context')
      .select('key_insights, history_summary')
      .eq('user_id', user.id)
      .eq('area', life_area || 'general')
      .maybeSingle();

    const contextStr = existingContext
      ? `\n\nCONTEXTO PRÉVIO:\nInsights: ${JSON.stringify(existingContext.key_insights)}\nHistórico: ${existingContext.history_summary}`
      : '';

    const areaSpecificInstructions = getAreaInstructions(life_area || 'general');

    const systemPrompt = `Você é o agente DeepSet 360 — um analista comportamental e estratégico de alta performance.

ÁREA DE FOCO: ${life_area || 'geral'}
SUB-METAS: ${sub_goals || 'Não especificadas'}
${contextStr}

METODOLOGIA: Diagnóstico em 4 camadas progressivas:
1. SINTOMA — o que o indivíduo descreve conscientemente
2. PADRÃO — a estrutura do comportamento
3. ESTRUTURA — crenças, medos e loops que sustentam o padrão
4. RAIZ — a crença fundamental ou momento de instalação

${areaSpecificInstructions}

OS 5 PADRÕES PRIMÁRIOS DE BLOQUEIO:
- HAR (Hiperatividade Reativa)
- PP (Perfeccionismo Paralisante)
- PG (Procrastinação Genética)
- SDP (Síndrome do Próximo Passo)
- AF (Autossabotagem Funcional)

PRINCÍPIO: O bloqueio não é ausência de capacidade — é presença de uma prioridade oculta.

Retorne o diagnóstico completo E um protocolo personalizado de 21 dias.
O protocolo deve ter ações PRÁTICAS e ESPECÍFICAS para a área "${life_area || 'geral'}", dividido em:
- Dias 1-7: RESET (desconstruir padrões limitantes)
- Dias 8-14: RECALIBRAÇÃO (instalar novos padrões)
- Dias 15-21: DOMÍNIO (consolidar e escalar)`;

    const responsesText = Object.entries(responses)
      .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
      .join('\n\n');

    const aiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `RESPOSTAS DO DIAGNÓSTICO:\n\n${responsesText}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_diagnosis_and_protocol",
            description: "Generate a complete DeepSet diagnosis and 21-day personalized protocol",
            parameters: {
              type: "object",
              properties: {
                behavioral_analysis: { type: "string", description: "Análise comportamental profunda em 4 camadas. 3-5 parágrafos." },
                pattern: { type: "string", description: "Padrão de bloqueio dominante e perfil de execução. 2-3 parágrafos." },
                main_block: { type: "string", description: "O bloqueio raiz identificado. 2-3 parágrafos." },
                future_prediction: { type: "string", description: "Previsão sem intervenção. 2-3 parágrafos." },
                direction: { type: "string", description: "Direcionamento estratégico personalizado. 3-5 parágrafos." },
                protocol: {
                  type: "array",
                  description: "Protocolo de 21 dias personalizado",
                  items: {
                    type: "object",
                    properties: {
                      day: { type: "number" },
                      title: { type: "string" },
                      action: { type: "string" },
                      challenge: { type: "string" },
                      reflection: { type: "string" },
                    },
                    required: ["day", "title", "action", "challenge", "reflection"],
                  },
                },
              },
              required: ["behavioral_analysis", "pattern", "main_block", "future_prediction", "direction", "protocol"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_diagnosis_and_protocol" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Tente novamente em breve." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      throw new Error("AI request failed");
    }

    const aiData = await aiResponse.json();
    let result;

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        result = JSON.parse(toolCall.function.arguments);
      } else {
        const content = aiData.choices?.[0]?.message?.content || "";
        result = JSON.parse(content);
      }
    } catch {
      result = {
        behavioral_analysis: aiData.choices?.[0]?.message?.content || "Análise não disponível",
        pattern: "Padrão em análise",
        main_block: "Bloqueio em análise",
        future_prediction: "Previsão em análise",
        direction: "Direcionamento em análise",
        protocol: [],
      };
    }

    const { protocol, ...analysis } = result;

    // Update user_context
    await supabaseClient.from('user_context').upsert({
      user_id: user.id,
      area: life_area || 'general',
      key_insights: [{ date: new Date().toISOString(), pattern: analysis.pattern?.substring(0, 200), block: analysis.main_block?.substring(0, 200) }],
      history_summary: `Diagnóstico realizado em ${new Date().toLocaleDateString('pt-BR')} para área ${life_area}. Padrão: ${analysis.pattern?.substring(0, 100)}`,
    }, { onConflict: 'user_id,area' });

    return new Response(JSON.stringify({ analysis, generated_protocol: protocol || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getAreaInstructions(area: string): string {
  const instructions: Record<string, string> = {
    business: `INSTRUÇÕES ESPECÍFICAS PARA NEGÓCIOS:
- Analise: nicho, público-alvo, proposta de valor, canais de aquisição
- No protocolo inclua: definir MVP, criar oferta irresistível, prospectar clientes, posicionar marca, construir esteira de produtos
- Considere: faturamento atual, meta financeira, experiência empreendedora`,
    finance: `INSTRUÇÕES ESPECÍFICAS PARA FINANÇAS:
- Analise: renda atual, dívidas, padrões de gasto, investimentos
- No protocolo inclua: diagnóstico financeiro, corte de gastos, reserva de emergência, fontes de renda, investimento
- Considere: metas de curto/médio/longo prazo`,
    relationships: `INSTRUÇÕES ESPECÍFICAS PARA RELACIONAMENTOS:
- Analise: padrões de apego, comunicação, limites, feridas emocionais
- No protocolo inclua: autoconhecimento relacional, comunicação assertiva, vulnerabilidade, limites saudáveis`,
    health: `INSTRUÇÕES ESPECÍFICAS PARA SAÚDE:
- Analise: sono, alimentação, exercício, energia, saúde mental
- No protocolo inclua: rotina matinal, alimentação consciente, movimento diário, gestão de estresse`,
    sales: `INSTRUÇÕES ESPECÍFICAS PARA VENDAS:
- Analise: processo comercial, objeções, scripts, follow-up, conversão
- No protocolo inclua: definir ICP, criar scripts, prospecção diária, contornar objeções, fechar mais`,
    positioning: `INSTRUÇÕES ESPECÍFICAS PARA POSICIONAMENTO:
- Analise: marca pessoal, presença digital, autoridade, diferenciação
- No protocolo inclua: definir nicho de autoridade, conteúdo estratégico, networking, visibilidade`,
    leadership: `INSTRUÇÕES ESPECÍFICAS PARA LIDERANÇA:
- Analise: estilo de liderança, gestão de equipe, delegação, decisão
- No protocolo inclua: autoconhecimento como líder, feedback, delegação, cultura de equipe`,
    career: `INSTRUÇÕES ESPECÍFICAS PARA CARREIRA:
- Analise: satisfação atual, habilidades, mercado, transição
- No protocolo inclua: mapeamento de competências, networking estratégico, portfólio, transição planejada`,
  };
  return instructions[area] || `Adapte o diagnóstico e protocolo para a área "${area}" com ações práticas e específicas.`;
}
