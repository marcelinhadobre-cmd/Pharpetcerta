import { useState, useEffect } from "react";
import {
  ShoppingCart, X, Plus, Minus, Trash2, MessageCircle,
  ArrowLeft, MapPin, User, Loader2, CheckCircle2,
  CreditCard, QrCode, Package, ShieldCheck, PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { useRouterState } from "@tanstack/react-router";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { insertPedido } from "@/lib/pedido.functions";

const WHATSAPP_NUMBER = "5512982501119";
const DELIVERY_STORAGE_KEY = "pharpep-delivery";

// ── Frete por região ──────────────────────────────────────────────────────────

const NORTE    = ["AC","AM","AP","PA","RO","RR","TO"];
const NORDESTE = ["AL","BA","CE","MA","PB","PE","PI","RN","SE"];

function calcFreight(uf: string, cidade: string): { label: string; value: number } | null {
  const u = uf.toUpperCase().trim();
  const c = cidade.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
  if (u === "SP") {
    return c === "sao paulo"
      ? { label: "SP Capital",     value: 72  }
      : { label: "SP Interior",    value: 68  };
  }
  if (u === "MG") return { label: "Minas Gerais",      value: 92  };
  if (u === "DF") return { label: "Distrito Federal",   value: 89  };
  if (u === "PR") return { label: "Paraná",             value: 89  };
  if (u === "SC") return { label: "Santa Catarina",     value: 89  };
  if (u === "RS") return { label: "Rio Grande do Sul",  value: 98  };
  if (NORTE.includes(u))    return { label: "Região Norte",    value: 118 };
  if (NORDESTE.includes(u)) return { label: "Nordeste",        value: 118 };
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function maskCEP(v: string)   { return v.replace(/\D/g,"").slice(0,8).replace(/^(\d{5})(\d)/,"$1-$2"); }
function maskCPF(v: string)   {
  return v.replace(/\D/g,"").slice(0,11)
    .replace(/^(\d{3})(\d)/,"$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/,"$1.$2.$3")
    .replace(/\.(\d{3})(\d)/,".$1-$2");
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g,"").slice(0,11);
  return d.length <= 10
    ? d.replace(/^(\d{2})(\d{4})(\d{0,4})/,"($1) $2-$3")
    : d.replace(/^(\d{2})(\d{5})(\d{0,4})/,"($1) $2-$3");
}
function validCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g,"");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (x: number) => {
    let s = 0; for (let i=0;i<x;i++) s += parseInt(d[i])*(x+1-i);
    const r=(s*10)%11; return r>=10?0:r;
  };
  return calc(9)===parseInt(d[9]) && calc(10)===parseInt(d[10]);
}
function validPhone(p: string) { return p.replace(/\D/g,"").length >= 10; }

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface FormState {
  nome: string; cpf: string; telefone: string;
  cep: string; rua: string; numero: string; complemento: string;
  bairro: string; cidade: string; uf: string;
}
const EMPTY: FormState = {
  nome:"", cpf:"", telefone:"",
  cep:"", rua:"", numero:"", complemento:"",
  bairro:"", cidade:"", uf:"",
};

type Step = "cart" | "checkout" | "calculating" | "summary" | "confirmed";
type Payment = "pix" | "cartao" | null;

// ── Componente ────────────────────────────────────────────────────────────────

export function CartWidget() {
  const [clientReady, setClientReady] = useState(false);
  const { isAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => { setClientReady(true); }, []);

  if (!clientReady || isAdmin) return null;
  if (pathname !== "/catalogo") return null;
  return <CartWidgetInner />;
}

