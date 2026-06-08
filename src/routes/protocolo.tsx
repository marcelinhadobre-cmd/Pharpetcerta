import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";
import {
  Activity, AlertTriangle, Brain, ChevronLeft, ChevronRight,
  ClipboardList, Dna, Flame, Heart, Info, Moon,
  RotateCcw, Shield, Syringe, TrendingUp, User, Zap,
} from "lucide-react";

export const Route = createFileRoute("/protocolo")({
  head: () => ({
    meta: [
      { title: "Protocolo Personalizado — PharPep" },
      { name: "description", content: "Gere seu protocolo clínico personalizado de peptídeos e medicina integrativa." },
    ],
  }),
  component: ProtocolPage,
});

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const OBJECTIVES = [
  { id: "performance", label: "Performance Atlética", Icon: Flame, desc: "Força, explosão e recuperação muscular" },
  { id: "composicao", label: "Composição Corporal", Icon: TrendingUp, desc: "Redução de gordura e hipertrofia" },
  { id: "antiaging", label: "Anti-Aging & Longevidade", Icon: Dna, desc: "Otimização hormonal e vitalidade" },
  { id: "recuperacao", label: "Recuperação & Reparo", Icon: Heart, desc: "Lesões, articulações e cicatrização" },
  { id: "cognitivo", label: "Performance Cognitiva", Icon: Brain, desc: "Foco, memória e controle do stress" },
  { id: "metabolico", label: "Saúde Metabólica", Icon: Activity, desc: "Glicemia, insulina e peso corporal" },
];

const SINTOMAS = [
  "Fadiga crônica", "Libido reduzida", "Dificuldade de recuperação",
  "Insônia / sono fragmentado", "Ganho de gordura abdominal",
  "Perda de massa muscular", "Baixa concentração", "Humor instável",
  "Queda de cabelo", "Disfunção erétil / vaginal", "Ansiedade",
  "Dores articulares", "Problemas digestivos", "Imunidade baixa",
];

const TREINO_TIPOS = [
  "Musculação / Hipertrofia", "CrossFit / Funcional",
  "HIIT / Cardio Intervalado", "Endurance / Corrida",
  "Artes Marciais / Combate", "Pilates / Yoga / Mobilidade",
];

const EXPERIENCIA_OPTS = [
  { id: "nenhuma", label: "Nenhuma — primeiro contato" },
  { id: "iniciante", label: "Iniciante — 1 a 2 ciclos" },
  { id: "intermediario", label: "Intermediário — 3 a 5 ciclos" },
  { id: "avancado", label: "Avançado — experiência consolidada" },
];

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface ProfileData {
  nome: string; idade: string; sexo: string;
  peso: string; altura: string; objetivo: string;
}
interface BioData {
  testosterona: string; igf1: string; cortisol: string;
  glicemia: string; sintomas: string[];
}
interface LifestyleData {
  treino_freq: number; treino_tipo: string[];
  qualidade_sono: number; nivel_stress: number; experiencia: string;
}
interface ProtocolItem {
  nome: string; classe: string; mecanismo: string;
  dose: string; timing: string; frequencia: string; ciclo: string;
  prioridade: "essencial" | "recomendado" | "opcional";
  tag: string; alerta?: string;
}

// ─── PROTOCOL ENGINE ────────────────────────────────────────────────────────

