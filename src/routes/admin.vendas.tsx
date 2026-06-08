import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Tag, Trash2, DollarSign, TrendingUp, ShoppingBag, X, Pencil } from "lucide-react";
import { formatBRL } from "@/lib/whatsapp";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/admin/vendas")({
  component: VendasAdmin,
});

// ─── Dados do Remetente — edite aqui ─────────────────────────────────────────
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
  produto: string;
  valor: number;
  status: string;
  observacoes: string;
}

const calcLucro = (valor: number) => valor * 0.1;

function gerarEtiqueta(venda: VendaRow) {
  const W = 540, H = 410;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(6, 6, W - 12, H - 12);

  // Header
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(6, 6, W - 12, 44);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px Arial";
  ctx.textBaseline = "middle";
  ctx.fillText("ETIQUETA DE ENVIO — PHARPEP", 18, 28);
  ctx.font = "11px Arial";
  ctx.textAlign = "right";
  ctx.fillText(`Pedido #${venda.id.slice(0, 8).toUpperCase()}`, W - 18, 28);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Separator (dashed)
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1;
  ctx.setLineDash([7, 4]);
  ctx.beginPath();
  ctx.moveTo(6, 198);
  ctx.lineTo(W - 6, 198);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── REMETENTE ──
  ctx.fillStyle = "#64748b";
  ctx.font = "bold 9px Arial";
  ctx.fillText("REMETENTE", 18, 72);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 13px Arial";
  ctx.fillText(REMETENTE.nome, 18, 90);
  ctx.font = "12px Arial";
  ctx.fillStyle = "#1e293b";
  ctx.fillText(`${REMETENTE.rua}, ${REMETENTE.numero} — Bairro ${REMETENTE.bairro}`, 18, 110);
  ctx.fillText(`${REMETENTE.cidade} — ${REMETENTE.estado}`, 18, 128);
  ctx.fillText(`CEP: ${REMETENTE.cep}`, 18, 146);
  ctx.fillText(`Tel: ${REMETENTE.telefone}`, 18, 164);

  // ── DESTINATÁRIO ──
  ctx.fillStyle = "#64748b";
  ctx.font = "bold 9px Arial";
  ctx.fillText("DESTINATÁRIO", 18, 222);

  ctx.fillStyle = "#000000";
  ctx.font = "bold 16px Arial";
  ctx.fillText(venda.cliente_nome.toUpperCase(), 18, 246);
  ctx.font = "12px Arial";
  ctx.fillStyle = "#1e293b";
  ctx.fillText(`${venda.endereco_rua}, ${venda.endereco_numero} — ${venda.endereco_bairro}`, 18, 268);
  ctx.fillText(`${venda.endereco_cidade} — ${venda.endereco_estado}`, 18, 288);

  // CEP box
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 298, 220, 36);
  ctx.font = "bold 20px 'Courier New', monospace";
  ctx.fillStyle = "#000";
  ctx.fillText(venda.endereco_cep, 28, 323);

  ctx.font = "11px Arial";
  ctx.fillStyle = "#334155";
  ctx.fillText(`CPF: ${venda.cliente_cpf}`, 252, 312);
  ctx.fillText(`Tel: ${venda.cliente_telefone}`, 252, 328);

  // Footer info
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(6, 350);
  ctx.lineTo(W - 6, 350);
  ctx.stroke();

  ctx.fillStyle = "#475569";
  ctx.font = "11px Arial";
  ctx.fillText(`Produto: ${venda.produto}`, 18, 370);
  ctx.fillText(`Valor: ${formatBRL(Number(venda.valor))}`, 18, 390);
  ctx.textAlign = "right";
  ctx.fillText(format(new Date(venda.created_at), "dd/MM/yyyy"), W - 18, 390);
  ctx.textAlign = "left";

  const link = document.createElement("a");
  link.download = `etiqueta-${venda.cliente_nome.replace(/\s+/g, "-")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ─── Main component ────────────────────────────────────────────────────────────

function VendasAdmin() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VendaRow | null>(null);

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["admin-vendas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as VendaRow[];
    },
  });

  const onDelete = async (id: string) => {
    if (!confirm("Excluir esta venda?")) return;
    const { error } = await supabase.from("vendas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Venda excluída");
    qc.invalidateQueries({ queryKey: ["admin-vendas"] });
  };

  const faturamentoTotal = vendas.reduce((s, v) => s + Number(v.valor), 0);
  const lucroTotal = vendas.reduce((s, v) => s + calcLucro(Number(v.valor)), 0);

  // Last 6 months chart data
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
                  {["Data", "Cliente", "CPF", "Telefone", "Produto", "Valor", "Lucro", ""].map((h) => (
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
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{v.cliente_telefone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.produto}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-gradient">
                      {formatBRL(Number(v.valor))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-green-400">
                      {formatBRL(calcLucro(Number(v.valor)))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => gerarEtiqueta(v)}
                          title="Gerar etiqueta de envio"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        >
                          <Tag className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setEditing(v); setShowForm(true); }}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(v.id)}
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
    </div>
  );
}

// ─── Form component ────────────────────────────────────────────────────────────

function VendaForm({ initial, onClose }: { initial: VendaRow | null; onClose: () => void }) {
  const [nome, setNome] = useState(initial?.cliente_nome ?? "");
  const [cpf, setCpf] = useState(initial?.cliente_cpf ?? "");
  const [telefone, setTelefone] = useState(initial?.cliente_telefone ?? "");
  const [rua, setRua] = useState(initial?.endereco_rua ?? "");
  const [numero, setNumero] = useState(initial?.endereco_numero ?? "");
  const [bairro, setBairro] = useState(initial?.endereco_bairro ?? "");
  const [cidade, setCidade] = useState(initial?.endereco_cidade ?? "");
  const [estado, setEstado] = useState(initial?.endereco_estado ?? "SP");
  const [cep, setCep] = useState(initial?.endereco_cep ?? "");
  const [produto, setProduto] = useState(initial?.produto ?? "");
  const [valor, setValor] = useState(initial ? String(initial.valor) : "");
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [saving, setSaving] = useState(false);

  const valorNum = Number(valor.replace(",", ".")) || 0;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      cliente_nome: nome,
      cliente_cpf: cpf,
      cliente_telefone: telefone,
      endereco_rua: rua,
      endereco_numero: numero,
      endereco_bairro: bairro,
      endereco_cidade: cidade,
      endereco_estado: estado.toUpperCase(),
      endereco_cep: cep,
      produto,
      valor: valorNum,
      status: "concluido",
      observacoes,
    };
    try {
      if (initial) {
        const { error } = await supabase.from("vendas").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vendas").insert(payload);
        if (error) throw error;
      }
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
                <input required value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} placeholder="João da Silva" />
              </Field>
              <Field label="CPF">
                <input required value={cpf} onChange={(e) => setCpf(e.target.value)} className={inputCls} placeholder="000.000.000-00" />
              </Field>
              <Field label="Telefone / WhatsApp">
                <input required value={telefone} onChange={(e) => setTelefone(e.target.value)} className={inputCls} placeholder="(11) 99999-9999" />
              </Field>
            </div>
          </section>

          {/* Endereço */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endereço de Entrega</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="CEP">
                <input required value={cep} onChange={(e) => setCep(e.target.value)} className={inputCls} placeholder="00000-000" />
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
                  onChange={(e) => setEstado(e.target.value)}
                  className={inputCls}
                  placeholder="SP"
                  maxLength={2}
                  style={{ textTransform: "uppercase" }}
                />
              </Field>
            </div>
          </section>

          {/* Pedido */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pedido</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Produto">
                <input required value={produto} onChange={(e) => setProduto(e.target.value)} className={inputCls} placeholder="Nome do produto" />
              </Field>
              <Field label="Valor (R$)">
                <input required value={valor} onChange={(e) => setValor(e.target.value)} className={inputCls} placeholder="0,00" />
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

          {/* Lucro preview */}
          {valorNum > 0 && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
              <p className="text-xs text-muted-foreground">Lucro desta venda</p>
              <p className="mt-1 font-display text-xl font-bold text-green-400">{formatBRL(calcLucro(valorNum))}</p>
              <p className="text-[11px] text-muted-foreground">
                10% de {formatBRL(valorNum)}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border bg-input/30 py-3 text-sm font-medium hover:bg-white/5">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-hero flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-60">
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