function CartWidgetInner() {
  const [open, setOpen]       = useState(false);
  const [step, setStep]       = useState<Step>("cart");
  const [payment, setPayment] = useState<Payment>(null);
  const [form, setForm]       = useState<FormState>(EMPTY);
  const [errors, setErrors]   = useState<Partial<Record<keyof FormState | "payment", string>>>({});
  const [cepLoading, setCepLoading] = useState(false);
  const [cepOk, setCepOk]     = useState(false);
  const [freight, setFreight] = useState<{ label: string; value: number } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmedTotals, setConfirmedTotals] = useState<{ subtotal: number; frete: number; total: number } | null>(null);
  const [confirmedItems, setConfirmedItems] = useState<typeof items>([]);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  const { items, removeItem, updateQty, clearCart, totalItems, totalPrice } = useCart();
  const { session } = useAuth();

  // ── Carrega form do localStorage após montagem no client ───────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DELIVERY_STORAGE_KEY);
      if (raw) setForm(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);

  // ── Salva form no localStorage sempre que muda ──────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(DELIVERY_STORAGE_KEY, JSON.stringify(form)); } catch { /* noop */ }
  }, [form]);

  // ── CEP lookup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = form.cep.replace(/\D/g,"");
    if (raw.length !== 8) { setCepOk(false); return; }
    setCepLoading(true); setCepOk(false);
    fetch(`https://viacep.com.br/ws/${raw}/json/`)
      .then(r => r.json())
      .then((d: { logradouro?:string; bairro?:string; localidade?:string; uf?:string; erro?:boolean }) => {
        if (d.erro) { setErrors(e=>({...e,cep:"CEP não encontrado"})); return; }
        setForm(f=>({ ...f, rua: d.logradouro||f.rua, bairro: d.bairro||f.bairro, cidade: d.localidade||f.cidade, uf: d.uf||f.uf }));
        setErrors(e=>({...e,cep:undefined})); setCepOk(true);
      })
      .catch(()=>setErrors(e=>({...e,cep:"Erro ao buscar CEP"})))
      .finally(()=>setCepLoading(false));
  }, [form.cep]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const set = (field: keyof FormState, value: string) => {
    setForm(f=>({...f,[field]:value}));
    setErrors(e=>({...e,[field]:undefined}));
  };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.nome.trim() || form.nome.trim().length < 3) e.nome = "Nome completo obrigatório";
    if (!validCPF(form.cpf)) e.cpf = "CPF inválido";
    if (!validPhone(form.telefone)) e.telefone = "Telefone inválido";
    if (form.cep.replace(/\D/g,"").length !== 8) e.cep = "CEP inválido";
    if (!form.rua.trim()) e.rua = "Rua obrigatória";
    if (!form.numero.trim()) e.numero = "Número obrigatório";
    if (!form.cidade.trim()) e.cidade = "Cidade obrigatória";
    if (!payment) e.payment = "Selecione uma forma de pagamento";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFinalize = () => {
    if (!validate()) return;
    const f = calcFreight(form.uf, form.cidade);
    setFreight(f);
    setStep("calculating");
    setTimeout(() => setStep("summary"), 2000);
  };

  const handleConfirm = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      const payload = {
        user_id: session?.user?.id ?? null,
        cliente_nome: form.nome,
        cliente_cpf: form.cpf,
        cliente_telefone: form.telefone,
        endereco_cep: form.cep,
        endereco_rua: form.rua,
        endereco_numero: form.numero,
        endereco_complemento: form.complemento ?? "",
        endereco_bairro: form.bairro,
        endereco_cidade: form.cidade,
        endereco_uf: form.uf,
        itens: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        subtotal: totalPrice,
        frete: freight?.value ?? 0,
        frete_regiao: freight?.label ?? "",
        total: totalPrice + (freight?.value ?? 0),
        pagamento: payment ?? "pix",
      };

      // Salva itens antes de limpar o carrinho
      setConfirmedItems([...items]);

      const result = await insertPedido({ data: payload });
      setConfirmedOrderId((result as any)?.id ?? null);

      const freteVal = freight?.value ?? 0;
      setConfirmedTotals({ subtotal: totalPrice, frete: freteVal, total: totalPrice + freteVal });
      clearCart();
      setStep("confirmed");
    } catch (e: any) {
      console.error("Erro inesperado:", e);
      toast.error(`Erro: ${e?.message ?? "Falha de conexão."}`);
    } finally {
      setConfirming(false);
    }
  };

  const handlePay = () => {
    const total = confirmedTotals?.total ?? 0;
    const pedidoRef = confirmedOrderId ? `#${confirmedOrderId.slice(0, 8).toUpperCase()}` : "";
    const payLabel = payment === "pix" ? "PIX" : "Cartão de Crédito";
    const addr = [
      `${form.rua}, ${form.numero}${form.complemento ? `, ${form.complemento}` : ""}`,
      form.bairro ? `${form.bairro},` : "",
      `${form.cidade}/${form.uf}`,
      `— CEP ${form.cep}`,
    ].filter(Boolean).join(" ");

    const itemsList = confirmedItems
      .map(i => `• ${i.name} x${i.quantity} — ${formatBRL(i.price * i.quantity)}`)
      .join("\n");

    const msg = encodeURIComponent(
      [
        `Olá! Fiz um pedido${pedidoRef ? ` *${pedidoRef}*` : ""} no valor de *${formatBRL(total)}*.`,
        ``,
        itemsList,
        ``,
        `*Dados de entrega:*`,
        `${form.nome} | CPF: ${form.cpf}`,
        addr,
        `Tel: ${form.telefone}`,
        ``,
        `Vou pagar no *${payLabel}*.`,
      ].join("\n")
    );

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
  };

  const closeAndReset = () => { setOpen(false); setStep("cart"); };

  const backLabel: Record<Step, Step | null> = {
    cart: null, checkout: "cart", calculating: null, summary: "checkout", confirmed: null,
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button
          onClick={()=>setOpen(true)}
          aria-label="Abrir carrinho"
          className={`fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-2xl shadow-primary/40 text-white transition-transform active:scale-95 ${totalItems>0?"cart-shake cart-pulse":""}`}
        >
          <ShoppingCart className="h-7 w-7"/>
          {totalItems>0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold shadow">
              {totalItems>99?"99+":totalItems}
            </span>
          )}
        </button>
      )}

      {/* Overlay */}
      {open && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={step==="calculating"?undefined:closeAndReset}/>}

      {/* Drawer */}
      <aside className={`fixed bottom-0 right-0 z-50 flex h-[94dvh] w-full max-w-md flex-col rounded-t-3xl bg-[oklch(0.10_0.02_280)] shadow-2xl transition-transform duration-300 ease-out sm:h-screen sm:rounded-none ${open?"translate-y-0":"translate-y-full"}`}>

        {/* Header */}
        {step !== "calculating" && step !== "confirmed" && (
          <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-5 py-4">
            <div className="flex items-center gap-2.5">
              {backLabel[step] && (
                <button onClick={()=>setStep(backLabel[step]!)} className="mr-1 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/8 hover:text-white">
                  <ArrowLeft className="h-4 w-4"/>
                </button>
              )}
              {step==="cart"    && <ShoppingCart className="h-5 w-5 text-primary"/>}
              {step==="checkout"&& <MapPin       className="h-5 w-5 text-primary"/>}
              {step==="summary" && <Package      className="h-5 w-5 text-primary"/>}
              <span className="font-display text-base font-bold">
                {step==="cart"?"Meu Carrinho":step==="checkout"?"Dados de entrega":"Resumo do pedido"}
              </span>
              {step==="cart" && totalItems>0 && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                  {totalItems} {totalItems===1?"item":"itens"}
                </span>
              )}
            </div>
            <button onClick={closeAndReset} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/8 hover:text-white">
              <X className="h-4 w-4"/>
            </button>
          </div>
        )}

        {/* ── STEP: CART ────────────────────────────────────────────────────── */}
        {step==="cart" && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {items.length===0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <ShoppingCart className="h-14 w-14 text-muted-foreground/20"/>
                  <p className="font-semibold text-muted-foreground">Carrinho vazio</p>
                  <p className="text-xs text-muted-foreground/60">Adicione peptídeos do catálogo</p>
                </div>
              ) : items.map(item=>(
                <div key={item.id} className="flex gap-3 rounded-2xl border border-white/8 bg-white/4 p-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5">
                    {item.primary_image_url
                      ? <img src={item.primary_image_url} alt={item.name} className="h-full w-full object-cover"/>
                      : <div className="flex h-full w-full items-center justify-center"><ShoppingCart className="h-5 w-5 text-muted-foreground/30"/></div>}
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                    <p className="text-sm font-semibold leading-tight line-clamp-2">{item.name}</p>
                    <p className="text-sm font-bold text-primary">{formatBRL(item.price*item.quantity)}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>updateQty(item.id,item.quantity-1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition hover:bg-white/10"><Minus className="h-3 w-3"/></button>
                      <span className="min-w-[1.5rem] text-center text-sm font-bold">{item.quantity}</span>
                      <button onClick={()=>updateQty(item.id,item.quantity+1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition hover:bg-white/10"><Plus className="h-3 w-3"/></button>
                      <button onClick={()=>removeItem(item.id)} className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-red-400/70 transition hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-3.5 w-3.5"/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {items.length>0 && (
              <div className="shrink-0 border-t border-white/8 px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="text-xl font-black text-gradient">{formatBRL(totalPrice)}</span>
                </div>
                <button onClick={()=>setStep("checkout")} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-white shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-95">
                  <MapPin className="h-4 w-4"/> Prosseguir para entrega
                </button>
                <button onClick={clearCart} className="w-full text-center text-xs text-muted-foreground/50 transition hover:text-muted-foreground">Limpar carrinho</button>
              </div>
            )}
          </>
        )}

        {/* ── STEP: CHECKOUT ────────────────────────────────────────────────── */}
        {step==="checkout" && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

              {/* Dados pessoais */}
              <section>
                <SectionTitle icon={<User className="h-4 w-4 text-primary"/>} label="Dados do destinatário"/>
                <div className="space-y-3">
                  <Field label="Nome completo *" error={errors.nome}>
                    <input value={form.nome} onChange={e=>set("nome",e.target.value)} placeholder="Seu nome completo" className={ic(!!errors.nome)}/>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="CPF *" error={errors.cpf}>
                      <input value={form.cpf} onChange={e=>set("cpf",maskCPF(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" className={ic(!!errors.cpf)}/>
                    </Field>
                    <Field label="Telefone *" error={errors.telefone}>
                      <input value={form.telefone} onChange={e=>set("telefone",maskPhone(e.target.value))} placeholder="(18) 99999-9999" inputMode="numeric" className={ic(!!errors.telefone)}/>
                    </Field>
                  </div>
                </div>
              </section>

              {/* Endereço */}
              <section>
                <SectionTitle icon={<MapPin className="h-4 w-4 text-primary"/>} label="Endereço de entrega"/>
                <div className="space-y-3">
                  <Field label="CEP *" error={errors.cep}>
                    <div className="relative">
                      <input value={form.cep} onChange={e=>set("cep",maskCEP(e.target.value))} placeholder="00000-000" inputMode="numeric" className={ic(!!errors.cep)+" pr-9"}/>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {cepLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/>}
                        {!cepLoading && cepOk && <CheckCircle2 className="h-4 w-4 text-green-400"/>}
                      </div>
                    </div>
                  </Field>
                  <Field label="Rua / Logradouro *" error={errors.rua}>
                    <input value={form.rua} onChange={e=>set("rua",e.target.value)} placeholder="Preenchido automaticamente" className={ic(!!errors.rua)}/>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Número *" error={errors.numero}>
                      <input value={form.numero} onChange={e=>set("numero",e.target.value)} placeholder="123" inputMode="numeric" className={ic(!!errors.numero)}/>
                    </Field>
                    <Field label="Complemento">
                      <input value={form.complemento} onChange={e=>set("complemento",e.target.value)} placeholder="Apto, bloco..." className={ic(false)}/>
                    </Field>
                  </div>
                  <Field label="Bairro">
                    <input value={form.bairro} onChange={e=>set("bairro",e.target.value)} placeholder="Preenchido automaticamente" className={ic(false)}/>
                  </Field>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Field label="Cidade *" error={errors.cidade}>
                        <input value={form.cidade} onChange={e=>set("cidade",e.target.value)} placeholder="Cidade" className={ic(!!errors.cidade)}/>
                      </Field>
                    </div>
                    <Field label="UF">
                      <input value={form.uf} onChange={e=>set("uf",e.target.value.toUpperCase().slice(0,2))} placeholder="SP" className={ic(false)}/>
                    </Field>
                  </div>
                </div>
              </section>

              {/* Pagamento */}
              <section>
                <SectionTitle icon={<CreditCard className="h-4 w-4 text-primary"/>} label="Forma de pagamento"/>
                {errors.payment && <p className="mb-2 text-[10px] text-red-400">{errors.payment}</p>}
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { id:"pix"   as const, label:"PIX",    Icon:QrCode,     desc:"Desconto à vista" },
                    { id:"cartao"as const, label:"Cartão",  Icon:CreditCard, desc:"Crédito/débito"   },
                  ]).map(({id,label,Icon,desc})=>(
                    <button
                      key={id}
                      onClick={()=>{ setPayment(id); setErrors(e=>({...e,payment:undefined})); }}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition ${payment===id?"border-primary bg-primary/15 text-primary":"border-white/10 bg-white/4 text-muted-foreground hover:border-white/20 hover:text-white"}`}
                    >
                      <Icon className="h-6 w-6"/>
                      <span className="text-sm font-bold">{label}</span>
                      <span className="text-[10px] opacity-60">{desc}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="shrink-0 border-t border-white/8 px-5 py-4">
              <button onClick={handleFinalize} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-white shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-95">
                Finalizar Compra
              </button>
            </div>
          </>
        )}

        {/* ── STEP: CALCULATING ─────────────────────────────────────────────── */}
        {step==="calculating" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20"/>
              <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-primary"/>
              <Package className="h-9 w-9 text-primary"/>
            </div>
            <div>
              <p className="font-display text-xl font-bold">Calculando frete...</p>
              <p className="mt-1 text-sm text-muted-foreground">Verificando disponibilidade para {form.cidade}/{form.uf}</p>
            </div>
            <div className="flex gap-1.5">
              {[0,1,2].map(i=>(
                <div key={i} className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{animationDelay:`${i*0.15}s`}}/>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP: SUMMARY ─────────────────────────────────────────────────── */}
        {step==="summary" && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

              {/* Frete */}
              <div className={`rounded-2xl border p-4 ${freight?"border-green-500/25 bg-green-500/8":"border-yellow-500/25 bg-yellow-500/8"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${freight?"bg-green-500/15":"bg-yellow-500/15"}`}>
                      <Package className={`h-5 w-5 ${freight?"text-green-400":"text-yellow-400"}`}/>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Frete — {freight?.label ?? "A consultar"}</p>
                      <p className={`text-lg font-black ${freight?"text-green-400":"text-yellow-400"}`}>
                        {freight ? formatBRL(freight.value) : "A combinar"}
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className={`h-5 w-5 ${freight?"text-green-400":"text-yellow-400"}`}/>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0"/>
                  <p className="text-[11px] text-muted-foreground">Frete já inclui <span className="font-semibold text-white/80">seguro</span> para o seu pedido</p>
                </div>
              </div>

              {/* Itens */}
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4 space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Itens</p>
                {items.map(i=>(
                  <div key={i.id} className="flex justify-between text-xs py-0.5">
                    <span className="truncate text-muted-foreground">{i.name} ×{i.quantity}</span>
                    <span className="ml-2 shrink-0 font-semibold">{formatBRL(i.price*i.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-white/8 pt-2">
                  <span className="text-xs text-muted-foreground">Subtotal</span>
                  <span className="text-xs font-semibold">{formatBRL(totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Frete</span>
                  <span className="text-xs font-semibold">{freight?formatBRL(freight.value):"A combinar"}</span>
                </div>
                <div className="flex justify-between border-t border-white/8 pt-2">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-base font-black text-gradient">{freight?formatBRL(totalPrice+freight.value):"–"}</span>
                </div>
              </div>

              {/* Pagamento */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                {payment==="pix" ? <QrCode className="h-5 w-5 text-primary shrink-0"/> : <CreditCard className="h-5 w-5 text-primary shrink-0"/>}
                <div>
                  <p className="text-[10px] text-muted-foreground">Pagamento</p>
                  <p className="text-sm font-bold">{payment==="pix"?"PIX":"Cartão de crédito/débito"}</p>
                </div>
              </div>

              {/* Endereço */}
              <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5"/>
                <div>
                  <p className="text-[10px] text-muted-foreground">Endereço</p>
                  <p className="text-sm font-semibold">{form.rua}, {form.numero}{form.complemento?`, ${form.complemento}`:""}</p>
                  <p className="text-xs text-muted-foreground">{form.bairro} — {form.cidade}/{form.uf} · CEP {form.cep}</p>
                  <p className="text-xs text-muted-foreground mt-1">{form.nome} · {form.telefone}</p>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-white/8 px-5 py-4">
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-white shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {confirming
                  ? <><Loader2 className="h-5 w-5 animate-spin"/> Confirmando...</>
                  : <><CheckCircle2 className="h-5 w-5"/> Confirmar pedido</>}
              </button>
            </div>
          </>
        )}

        {/* ── STEP: CONFIRMED ───────────────────────────────────────────────── */}
        {step==="confirmed" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
            {/* Ícone de sucesso */}
            <div className="relative flex h-28 w-28 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-green-500/15"/>
              <div className="absolute inset-3 rounded-full bg-green-500/20"/>
              <PartyPopper className="h-12 w-12 text-green-400"/>
            </div>

            <div className="space-y-2">
              <p className="font-display text-2xl font-black text-green-400">Pedido confirmado!</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Seu pedido foi registrado com sucesso.<br/>
                Agora realize o pagamento para confirmarmos o envio.
              </p>
            </div>

            {/* Resumo rápido */}
            {confirmedTotals && (
              <div className="w-full rounded-2xl border border-white/8 bg-white/4 px-5 py-4 text-left space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{formatBRL(confirmedTotals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Frete c/ seguro</span>
                  <span className="font-semibold">{confirmedTotals.frete > 0 ? formatBRL(confirmedTotals.frete) : "A combinar"}</span>
                </div>
                <div className="flex justify-between border-t border-white/8 pt-2">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-base font-black text-gradient">{formatBRL(confirmedTotals.total)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-muted-foreground">Pagamento</span>
                  <span className="font-semibold">{payment === "pix" ? "PIX" : "Cartão"}</span>
                </div>
              </div>
            )}

            <button
              onClick={handlePay}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] py-4 text-sm font-bold text-white shadow-lg shadow-[#25D366]/30 transition hover:brightness-110 active:scale-95"
            >
              <MessageCircle className="h-5 w-5"/> Realizar pagamento agora
            </button>

            <button onClick={closeAndReset} className="text-xs text-muted-foreground/50 transition hover:text-muted-foreground underline underline-offset-2">
              Fechar
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function ic(err: boolean) {
  return `w-full rounded-xl border ${err?"border-red-500/60 bg-red-500/5":"border-white/10 bg-white/5"} px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/40 focus:border-primary/50 focus:ring-1 focus:ring-primary/30`;
}

function Field({ label, error, children }: { label:string; error?:string; children:React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{label}</label>
      {children}
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}

function SectionTitle({ icon, label }: { icon:React.ReactNode; label:string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon}
      <span className="text-xs font-bold uppercase tracking-widest text-primary">{label}</span>
    </div>
  );
}