function buildProtocol(p: ProfileData, b: BioData, l: LifestyleData) {
  const items: ProtocolItem[] = [];
  const insights: string[] = [];
  const monitoring: string[] = [];

  const peso = parseFloat(p.peso) || 0;
  const altura = parseFloat(p.altura) || 0;
  const imc = peso > 0 && altura > 0 ? peso / Math.pow(altura / 100, 2) : 0;
  const igf1 = parseFloat(b.igf1) || 0;
  const cortisol = parseFloat(b.cortisol) || 0;
  const glicemia = parseFloat(b.glicemia) || 0;
  const isOverweight = imc > 26;
  const hasLowIGF1 = igf1 > 0 && igf1 < 180;
  const hasHighCortisol = cortisol > 0 && cortisol > 18;
  const hasPoorSleep = l.qualidade_sono <= 5;
  const hasHighStress = l.nivel_stress >= 7;
  const isHighlyActive = l.treino_freq >= 4;
  const { objetivo } = p;
  const sintomas = b.sintomas;

  if (["performance", "composicao", "antiaging"].includes(objetivo) || hasLowIGF1) {
    items.push({
      nome: "CJC-1295 sem DAC + Ipamorelin",
      classe: "GH Secretagogo — GHRH + GHRP",
      mecanismo: "Estimula liberação pulsátil de GH endógeno via receptores GHRHR e ghrelina. Eleva IGF-1, promove lipólise, síntese proteica, recuperação tecidual e aprofundamento do sono delta.",
      dose: "CJC-1295 300 mcg + Ipamorelin 300 mcg (mesma seringa SC)",
      timing: "30–60 min antes do sono, jejum de 2h",
      frequencia: "3–5× por semana (prioridade dias de treino)",
      ciclo: "12 semanas ativas → 4 semanas off",
      prioridade: hasLowIGF1 ? "essencial" : "recomendado",
      tag: "GH / IGF-1",
      alerta: hasLowIGF1 ? "IGF-1 baixo detectado — monitorar resposta após 6–8 semanas com novo exame." : undefined,
    });
    insights.push("Eixo somatotrófico otimizado via secretagogos de GH endógeno");
    monitoring.push("IGF-1 basal → repetir na 8ª semana de protocolo");
    monitoring.push("Glicemia de jejum mensal (GH pode elevar resistência insulínica)");
  }

  if (["recuperacao", "performance"].includes(objetivo) || isHighlyActive || sintomas.includes("Dores articulares") || sintomas.includes("Problemas digestivos")) {
    items.push({
      nome: "BPC-157 (Body Protection Compound-157)",
      classe: "Peptídeo Gástrico Sistêmico",
      mecanismo: "Upregula VEGFR2, EGF e FAK. Modula serotonina, dopamina e óxido nítrico. Acelera reparo de tendões, ligamentos, mucosa intestinal e neurônios dopaminérgicos.",
      dose: "250–500 mcg/dia",
      timing: "Manhã em jejum (SC perilesional ou abdominal)",
      frequencia: "Diária",
      ciclo: "4–8 semanas contínuas",
      prioridade: "essencial",
      tag: "Recuperação / Gut",
    });
    insights.push("Reparo tecidual multissistêmico com BPC-157");
    monitoring.push("Avaliação subjetiva de dor e mobilidade articular em 3–4 semanas");
  }

  if (objetivo === "recuperacao" || sintomas.includes("Dores articulares") || sintomas.includes("Dificuldade de recuperação")) {
    items.push({
      nome: "TB-500 (Thymosin Beta-4)",
      classe: "Regulador de Actina / Fator de Migração Celular",
      mecanismo: "Liga-se à actina-G intracelular. Promove migração e diferenciação celular, angiogênese local e ativação de células satélite musculares. Efeito sinérgico com BPC-157.",
      dose: "2.0–2.5 mg (loading) → 2.0 mg (manutenção)",
      timing: "Qualquer horário (SC abdominal)",
      frequencia: "2×/semana por 4–6 sem → 1×/semana manutenção",
      ciclo: "6 semanas loading + fase de manutenção",
      prioridade: "recomendado",
      tag: "Reparo Muscular / Tendões",
    });
    insights.push("Stack BPC-157 + TB-500 para reparo profundo de tecidos moles");
  }

  if (objetivo === "antiaging") {
    items.push({
      nome: "Epithalon (Tetrapeptídeo Epifisário)",
      classe: "Bioregulador Tímico — Ativador de Telomerase",
      mecanismo: "Ativa hTERT normalizando comprimento telomérico em células somáticas. Restaura secreção circadiana de melatonina via glândula pineal. Antioxidante mitocondrial via SOD e catalase.",
      dose: "5–10 mg/dia",
      timing: "Manhã (SC abdominal)",
      frequencia: "Diária por 10–20 dias consecutivos",
      ciclo: "1–2 ciclos/ano (intervalo mínimo de 6 meses)",
      prioridade: "essencial",
      tag: "Longevidade / Telômeros",
    });
    insights.push("Proteção e restauração telomérica com Epithalon");
    monitoring.push("Telomere Length Test anual");
    monitoring.push("Perfil de melatonina noturna antes e após o ciclo");
  }

  if (objetivo === "cognitivo" || hasHighStress || sintomas.includes("Ansiedade") || sintomas.includes("Baixa concentração")) {
    items.push({
      nome: "Selank",
      classe: "Ansiolítico Peptídico — Análogo da Tuftsin",
      mecanismo: "Modula subunidades GABA-A. Estabiliza BDNF e normaliza IL-6 e TNF-α. Efeito ansiolítico sem sedação ou dependência. Melhora consolidação de memória de trabalho.",
      dose: "250–500 mcg",
      timing: "Manhã (cognição) e/ou 30 min antes do sono (ansiedade)",
      frequencia: "1–2× ao dia (intranasal ou SC)",
      ciclo: "2–4 semanas por curso",
      prioridade: "recomendado",
      tag: "Cognição / Ansiedade",
    });
    insights.push("Ansiolítico e nootrópico com Selank sem efeito sedativo");
    if (hasHighStress) monitoring.push("Escalas de ansiedade (GAD-7) e cortisol salivar matinal");
  }

  if (objetivo === "metabolico" || isOverweight) {
    items.push({
      nome: "Semaglutide",
      classe: "Agonista GLP-1R — Regulador de Saciedade",
      mecanismo: "Ativa receptores GLP-1 no hipotálamo (núcleo arqueado) e células β pancreáticas. Reduz glicemia pós-prandial, prolonga saciedade e promove perda de gordura visceral.",
      dose: "Sem 1–4: 0.25 mg/sem → Sem 5–8: 0.5 mg/sem → Sem 9+: até 1 mg/sem",
      timing: "Mesmo dia da semana, qualquer horário (SC abdominal ou coxa)",
      frequencia: "1× por semana",
      ciclo: "Contínuo — reavaliação clínica a cada 12 semanas",
      prioridade: isOverweight ? "essencial" : "recomendado",
      tag: "GLP-1 / Metabólico",
      alerta: "Iniciar com dose mínima. Náusea transitória é esperada nas primeiras semanas. Contraindicado em pancreatite ativa.",
    });
    insights.push("Regulação GLP-1 para composição corporal e sensibilidade insulínica");
    monitoring.push("Glicemia de jejum + HbA1c trimestral");
    monitoring.push("Peso e circunferência abdominal semanais");
    if (glicemia > 100) monitoring.push("⚠ Glicemia limítrofe — monitoramento intensivo recomendado");
  }

  if (hasPoorSleep || sintomas.includes("Insônia / sono fragmentado")) {
    items.push({
      nome: "DSIP (Delta Sleep-Inducing Peptide)",
      classe: "Peptídeo Neuroendócrino — Modulador de Sono",
      mecanismo: "Agonista no núcleo supraquiasmático. Induz ondas delta sem suprimir REM. Normaliza secreção pulsátil de cortisol e sincroniza o ritmo circadiano.",
      dose: "100–200 mcg",
      timing: "30 min antes de dormir (SC)",
      frequencia: "Diária por 2–4 semanas",
      ciclo: "2–4 semanas (repetir após 2 semanas off)",
      prioridade: hasPoorSleep ? "essencial" : "recomendado",
      tag: "Sono / Ritmo Circadiano",
    });
    insights.push("Restauração do sono profundo delta e cortisol circadiano");
    monitoring.push("Diário de sono: latência, despertares e qualidade subjetiva");
    if (hasHighCortisol) monitoring.push("⚠ Cortisol elevado — DSIP + gestão de stress é prioridade clínica");
  }

  if (["composicao", "metabolico"].includes(objetivo) || isOverweight) {
    items.push({
      nome: "AOD-9604",
      classe: "Fragmento GH C-Terminal (176–191)",
      mecanismo: "Estimula receptores β3 adrenérgicos em adipócitos sem efeitos anti-insulínicos do GH completo. Lipólise seletiva em gordura visceral e subcutânea. Sem ação mitogênica.",
      dose: "300 mcg/dia",
      timing: "Manhã em jejum estrito (SC abdominal ou sublingual)",
      frequencia: "Diária",
      ciclo: "12 semanas",
      prioridade: "recomendado",
      tag: "Lipólise / Composição",
    });
    insights.push("Lipólise seletiva sem efeitos proliferativos do GH completo");
    monitoring.push("Bioimpedância ou DEXA no início e na 12ª semana");
  }

  if (["antiaging", "cognitivo"].includes(objetivo) || sintomas.includes("Imunidade baixa")) {
    items.push({
      nome: "Thymosin Alpha-1 (Tα1)",
      classe: "Imunomodulador Tímico",
      mecanismo: "Promove maturação de células T CD4+/CD8+, NK e dendríticas. Upregula IFN-γ e IL-2. Ativa via Nrf2. Indicado em imunossenescência e déficits imunes funcionais.",
      dose: "1.6 mg",
      timing: "Manhã (SC abdominal)",
      frequencia: "2×/semana",
      ciclo: "6–12 semanas",
      prioridade: "opcional",
      tag: "Imunidade / Longevidade",
    });
    insights.push("Modulação imune e reversão de imunossenescência com Tα1");
  }

  const order: Record<string, number> = { essencial: 0, recomendado: 1, opcional: 2 };
  items.sort((a, b) => order[a.prioridade] - order[b.prioridade]);

  return { items, insights, monitoring };
}

