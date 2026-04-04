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

    const { message, history } = await req.json();
    if (!message || typeof message !== 'string') throw new Error("Message required");

    // Deduct 1 credit
    const { data: canDeduct } = await supabaseClient.rpc('deduct_credits', {
      _user_id: user.id,
      _amount: 1,
      _description: 'IA Coach DeepSet'
    });

    if (!canDeduct) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get user context
    const [diagRes, progressRes, statsRes] = await Promise.all([
      supabaseClient.from('diagnostic_results').select('analysis').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseClient.from('user_progress').select('day_number, completed').eq('user_id', user.id),
      supabaseClient.from('user_stats').select('xp, level, best_streak, total_days_completed').eq('user_id', user.id).maybeSingle(),
    ]);

    const diagnosis = diagRes.data?.analysis || {};
    const completedDays = (progressRes.data || []).filter((p: any) => p.completed).length;
    const stats = statsRes.data || {};

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

    const systemPrompt = `Você é o Coach DeepSet — um mentor de alta performance direto, estratégico e empático. Responda em português do Brasil.

CONTEXTO DO USUÁRIO:
- Diagnóstico: ${JSON.stringify(diagnosis)}
- Progresso: ${completedDays}/21 dias do protocolo original
- Nível: ${stats.level || 1} | XP: ${stats.xp || 0} | Melhor streak: ${stats.best_streak || 0}

REGRAS:
1. Seja direto e prático — nada de enrolação
2. Use o contexto do diagnóstico para personalizar respostas
3. Motive sem ser genérico — use dados concretos do progresso do usuário
4. Desafie padrões de pensamento limitantes
5. Referencie conceitos DeepSet: Reset, Recalibração, Domínio, padrões de bloqueio
6. Respostas curtas e impactantes (máx 150 palavras)
7. Termine com uma pergunta poderosa ou desafio prático`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message }
    ];

    const aiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, max_tokens: 500 }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Tente em breve." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      throw new Error("AI failed");
    }

    const aiData = await aiResponse.json();
    const response = aiData.choices?.[0]?.message?.content || "Não consegui processar sua mensagem.";

    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
