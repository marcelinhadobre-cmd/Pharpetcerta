import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Sparkles, ShieldCheck, Zap, ClipboardList, FlaskConical, ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/hooks/use-auth";
import hero from "@/assets/hero-molecules.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PharPep — Protocolo Premium de Peptídeos" },
      { name: "description", content: "Protocolo clínico personalizado de peptídeos e otimização hormonal." },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    trackEvent("page_view", undefined, { path: "/" });
  }, []);

  useEffect(() => {
    if (!loading && isAdmin) navigate({ to: "/admin/dashboard", replace: true });
  }, [loading, isAdmin, navigate]);

  if (loading || isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const loggedIn = !!session;

  return (
    <div className="min-h-screen bg-mesh">
      <SiteHeader />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <img src={hero} alt="" className="h-full w-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/75 to-background" />
        </div>

        {/* Glow orbs */}
        <div className="pointer-events-none absolute -left-40 top-10 h-[500px] w-[500px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="pointer-events-none absolute -right-40 top-32 h-[400px] w-[400px] rounded-full bg-accent/10 blur-[100px]" />

        <div className="mx-auto max-w-5xl px-4 pt-20 pb-28 sm:pt-32 sm:pb-40">
          <div className="mx-auto max-w-3xl text-center animate-fade-up">

            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Medicina de Alta Performance
            </div>

            {/* Headline */}
            <h1 className="font-display text-5xl font-black leading-[1.08] tracking-tight sm:text-7xl">
              Seu protocolo<br />
              <span className="text-gradient">personalizado</span><br />
              de peptídeos
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Responda um questionário clínico e receba um protocolo completo baseado no seu perfil hormonal, biomarcadores e objetivos.
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {loggedIn ? (
                <>
                  <Link
                    to="/protocolo"
                    className="btn-hero inline-flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-bold sm:w-auto"
                  >
                    Acessar meu protocolo
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/catalogo"
                    className="glass inline-flex w-full items-center justify-center gap-2 rounded-2xl px-7 py-4 text-base font-semibold transition-all hover:border-primary/40 hover:bg-white/10 sm:w-auto"
                  >
                    <FlaskConical className="h-4 w-4" />
                    Ver catálogo de peptídeos
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="btn-hero inline-flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-bold sm:w-auto"
                  >
                    Criar conta grátis
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/catalogo"
                    className="glass inline-flex w-full items-center justify-center gap-2 rounded-2xl px-7 py-4 text-base font-semibold transition-all hover:border-primary/40 hover:bg-white/10 sm:w-auto"
                  >
                    <FlaskConical className="h-4 w-4" />
                    Ver catálogo de peptídeos
                  </Link>
                </>
              )}
            </div>

            {/* Social proof */}
            <p className="mt-5 text-xs text-muted-foreground/50">
              Protocolo gerado por inteligência clínica · 100% personalizado · seguro e educacional
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pb-24">
        <div className="mb-12 text-center animate-fade-up">
          <p className="text-xs uppercase tracking-widest text-primary mb-2">Como funciona</p>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Do questionário ao protocolo em <span className="text-gradient">minutos</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-up" style={{ animationDelay: "100ms" }}>
          {[
            {
              step: "01",
              icon: ClipboardList,
              title: "Preencha a anamnese",
              desc: "Perfil, biomarcadores, estilo de vida e objetivos. Salvo automaticamente a cada passo.",
            },
            {
              step: "02",
              icon: FlaskConical,
              title: "Engine clínica analisa",
              desc: "Nosso algoritmo cruza seus dados com protocolos baseados em evidências para cada composto.",
            },
            {
              step: "03",
              icon: Sparkles,
              title: "Protocolo completo",
              desc: "Dose, timing, ciclo e mecanismo de ação. Exporte em PDF ou compartilhe no WhatsApp.",
            },
          ].map(({ step, icon: Icon, title, desc }, i) => (
            <div
              key={i}
              className="card-premium relative overflow-hidden rounded-2xl p-6 animate-fade-up"
              style={{ animationDelay: `${150 + i * 80}ms` }}
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
              <span className="text-5xl font-black text-primary/10 leading-none select-none">{step}</span>
              <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 border border-primary/20">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-display text-base font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pb-24">
        <div className="card-premium relative overflow-hidden rounded-3xl p-8 sm:p-12 animate-fade-up">
          <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />

          <div className="relative grid grid-cols-1 gap-10 sm:grid-cols-2 sm:items-center">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary mb-3">Por que PharPep</p>
              <h2 className="font-display text-3xl font-bold leading-snug sm:text-4xl">
                Protocolo clínico,<br />
                <span className="text-gradient">não suposição</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Cada recomendação é baseada nos seus dados reais — não em protocolos genéricos. O sistema considera IMC, biomarcadores, nível de estresse, qualidade de sono e objetivos para montar um plano específico para você.
              </p>
              {loggedIn ? (
                <Link
                  to="/protocolo"
                  className="btn-hero mt-8 inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold"
                >
                  Ver meu protocolo <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="btn-hero mt-8 inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold"
                >
                  Começar agora <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: ShieldCheck, label: "Baseado em evidências", color: "text-primary" },
                { icon: Zap, label: "Gerado em segundos", color: "text-accent" },
                { icon: ClipboardList, label: "Dados salvos", color: "text-green-400" },
                { icon: FlaskConical, label: "PDF completo", color: "text-yellow-400" },
              ].map(({ icon: Icon, label, color }, i) => (
                <div key={i} className="glass rounded-xl p-4 text-center">
                  <Icon className={`mx-auto h-6 w-6 ${color}`} />
                  <p className="mt-2 text-xs font-semibold leading-snug">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/50 py-10 text-center">
        <p className="text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} PharPep · Protocolo Premium · Uso exclusivo para fins educacionais e informativos
        </p>
      </footer>
    </div>
  );
}
