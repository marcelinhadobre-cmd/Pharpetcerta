import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, X } from "lucide-react";
import { formatBRL } from "@/lib/whatsapp";
import {
  format,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subDays,
  parseISO,
  isWithinInterval,
  eachDayOfInterval,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";

export const Route = createFileRoute("/admin/financas")({
  component: FinancasAdmin,
});

interface FinancaRow {
  id: string;
  created_at: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: "entrada" | "saida";
}

type FilterType = "hoje" | "semana" | "mes" | "personalizado";

function getRange(filter: FilterType, from: string, to: string) {
  const now = new Date();
  if (filter === "hoje") return { start: startOfDay(now), end: endOfDay(now) };
  if (filter === "semana") return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
  if (filter === "mes") return { start: startOfMonth(now), end: endOfMonth(now) };
  const s = from ? parseISO(from) : startOfMonth(now);
  const e = to ? parseISO(to) : now;
  return { start: startOfDay(s), end: endOfDay(e >= s ? e : s) };
}

function buildChartData(financas: FinancaRow[], start: Date, end: Date) {
  const days = eachDayOfInterval({ start, end });
  const groupWeekly = days.length > 31;
  const map = new Map<string, { label: string; entradas: number; saidas: number }>();

  for (const d of days) {
    const key = groupWeekly
      ? format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd")
      : format(d, "yyyy-MM-dd");
    if (!map.has(key)) {
      map.set(key, { label: format(d, "dd/MM", { locale: ptBR }), entradas: 0, saidas: 0 });
    }
  }

  for (const f of financas) {
    const d = parseISO(f.data);
    const key = groupWeekly
      ? format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd")
      : f.data;
    const entry = map.get(key);
    if (entry) {
      if (f.tipo === "entrada") entry.entradas += Number(f.valor);
      else entry.saidas += Number(f.valor);
    }
  }

  let cum = 0;
  return Array.from(map.values()).map((v) => {
    cum += v.entradas - v.saidas;
    return { ...v, saldo: cum };
  });
}

function fmtTick(v: number) {
  if (v === 0) return "R$0";
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return `R$${v}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-xs shadow-xl">
      <p className="mb-1.5 font-semibold text-white">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="mt-0.5">
          {p.name}: {formatBRL(p.value)}
        </p>
      ))}
    </div>
  );
}

function FinancasAdmin() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<FilterType>("mes");
  const now = new Date();
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(format(now, "yyyy-MM-dd"));

  const { data: allFinancas = [], isLoading } = useQuery({
    queryKey: ["admin-financas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financas")
        .select("*")
        .order("data", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FinancaRow[];
    },
  });

  const range = useMemo(() => getRange(filter, customFrom, customTo), [filter, customFrom, customTo]);

  const financas = useMemo(
    () =>
      allFinancas.filter((f) =>
        isWithinInterval(parseISO(f.data + "T00:00:00"), range)
      ),
    [allFinancas, range]
  );

  const chartData = useMemo(() => buildChartData(financas, range.start, range.end), [financas, range]);
  const hasChartData = chartData.some((d) => d.entradas > 0 || d.saidas > 0);

  const onDelete = async (id: string) => {
    if (!confirm("Excluir este lançamento?")) return;
    const { error } = await supabase.from("financas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Lançamento excluído");
    qc.invalidateQueries({ queryKey: ["admin-financas"] });
  };

  const totalEntradas = financas.filter((f) => f.tipo === "entrada").reduce((s, f) => s + Number(f.valor), 0);
  const totalSaidas = financas.filter((f) => f.tipo === "saida").reduce((s, f) => s + Number(f.valor), 0);
  const saldo = totalEntradas - totalSaidas;

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "hoje", label: "Hoje" },
    { key: "semana", label: "7 dias" },
    { key: "mes", label: "Este mês" },
    { key: "personalizado", label: "Personalizado" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Finanças</h1>
          <p className="text-sm text-muted-foreground">Controle manual de entradas e saídas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-hero inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> Novo Lançamento
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              filter === f.key
                ? "btn-hero"
                : "border border-border bg-input/30 text-muted-foreground hover:bg-white/5"
            }`}
          >
            {f.label}
          </button>
        ))}
        {filter === "personalizado" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-xl border border-border bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <span className="text-muted-foreground">—</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-xl border border-border bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card-premium rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Entradas</p>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-green-400">{formatBRL(totalEntradas)}</p>
        </div>
        <div className="card-premium rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Saídas</p>
            <TrendingDown className="h-4 w-4 text-red-400" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-red-400">{formatBRL(totalSaidas)}</p>
        </div>
        <div className="card-premium rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Saldo</p>
            <Wallet className={`h-4 w-4 ${saldo >= 0 ? "text-primary" : "text-red-400"}`} />
          </div>
          <p className={`mt-3 font-display text-2xl font-bold ${saldo >= 0 ? "text-gradient" : "text-red-400"}`}>
            {formatBRL(saldo)}
          </p>
        </div>
      </div>

      {/* Charts */}
      {hasChartData && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Bar chart: Entradas vs Saídas */}
          <div className="card-premium rounded-2xl p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Entradas vs Saídas
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#888" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmtTick}
                  width={60}
                />
                <RechartsTooltip content={<CurrencyTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Legend
                  formatter={(v) => (v === "entradas" ? "Entradas" : "Saídas")}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Bar dataKey="entradas" fill="#4ade80" radius={[4, 4, 0, 0]} maxBarSize={40} name="entradas" />
                <Bar dataKey="saidas" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={40} name="saidas" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Area chart: Saldo acumulado */}
          <div className="card-premium rounded-2xl p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Saldo Acumulado
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#888" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmtTick}
                  width={60}
                />
                <RechartsTooltip content={<CurrencyTooltip />} cursor={{ stroke: "rgba(167,139,250,0.2)" }} />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  fill="url(#saldoGrad)"
                  name="Saldo"
                  dot={false}
                  activeDot={{ r: 4, fill: "#a78bfa" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : financas.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
          Nenhum lançamento no período selecionado.
        </div>
      ) : (
        <div className="card-premium overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  {["Data", "Descrição", "Tipo", "Valor", ""].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {financas.map((f) => (
                  <tr key={f.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {format(new Date(f.data + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3 font-medium">{f.descricao}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          f.tipo === "entrada"
                            ? "bg-green-500/15 text-green-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {f.tipo === "entrada" ? "Entrada" : "Saída"}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 font-semibold ${f.tipo === "entrada" ? "text-green-400" : "text-red-400"}`}>
                      {f.tipo === "saida" ? "− " : "+ "}{formatBRL(Number(f.valor))}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onDelete(f.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <FinancaForm
          onClose={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ["admin-financas"] });
          }}
        />
      )}
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

function FinancaForm({ onClose }: { onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [data, setData] = useState(today);
  const [saving, setSaving] = useState(false);

  const valorNum = Number(valor.replace(",", ".")) || 0;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (valorNum <= 0) return toast.error("Informe um valor válido");
    setSaving(true);
    const { error } = await supabase.from("financas").insert({
      descricao,
      valor: valorNum,
      tipo,
      data,
    });
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    toast.success("Lançamento salvo!");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-premium w-full max-w-md rounded-t-3xl p-6 sm:rounded-3xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">Novo Lançamento</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Tipo toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipo("entrada")}
              className={`rounded-xl py-3 text-sm font-semibold transition ${
                tipo === "entrada"
                  ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/40"
                  : "border border-border bg-input/30 text-muted-foreground hover:bg-white/5"
              }`}
            >
              + Entrada
            </button>
            <button
              type="button"
              onClick={() => setTipo("saida")}
              className={`rounded-xl py-3 text-sm font-semibold transition ${
                tipo === "saida"
                  ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/40"
                  : "border border-border bg-input/30 text-muted-foreground hover:bg-white/5"
              }`}
            >
              − Saída
            </button>
          </div>

          <Field label="Descrição">
            <input
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className={inputCls}
              placeholder="Ex: Compra de estoque, Frete recebido..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <input
                required
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className={inputCls}
                placeholder="0,00"
              />
            </Field>
            <Field label="Data">
              <input
                required
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Preview */}
          {valorNum > 0 && (
            <div className={`rounded-xl border px-4 py-3 ${tipo === "entrada" ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
              <p className="text-xs text-muted-foreground">{tipo === "entrada" ? "Entrada" : "Saída"}</p>
              <p className={`mt-1 font-display text-xl font-bold ${tipo === "entrada" ? "text-green-400" : "text-red-400"}`}>
                {tipo === "saida" ? "− " : "+ "}{formatBRL(valorNum)}
              </p>
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
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
