import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, Trash2, DollarSign, TrendingUp, ShoppingBag, X, Pencil, Eye, Tag,
  Package, ChevronDown, Search, FileText,
} from "lucide-react";
import { formatBRL } from "@/lib/whatsapp";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/admin/vendas")({
  component: VendasAdmin,
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface VendaItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface VendaDesconto {
  nome: string;
  tipo: "%" | "R$";
  valor: number;
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
  descontos: VendaDesconto[];
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

// ─── Geração de PDF com jsPDF ─────────────────────────────────────────────────
function gerarPDF(venda: VendaRow) {
  const itens: VendaItem[] = Array.isArray(venda.itens) ? venda.itens : [];
  const descontos: VendaDesconto[] = Array.isArray(venda.descontos) ? venda.descontos : [];
  const subtotal = itens.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const descontoTotal = descontos.reduce(
    (s, d) => s + (d.tipo === "%" ? (subtotal * d.valor) / 100 : d.valor), 0
  );
  const frete = Number(venda.frete) || 0;
  const total = Math.max(0, subtotal - descontoTotal + frete);

  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const W = 210;
  const M = 15; // margin
  let y = 0;

  // ── Header ──────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 42, "F");

  // Logo / nome
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("PHARPEP SUPLEMENTOS", M, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("Orçamento / Comprovante de Venda", M, 27);

  // Pedido # e data (direita)
  doc.setTextColor(125, 211, 252);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Pedido #${venda.id.slice(0, 8).toUpperCase()}`, W - M, 18, { align: "right" });
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    format(new Date(venda.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
    W - M, 27, { align: "right" }
  );

  y = 52;

  // ── Dados do cliente ────────────────────────────────────────────
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(M, y - 4, W - 2 * M, 24, 3, 3, "F");

  doc.setTextColor(14, 165, 233);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO CLIENTE", M + 4, y + 2);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(venda.cliente_nome || "—", M + 4, y + 10);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(
    `CPF: ${venda.cliente_cpf || "—"}   |   Telefone: ${venda.cliente_telefone || "—"}`,
    M + 4, y + 17
  );
  y += 30;

  // ── Endereço ────────────────────────────────────────────────────
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(M, y - 4, W - 2 * M, 24, 3, 3, "F");

  doc.setTextColor(14, 165, 233);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("ENDEREÇO DE ENTREGA", M + 4, y + 2);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const endPrincipal = [venda.endereco_rua, venda.endereco_numero]
    .filter(Boolean).join(", ");
  const endBairro = venda.endereco_bairro ? ` — ${venda.endereco_bairro}` : "";
  doc.text(`${endPrincipal}${endBairro}`, M + 4, y + 10);
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.text(
    `${venda.endereco_cidade || "—"} — ${venda.endereco_estado || "—"}   |   CEP: ${venda.endereco_cep || "—"}`,
    M + 4, y + 17
  );
  y += 32;

  // ── Tabela de produtos ──────────────────────────────────────────
  doc.setTextColor(14, 165, 233);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("PRODUTOS", M, y);
  y += 4;

  // Cabeçalho
  doc.setFillColor(30, 41, 59);
  doc.rect(M, y, W - 2 * M, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("PRODUTO", M + 3, y + 5.5);
  doc.text("QTD", 140, y + 5.5, { align: "center" });
  doc.text("UNIT.", 162, y + 5.5, { align: "right" });
  doc.text("SUBTOTAL", W - M, y + 5.5, { align: "right" });
  y += 10;

  // Linhas
  if (itens.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(M, y, W - 2 * M, 8, "F");
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Nenhum produto registrado", M + 3, y + 5.5);
    y += 10;
  } else {
    itens.forEach((item, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(M, y, W - 2 * M, 9, "F");

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      // Truncate long names
      const maxNameW = 110;
      const nameLines = doc.splitTextToSize(item.product_name, maxNameW);
      doc.text(nameLines[0], M + 3, y + 6);

      doc.setTextColor(14, 165, 233);
      doc.setFont("helvetica", "bold");
      doc.text(String(item.quantity), 140, y + 6, { align: "center" });

      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");
      doc.text(formatBRL(item.unit_price), 162, y + 6, { align: "right" });

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(formatBRL(item.quantity * item.unit_price), W - M, y + 6, { align: "right" });

      y += 9;
    });
  }

  // Linha separadora
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(M, y + 2, W - M, y + 2);
  y += 8;

  // ── Totais ───────────────────────────────────────────────────────
  const totX = 115;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Subtotal", totX, y);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(formatBRL(subtotal), W - M, y, { align: "right" });
  y += 7;

  descontos.forEach((d) => {
    const calc = d.tipo === "%" ? (subtotal * d.valor) / 100 : d.valor;
    const label = d.tipo === "%" ? `${d.nome} (${d.valor}%)` : d.nome;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(label, totX, y);
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.text(`-${formatBRL(calc)}`, W - M, y, { align: "right" });
    y += 7;
  });

  if (frete > 0) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Frete", totX, y);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text(formatBRL(frete), W - M, y, { align: "right" });
    y += 7;
  }

  y += 2;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(totX - 4, y - 3, W - totX - M + 4, 13, 3, 3, "F");
  doc.setTextColor(125, 211, 252);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", totX + 2, y + 7);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text(formatBRL(total), W - M, y + 7, { align: "right" });
  y += 18;

  // ── Observações ──────────────────────────────────────────────────
  if (venda.observacoes) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);
    y += 6;

    doc.setTextColor(14, 165, 233);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVAÇÕES", M, y);
    y += 5;

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "italic");
    const obsLines = doc.splitTextToSize(venda.observacoes, W - 2 * M);
    doc.text(obsLines, M, y);
    y += obsLines.length * 5 + 5;
  }

  // ── Footer ───────────────────────────────────────────────────────
  const footerY = 280;
  doc.setFillColor(241, 245, 249);
  doc.rect(0, footerY, W, 17, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(0, footerY, W, footerY);
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • PharPep Suplementos`,
    W / 2, footerY + 9, { align: "center" }
  );

  doc.save(
    `orcamento-${venda.cliente_nome.replace(/\s+/g, "-")}-${venda.id.slice(0, 8)}.pdf`
  );
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
  const descontos: VendaDesconto[] = Array.isArray(venda.descontos) ? venda.descontos : [];
  const frete = Number(venda.frete) || 0;
  const subtotal = itens.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const descontoTotal = descontos.reduce((s, d) => s + (d.tipo === "%" ? (subtotal * d.valor) / 100 : d.valor), 0);
  const total = Math.max(0, subtotal - descontoTotal + frete);

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

        <section className="mb-4 rounded-xl border border-white/8 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliente</p>
          <p className="font-semibold">{venda.cliente_nome}</p>
          <p className="text-sm text-muted-foreground">{venda.cliente_cpf} · {venda.cliente_telefone}</p>
        </section>

        <section className="mb-4 rounded-xl border border-white/8 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endereço</p>
          <p className="text-sm">{venda.endereco_rua}, {venda.endereco_numero} — {venda.endereco_bairro}</p>
          <p className="text-sm text-muted-foreground">{venda.endereco_cidade} — {venda.endereco_estado} · CEP {venda.endereco_cep}</p>
        </section>

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

        <section className="mb-4 rounded-xl border border-white/8 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatBRL(subtotal)}</span>
          </div>
          {descontos.map((d, i) => {
            const calc = d.tipo === "%" ? (subtotal * d.valor) / 100 : d.valor;
            return (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {d.nome}{d.tipo === "%" ? ` (${d.valor}%)` : ""}
                </span>
                <span className="text-red-400 font-medium">-{formatBRL(calc)}</span>
              </div>
            );
          })}
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
          className="btn-hero w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
        >
          <FileText className="h-4 w-4" />
          Gerar Orçamento em PDF
        </button>
      </div>
    </div>
  );
}

// ─── Product Picker ────────────────────────────────────────────────────────────
function ProductPicker({
  products,
  selected,
  onSelect,
}: {
  products: PharpepProduct[];
  selected: PharpepProduct | null;
  onSelect: (p: PharpepProduct) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={inputCls + " flex items-center justify-between text-left"}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.name : "Selecionar produto..."}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-[60] left-0 right-0 mt-1 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Search */}
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full rounded-xl bg-input/40 py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary border border-border"
              />
            </div>
          </div>

          {/* Product list */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhum produto encontrado</p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelect(p);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/5 ${
                    selected?.id === p.id ? "bg-primary/10" : ""
                  }`}
                >
                  {p.primary_image_url ? (
                    <img
                      src={p.primary_image_url}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">{p.name}</p>
                    <p className="text-xs font-semibold text-primary">{formatBRL(p.price)}</p>
                  </div>
                  {selected?.id === p.id && (
                    <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Form component ────────────────────────────────────────────────────────────
function VendaForm({ initial, onClose }: { initial: VendaRow | null; onClose: () => void }) {
  const qc = useQueryClient();

  const [nome, setNome] = useState(initial?.cliente_nome ?? "");
  const [cpf, setCpf] = useState(initial?.cliente_cpf ?? "");
  const [telefone, setTelefone] = useState(initial?.cliente_telefone ?? "");

  const [rua, setRua] = useState(initial?.endereco_rua ?? "");
  const [numero, setNumero] = useState(initial?.endereco_numero ?? "");
  const [bairro, setBairro] = useState(initial?.endereco_bairro ?? "");
  const [cidade, setCidade] = useState(initial?.endereco_cidade ?? "");
  const [estado, setEstado] = useState(initial?.endereco_estado ?? "SP");
  const [cep, setCep] = useState(initial?.endereco_cep ?? "");

  const [itens, setItens] = useState<VendaItem[]>(
    Array.isArray(initial?.itens) ? initial.itens : [],
  );

  const [freteStr, setFreteStr] = useState(() => {
    const f = Number(initial?.frete) || 0;
    return f > 0 ? f.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "";
  });
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [saving, setSaving] = useState(false);

  // Produto sendo adicionado
  const [selectedProd, setSelectedProd] = useState<PharpepProduct | null>(null);
  const [addQty, setAddQty] = useState("1");
  const [addPriceStr, setAddPriceStr] = useState("");

  const [descontos, setDescontos] = useState<VendaDesconto[]>(
    Array.isArray(initial?.descontos) ? initial.descontos : [],
  );
  const [addDescontoNome, setAddDescontoNome] = useState("");
  const [addDescontoTipo, setAddDescontoTipo] = useState<"%" | "R$">("%");
  const [addDescontoValorStr, setAddDescontoValorStr] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["pharpep-products-form"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharpep_products")
        .select("id, name, price, primary_image_url, active")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as PharpepProduct[];
    },
  });

  const frete = parseBRL(freteStr);
  const subtotal = itens.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const descontoTotal = descontos.reduce((s, d) => s + (d.tipo === "%" ? (subtotal * d.valor) / 100 : d.valor), 0);
  const total = Math.max(0, subtotal - descontoTotal + frete);

  const handleSelectProd = (p: PharpepProduct) => {
    setSelectedProd(p);
    setAddPriceStr(p.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
    setAddQty("1");
  };

  const addItem = useCallback(() => {
    console.log("addItem chamado:", { selectedProd, addQty, addPriceStr });
    if (!selectedProd) return toast.error("Selecione um produto");
    const qty = parseInt(addQty, 10);
    if (!qty || qty < 1) return toast.error("Quantidade inválida");
    const price = parseBRL(addPriceStr) > 0 ? parseBRL(addPriceStr) : selectedProd.price;
    console.log("Preço final:", price);

    setItens((prev) => {
      const exists = prev.findIndex((i) => i.product_id === selectedProd.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = { ...updated[exists], quantity: updated[exists].quantity + qty, unit_price: price };
        console.log("Item atualizado:", updated[exists]);
        return updated;
      }
      const novo = [...prev, { product_id: selectedProd.id, product_name: selectedProd.name, quantity: qty, unit_price: price }];
      console.log("Novo item adicionado:", novo[novo.length - 1]);
      console.log("Novo array de itens:", novo);
      return novo;
    });

    setSelectedProd(null);
    setAddQty("1");
    setAddPriceStr("");
  }, [selectedProd, addQty, addPriceStr]);

  const removeItem = (idx: number) => setItens((prev) => prev.filter((_, i) => i !== idx));

  const addDesconto = () => {
    console.log("addDesconto chamado:", { addDescontoNome, addDescontoValorStr, addDescontoTipo });
    if (!addDescontoNome.trim()) return toast.error("Informe o nome do desconto");
    const v = parseBRL(addDescontoValorStr);
    console.log("Valor parseado:", v);
    if (!v || v <= 0) return toast.error("Informe o valor do desconto");
    if (addDescontoTipo === "%" && v > 100) return toast.error("Desconto em % não pode ser maior que 100");
    setDescontos((prev) => {
      const novo = [...prev, { nome: addDescontoNome.trim(), tipo: addDescontoTipo, valor: v }];
      console.log("Novo array de descontos:", novo);
      return novo;
    });
    setAddDescontoNome("");
    setAddDescontoValorStr("");
  };

  const removeDesconto = (idx: number) => setDescontos((prev) => prev.filter((_, i) => i !== idx));

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
      itens,
      descontos,
      frete,
      valor: total,
      status: "concluido",
      observacoes,
    };

    console.log("Payload enviado:", JSON.stringify(payload, null, 2));
    console.log("Descontos array:", descontos);
    console.log("Itens array:", itens);

    try {
      if (initial) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from("vendas").update(payload as any).eq("id", initial.id);
        console.log("Update vendas error:", error);
        if (error) throw error;
        const { error: finError } = await supabase
          .from("financas")
          .update({ valor: total * 0.1, descricao: `Venda: ${itens.map((i) => i.product_name).join(", ")} — ${nome}` })
          .eq("venda_id", initial.id);
        if (finError) {
          console.error("Erro ao atualizar finanças:", finError);
          toast.warning("Venda salva, mas houve erro ao atualizar finanças");
        }
      } else {
        console.log("Inserindo nova venda...");
        console.log("Payload para Supabase:", payload);
        const { data: inserted, error } = await supabase
          .from("vendas")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(payload as any)
          .select("id");
        console.log("Insert vendas result:", { inserted, error });
        if (error) throw error;
        console.log("Venda inserida, dados:", inserted);
        const vendaId = (inserted as any)?.[0]?.id;
        console.log("ID da venda:", vendaId);
        if (!vendaId) throw new Error("Não foi possível obter o ID da venda");
        const hoje = new Date().toISOString().slice(0, 10);
        console.log("Inserindo em finanças...");
        const { error: finError } = await supabase.from("financas").insert({
          venda_id: vendaId,
          valor: total * 0.1,
          tipo: "entrada",
          data: hoje,
          descricao: `Venda: ${itens.map((i) => i.product_name).join(", ")} — ${nome}`,
        });
        console.log("Insert financas result:", { finError });
        if (finError) {
          console.error("Erro ao inserir em finanças:", finError);
          toast.warning("Venda salva, mas houve erro ao registrar financeiro");
        }
      }
      qc.invalidateQueries({ queryKey: ["admin-financas"] });
      toast.success("Venda salva!");
      onClose();
    } catch (err: unknown) {
      console.error("Erro ao salvar venda:", err);
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

            {/* Picker + controles de adição */}
            <div className="space-y-3 rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <Field label="Selecionar produto">
                <ProductPicker
                  products={products}
                  selected={selectedProd}
                  onSelect={handleSelectProd}
                />
              </Field>

              {selectedProd && (
                <>
                  {/* Preview do produto selecionado */}
                  <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                    {selectedProd.primary_image_url ? (
                      <img
                        src={selectedProd.primary_image_url}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold">{selectedProd.name}</p>
                      <p className="text-xs text-muted-foreground">Preço sugerido: <span className="font-medium text-primary">{formatBRL(selectedProd.price)}</span></p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedProd(null); setAddPriceStr(""); setAddQty("1"); }}
                      className="rounded-lg p-1 hover:bg-white/10"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                    <Field label="Quantidade">
                      <input
                        type="number"
                        min={1}
                        value={addQty}
                        onChange={(e) => setAddQty(e.target.value)}
                        className={inputCls}
                        placeholder="1"
                      />
                    </Field>
                    <Field label="Preço unitário (R$)">
                      <input
                        value={addPriceStr}
                        onChange={(e) => setAddPriceStr(maskValor(e.target.value))}
                        className={inputCls}
                        placeholder="0,00"
                        inputMode="numeric"
                      />
                    </Field>
                    <div className="pb-0.5">
                      <button
                        type="button"
                        onClick={addItem}
                        className="btn-hero h-[46px] w-full rounded-xl px-4 text-sm font-semibold"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Lista de itens adicionados */}
            {itens.length > 0 && (
              <div className="rounded-xl border border-white/8 overflow-hidden">
                {itens.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity}× {formatBRL(item.unit_price)} = <span className="font-semibold text-foreground">{formatBRL(item.quantity * item.unit_price)}</span>
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

          {/* Descontos */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descontos</h3>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
              <Field label="Nome do desconto">
                <input
                  value={addDescontoNome}
                  onChange={(e) => setAddDescontoNome(e.target.value)}
                  className={inputCls}
                  placeholder="Ex: Cupom cliente fiel"
                />
              </Field>
              <Field label="Tipo">
                <div className="flex overflow-hidden rounded-xl border border-border h-[46px]">
                  <button
                    type="button"
                    onClick={() => setAddDescontoTipo("%")}
                    className={`flex-1 px-3 text-sm font-semibold transition ${addDescontoTipo === "%" ? "bg-primary text-white" : "bg-input/40 text-muted-foreground hover:bg-white/5"}`}
                  >%</button>
                  <button
                    type="button"
                    onClick={() => setAddDescontoTipo("R$")}
                    className={`flex-1 px-3 text-sm font-semibold transition ${addDescontoTipo === "R$" ? "bg-primary text-white" : "bg-input/40 text-muted-foreground hover:bg-white/5"}`}
                  >R$</button>
                </div>
              </Field>
              <Field label="Valor">
                <input
                  value={addDescontoValorStr}
                  onChange={(e) => setAddDescontoValorStr(maskValor(e.target.value))}
                  className={inputCls + " w-28"}
                  placeholder="0,00"
                  inputMode="numeric"
                />
              </Field>
              <div className="pb-0.5">
                <button
                  type="button"
                  onClick={addDesconto}
                  className="btn-hero h-[46px] rounded-xl px-4 text-sm font-semibold"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {descontos.length > 0 && (
              <div className="rounded-xl border border-white/8 overflow-hidden">
                {descontos.map((d, idx) => {
                  const calc = d.tipo === "%" ? (subtotal * d.valor) / 100 : d.valor;
                  return (
                    <div key={idx} className="flex items-center gap-3 border-b border-white/5 px-4 py-2.5 last:border-0">
                      <Tag className="h-4 w-4 shrink-0 text-red-400" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{d.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.tipo === "%" ? `${d.valor}%` : formatBRL(d.valor)} = -{formatBRL(calc)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDesconto(idx)}
                        className="rounded-lg p-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
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
          {(subtotal > 0 || total > 0) && (
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              {descontos.map((d, i) => {
                const calc = d.tipo === "%" ? (subtotal * d.valor) / 100 : d.valor;
                return (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {d.nome}{d.tipo === "%" ? ` (${d.valor}%)` : ""}
                    </span>
                    <span className="text-red-400 font-medium">-{formatBRL(calc)}</span>
                  </div>
                );
              })}
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
