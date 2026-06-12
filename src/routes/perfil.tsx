import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { User, Phone, Shield } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Perfil — PharPep" }] }),
  component: PerfilPage,
});

function PerfilPage() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const nome = profile?.nome || "—";
  const telefone = profile?.telefone || "—";
  const email = session.user.email || "—";

  return (
    <div className="min-h-screen bg-mesh">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-12 sm:py-20">
        <div className="mb-8 animate-fade-up">
          <p className="text-xs uppercase tracking-widest text-primary">Conta</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Meu Perfil</h1>
        </div>

        <div className="card-premium rounded-3xl p-7 animate-fade-up space-y-5" style={{ animationDelay: "80ms" }}>
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 border border-primary/30">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">{nome}</p>
              <p className="text-xs text-muted-foreground">Conta PharPep ativa</p>
            </div>
          </div>

          <div className="h-px bg-white/8" />

          {/* Info */}
          {[
            { icon: User,   label: "Nome",      value: nome },
            { icon: Phone,  label: "Telefone",  value: telefone },
            { icon: Shield, label: "E-mail",    value: email },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">{label}</p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
