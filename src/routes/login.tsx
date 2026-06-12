import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { registerUser } from "@/lib/register-user.functions";
import { formatPhone, phoneToEmail } from "@/lib/phone";
import { toast } from "sonner";
import { Lock, Phone, User, LogIn, UserPlus } from "lucide-react";
import logo from "@/assets/pharpep-logo.png";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — PharPep" }] }),
  component: LoginPage,
});

type Tab = "entrar" | "cadastrar";

function LoginPage() {
  const navigate = useNavigate();
  const { session, isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("entrar");

  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [regNome, setRegNome] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      if (isAdmin) navigate({ to: "/admin/dashboard" });
      else navigate({ to: "/protocolo" });
    }
  }, [loading, session, isAdmin, navigate]);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(loginPhone),
      password: loginPassword,
    });
    setLoggingIn(false);
    if (error) {
      toast.error("Telefone ou senha incorretos");
      return;
    }
    toast.success("Bem-vindo!");
  };

  const onRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (regPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setRegistering(true);
    try {
      await registerUser({ nome: regNome, telefone: regPhone, password: regPassword });
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(regPhone),
        password: regPassword,
      });
      if (error) {
        toast.success("Conta criada com sucesso! Faça login para continuar.");
        setTab("entrar");
        setLoginPhone(regPhone);
        setRegistering(false);
        return;
      }
      toast.success("Conta criada! Bem-vindo(a)!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar conta");
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mesh px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">

        <div className="mb-7 flex flex-col items-center">
          <img src={logo} alt="PharPep" width={60} height={60} className="drop-shadow-[0_0_20px_oklch(0.78_0.18_200/0.6)]" />
          <h1 className="mt-3 font-display text-2xl font-bold">
            Phar<span className="text-gradient">Pep</span>
          </h1>
          <p className="text-xs text-muted-foreground">Peptídeos & Medicina Integrativa</p>
        </div>

        <div className="card-premium rounded-3xl p-7">
          {/* Tabs */}
          <div className="mb-6 flex rounded-xl bg-input/40 p-1">
            {(["entrar", "cadastrar"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  tab === t ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "entrar" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {tab === "entrar" ? (
            <form onSubmit={onLogin} className="space-y-4">
              <Field label="Número de Telefone">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(formatPhone(e.target.value))}
                    placeholder="(18) 99999-9999"
                    className={inputCls + " pl-10"}
                  />
                </div>
              </Field>
              <Field label="Senha">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••"
                    className={inputCls + " pl-10"}
                  />
                </div>
              </Field>
              <button
                type="submit"
                disabled={loggingIn}
                className="btn-hero flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
              >
                <LogIn className="h-4 w-4" />
                {loggingIn ? "Entrando..." : "Entrar"}
              </button>
            </form>
          ) : (
            <form onSubmit={onRegister} className="space-y-4">
              <Field label="Nome completo">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={regNome}
                    onChange={(e) => setRegNome(e.target.value)}
                    placeholder="Seu nome"
                    className={inputCls + " pl-10"}
                  />
                </div>
              </Field>
              <Field label="Número de Telefone">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(formatPhone(e.target.value))}
                    placeholder="(18) 99999-9999"
                    className={inputCls + " pl-10"}
                  />
                </div>
              </Field>
              <Field label="Senha">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={inputCls + " pl-10"}
                  />
                </div>
              </Field>
              <Field label="Confirmar senha">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    className={inputCls + " pl-10"}
                  />
                </div>
              </Field>
              <button
                type="submit"
                disabled={registering}
                className="btn-hero flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" />
                {registering ? "Criando conta..." : "Criar conta"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-input/40 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
