import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

const SESSION_CACHE_KEY = "pharpep-query-cache";

function buildQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        // Dados com menos de 3 min não são refetchados — elimina loading desnecessário
        staleTime: 3 * 60 * 1000,
        // Mantém cache inativo por 30 min
        gcTime: 30 * 60 * 1000,
        // Não tenta infinitamente em erro
        retry: 1,
      },
    },
  });

  // ── Restaura o cache da sessão anterior (só no browser) ──────────────────────
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (raw) {
        const dehydrated = JSON.parse(raw);
        hydrate(client, dehydrated);
      }
    } catch {
      // Cache corrompido — ignora
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    }

    // Salva o cache no sessionStorage antes do refresh/fechamento da aba
    window.addEventListener("pagehide", () => {
      try {
        const state = dehydrate(client, {
          shouldDehydrateQuery: (q) => q.state.status === "success",
        });
        sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(state));
      } catch { /* noop */ }
    });
  }

  return client;
}

export const getRouter = () => {
  const queryClient = buildQueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
