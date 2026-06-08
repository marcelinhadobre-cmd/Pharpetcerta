import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

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
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { trackEvent("page_view", undefined, { path: "/catalogo" }); }, []);

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

  const { data, isLoading } = useQuery({
    queryKey: ["products-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, price, primary_image_url")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Realtime: refresh on any product change
  useEffect(() => {
    const ch = supabase
      .channel("products-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        window.dispatchEvent(new Event("focus"));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="min-h-screen bg-mesh">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <div className="mb-10 text-center animate-fade-up">
          <p className="text-xs uppercase tracking-widest text-primary">Catálogo</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
            Peptídeos <span className="text-gradient">premium</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Toque em "Pedir agora" para conversar com nosso time pelo WhatsApp.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-muted-foreground">Nenhum produto cadastrado ainda. Volte em breve.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </main>
    </div>
  );
}
