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

    // Deduct 2 credits
    const { data: canDeduct } = await supabaseClient.rpc('deduct_credits', {
      _user_id: user.id,
      _amount: 2,
      _description: 'Relatório Final DeepSet AI'
    });

    if (!canDeduct) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes (necessário: 2)" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get user data
    const [diagRes, progressRes] = await Promise.all([
      supabaseClient.from('diagnostic_results').select('analysis').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseClient.from('user_progress').select('*').eq('user_id', user.id).order('day_number'),
    ]);

    const diagnosis = diagRes.data?.analysis || {};
    const progress = progressRes.data || [];
    const completedDays = progress.filter((p: any) => p.completed).length;

    // Get LLM config
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

    const systemPrompt = `Você é o agente DeepSet — analista de alta performance. Gere um relatório final completo em português do Brasil.

FRAMEWORK DE ANÁLISE:
- Compare o padrão de bloqueio identificado no diagnóstico vs. o comportamento durante os 21 dias
- Avalie a transição entre as 3 fases: Reset (dias 1-7), Recalibração (dias 8-14), Domínio (dias 15-21)
- Identifique qual dos 5 perfis de execução o usuário demonstrou e como evoluiu
- Analise consistência como indicador principal (não intensidade)

SCORE DE DOMÍNIO:
- Iniciante (0-5 dias): Ainda no padrão antigo
- Inconsistente (6-11 dias): Em transição, oscilando entre padrões
- Disciplinado (12-17 dias): Novo padrão emergindo com consistência
- Alta Performance (18-21 dias): Domínio instalado, auto-governo funcional

Retorne EXATAMENTE um JSON:
{
  "antes_vs_depois": "Comparação detalhada do estado antes (diagnóstico) vs depois (21 dias) — padrão de bloqueio, perfil de execução, crenças",
  "padroes_identificados": "Padrões comportamentais que emergiram: quais bloqueios foram superados, quais persistem, novos padrões instalados",
  "evolucao": "Análise da evolução fase a fase: Reset → Recalibração → Domínio. Onde houve mais evolução e onde houve resistência",
  "pontos_fortes": "Pontos fortes demonstrados — momentos de consistência, resiliência, decisões que quebraram o padrão antigo",
  "areas_melhoria": "Áreas que ainda precisam de atenção — padrões residuais, gatilhos que ainda ativam o bloqueio",
  "recomendacoes": "Recomendações estratégicas pós-protocolo para manter o novo padrão de alta performance"
}`;

    const userPrompt = `DIAGNÓSTICO INICIAL DEEPSET: ${JSON.stringify(diagnosis)}
PROGRESSO: ${completedDays}/21 dias completados
DADOS DE PROGRESSO: ${JSON.stringify(progress.map((p: any) => ({ dia: p.day_number, concluido: p.completed, notas: p.notes })))}`;

    const aiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "generate_report",
            description: "Generate a DeepSet final performance report",
            parameters: {
              type: "object",
              properties: {
                antes_vs_depois: { type: "string" },
                padroes_identificados: { type: "string" },
                evolucao: { type: "string" },
                pontos_fortes: { type: "string" },
                areas_melhoria: { type: "string" },
                recomendacoes: { type: "string" },
              },
              required: ["antes_vs_depois", "padroes_identificados", "evolucao", "pontos_fortes", "areas_melhoria", "recomendacoes"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_report" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI error:", aiResponse.status, await aiResponse.text());
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Tente em breve." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Contate o administrador." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      throw new Error("AI failed");
    }

    const aiData = await aiResponse.json();
    let report;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      report = toolCall ? JSON.parse(toolCall.function.arguments) : JSON.parse(aiData.choices?.[0]?.message?.content || "{}");
    } catch {
      report = { resumo: aiData.choices?.[0]?.message?.content || "Relatório não disponível" };
    }

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
