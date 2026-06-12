import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  nome: string;
  telefone: string;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  profile: UserProfile | null;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  profile: null,
  signOut: async () => {},
});

// ─── localStorage helpers ──────────────────────────────────────────────────────

const ADMIN_KEY = "pharpep-is-admin";

/** Lê a session Supabase diretamente do localStorage sem fetch. */
function readStoredSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith("sb-") || !k.endsWith("-auth-token")) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!parsed?.access_token || !parsed?.user) continue;
      // Descarta se já expirou (com 60 s de buffer)
      if (parsed.expires_at && parsed.expires_at < Date.now() / 1000 + 60) continue;
      return parsed as Session;
    }
  } catch { /* noop */ }
  return null;
}

function getCachedAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ADMIN_KEY) === "1";
}

function setCachedAdmin(v: boolean) {
  if (typeof window === "undefined") return;
  if (v) localStorage.setItem(ADMIN_KEY, "1");
  else localStorage.removeItem(ADMIN_KEY);
}

// ─── Supabase helpers ──────────────────────────────────────────────────────────

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from("user_profiles")
    .select("nome, telefone")
    .eq("id", userId)
    .maybeSingle();
  return data ? { nome: data.nome, telefone: data.telefone } : null;
}

/**
 * Retorna:
 *   true  → é admin (confirmado no banco)
 *   false → definitivamente não é admin
 *   null  → erro de rede — use o cache como fallback
 */
async function checkAdmin(userId: string): Promise<boolean | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return null;
  return !!data;
}

async function loadUserData(userId: string) {
  const [adminResult, prof] = await Promise.all([
    checkAdmin(userId),
    fetchProfile(userId),
  ]);
  const admin =
    adminResult === null
      ? getCachedAdmin()   // fallback em caso de erro de rede
      : adminResult;
  if (adminResult !== null) setCachedAdmin(admin);
  return { admin, prof };
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  /**
   * Inicialização síncrona antes do primeiro paint.
   * Se há session + flag de admin no localStorage, salta a tela "Carregando..."
   * sem flash de UI — o usuário vê o painel admin diretamente no refresh.
   */
  useLayoutEffect(() => {
    const s = readStoredSession();
    const a = getCachedAdmin();
    if (s && a) {
      setSession(s);
      setIsAdmin(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    // Verificação autoritativa (pode refrescar o token se necessário)
    (async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (s?.user) {
          const { admin, prof } = await loadUserData(s.user.id);
          if (!mounted) return;
          setSession(s);
          setIsAdmin(admin);
          setProfile(prof);
        } else {
          setSession(null);
          setIsAdmin(false);
          setProfile(null);
          setCachedAdmin(false);
        }
      } catch (e) {
        console.error("Erro ao inicializar auth:", e);
      } finally {
        if (mounted) {
          initialized = true;
          setLoading(false);
        }
      }
    })();

    // Eventos subsequentes (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (!mounted || !initialized) return;

        if (event === "SIGNED_OUT") {
          setSession(null);
          setIsAdmin(false);
          setProfile(null);
          setCachedAdmin(false);
          setLoading(false);
          return;
        }

        if (s?.user) {
          const { admin, prof } = await loadUserData(s.user.id);
          if (!mounted) return;
          setSession(s);
          setIsAdmin(admin);
          setProfile(prof);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setCachedAdmin(false);
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <Ctx.Provider value={{ user: session?.user ?? null, session, isAdmin, loading, profile, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
