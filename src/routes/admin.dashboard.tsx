import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Users, Package, MousePointerClick } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/admin/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    refetchInterval: 10_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [pv, orders, prods, events] = await Promise.all([
        supabase.from("analytics_events").select("session_id, created_at", { count: "exact" }).eq("event_type", "page_view"),
        supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "order_click"),
        supabase.from("pharpep_products").select("id", { count: "exact", head: true }),
        supabase.from("analytics_events").select("event_type, created_at").gte("created_at", since).order("created_at"),
      ]);

      const uniqueVisitors = new Set((pv.data ?? []).map((r) => r.session_id).filter(Boolean)).size;

      // Bucket events by day
      const days: Record<string, { day: string; views: number; orders: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        days[key] = { day: key.slice(5), views: 0, orders: 0 };
      }
      for (const e of events.data ?? []) {
        const key = (e.created_at as string).slice(0, 10);
        if (!days[key]) continue;
        if (e.event_type === "page_view") days[key].views++;
        if (e.event_type === "order_click") days[key].orders++;
      }

      return {
        visitors: uniqueVisitors,
        pageViews: pv.count ?? 0,
        orderClicks: orders.count ?? 0,
        products: prods.count ?? 0,
        series: Object.values(days),
      };
    },
  });

  const cards = [
    { label: "Visitantes únicos", value: stats?.visitors ?? 0, icon: Users, color: "text-primary" },
    { label: "Total de acessos", value: stats?.pageViews ?? 0, icon: Eye, color: "text-accent" },
    { label: "Produtos cadastrados", value: stats?.products ?? 0, icon: Package, color: "text-chart-3" },
    { label: "Cliques em pedir", value: stats?.orderClicks ?? 0, icon: MousePointerClick, color: "text-chart-4" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Estatísticas em tempo real · atualiza a cada 10s</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card-premium rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <p className="mt-3 font-display text-3xl font-bold">{c.value.toLocaleString("pt-BR")}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-premium rounded-2xl p-5">
          <h3 className="font-display text-lg font-semibold">Tráfego (30 dias)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.series ?? []}>
                <defs>
                  <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.18 200)" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="oklch(0.78 0.18 200)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="day" stroke="oklch(0.7 0.03 260)" fontSize={11} />
                <YAxis stroke="oklch(0.7 0.03 260)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.03 270)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="views" stroke="oklch(0.78 0.18 200)" fill="url(#gv)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-premium rounded-2xl p-5">
          <h3 className="font-display text-lg font-semibold">Cliques em "Pedir agora"</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="day" stroke="oklch(0.7 0.03 260)" fontSize={11} />
                <YAxis stroke="oklch(0.7 0.03 260)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.03 270)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12 }} />
                <Bar dataKey="orders" fill="oklch(0.65 0.25 305)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
