import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Star, X, Loader2 } from "lucide-react";
import { formatBRL } from "@/lib/whatsapp";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/produtos")({
  component: ProductsAdmin,
});

interface ProductRow {
  id: string;
  name: string;
  description: string;
  price: number;
  primary_image_url: string | null;
  active: boolean;
  sort_order: number;
}

function ProductsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("sort_order").order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductRow[];
    },
  });

  const onDelete = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Produto excluído");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Produtos</h1>
          <p className="text-sm text-muted-foreground">Gerencie o catálogo em tempo real</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-hero inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
          <Plus className="h-4 w-4" /> Novo produto
        </button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : !products || products.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">Nenhum produto cadastrado.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="card-premium flex gap-3 rounded-2xl p-3">
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-secondary/40">
                {p.primary_image_url && <img src={p.primary_image_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-sm text-gradient font-bold">{formatBRL(Number(p.price))}</p>
                <div className="mt-auto flex gap-1">
                  <button onClick={() => { setEditing(p); setShowForm(true); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => onDelete(p.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <ProductForm initial={editing} onClose={() => { setShowForm(false); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-products"] }); }} />}
    </div>
  );
}

function ProductForm({ initial, onClose }: { initial: ProductRow | null; onClose: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [primaryUrl, setPrimaryUrl] = useState<string | null>(initial?.primary_image_url ?? null);
  const [images, setImages] = useState<{ id?: string; url: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initial) {
      supabase.from("product_images").select("id, url").eq("product_id", initial.id).order("sort_order").then(({ data }) => {
        if (data) setImages(data);
      });
    }
  }, [initial]);

  const onUpload = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    const uploaded: { url: string }[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
      if (error) { toast.error(error.message); continue; }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      uploaded.push({ url: data.publicUrl });
    }
    setImages((prev) => {
      const next = [...prev, ...uploaded];
      if (!primaryUrl && next.length > 0) setPrimaryUrl(next[0].url);
      return next;
    });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = async (img: { id?: string; url: string }) => {
    if (img.id) await supabase.from("product_images").delete().eq("id", img.id);
    setImages((prev) => prev.filter((i) => i.url !== img.url));
    if (primaryUrl === img.url) setPrimaryUrl(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name,
      description,
      price: Number(price.replace(",", ".")) || 0,
      primary_image_url: primaryUrl ?? images[0]?.url ?? null,
      active,
    };
    try {
      let productId = initial?.id;
      if (initial) {
        const { error } = await supabase.from("products").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }
      // Sync images: insert any without an id
      const toInsert = images.filter((i) => !i.id).map((i, idx) => ({ product_id: productId!, url: i.url, sort_order: idx }));
      if (toInsert.length > 0) {
        await supabase.from("product_images").insert(toInsert);
      }
      toast.success("Salvo!");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="card-premium max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl sm:rounded-3xl p-6 animate-fade-up">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{initial ? "Editar produto" : "Novo produto"}</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nome"><input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
          <Field label="Descrição"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls + " resize-none"} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço (R$)"><input required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" className={inputCls} /></Field>
            <Field label="Status">
              <button type="button" onClick={() => setActive(!active)} className={`w-full rounded-xl border px-4 py-3 text-sm font-medium ${active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-input/40 text-muted-foreground"}`}>
                {active ? "Ativo" : "Inativo"}
              </button>
            </Field>
          </div>

          <Field label="Imagens">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((img) => (
                  <div key={img.url} className={`group relative aspect-square overflow-hidden rounded-xl border-2 ${primaryUrl === img.url ? "border-primary glow-cyan" : "border-border"}`}>
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/60 opacity-0 transition group-hover:opacity-100">
                      <button type="button" onClick={() => setPrimaryUrl(img.url)} className="rounded-md bg-primary/80 p-1.5"><Star className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => removeImage(img)} className="rounded-md bg-destructive/80 p-1.5"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  <span className="text-[10px]">Enviar</span>
                  <input ref={fileRef} type="file" multiple accept="image/*" onChange={(e) => onUpload(e.target.files)} className="hidden" />
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground">Toque na estrela para definir a imagem principal.</p>
            </div>
          </Field>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border bg-input/30 py-3 text-sm font-medium hover:bg-white/5">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-hero flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-60">{saving ? "Salvando..." : "Salvar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-border bg-input/40 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
