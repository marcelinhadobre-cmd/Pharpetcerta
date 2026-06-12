import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  primary_image_url: string | null;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const { session } = useAuth();
  const navigate = useNavigate();

  const openDetail = () => {
    trackEvent("product_view", product.id, { name: product.name });
    setDetailOpen(true);
  };

  const handleAdd = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    trackEvent("add_to_cart", product.id, { name: product.name });
    addItem({ id: product.id, name: product.name, price: product.price, primary_image_url: product.primary_image_url });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <>
      <div
        onClick={openDetail}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(); } }}
        className="card-premium group flex flex-col overflow-hidden rounded-2xl animate-fade-up cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        {/* Imagem */}
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary/40">
          {product.primary_image_url ? (
            <img
              src={product.primary_image_url}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/20" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
          <h3 className="font-display text-xs font-semibold leading-snug sm:text-sm">{product.name}</h3>
          <p className="line-clamp-2 text-[11px] text-muted-foreground sm:text-xs">{product.description}</p>
          <div className="mt-auto flex flex-col gap-2">
            <span className="text-sm font-bold text-gradient sm:text-base">{formatBRL(Number(product.price))}</span>
            <button
              onClick={handleAdd}
              className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-semibold transition-all active:scale-95 sm:text-xs ${
                added
                  ? "bg-green-500/20 border border-green-500/40 text-green-400"
                  : "btn-hero"
              }`}
            >
              {added
                ? <><Check className="h-3 w-3" /> Adicionado</>
                : <><ShoppingCart className="h-3 w-3" /> Adicionar ao carrinho</>}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de detalhe */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto gap-0 p-0">
          <div className="relative aspect-video w-full overflow-hidden bg-secondary/40">
            {product.primary_image_url ? (
              <img src={product.primary_image_url} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/20" />
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
          </div>
          <div className="flex flex-col gap-4 p-6">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="font-display text-xl">{product.name}</DialogTitle>
              <DialogDescription className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {product.description || "Sem descrição disponível."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3">
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Preço</span>
                <p className="text-2xl font-bold text-gradient">{formatBRL(Number(product.price))}</p>
              </div>
              <button
                onClick={(e) => { handleAdd(e); setDetailOpen(false); }}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all active:scale-95 ${
                  added ? "bg-green-500/20 border border-green-500/40 text-green-400" : "btn-hero"
                }`}
              >
                {added ? <><Check className="h-4 w-4" /> Adicionado!</> : <><ShoppingCart className="h-4 w-4" /> Adicionar ao carrinho</>}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