// ─── INPUT HELPERS ───────────────────────────────────────────────────────────

const inputCls = "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-primary/50 focus:outline-none transition-colors placeholder:text-muted-foreground/40";
const labelCls = "block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide";

function LabInput({ label, value, onChange, placeholder, ref_range }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; ref_range: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input type="number" value={value} onChange={e => onChange(e.target.value)}
        className={inputCls} placeholder={placeholder} />
      <p className="mt-1 text-xs text-muted-foreground/50">Ref: {ref_range}</p>
    </div>
  );
}

function SliderField({ label, value, onChange, min, max, step = 1, leftLabel, rightLabel }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; leftLabel: string; rightLabel: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className={labelCls}>{label}</label>
        <span className="text-sm font-bold text-primary">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-primary h-2 rounded-full cursor-pointer"
        style={{ background: `linear-gradient(to right, oklch(0.78 0.18 200) 0%, oklch(0.65 0.25 305) ${pct}%, oklch(1 0 0 / 8%) ${pct}%)` }}
      />
      <div className="mt-1 flex justify-between text-xs text-muted-foreground/50">
        <span>{leftLabel}</span><span>{rightLabel}</span>
      </div>
    </div>
  );
}

// ─── STEP COMPONENTS ─────────────────────────────────────────────────────────

