import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Search, X } from "lucide-react";

// ── Utilitários de busca fuzzy ────────────────────────────────────────────────

function normalize(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function isFuzzySubsequence(haystack: string, needle: string): boolean {
  let hi = 0;
  for (const ch of needle) {
    while (hi < haystack.length && haystack[hi] !== ch) hi++;
    if (hi >= haystack.length) return false;
    hi++;
  }
  return true;
}

function matchScore(name: string, description: string, query: string): number {
  if (!query) return 1;
  const q = normalize(query);
  const n = normalize(name);
  const d = normalize(description ?? "");
  const tokens = q.split(/\s+/).filter(Boolean);

  if (n === q) return 100;
  if (n.startsWith(q)) return 90;
  if (n.includes(q)) return 80;
  if (tokens.length && tokens.every(t => n.includes(t))) return 70;

  const found = tokens.filter(t => n.includes(t));
  if (found.length) return 50 + (found.length / tokens.length) * 15;

  if (d.includes(q)) return 40;
  if (tokens.some(t => d.includes(t))) return 35;

  if (q.length >= 3 && isFuzzySubsequence(n, q)) return 25;

  // Tolerância a typos: distância de edição por palavra do nome vs token
  const nameWords = n.split(/\s+/);
  for (const word of nameWords) {
    for (const token of tokens) {
      if (token.length >= 3) {
        const slice = word.slice(0, token.length + 1);
        const dist = levenshtein(slice, token);
        if (dist <= Math.max(1, Math.floor(token.length / 3))) return 15;
      }
    }
  }

  return 0;
}

export const Route = createFileRoute("/catalogo")({
  head: () => ({
    meta: [
      { title: "Catálogo de Peptídeos — PharPep" },
      { name: "description", content: "Catálogo premium de peptídeos com atendimento direto pelo WhatsApp." },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  useEffect(() => {
    trackEvent("page_view", undefined, { path: "/catalogo" });
    // Limpa cache antigo de produtos para garantir fetch sempre fresco
    try {
      const raw = sessionStorage.getItem("pharpep-query-cache");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.queries) {
          parsed.queries = parsed.queries.filter(
            (q: { queryKey: unknown[] }) => JSON.stringify(q.queryKey) !== JSON.stringify(["products-public"])
          );
          sessionStorage.setItem("pharpep-query-cache", JSON.stringify(parsed));
        }
      }
    } catch { /* noop */ }
  }, []);

  // Redireciona admin assim que auth resolver — não bloqueia a exibição dos produtos
  useEffect(() => {
    if (!authLoading && isAdmin) navigate({ to: "/admin/dashboard", replace: true });
  }, [authLoading, isAdmin, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["products-public"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharpep_products")
        .select("id, name, description, price, primary_image_url")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    return data
      .map(p => ({ p, score: matchScore(p.name, p.description ?? "", search) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ p }) => p);
  }, [data, search]);

  // Realtime: refresh on any product change
  useEffect(() => {
    const ch = supabase
      .channel("pharpep-products-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "pharpep_products" }, () => {
        window.dispatchEvent(new Event("focus"));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="min-h-screen bg-mesh">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <div className="mb-8 text-center animate-fade-up">
          <p className="text-xs uppercase tracking-widest text-primary">Catálogo</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
            Peptídeos <span className="text-gradient">premium</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Toque em "Pedir agora" para conversar com nosso time pelo WhatsApp.
          </p>
        </div>

        {/* Barra de busca */}
        <div className="mx-auto mb-8 max-w-lg animate-fade-up" style={{ animationDelay: "80ms" }}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar peptídeo... (ex: BPC, retatrutida, sono)"
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-10 text-sm outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white/8 focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {search && !isLoading && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {filtered.length === 0
                ? "Nenhum produto encontrado para esta busca"
                : `${filtered.length} produto${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-sm font-semibold text-red-400 mb-1">Erro ao carregar produtos</p>
            <p className="text-xs text-muted-foreground">{String(error)}</p>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-muted-foreground">Nenhum produto cadastrado ainda. Volte em breve.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center animate-fade-up">
            <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-semibold">Nenhum resultado para "{search}"</p>
            <p className="mt-1 text-xs text-muted-foreground">Tente outro nome ou parte do nome do peptídeo</p>
            <button onClick={() => setSearch("")} className="mt-4 text-xs text-primary underline underline-offset-2">
              Limpar busca
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </main>
    </div>
  );
}
