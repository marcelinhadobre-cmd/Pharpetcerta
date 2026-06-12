import { useState, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Menu, X, User, ClipboardList, Phone, ShoppingBag,
  Package, LogOut, LogIn, ChevronRight, FlaskConical, ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/pharpep-logo.png";

const HAMBURGER_PAGES = ["/perfil", "/protocolo", "/pedidos", "/carrinho", "/contato"];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { session, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showBack = HAMBURGER_PAGES.includes(pathname);

  // Fecha ao apertar Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Trava scroll do body quando aberto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate({ to: "/login" });
  };

  const close = () => setOpen(false);

  const loggedIn = !!session;
  const userName = profile?.nome || session?.user?.email || "Usuário";

  const menuItems = loggedIn
    ? [
        { icon: User,         label: "Perfil",          to: "/perfil" },
        { icon: ClipboardList, label: "Minha Anamnese",  to: "/protocolo" },
        { icon: FlaskConical,  label: "Catálogo",        to: "/catalogo" },
        { icon: ShoppingBag,  label: "Minhas Compras",   to: "/pedidos" },
        { icon: Package,      label: "Meus Pedidos",     to: "/carrinho" },
        { icon: Phone,        label: "Contato",          to: "/contato" },
      ]
    : [
        { icon: FlaskConical, label: "Catálogo",         to: "/catalogo" },
        { icon: Phone,        label: "Contato",          to: "/contato" },
      ];

  return (
    <>
      <header className="glass sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logo}
              alt="PharPep"
              width={36}
              height={36}
              className="drop-shadow-[0_0_12px_oklch(0.78_0.18_200/0.6)]"
            />
            <span className="font-display text-xl font-bold tracking-tight">
              Phar<span className="text-gradient">Pep</span>
            </span>
          </Link>

          {/* Botão voltar — visível apenas nas páginas do menu */}
          {showBack && (
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-primary/40 hover:bg-primary/10 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao início
            </Link>
          )}

          {/* Hamburger */}
          {!loading && (
            <button
              onClick={() => setOpen(true)}
              aria-label="Abrir menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-foreground transition hover:border-primary/40 hover:bg-primary/10"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-72 flex-col bg-[oklch(0.10_0.02_280)] shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header do drawer */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <span className="font-display text-sm font-bold tracking-tight text-white/80">Menu</span>
          <button
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/8 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info do usuário */}
        {loggedIn && (
          <div className="border-b border-white/8 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{userName}</p>
                <p className="text-[11px] text-muted-foreground">Conta ativa</p>
              </div>
            </div>
          </div>
        )}

        {/* Itens do menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {menuItems.map(({ icon: Icon, label, to }) => (
            <Link
              key={to}
              to={to}
              onClick={close}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/8 hover:text-white group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 transition group-hover:bg-primary/15 group-hover:text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <span className="flex-1">{label}</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-30 group-hover:opacity-60" />
            </Link>
          ))}
        </nav>

        {/* Footer do drawer */}
        <div className="border-t border-white/8 px-3 py-4">
          {loggedIn ? (
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                <LogOut className="h-4 w-4" />
              </div>
              Sair da conta
            </button>
          ) : (
            <Link
              to="/login"
              onClick={close}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-primary transition hover:bg-primary/10"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                <LogIn className="h-4 w-4" />
              </div>
              Entrar / Criar conta
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
