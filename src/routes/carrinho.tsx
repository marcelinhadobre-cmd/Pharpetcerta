import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag, PackageSearch, ChevronDown, Package, MapPin, CreditCard,
  ShieldCheck, MessageCircle, Clock, CheckCircle2, Truck, XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/carrinho")({
  head: () => ({ meta: [{ title: "Meus Pedidos — PharPep" }] }),
  component: MeusPedidosPage,
});

const WHATSAPP_NUMBER = "5512982501119";

interface PedidoItem { id: string; name: string; price: number; quantity: number; }

interface MeuPedido {
  id: string;
  created_at: string;
  cliente_nome: string;
  cliente_cpf: string;
  cliente_telefone: string;
  itens: PedidoItem[];
  subtotal: number;
  frete: number;
  frete_regiao: string | null;
  total: number;
  pagamento: string;
  status: string;
  endereco_rua: string;
  endereco_numero: string;
  endereco_complemento: string | null;
  endereco_bairro: string;
  endereco_cidade: string;
  endereco_uf: string;
  endereco_cep: string;
}

const STATUS_CLS: Record<string, string> = {
  pendente:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  confirmado: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  enviado:    "bg-purple-500/15 text-purple-400 border-purple-500/20",
  cancelado:  "bg-red-500/15 text-red-400 border-red-500/20",
};

const STATUS_LABEL: Record<string, string> = {
  pendente:   "Aguardando pagamento",
  confirmado: "Confirmado",
  enviado:    "Em transporte",
  cancelado:  "Cancelado",
};

const STATUS_ICON: Record<string, React.FC<{ className?: string }>> = {
  pendente:   Clock,
  confirmado: CheckCircle2,
  enviado:    Truck,
  cancelado:  XCircle,
};

function formatBRL(v: number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildPayMsg(p: MeuPedido): string {
  const pedidoRef = `#${p.id.slice(0, 8).toUpperCase()}`;
  const payLabel  = p.pagamento === "pix" ? "PIX" : "Cartão de Crédito";
  const addr = [
    `${p.endereco_rua}, ${p.endereco_numero}`,
    p.endereco_bairro,
    `${p.endereco_cidade}/${p.endereco_uf}`,
    `— CEP ${p.endereco_cep}`,
  ].filter(Boolean).join(", ");

  const itemsList = (p.itens ?? [])
    .map(i => `• ${i.name} x${i.quantity} — ${formatBRL(i.price * i.quantity)}`)
    .join("\n");

  return [
    `Olá! Fiz um pedido *${pedidoRef}* no valor de *${formatBRL(p.total)}*.`,
    ``,
    itemsList,
    ``,
    `*Dados de entrega:*`,
    `${p.cliente_nome} | CPF: ${p.cliente_cpf}`,
    addr,
    `Tel: ${p.cliente_telefone}`,
    ``,
    `Vou pagar no *${payLabel}*.`,
  ].join("\n");
}

function MeusPedidosPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["meus-pedidos-ativos", session?.user?.id],
    enabled: !!session?.user?.id,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db
        .from("pharpep_pedidos")
        .select("id, created_at, cliente_nome, cliente_cpf, cliente_telefone, itens, subtotal, frete, frete_regiao, total, pagamento, status, endereco_rua, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_uf, endereco_cep")
        .eq("user_id", session!.user.id)
        .neq("status", "entregue")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MeuPedido[];
    },
  });

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const handlePay = (p: MeuPedido) => {
    const msg = encodeURIComponent(buildPayMsg(p));
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-mesh">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
        <div className="mb-8 animate-fade-up">
          <p className="text-xs uppercase tracking-widest text-primary">Acompanhamento</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Meus Pedidos</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pedidos em andamento. Após entregues aparecem em <strong>Minhas Compras</strong>.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : pedidos.length === 0 ? (
          <div className="animate-fade-up flex flex-col items-center justify-center rounded-3xl card-premium px-8 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 border border-primary/20 mb-5">
              <PackageSearch className="h-8 w-8 text-primary" />
            </div>
            <p className="font-display text-lg font-bold">Nenhum pedido ativo</p>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              Quando você fizer um pedido no catálogo, ele aparecerá aqui para acompanhamento.
            </p>
            <button
              onClick={() => navigate({ to: "/catalogo" })}
              className="btn-hero mt-7 inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold"
            >
              <ShoppingBag className="h-4 w-4" />
              Ver catálogo
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-up">
            {pedidos.map((p, idx) => {
              const isOpen = expandedId === p.id;
              const StatusIcon = STATUS_ICON[p.status] ?? Clock;
              return (
                <div
                  key={p.id}
                  className="card-premium rounded-2xl overflow-hidden"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Header do card */}
                  <button
                    onClick={() => setExpandedId(isOpen ? null : p.id)}
                    className="w-full flex items-start justify-between gap-3 p-4 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">
                          #{p.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLS[p.status] ?? "bg-white/10 text-foreground border-white/10"}`}>
                          <StatusIcon className="h-3 w-3" />
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {p.itens?.map(i => `${i.name} x${i.quantity}`).join(", ") ?? "—"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="text-sm font-bold text-gradient">{formatBRL(p.total)}</span>
                        <span>{p.pagamento === "pix" ? "PIX" : "Cartão"}</span>
                        <span>{format(new Date(p.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      </div>
                    </div>
                    <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* CTA de pagamento — só para pedidos pendentes */}
                  {p.status === "pendente" && (
                    <div className="px-4 pb-4">
                      <button
                        onClick={() => handlePay(p)}
                        className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#25D366]/30 transition hover:brightness-110 active:scale-95"
                      >
                        <MessageCircle className="h-5 w-5" />
                        Finalizar compra — enviar pagamento
                      </button>
                    </div>
                  )}

                  {/* Detalhes expandidos */}
                  {isOpen && (
                    <div className="border-t border-white/5 p-4 space-y-5">
                      {p.itens?.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                            <Package className="h-3 w-3" /> Itens
                          </div>
                          <div className="rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                            {p.itens.map((item, i) => (
                              <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                                <div>
                                  <span className="font-medium">{item.name}</span>
                                  <span className="ml-2 text-xs text-muted-foreground">x{item.quantity}</span>
                                </div>
                                <span className="font-semibold shrink-0">{formatBRL(item.price * item.quantity)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                            <MapPin className="h-3 w-3" /> Entrega
                          </div>
                          <div className="space-y-0.5 text-sm">
                            <p>{p.endereco_rua}, {p.endereco_numero}</p>
                            {p.endereco_complemento && <p className="text-muted-foreground">{p.endereco_complemento}</p>}
                            <p>{p.endereco_bairro}</p>
                            <p>{p.endereco_cidade} — {p.endereco_uf}</p>
                            <p className="font-mono text-xs">CEP: {p.endereco_cep}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                            <CreditCard className="h-3 w-3" /> Resumo
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span>{formatBRL(p.subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Frete{p.frete_regiao ? ` (${p.frete_regiao})` : ""}
                              </span>
                              <span>{p.frete > 0 ? formatBRL(p.frete) : "A combinar"}</span>
                            </div>
                            <div className="flex justify-between border-t border-white/10 pt-1 font-bold">
                              <span>Total</span>
                              <span className="text-gradient">{formatBRL(p.total)}</span>
                            </div>
                          </div>
                          {p.frete > 0 && (
                            <div className="flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 px-2.5 py-1.5 text-[11px] text-green-400 mt-2">
                              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                              Frete com seguro incluso
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground pt-1">
                            Pagamento:{" "}
                            <span className="font-medium text-foreground">
                              {p.pagamento === "pix" ? "PIX" : "Cartão"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
