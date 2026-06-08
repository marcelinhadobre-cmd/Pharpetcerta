import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Sparkles, ShieldCheck, Zap, ClipboardList } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/hooks/use-auth";
import hero from "@/assets/hero-molecules.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PharPep — Catálogo Premium de Peptídeos" },
      { name: "description", content: "Catálogo premium de peptídeos com atendimento especializado." },
    ],
  }),
  component: Index,
});

function Index() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    trackEvent("page_view", undefined, { path: "/" });
  }, []);

  // Admin nunca fica nessa página — vai direto para o painel
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

  return (
    <div className="min-h-screen bg-mesh">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={hero} alt="" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/70 to-background" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:pt-24 sm:pb-32">
          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            <div className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Peptídeos premium · qualidade verificada
            </div>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight sm:text-6xl md:text-7xl">
              Catálogo <span className="text-gradient">PharPep</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Peptídeos premium selecionados com atendimento especializado. Acesse o catálogo e faça seu pedido.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/catalogo"
                className="btn-hero inline-flex w-full items-center justify-center gap-2 rounded-2xl px-7 py-4 text-base font-semibold sm:w-auto"
              >
                Ver catálogo
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/login"
                className="glass inline-flex w-full items-center justify-center gap-2 rounded-2xl px-7 py-4 text-base font-semibold transition-all hover:border-primary/40 hover:bg-white/10 sm:w-auto"
              >
                Entrar / Criar conta
              </Link>
            </div>
          </div>

          {/* Feature cards */}
          <div className="mx-auto mt-20 max-w-3xl animate-fade-up" style={{ animationDelay: "200ms" }}>
            <div className="card-premium relative overflow-hidden rounded-3xl p-8 sm:p-10">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
              <div className="relative">
                <p className="font-display text-2xl font-bold sm:text-3xl">ACESSE O CATÁLOGO</p>
                <p className="mt-2 text-sm text-muted-foreground">Produtos selecionados · pedido direto pelo sistema</p>
                <Link
                  to="/catalogo"
                  className="btn-hero mt-6 inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold uppercase tracking-wider"
                >
                  Ver produtos
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, t: "Qualidade", d: "Produtos selecionados" },
              { icon: Zap, t: "Atendimento", d: "Rápido e especializado" },
              { icon: ClipboardList, t: "Protocolo", d: "Personalizado para você" },
            ].map((f, i) => (
              <div key={i} className="glass rounded-2xl p-5 text-center animate-fade-up" style={{ animationDelay: `${300 + i * 80}ms` }}>
                <f.icon className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-2 text-sm font-semibold">{f.t}</p>
                <p className="text-xs text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PharPep · Catálogo Premium
      </footer>
    </div>
  );
}