function StepPerfil({ profile, setProfile, imc }: {
  profile: ProfileData; setProfile: React.Dispatch<React.SetStateAction<ProfileData>>; imc: string | null;
}) {
  const imcInfo = useMemo(() => {
    if (!imc) return null;
    const v = parseFloat(imc);
    if (v < 18.5) return { text: "Abaixo do peso", cls: "text-yellow-400" };
    if (v < 25) return { text: "Peso ideal", cls: "text-green-400" };
    if (v < 30) return { text: "Sobrepeso", cls: "text-orange-400" };
    return { text: "Obesidade grau I+", cls: "text-red-400" };
  }, [imc]);

  return (
    <div className="glass rounded-3xl p-7 sm:p-9 space-y-7">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Perfil do Paciente</h2>
          <p className="text-xs text-muted-foreground">Dados antropométricos e objetivo principal</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>Nome completo *</label>
          <input type="text" value={profile.nome}
            onChange={e => setProfile(p => ({ ...p, nome: e.target.value }))}
            className={inputCls} placeholder="Ex: João Silva" />
        </div>
        <div>
          <label className={labelCls}>Idade (anos)</label>
          <input type="number" value={profile.idade}
            onChange={e => setProfile(p => ({ ...p, idade: e.target.value }))}
            className={inputCls} placeholder="35" min="18" max="80" />
        </div>
        <div>
          <label className={labelCls}>Sexo biológico *</label>
          <div className="grid grid-cols-2 gap-2">
            {["masculino", "feminino"].map(s => (
              <button key={s} onClick={() => setProfile(p => ({ ...p, sexo: s }))}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all capitalize ${profile.sexo === s ? "border-primary bg-primary/20 text-primary" : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Peso (kg)</label>
          <input type="number" value={profile.peso}
            onChange={e => setProfile(p => ({ ...p, peso: e.target.value }))}
            className={inputCls} placeholder="82" />
        </div>
        <div>
          <label className={labelCls}>Altura (cm)</label>
          <input type="number" value={profile.altura}
            onChange={e => setProfile(p => ({ ...p, altura: e.target.value }))}
            className={inputCls} placeholder="178" />
        </div>
      </div>

      {imc && imcInfo && (
        <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-4 w-4" /> IMC calculado
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-primary">{imc}</span>
            <span className={`text-xs font-medium ${imcInfo.cls}`}>{imcInfo.text}</span>
          </div>
        </div>
      )}

      <div>
        <label className={labelCls + " mb-3"}>Objetivo principal *</label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OBJECTIVES.map(obj => (
            <button key={obj.id} onClick={() => setProfile(p => ({ ...p, objetivo: obj.id }))}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${profile.objetivo === obj.id ? "border-primary bg-primary/10 shadow-[0_0_20px_-8px_oklch(0.78_0.18_200/0.4)]" : "border-white/10 bg-white/4 hover:border-white/20"}`}>
              <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${profile.objetivo === obj.id ? "bg-primary/30" : "bg-white/8"}`}>
                <obj.Icon className={`h-4 w-4 ${profile.objetivo === obj.id ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${profile.objetivo === obj.id ? "text-primary" : ""}`}>{obj.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{obj.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepBiomarkers({ bio, setBio, sexo, toggleSintoma }: {
  bio: BioData; setBio: React.Dispatch<React.SetStateAction<BioData>>;
  sexo: string; toggleSintoma: (s: string) => void;
}) {
  return (
    <div className="glass rounded-3xl p-7 sm:p-9 space-y-7">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20">
          <ClipboardList className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Biomarcadores & Exames</h2>
          <p className="text-xs text-muted-foreground">Preencha com seus resultados laboratoriais recentes (opcional)</p>
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-3 flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">Deixe em branco caso não tenha realizado os exames. O protocolo será gerado com base nos seus sintomas e objetivo.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <LabInput label="Testosterona Total"
          value={bio.testosterona}
          onChange={v => setBio(b => ({ ...b, testosterona: v }))}
          placeholder="ng/dL"
          ref_range={sexo === "feminino" ? "15–70 ng/dL" : "300–1000 ng/dL"} />
        <LabInput label="IGF-1"
          value={bio.igf1}
          onChange={v => setBio(b => ({ ...b, igf1: v }))}
          placeholder="ng/mL"
          ref_range="100–300 ng/mL (varia por idade)" />
        <LabInput label="Cortisol Matinal"
          value={bio.cortisol}
          onChange={v => setBio(b => ({ ...b, cortisol: v }))}
          placeholder="mcg/dL"
          ref_range="6–18 mcg/dL (coleta 8h)" />
        <LabInput label="Glicemia de Jejum"
          value={bio.glicemia}
          onChange={v => setBio(b => ({ ...b, glicemia: v }))}
          placeholder="mg/dL"
          ref_range="70–99 mg/dL" />
      </div>

      <div>
        <label className={labelCls + " mb-3"}>Sintomas atuais (selecione todos que se aplicam)</label>
        <div className="flex flex-wrap gap-2">
          {SINTOMAS.map(s => (
            <button key={s} onClick={() => toggleSintoma(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${bio.sintomas.includes(s) ? "border-accent bg-accent/20 text-accent" : "border-white/10 bg-white/4 text-muted-foreground hover:border-white/20"}`}>
              {s}
            </button>
          ))}
        </div>
        {bio.sintomas.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">{bio.sintomas.length} sintoma(s) selecionado(s)</p>
        )}
      </div>
    </div>
  );
}

function StepLifestyle({ lifestyle, setLifestyle, toggleTreinoTipo }: {
  lifestyle: LifestyleData; setLifestyle: React.Dispatch<React.SetStateAction<LifestyleData>>;
  toggleTreinoTipo: (t: string) => void;
}) {
  return (
    <div className="glass rounded-3xl p-7 sm:p-9 space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20">
          <Zap className="h-5 w-5 text-green-400" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Estilo de Vida</h2>
          <p className="text-xs text-muted-foreground">Treino, sono, stress e experiência com peptídeos</p>
        </div>
      </div>

      <SliderField label="Frequência de treino (dias/semana)"
        value={lifestyle.treino_freq} onChange={v => setLifestyle(l => ({ ...l, treino_freq: v }))}
        min={0} max={7} leftLabel="Sedentário" rightLabel="Diário" />

      <div>
        <label className={labelCls + " mb-3"}>Tipo de treino</label>
        <div className="flex flex-wrap gap-2">
          {TREINO_TIPOS.map(t => (
            <button key={t} onClick={() => toggleTreinoTipo(t)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${lifestyle.treino_tipo.includes(t) ? "border-primary bg-primary/20 text-primary" : "border-white/10 bg-white/4 text-muted-foreground hover:border-white/20"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <SliderField label="Qualidade do sono"
        value={lifestyle.qualidade_sono} onChange={v => setLifestyle(l => ({ ...l, qualidade_sono: v }))}
        min={1} max={10} leftLabel="Péssimo" rightLabel="Excelente" />

      <SliderField label="Nível de stress (percebido)"
        value={lifestyle.nivel_stress} onChange={v => setLifestyle(l => ({ ...l, nivel_stress: v }))}
        min={1} max={10} leftLabel="Baixo" rightLabel="Extremo" />

      <div>
        <label className={labelCls + " mb-2"}>Experiência com peptídeos *</label>
        <div className="space-y-2">
          {EXPERIENCIA_OPTS.map(opt => (
            <button key={opt.id} onClick={() => setLifestyle(l => ({ ...l, experiencia: opt.id }))}
              className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${lifestyle.experiencia === opt.id ? "border-primary bg-primary/15 text-primary" : "border-white/10 bg-white/4 text-muted-foreground hover:border-white/20"}`}>
              <div className={`h-3 w-3 rounded-full border-2 flex-shrink-0 ${lifestyle.experiencia === opt.id ? "border-primary bg-primary" : "border-white/30"}`} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PROTOCOL OUTPUT ─────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  essencial: { label: "ESSENCIAL", cls: "text-primary border-primary/40 bg-primary/10", bar: "bg-primary" },
  recomendado: { label: "RECOMENDADO", cls: "text-accent border-accent/40 bg-accent/10", bar: "bg-accent" },
  opcional: { label: "OPCIONAL", cls: "text-muted-foreground border-white/20 bg-white/5", bar: "bg-white/20" },
};

function ProtocolCard({ item, index }: { item: ProtocolItem; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = PRIORITY_CONFIG[item.prioridade];

  return (
    <div className="card-premium rounded-2xl overflow-hidden animate-fade-up" style={{ animationDelay: `${index * 80}ms` }}>
      <div className={`h-1 ${cfg.bar}`} />
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider ${cfg.cls}`}>{cfg.label}</span>
              <span className="rounded-full bg-white/8 border border-white/10 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">{item.tag}</span>
            </div>
            <h3 className="font-display text-base font-bold leading-tight">{item.nome}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{item.classe}</p>
          </div>
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/5">
            <Syringe className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { icon: Zap, label: "Dose", value: item.dose },
            { icon: Moon, label: "Timing", value: item.timing },
            { icon: ClipboardList, label: "Frequência", value: item.frequencia },
            { icon: Shield, label: "Ciclo", value: item.ciclo },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2.5 rounded-xl bg-white/4 border border-white/6 px-3 py-2.5">
              <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">{label}</p>
                <p className="text-xs font-medium leading-snug mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => setExpanded(e => !e)}
          className="flex w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Info className="h-3.5 w-3.5" />
          {expanded ? "Ocultar" : "Ver"} mecanismo de ação
          <ChevronRight className={`h-3.5 w-3.5 ml-auto transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>

        {expanded && (
          <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
            <p className="text-xs leading-relaxed text-muted-foreground">{item.mecanismo}</p>
          </div>
        )}

        {item.alerta && (
          <div className="flex items-start gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
            <p className="text-xs text-orange-300">{item.alerta}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StepProtocol({ protocol, profile, bio, lifestyle, imc, onReset }: {
  protocol: ReturnType<typeof buildProtocol>;
  profile: ProfileData; bio: BioData; lifestyle: LifestyleData;
  imc: string | null; onReset: () => void;
}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const essenciais = protocol.items.filter(i => i.prioridade === "essencial").length;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Report header */}
      <div className="card-premium rounded-3xl p-7 sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary mb-1">Protocolo Clínico Personalizado</p>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">{profile.nome || "Paciente"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Emitido em {dateStr} · PharPep Protocol Engine</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onReset}
              className="glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium hover:border-white/20 transition-all">
              <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Objetivo", value: OBJECTIVES.find(o => o.id === profile.objetivo)?.label ?? "—" },
            { label: "IMC", value: imc ? `${imc} kg/m²` : "—" },
            { label: "Peptídeos", value: `${protocol.items.length} protocolos` },
            { label: "Essenciais", value: `${essenciais} compostos` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-white/4 border border-white/8 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">{label}</p>
              <p className="mt-1 text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>

        {protocol.insights.length > 0 && (
          <div className="mt-5 space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2">Análise Clínica</p>
            {protocol.insights.map((insight, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                {insight}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Protocol items */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4 px-1">Compostos Recomendados</p>
        <div className="space-y-4">
          {protocol.items.map((item, i) => <ProtocolCard key={item.nome} item={item} index={i} />)}
        </div>
      </div>

      {/* Monitoring */}
      {protocol.monitoring.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
              <ClipboardList className="h-4 w-4 text-accent" />
            </div>
            <h3 className="font-display text-base font-bold">Cronograma de Monitoramento</h3>
          </div>
          <div className="space-y-2">
            {protocol.monitoring.map((m, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0" />
                {m}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-2xl border border-orange-500/25 bg-orange-500/8 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-400" />
          <div>
            <p className="text-sm font-semibold text-orange-300 mb-1">Aviso Clínico Importante</p>
            <p className="text-xs leading-relaxed text-orange-200/70">
              Este protocolo é gerado com fins informativos e educacionais. A utilização de peptídeos e compostos hormonais deve ser sempre acompanhada por um médico especialista habilitado. Não substitui consulta, diagnóstico ou prescrição médica. A PharPep não se responsabiliza pelo uso indevido destas informações.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

function ProtocolPage() {
  const navigate = useNavigate();
  const { session, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAdmin) navigate({ to: "/admin/dashboard", replace: true });
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  if (loading || isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const [step, setStep] = useState(0);
  const [generated, setGenerated] = useState(false);

  const [profile, setProfile] = useState<ProfileData>({
    nome: "", idade: "", sexo: "", peso: "", altura: "", objetivo: "",
  });
  const [bio, setBio] = useState<BioData>({
    testosterona: "", igf1: "", cortisol: "", glicemia: "", sintomas: [],
  });
  const [lifestyle, setLifestyle] = useState<LifestyleData>({
    treino_freq: 3, treino_tipo: [], qualidade_sono: 7, nivel_stress: 5, experiencia: "",
  });

  const imc = useMemo(() => {
    const p = parseFloat(profile.peso), h = parseFloat(profile.altura);
    if (p > 0 && h > 0) return (p / Math.pow(h / 100, 2)).toFixed(1);
    return null;
  }, [profile.peso, profile.altura]);

  const protocol = useMemo(
    () => generated ? buildProtocol(profile, bio, lifestyle) : null,
    [generated] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const toggleSintoma = (s: string) =>
    setBio(b => ({ ...b, sintomas: b.sintomas.includes(s) ? b.sintomas.filter(x => x !== s) : [...b.sintomas, s] }));

  const toggleTreinoTipo = (t: string) =>
    setLifestyle(l => ({ ...l, treino_tipo: l.treino_tipo.includes(t) ? l.treino_tipo.filter(x => x !== t) : [...l.treino_tipo, t] }));

  const canNext = useMemo(() => {
    if (step === 0) return !!(profile.nome && profile.sexo && profile.objetivo);
    if (step === 2) return !!lifestyle.experiencia;
    return true;
  }, [step, profile, lifestyle]);

  const handleReset = () => {
    setGenerated(false);
    setStep(0);
    setProfile({ nome: "", idade: "", sexo: "", peso: "", altura: "", objetivo: "" });
    setBio({ testosterona: "", igf1: "", cortisol: "", glicemia: "", sintomas: [] });
    setLifestyle({ treino_freq: 3, treino_tipo: [], qualidade_sono: 7, nivel_stress: 5, experiencia: "" });
  };

  const STEPS = ["Perfil", "Biomarcadores", "Estilo de Vida", "Protocolo"];

  return (
    <div className="min-h-screen bg-mesh">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">

        {/* Page header */}
        <div className="mb-10 text-center animate-fade-up">
          <p className="text-xs uppercase tracking-widest text-primary">Onboarding Premium</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
            Protocolo <span className="text-gradient">Personalizado</span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            Responda o questionário clínico e receba seu protocolo completo de peptídeos e otimização hormonal.
          </p>
        </div>

        {/* Step progress */}
        <div className="mb-8 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="relative mb-5">
            <div className="h-0.5 rounded-full bg-white/8">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: "linear-gradient(90deg, oklch(0.78 0.18 200), oklch(0.65 0.25 305))" }} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {STEPS.map((label, i) => (
              <div key={i} className={`text-center text-xs transition-colors ${i === step ? "text-primary font-semibold" : i < step ? "text-muted-foreground" : "text-muted-foreground/30"}`}>
                <div className={`mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-all ${i === step ? "border-primary bg-primary/20 text-primary shadow-[0_0_12px_-2px_oklch(0.78_0.18_200/0.6)]" : i < step ? "border-green-500/60 bg-green-500/15 text-green-400" : "border-white/10 text-muted-foreground/30"}`}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className="hidden sm:inline">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active step */}
        <div key={step} className="animate-fade-up">
          {step === 0 && <StepPerfil profile={profile} setProfile={setProfile} imc={imc} />}
          {step === 1 && <StepBiomarkers bio={bio} setBio={setBio} sexo={profile.sexo} toggleSintoma={toggleSintoma} />}
          {step === 2 && <StepLifestyle lifestyle={lifestyle} setLifestyle={setLifestyle} toggleTreinoTipo={toggleTreinoTipo} />}
          {step === 3 && protocol && <StepProtocol protocol={protocol} profile={profile} bio={bio} lifestyle={lifestyle} imc={imc} onReset={handleReset} />}
        </div>

        {/* Navigation */}
        {step < 3 && (
          <div className="mt-8 flex items-center justify-between animate-fade-up" style={{ animationDelay: "150ms" }}>
            <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
              className="glass inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium disabled:opacity-20 transition-all hover:border-white/20">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>

            {step < 2 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
                className="btn-hero inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed disabled:translate-y-0 disabled:filter-none">
                Próximo <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={() => { setGenerated(true); setStep(3); }} disabled={!canNext}
                className="btn-hero inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed disabled:translate-y-0 disabled:filter-none">
                <Syringe className="h-4 w-4" /> Gerar Protocolo
              </button>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PharPep · Protocolo Premium · Uso exclusivo para fins educacionais
      </footer>
    </div>
  );
}
