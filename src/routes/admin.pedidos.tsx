import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MessageCircle, Trash2, ChevronDown, Package, MapPin, User,
  CreditCard, ShieldCheck, X, CheckCircle2, Info,
} from "lucide-react";

export const Route = createFileRoute("/admin/pedidos")({
  component: PedidosAdmin,
});

interface PedidoItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface PharpepPedido {
  id: string;
  created_at: string;
  user_id: string | null;
  cliente_nome: string;
  cliente_cpf: string;
  cliente_telefone: string;
  endereco_cep: string;
  endereco_rua: string;
  endereco_numero: string;
  endereco_complemento: string | null;
  endereco_bairro: string;
  endereco_cidade: string;
  endereco_uf: string;
  itens: PedidoItem[];
  subtotal: number;
  frete: number;
  frete_regiao: string | null;
  total: number;
  pagamento: string;
  status: string;
}

const STATUS_OPTS: { value: string; label: string; desc?: string }[] = [
  { value: "pendente",   label: "Pendente",   desc: "Aguardando confirmação" },
  { value: "confirmado", label: "Confirmado",  desc: "Registra em Vendas e Finanças (10%)" },
  { value: "enviado",    label: "Enviado",     desc: "Pedido despachado" },
  { value: "entregue",   label: "Entregue",    desc: "Entregue ao cliente" },
  { value: "cancelado",  label: "Cancelado",   desc: "Pedido cancelado" },
];

const STATUS_CLS: Record<string, string> = {
  pendente:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  confirmado: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  enviado:    "bg-purple-500/15 text-purple-400 border-purple-500/20",
  entregue:   "bg-green-500/15 text-green-400 border-green-500/20",
  cancelado:  "bg-red-500/15 text-red-400 border-red-500/20",
};

