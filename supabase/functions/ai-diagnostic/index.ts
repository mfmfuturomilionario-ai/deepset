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

    const { responses } = await req.json();
    if (!responses) throw new Error("Missing responses");

    // Deduct credits
    const { data: canDeduct } = await supabaseClient.rpc('deduct_credits', {
      _user_id: user.id,
      _amount: 1,
      _description: 'Diagnóstico DeepSet AI'
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

    const systemPrompt = `Você é o agente DeepSet — um analista comportamental de alta performance baseado no Playbook DeepSet.

METODOLOGIA: Você diagnostica em 4 camadas progressivas:
1. SINTOMA — o que o indivíduo descreve conscientemente
2. PADRÃO — a estrutura do comportamento (frequência, contexto, gatilhos)
3. ESTRUTURA — crenças, medos, identidades e loops neurais que sustentam o padrão
4. RAIZ — a crença fundamental ou momento de instalação do padrão

OS 5 PADRÕES PRIMÁRIOS DE BLOQUEIO:
- HAR (Hiperatividade Reativa): movimento constante sem progresso real
- PP (Perfeccionismo Paralisante): espera pela condição perfeita que nunca chega
- PG (Procrastinação Genética): evitação baseada em desconforto emocional
- SDP (Síndrome do Próximo Passo): dependência de validação externa
- AF (Autossabotagem Funcional): fracasso deliberado para evitar sucesso

OS 5 PERFIS DE EXECUÇÃO:
1. Potencial Represado — alta capacidade, baixa execução
2. Executor Exausto — alta execução, baixa eficiência
3. Disperso Criativo — alta geração de ideias, baixa implementação
4. Perfeccionista Invisível — alta qualidade, baixa visibilidade
5. Inconsistente Cíclico — alta performance em picos, colapso entre eles

PRINCÍPIO: O bloqueio não é ausência de capacidade — é presença de uma prioridade oculta.

Retorne EXATAMENTE um JSON com estas chaves:
{
  "behavioral_analysis": "Análise comportamental profunda em 4 camadas (sintoma → padrão → estrutura → raiz). 3-5 parágrafos.",
  "pattern": "Qual dos 5 padrões de bloqueio é dominante e qual perfil de execução se encaixa. 2-3 parágrafos.",
  "main_block": "O bloqueio raiz — a crença fundamental ou prioridade oculta que impede o crescimento. 2-3 parágrafos.",
  "future_prediction": "Previsão do que acontecerá se o padrão atual continuar sem intervenção. 2-3 parágrafos.",
  "direction": "Direcionamento estratégico personalizado baseado no perfil identificado. 3-5 parágrafos."
}`;

    const userPrompt = `RESPOSTAS DO DIAGNÓSTICO DEEPSET:

DORES: ${responses.pains}

FRUSTRAÇÕES: ${responses.frustrations}

OBJETIVOS: ${responses.goals}

IDENTIDADE: ${responses.identity}

MEDOS: ${responses.fears}`;

    const aiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_diagnosis",
            description: "Generate a DeepSet behavioral diagnosis",
            parameters: {
              type: "object",
              properties: {
                behavioral_analysis: { type: "string" },
                pattern: { type: "string" },
                main_block: { type: "string" },
                future_prediction: { type: "string" },
                direction: { type: "string" },
              },
              required: ["behavioral_analysis", "pattern", "main_block", "future_prediction", "direction"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_diagnosis" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em breve." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Contate o administrador." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      throw new Error("AI request failed");
    }

    const aiData = await aiResponse.json();
    let analysis;
    
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        analysis = JSON.parse(toolCall.function.arguments);
      } else {
        const content = aiData.choices?.[0]?.message?.content || "";
        analysis = JSON.parse(content);
      }
    } catch {
      analysis = {
        behavioral_analysis: aiData.choices?.[0]?.message?.content || "Análise não disponível",
        pattern: "Padrão em análise",
        main_block: "Bloqueio em análise",
        future_prediction: "Previsão em análise",
        direction: "Direcionamento em análise",
      };
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
