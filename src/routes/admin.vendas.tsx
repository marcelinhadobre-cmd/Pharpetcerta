import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, Trash2, DollarSign, TrendingUp, ShoppingBag, X, Pencil, Eye, Tag,
  Package, ChevronDown,
} from "lucide-react";
import { formatBRL } from "@/lib/whatsapp";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/admin/vendas")({
  component: VendasAdmin,
});

// ─── Remetente ────────────────────────────────────────────────────────────────
const REMETENTE = {
  nome: "PharPep Suplementos",
  rua: "Av. Central",
  numero: "456",
  bairro: "Centro",
  cidade: "São Paulo",
  estado: "SP",
  cep: "01310-100",
  telefone: "(11) 99999-9999",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface VendaItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface VendaRow {
  id: string;
  created_at: string;
  cliente_nome: string;
  cliente_cpf: string;
  cliente_telefone: string;
  endereco_rua: string;
  endereco_numero: string;
  endereco_bairro: string;
  endereco_cidade: string;
  endereco_estado: string;
  endereco_cep: string;
  itens: VendaItem[];
  frete: number;
  valor: number;
  status: string;
  observacoes: string;
}

interface PharpepProduct {
  id: string;
  name: string;
  price: number;
  primary_image_url: string | null;
  active: boolean;
}

// ─── Helpers de formatação ─────────────────────────────────────────────────────
function maskCpf(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim().replace(/-$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim().replace(/-$/, "");
}

function maskCep(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d{0,3})/, "$1-$2").replace(/-$/, "");
}