function formatBRL(v: number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Modal de Status ─────────────────────────────────────────────────────────

function StatusModal({
  pedido,
  onClose,
  onConfirm,
}: {
  pedido: PharpepPedido;
  onClose: () => void;
  onConfirm: (pedido: PharpepPedido, newStatus: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState(pedido.status);
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (selected === pedido.status) { onClose(); return; }
    setSaving(true);
    await onConfirm(pedido, selected);
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-premium w-full max-w-sm rounded-t-3xl p-6 sm:rounded-3xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Alterar Status</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pedido #{pedido.id.slice(0, 8).toUpperCase()} · {pedido.cliente_nome}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/5 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 mb-5">
          {STATUS_OPTS.map((opt) => {
            const isActive = selected === opt.value;
            const isCurrent = pedido.status === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={`w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-white/8 bg-white/[0.02] hover:border-white/15"
                }`}
              >
                <div className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                  isActive ? "border-primary bg-primary" : "border-white/30"
                }`}>
                  {isActive && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isActive ? "text-primary" : ""}`}>
                      {opt.label}
                    </span>
                    {isCurrent && (
                      <span className="rounded-full bg-white/8 border border-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        atual
                      </span>
                    )}
                  </div>
                  {opt.desc && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Aviso ao confirmar */}
        {selected === "confirmado" && pedido.status !== "confirmado" && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-blue-500/25 bg-blue-500/8 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
            <p className="text-xs text-blue-300 leading-relaxed">
              Ao confirmar, este pedido será registrado automaticamente em{" "}
              <strong>Vendas</strong> e <strong>Finanças</strong> (10% = {formatBRL(pedido.total * 0.1)}).
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-input/30 py-3 text-sm font-medium hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            onClick={handle}
            disabled={saving || selected === pedido.status}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:opacity-40"
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirmar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

function PedidosAdmin() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<PharpepPedido | null>(null);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["admin-pharpep-pedidos"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db
        .from("pharpep_pedidos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PharpepPedido[];
    },
  });

  const updateStatus = async (pedido: PharpepPedido, newStatus: string) => {
    const db = supabase as any;

    // 1. Atualiza o status do pedido
    const { error } = await db
      .from("pharpep_pedidos")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", pedido.id);
    if (error) {
      toast.error(error.message);
      return;
    }

    // 2. Se está confirmando (e não estava confirmado antes) → cria venda + financas
    if (newStatus === "confirmado" && pedido.status !== "confirmado") {
      const vendaItens = (pedido.itens ?? []).map((item) => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
      }));

      const vendaPayload = {
        cliente_nome: pedido.cliente_nome,
        cliente_cpf: pedido.cliente_cpf,
        cliente_telefone: pedido.cliente_telefone,
        endereco_rua: pedido.endereco_rua,
        endereco_numero: pedido.endereco_numero,
        endereco_bairro: pedido.endereco_bairro,
        endereco_cidade: pedido.endereco_cidade,
        endereco_estado: pedido.endereco_uf,
        endereco_cep: pedido.endereco_cep,
        itens: vendaItens,
        descontos: [],
        frete: pedido.frete ?? 0,
        valor: pedido.total,
        status: "concluido",
        observacoes: `Pedido #${pedido.id.slice(0, 8).toUpperCase()} via carrinho`,
      };

      const { data: vendaData, error: vendaErr } = await db
        .from("vendas")
        .insert(vendaPayload)
        .select("id")
        .single();

      if (vendaErr) {
        toast.warning(`Pedido confirmado, mas erro ao registrar em Vendas: ${vendaErr.message}`);
      } else {
        const vendaId = vendaData?.id;
        if (vendaId) {
          const { error: finErr } = await db.from("financas").insert({
            venda_id: vendaId,
            valor: pedido.total * 0.1,
            tipo: "entrada",
            data: new Date().toISOString().slice(0, 10),
            descricao: `Venda: ${(pedido.itens ?? []).map((i) => i.name).join(", ")} — ${pedido.cliente_nome}`,
          });
          if (finErr) {
            toast.warning(`Venda registrada, mas erro em Finanças: ${finErr.message}`);
          } else {
            toast.success("Pedido confirmado! Registrado em Vendas e Finanças.");
          }
        } else {
          toast.success("Pedido confirmado e venda registrada.");
        }
      }
    } else {
      toast.success("Status atualizado");
    }

    qc.invalidateQueries({ queryKey: ["admin-pharpep-pedidos"] });
    qc.invalidateQueries({ queryKey: ["admin-vendas"] });
    qc.invalidateQueries({ queryKey: ["admin-financas"] });
  };

  const onDelete = async (id: string) => {
    if (!confirm("Excluir este pedido permanentemente?")) return;
    const db = supabase as any;
    const { error } = await db.from("pharpep_pedidos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Pedido excluído");
    qc.invalidateQueries({ queryKey: ["admin-pharpep-pedidos"] });
  };

  const openWhatsApp = (p: PharpepPedido) => {
    const num = p.cliente_telefone.replace(/\D/g, "");
    const full = num.startsWith("55") ? num : `55${num}`;
    const items = p.itens.map(i => `• ${i.name} (x${i.quantity}) — ${formatBRL(i.price * i.quantity)}`).join("\n");
    const msg = [
      `Olá, ${p.cliente_nome}! 👋`,
      `Seu pedido *#${p.id.slice(0, 8).toUpperCase()}* foi recebido.`,
      ``,
      `*Itens:*`,
      items,
      ``,
      `Subtotal: ${formatBRL(p.subtotal)}`,
      p.frete > 0 ? `Frete (${p.frete_regiao ?? ""}): ${formatBRL(p.frete)}` : `Frete: A combinar`,
      `*Total: ${formatBRL(p.total)}*`,
      ``,
      `Pagamento: ${p.pagamento === "pix" ? "PIX" : "Cartão"}`,
    ].join("\n");
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const pendentes = pedidos.filter(p => p.status === "pendente").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Pedidos realizados pelo carrinho do catálogo</p>
        </div>
        <div className="flex gap-3">
          <div className="card-premium rounded-2xl px-5 py-3 text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-display text-2xl font-bold">{pedidos.length}</p>
          </div>
          {pendentes > 0 && (
            <div className="card-premium rounded-2xl px-5 py-3 text-center border border-yellow-500/20">
              <p className="text-xs text-yellow-400">Pendentes</p>
              <p className="font-display text-2xl font-bold text-yellow-400">{pendentes}</p>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : pedidos.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
          Nenhum pedido realizado ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => {
            const isOpen = expandedId === p.id;
            return (
              <div key={p.id} className="card-premium overflow-hidden rounded-2xl">
                {/* Row principal */}
                <div className="flex items-start gap-3 p-4 sm:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{p.cliente_nome}</span>
                      {/* Badge de status clicável */}
                      <button
                        onClick={() => setStatusModal(p)}
                        title="Alterar status"
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition hover:ring-1 hover:ring-white/20 ${STATUS_CLS[p.status] ?? "bg-white/10 text-foreground border-white/10"}`}
                      >
                        {p.status}
                      </button>
                      <span className="text-[11px] text-muted-foreground font-mono">#{p.id.slice(0, 8).toUpperCase()}</span>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                      {p.itens?.length > 0
                        ? p.itens.map(i => `${i.name} x${i.quantity}`).join(", ")
                        : "—"}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-bold text-gradient text-sm">{formatBRL(p.total)}</span>
                      <span>{p.pagamento === "pix" ? "PIX" : "Cartão"}</span>
                      <span>{format(new Date(p.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openWhatsApp(p)}
                      title="Contatar cliente via WhatsApp"
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-green-500/10 hover:text-green-400"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => setExpandedId(isOpen ? null : p.id)}
                      title="Ver detalhes"
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>

                    <button
                      onClick={() => onDelete(p.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Detalhes expandidos */}
                {isOpen && (
                  <div className="border-t border-white/5 p-4 space-y-5">
                    {/* Status button mobile */}
                    <div className="flex items-center gap-3 sm:hidden">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      <button
                        onClick={() => setStatusModal(p)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:ring-1 hover:ring-white/20 ${STATUS_CLS[p.status] ?? "bg-white/10 text-foreground border-white/10"}`}
                      >
                        {p.status} ↓
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                      {/* Cliente */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                          <User className="h-3 w-3" /> Cliente
                        </div>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-muted-foreground">Nome:</span> {p.cliente_nome}</p>
                          <p><span className="text-muted-foreground">CPF:</span> <span className="font-mono">{p.cliente_cpf}</span></p>
                          <p><span className="text-muted-foreground">Tel:</span> {p.cliente_telefone}</p>
                          {p.user_id && (
                            <p className="truncate"><span className="text-muted-foreground">User ID:</span> <span className="font-mono text-[11px]">{p.user_id}</span></p>
                          )}
                        </div>
                      </div>

                      {/* Endereço */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                          <MapPin className="h-3 w-3" /> Endereço
                        </div>
                        <div className="space-y-1 text-sm">
                          <p>{p.endereco_rua}, {p.endereco_numero}</p>
                          {p.endereco_complemento && <p className="text-muted-foreground">{p.endereco_complemento}</p>}
                          <p>{p.endereco_bairro}</p>
                          <p>{p.endereco_cidade} — {p.endereco_uf}</p>
                          <p className="font-mono text-xs">CEP: {p.endereco_cep}</p>
                        </div>
                      </div>

                      {/* Pagamento */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                          <CreditCard className="h-3 w-3" /> Pagamento
                        </div>
                        <div className="space-y-1 text-sm">
                          <p>
                            {p.pagamento === "pix"
                              ? <span className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400">PIX</span>
                              : <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400">Cartão</span>
                            }
                          </p>
                          <p><span className="text-muted-foreground">Subtotal:</span> {formatBRL(p.subtotal)}</p>
                          {p.frete > 0
                            ? <p><span className="text-muted-foreground">Frete{p.frete_regiao ? ` (${p.frete_regiao})` : ""}:</span> {formatBRL(p.frete)}</p>
                            : <p className="text-muted-foreground text-xs">Frete: A combinar</p>
                          }
                          <p className="font-bold"><span className="text-muted-foreground font-normal">Total:</span> <span className="text-gradient">{formatBRL(p.total)}</span></p>
                        </div>
                        {p.frete > 0 && (
                          <div className="flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 px-2.5 py-1.5 text-[11px] text-green-400">
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                            Frete inclui seguro
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Itens do pedido */}
                    {p.itens?.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                          <Package className="h-3 w-3" /> Itens do pedido ({p.itens.length})
                        </div>
                        <div className="rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                          {p.itens.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">{item.name}</span>
                                <span className="ml-2 text-xs text-muted-foreground">x{item.quantity}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono text-xs text-muted-foreground">{formatBRL(item.price)} un</span>
                                <span className="ml-3 font-semibold">{formatBRL(item.price * item.quantity)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de alteração de status */}
      {statusModal && (
        <StatusModal
          pedido={statusModal}
          onClose={() => setStatusModal(null)}
          onConfirm={updateStatus}
        />
      )}
    </div>
  );
}
