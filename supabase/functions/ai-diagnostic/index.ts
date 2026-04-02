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
      _description: 'Diagnóstico AI'
    });

    if (!canDeduct) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get LLM settings for this user
    const { data: userLLM } = await supabaseClient
      .from('llm_settings')
      .select('provider, model')
      .eq('scope', 'user')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const { data: globalLLM } = await supabaseClient
      .from('llm_settings')
      .select('provider, model')
      .eq('scope', 'global')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const llm = userLLM || globalLLM || { provider: 'lovable', model: 'google/gemini-3-flash-preview' };

    let apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
    let apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    let model = llm.model || "google/gemini-3-flash-preview";

    // If using external provider, get API key from api_keys table
    if (llm.provider !== 'lovable') {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: keyData } = await adminClient
        .from('api_keys')
        .select('api_key')
        .eq('provider', llm.provider)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (keyData) {
        apiKey = keyData.api_key;
        switch (llm.provider) {
          case 'openai': apiUrl = "https://api.openai.com/v1/chat/completions"; model = model || "gpt-4o-mini"; break;
          case 'anthropic': apiUrl = "https://api.anthropic.com/v1/messages"; break;
          case 'google': apiUrl = "https://generativelanguage.googleapis.com/v1beta/chat/completions"; break;
          case 'groq': apiUrl = "https://api.groq.com/openai/v1/chat/completions"; model = model || "llama-3.3-70b-versatile"; break;
          case 'deepseek': apiUrl = "https://api.deepseek.com/v1/chat/completions"; model = model || "deepseek-chat"; break;
          case 'perplexity': apiUrl = "https://api.perplexity.ai/chat/completions"; model = model || "sonar"; break;
        }
      }
    }

    const systemPrompt = `Você é um analista comportamental de alta performance. Analise profundamente as respostas do usuário e gere um diagnóstico completo em português do Brasil.

Retorne EXATAMENTE um JSON com estas chaves:
{
  "behavioral_analysis": "Análise comportamental detalhada (3-5 parágrafos)",
  "pattern": "Padrão principal identificado (2-3 parágrafos)",
  "main_block": "Bloqueio principal que impede o crescimento (2-3 parágrafos)",
  "future_prediction": "Previsão do que acontecerá se nada mudar (2-3 parágrafos)",
  "direction": "Direcionamento estratégico personalizado (3-5 parágrafos)"
}`;

    const userPrompt = `RESPOSTAS DO DIAGNÓSTICO:

DORES: ${responses.pains}

FRUSTRAÇÕES: ${responses.frustrations}

OBJETIVOS: ${responses.goals}

IDENTIDADE: ${responses.identity}

MEDOS: ${responses.fears}`;

    // Use tool calling for structured output
    const aiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
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
            description: "Generate a behavioral diagnosis",
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