function maskValor(v: string) {
  const digits = v.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseBRL(v: string) {
  return parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;
}

const calcLucro = (valor: number) => valor * 0.1;

// ─── PDF como Canvas ──────────────────────────────────────────────────────────
function gerarPDF(venda: VendaRow) {
  const itens: VendaItem[] = Array.isArray(venda.itens) ? venda.itens : [];
  const subtotal = itens.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const frete = Number(venda.frete) || 0;
  const total = subtotal + frete;

  const W = 600;
  const itemH = 28;
  const fixedH = 460;
  const H = fixedH + Math.max(itens.length, 1) * itemH + 20;

  const canvas = document.createElement("canvas");
  canvas.width = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);

  // Fundo
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, W, H);

  // Borda externa
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 8, 8, W - 16, H - 16, 12);
  ctx.stroke();

  // Header verde
  ctx.fillStyle = "#0f172a";
  roundRectFill(ctx, 8, 8, W - 16, 70, 12, 0);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px Arial";
  ctx.textBaseline = "top";
  ctx.fillText("PHARPEP SUPLEMENTOS", 24, 22);
  ctx.font = "11px Arial";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Orçamento / Comprovante de Venda", 24, 46);

  // Nº do pedido + data
  ctx.textAlign = "right";
  ctx.fillStyle = "#7dd3fc";
  ctx.font = "bold 12px Arial";
  ctx.fillText(`Pedido #${venda.id.slice(0, 8).toUpperCase()}`, W - 24, 22);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px Arial";
  ctx.fillText(format(new Date(venda.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), W - 24, 42);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // ── Seção cliente ──────────────────────────────────────────────
  let y = 98;
  sectionTitle(ctx, "DADOS DO CLIENTE", 24, y);
  y += 22;

  const col1 = 24, col2 = W / 2 + 12;
  infoLine(ctx, "Nome", venda.cliente_nome, col1, y);
  infoLine(ctx, "CPF", venda.cliente_cpf, col2, y);
  y += 22;
  infoLine(ctx, "Telefone", venda.cliente_telefone, col1, y);
  y += 22;

  // ── Seção endereço ─────────────────────────────────────────────
  divider(ctx, W, y + 4);
  y += 18;
  sectionTitle(ctx, "ENDEREÇO DE ENTREGA", 24, y);
  y += 22;

  const endereco = [venda.endereco_rua, venda.endereco_numero].filter(Boolean).join(", ");
  infoLine(ctx, "Endereço", endereco, col1, y);
  infoLine(ctx, "Bairro", venda.endereco_bairro, col2, y);
  y += 22;
  infoLine(ctx, "Cidade", `${venda.endereco_cidade} — ${venda.endereco_estado}`, col1, y);
  infoLine(ctx, "CEP", venda.endereco_cep, col2, y);
  y += 28;

  // ── Tabela de itens ────────────────────────────────────────────
  divider(ctx, W, y);
  y += 14;
  sectionTitle(ctx, "PRODUTOS", 24, y);
  y += 20;

  // Cabeçalho tabela
  ctx.fillStyle = "#e2e8f0";
  roundRectFill(ctx, 20, y, W - 40, 24, 6, 6);
  ctx.fillStyle = "#475569";
  ctx.font = "bold 10px Arial";
  ctx.fillText("PRODUTO", 30, y + 16);
  ctx.textAlign = "center";
  ctx.fillText("QTD", W / 2 - 20, y + 16);
  ctx.textAlign = "right";
  ctx.fillText("UNIT.", W - 100, y + 16);
  ctx.fillText("SUBTOTAL", W - 30, y + 16);
  ctx.textAlign = "left";
  y += 28;

  // Linhas de itens
  if (itens.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "italic 11px Arial";
    ctx.fillText("Nenhum produto registrado", 30, y + 16);
    y += itemH;
  } else {
    itens.forEach((item, idx) => {
      if (idx % 2 === 0) {
        ctx.fillStyle = "rgba(241,245,249,0.8)";
        roundRectFill(ctx, 20, y, W - 40, itemH - 2, 4, 4);
      }
      ctx.fillStyle = "#1e293b";
      ctx.font = "11px Arial";
      ctx.fillText(item.product_name, 30, y + 18);

      ctx.textAlign = "center";
      ctx.fillStyle = "#0ea5e9";
      ctx.font = "bold 11px Arial";
      ctx.fillText(String(item.quantity), W / 2 - 20, y + 18);

      ctx.textAlign = "right";
      ctx.fillStyle = "#475569";
      ctx.font = "11px Arial";
      ctx.fillText(formatBRL(item.unit_price), W - 100, y + 18);
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 11px Arial";
      ctx.fillText(formatBRL(item.quantity * item.unit_price), W - 30, y + 18);
      ctx.textAlign = "left";
      y += itemH;
    });
  }

  y += 8;
  divider(ctx, W, y);
  y += 20;

  // ── Totais ─────────────────────────────────────────────────────
  const totalsX = W - 200;
  totalLine(ctx, "Subtotal", formatBRL(subtotal), totalsX, y);
  y += 22;
  if (frete > 0) {
    totalLine(ctx, "Frete", formatBRL(frete), totalsX, y);
    y += 22;
  }

  // Linha total destaque
  ctx.fillStyle = "#0f172a";
  roundRectFill(ctx, totalsX - 10, y - 4, W - totalsX + 2, 30, 8, 8);
  ctx.fillStyle = "#7dd3fc";
  ctx.font = "bold 13px Arial";
  ctx.fillText("TOTAL", totalsX, y + 16);
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px Arial";
  ctx.fillText(formatBRL(total), W - 30, y + 16);
  ctx.textAlign = "left";
  y += 40;

  // Observações
  if (venda.observacoes) {
    divider(ctx, W, y);
    y += 16;
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 9px Arial";
    ctx.fillText("OBSERVAÇÕES", 24, y);
    y += 14;
    ctx.fillStyle = "#334155";
    ctx.font = "italic 11px Arial";
    ctx.fillText(venda.observacoes, 24, y);
    y += 20;
  }

  // Footer
  ctx.fillStyle = "#f1f5f9";
  roundRectFill(ctx, 8, H - 44, W - 16, 36, 0, 12);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    `Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • PharPep Suplementos`,
    W / 2,
    H - 22,
  );
  ctx.textAlign = "left";

  const link = document.createElement("a");
  link.download = `orcamento-${venda.cliente_nome.replace(/\s+/g, "-")}-${venda.id.slice(0, 8)}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function roundRectFill(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  tl: number, br: number,
) {
  const tr = tl, bl = br;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
  ctx.fill();
}

function sectionTitle(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.fillStyle = "#0ea5e9";
  ctx.font = "bold 9px Arial";
  ctx.fillText(text, x, y);
}

function divider(ctx: CanvasRenderingContext2D, W: number, y: number) {
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(20, y);
  ctx.lineTo(W - 20, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function infoLine(ctx: CanvasRenderingContext2D, label: string, value: string, x: number, y: number) {
  ctx.fillStyle = "#94a3b8";
  ctx.font = "9px Arial";
  ctx.fillText(label, x, y);
  ctx.fillStyle = "#1e293b";
  ctx.font = "11px Arial";
  ctx.fillText(value || "—", x, y + 12);
}

function totalLine(ctx: CanvasRenderingContext2D, label: string, value: string, x: number, y: number) {
  ctx.fillStyle = "#64748b";
  ctx.font = "11px Arial";
  ctx.fillText(label, x, y + 13);
  ctx.textAlign = "right";
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 11px Arial";
  ctx.fillText(value, x + 190, y + 13);
  ctx.textAlign = "left";
}

// ─── Main component ────────────────────────────────────────────────────────────
function VendasAdmin() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VendaRow | null>(null);
  const [viewing, setViewing] = useState<VendaRow | null>(null);

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["admin-vendas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VendaRow[];
    },
  });

  const onDelete = async (id: string) => {
    if (!confirm("Excluir esta venda?")) return;
    const { error } = await supabase.from("vendas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Venda excluída");
    qc.invalidateQueries({ queryKey: ["admin-vendas"] });
    qc.invalidateQueries({ queryKey: ["admin-financas"] });
  };

  const faturamentoTotal = vendas.reduce((s, v) => s + Number(v.valor), 0);
  const lucroTotal = vendas.reduce((s, v) => s + calcLucro(Number(v.valor)), 0);

  const monthlyData = (() => {
    const months: Record<string, { mes: string; Faturamento: number; Lucro: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      months[key] = { mes: format(d, "MMM/yy", { locale: ptBR }), Faturamento: 0, Lucro: 0 };
    }
    for (const v of vendas) {
      const key = v.created_at.slice(0, 7);
      if (months[key]) {
        months[key].Faturamento += Number(v.valor);
        months[key].Lucro += calcLucro(Number(v.valor));
      }
    }
    return Object.values(months);
  })();

  const cards = [
    { label: "Faturamento Total", value: formatBRL(faturamentoTotal), icon: DollarSign, color: "text-primary" },
    { label: "Meu Lucro Total", value: formatBRL(lucroTotal), icon: TrendingUp, color: "text-green-400" },
    { label: "Total de Vendas", value: String(vendas.length), icon: ShoppingBag, color: "text-accent" },
    {
      label: "Lucro Médio / Venda",
      value: vendas.length ? formatBRL(lucroTotal / vendas.length) : formatBRL(0),
      icon: Tag,
      color: "text-chart-4",
    },
  ];

  const resumoItens = (v: VendaRow) => {
    const itens: VendaItem[] = Array.isArray(v.itens) ? v.itens : [];
    if (itens.length === 0) return "—";
    return itens.map((i) => `${i.product_name} (${i.quantity}x)`).join(", ");
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Vendas</h1>
          <p className="text-sm text-muted-foreground">Lucro = 10% do valor por venda</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="btn-hero inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> Nova Venda
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card-premium rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <p className="mt-3 font-display text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      <div className="card-premium rounded-2xl p-5">
        <h3 className="font-display text-lg font-semibold">Faturamento & Lucro por Mês</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
              <XAxis dataKey="mes" stroke="oklch(0.7 0.03 260)" fontSize={11} />
              <YAxis
                stroke="oklch(0.7 0.03 260)"
                fontSize={11}
                tickFormatter={(v: number) => (v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`)}
              />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.18 0.03 270)",
                  border: "1px solid oklch(1 0 0 / 0.1)",
                  borderRadius: 12,
                }}
                formatter={(v: number) => formatBRL(v)}
              />
              <Legend />
              <Bar dataKey="Faturamento" fill="oklch(0.78 0.18 200)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Lucro" fill="oklch(0.65 0.25 305)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : vendas.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">Nenhuma venda registrada.</div>
      ) : (
        <div className="card-premium overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  {["Data", "Cliente", "CPF", "Produtos", "Frete", "Total", "Lucro", ""].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendas.map((v) => (
                  <tr key={v.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {format(new Date(v.created_at), "dd/MM/yy")}
                    </td>
                    <td className="px-4 py-3 font-medium">{v.cliente_nome}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{v.cliente_cpf}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground text-xs">{resumoItens(v)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {Number(v.frete) > 0 ? formatBRL(Number(v.frete)) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-gradient">
                      {formatBRL(Number(v.valor))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-green-400">
                      {formatBRL(calcLucro(Number(v.valor)))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewing(v)}
                          title="Visualizar"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-sky-400"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setEditing(v); setShowForm(true); }}
                          title="Editar"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(v.id)}
                          title="Excluir"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <VendaForm
          initial={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-vendas"] });
          }}
        />
      )}

      {viewing && (
        <VendaViewer venda={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

// ─── Modal Visualizar ──────────────────────────────────────────────────────────
function VendaViewer({ venda, onClose }: { venda: VendaRow; onClose: () => void }) {
  const itens: VendaItem[] = Array.isArray(venda.itens) ? venda.itens : [];
  const frete = Number(venda.frete) || 0;
  const subtotal = itens.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = subtotal + frete;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-premium max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-6 sm:rounded-3xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Venda #{venda.id.slice(0, 8).toUpperCase()}</h2>
            <p className="text-xs text-muted-foreground">
              {format(new Date(venda.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cliente */}
        <section className="mb-4 rounded-xl border border-white/8 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliente</p>
          <p className="font-semibold">{venda.cliente_nome}</p>
          <p className="text-sm text-muted-foreground">{venda.cliente_cpf} · {venda.cliente_telefone}</p>
        </section>

        {/* Endereço */}
        <section className="mb-4 rounded-xl border border-white/8 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endereço</p>
          <p className="text-sm">{venda.endereco_rua}, {venda.endereco_numero} — {venda.endereco_bairro}</p>
          <p className="text-sm text-muted-foreground">{venda.endereco_cidade} — {venda.endereco_estado} · CEP {venda.endereco_cep}</p>
        </section>

        {/* Produtos */}
        <section className="mb-4 rounded-xl border border-white/8 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Produtos</p>
          {itens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum produto</p>
          ) : (
            <div className="space-y-2">
              {itens.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{item.product_name} <span className="text-muted-foreground">×{item.quantity}</span></span>
                  <span className="font-semibold">{formatBRL(item.quantity * item.unit_price)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Totais */}
        <section className="mb-4 rounded-xl border border-white/8 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatBRL(subtotal)}</span>
          </div>
          {frete > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Frete</span>
              <span>{formatBRL(frete)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-white/8 pt-2 font-bold">
            <span>Total</span>
            <span className="text-gradient">{formatBRL(total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Seu lucro (10%)</span>
            <span className="text-green-400 font-semibold">{formatBRL(calcLucro(total))}</span>
          </div>
        </section>

        {venda.observacoes && (
          <section className="mb-4 rounded-xl border border-white/8 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações</p>
            <p className="text-sm">{venda.observacoes}</p>
          </section>
        )}

        <button
          onClick={() => gerarPDF(venda)}
          className="btn-hero w-full rounded-xl py-3 text-sm font-semibold"
        >
          Gerar PDF / Orçamento
        </button>
      </div>
    </div>
  );
}

// ─── Form component ────────────────────────────────────────────────────────────
function VendaForm({ initial, onClose }: { initial: VendaRow | null; onClose: () => void }) {
  const qc = useQueryClient();

  // Dados cliente
  const [nome, setNome] = useState(initial?.cliente_nome ?? "");
  const [cpf, setCpf] = useState(initial?.cliente_cpf ?? "");
  const [telefone, setTelefone] = useState(initial?.cliente_telefone ?? "");

  // Endereço
  const [rua, setRua] = useState(initial?.endereco_rua ?? "");
  const [numero, setNumero] = useState(initial?.endereco_numero ?? "");
  const [bairro, setBairro] = useState(initial?.endereco_bairro ?? "");
  const [cidade, setCidade] = useState(initial?.endereco_cidade ?? "");
  const [estado, setEstado] = useState(initial?.endereco_estado ?? "SP");
  const [cep, setCep] = useState(initial?.endereco_cep ?? "");

  // Itens
  const [itens, setItens] = useState<VendaItem[]>(
    Array.isArray(initial?.itens) ? initial.itens : [],
  );

  // Frete e obs
  const [freteStr, setFreteStr] = useState(() => {
    const f = Number(initial?.frete) || 0;
    return f > 0 ? f.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "";
  });
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [saving, setSaving] = useState(false);

  // Produto sendo adicionado
  const [addProductId, setAddProductId] = useState("");
  const [addQty, setAddQty] = useState("1");

  const { data: products = [] } = useQuery({
    queryKey: ["pharpep-products-form"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, primary_image_url, active")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as PharpepProduct[];
    },
  });

  const frete = parseBRL(freteStr);
  const subtotal = itens.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = subtotal + frete;

  const addItem = useCallback(() => {
    const prod = products.find((p) => p.id === addProductId);
    if (!prod) return toast.error("Selecione um produto");
    const qty = parseInt(addQty, 10);
    if (!qty || qty < 1) return toast.error("Quantidade inválida");

    setItens((prev) => {
      const exists = prev.findIndex((i) => i.product_id === prod.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = { ...updated[exists], quantity: updated[exists].quantity + qty };
        return updated;
      }
      return [...prev, { product_id: prod.id, product_name: prod.name, quantity: qty, unit_price: prod.price }];
    });
    setAddProductId("");
    setAddQty("1");
  }, [addProductId, addQty, products]);

  const removeItem = (idx: number) => setItens((prev) => prev.filter((_, i) => i !== idx));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (itens.length === 0) return toast.error("Adicione ao menos um produto");
    setSaving(true);

    const payload = {
      cliente_nome: nome,
      cliente_cpf: cpf,
      cliente_telefone: telefone,
      endereco_rua: rua,
      endereco_numero: numero,
      endereco_bairro: bairro,
      endereco_cidade: cidade,
      endereco_estado: estado.toUpperCase().slice(0, 2),
      endereco_cep: cep,
      itens: itens as unknown as import("@/integrations/supabase/types").Json,
      frete,
      valor: total,
      status: "concluido",
      observacoes,
    };

    try {
      if (initial) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from("vendas").update(payload as any).eq("id", initial.id);
        if (error) throw error;
        await supabase
          .from("financas")
          .update({ valor: total * 0.1, descricao: `Venda: ${itens.map((i) => i.product_name).join(", ")} — ${nome}` })
          .eq("venda_id", initial.id);
      } else {
        const { data: inserted, error } = await supabase
          .from("vendas")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(payload as any)
          .select("id")
          .single();
        if (error) throw error;
        const hoje = new Date().toISOString().slice(0, 10);
        await supabase.from("financas").insert({
          venda_id: inserted.id,
          valor: total * 0.1,
          tipo: "entrada",
          data: hoje,
          descricao: `Venda: ${itens.map((i) => i.product_name).join(", ")} — ${nome}`,
        });
      }
      qc.invalidateQueries({ queryKey: ["admin-financas"] });
      toast.success("Venda salva!");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-premium max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl p-6 sm:rounded-3xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{initial ? "Editar Venda" : "Nova Venda"}</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Cliente */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados do Cliente</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nome completo">
                <input
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className={inputCls}
                  placeholder="João da Silva"
                />
              </Field>
              <Field label="CPF">
                <input
                  required
                  value={cpf}
                  onChange={(e) => setCpf(maskCpf(e.target.value))}
                  className={inputCls}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </Field>
              <Field label="Telefone / WhatsApp">
                <input
                  required
                  value={telefone}
                  onChange={(e) => setTelefone(maskPhone(e.target.value))}
                  className={inputCls}
                  placeholder="(11) 99999-9999"
                  inputMode="numeric"
                />
              </Field>
            </div>
          </section>

          {/* Endereço */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endereço de Entrega</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="CEP">
                <input
                  required
                  value={cep}
                  onChange={(e) => setCep(maskCep(e.target.value))}
                  className={inputCls}
                  placeholder="00000-000"
                  inputMode="numeric"
                />
              </Field>
              <Field label="Número">
                <input required value={numero} onChange={(e) => setNumero(e.target.value)} className={inputCls} placeholder="123" />
              </Field>
              <Field label="Rua / Avenida">
                <input required value={rua} onChange={(e) => setRua(e.target.value)} className={inputCls} placeholder="Rua das Flores" />
              </Field>
              <Field label="Bairro">
                <input required value={bairro} onChange={(e) => setBairro(e.target.value)} className={inputCls} placeholder="Centro" />
              </Field>
              <Field label="Cidade">
                <input required value={cidade} onChange={(e) => setCidade(e.target.value)} className={inputCls} placeholder="São Paulo" />
              </Field>
              <Field label="Estado (UF)">
                <input
                  required
                  value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))}
                  className={inputCls}
                  placeholder="SP"
                  maxLength={2}
                />
              </Field>
            </div>
          </section>

          {/* Produtos */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Produtos</h3>

            {/* Adicionador */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={addProductId}
                  onChange={(e) => {
                    setAddProductId(e.target.value);
                  }}
                  className={inputCls + " appearance-none pr-8"}
                >
                  <option value="">Selecionar produto...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatBRL(p.price)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <input
                type="number"
                min={1}
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                className={inputCls + " w-20"}
                placeholder="Qtd"
              />
              <button
                type="button"
                onClick={addItem}
                className="btn-hero flex-shrink-0 rounded-xl px-4 text-sm font-semibold"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Lista de itens adicionados */}
            {itens.length > 0 && (
              <div className="rounded-xl border border-white/8 overflow-hidden">
                {itens.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 border-b border-white/5 px-4 py-2.5 last:border-0">
                    <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity}× {formatBRL(item.unit_price)} = {formatBRL(item.quantity * item.unit_price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="rounded-lg p-1 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Frete + Obs */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entrega</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Frete (R$) — opcional">
                <input
                  value={freteStr}
                  onChange={(e) => setFreteStr(maskValor(e.target.value))}
                  className={inputCls}
                  placeholder="0,00"
                  inputMode="numeric"
                />
              </Field>
            </div>
            <Field label="Observações">
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
                className={inputCls + " resize-none"}
              />
            </Field>
          </section>

          {/* Preview de valores */}
          {total > 0 && (
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              {frete > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frete</span>
                  <span>{formatBRL(frete)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/8 pt-1.5 font-bold">
                <span>Total</span>
                <span className="text-gradient">{formatBRL(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Seu lucro (10%)</span>
                <span className="font-semibold text-green-400">{formatBRL(calcLucro(total))}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border bg-input/30 py-3 text-sm font-medium hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-hero flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar Venda"}
            </button>
          </div>
        </form>
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
