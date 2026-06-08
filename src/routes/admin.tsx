import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, Package, LogOut, ShoppingBag, Users, ClipboardList, Wallet } from "lucide-react";
import logo from "@/assets/pharpep-logo.png";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { session, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && (!session || !isAdmin)) navigate({ to: "/login" });
  }, [loading, session, isAdmin, navigate]);

  if (loading || !session || !isAdmin) {
    return <div className="flex min-h-screen items-center justify-center bg-mesh text-sm text-muted-foreground">Carregando...</div>;
  }

  const nav = [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/produtos", label: "Produtos", icon: Package },
    { to: "/admin/vendas", label: "Vendas", icon: ShoppingBag },
    { to: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
    { to: "/admin/financas", label: "Finanças", icon: Wallet },
    { to: "/admin/usuarios", label: "Usuários", icon: Users },
  ] as const;

  return (
    <div className="min-h-screen bg-mesh">
      <header className="glass sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <img src={logo} alt="" width={32} height={32} />
            <span className="font-display text-lg font-bold">Phar<span className="text-gradient">Pep</span> · Admin</span>
          </Link>
          <button onClick={() => { signOut(); navigate({ to: "/login" }); }} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
          {nav.map((n) => {
            const active = path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-white/5"}`}>
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
