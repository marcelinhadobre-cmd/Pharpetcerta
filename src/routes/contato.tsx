import { createFileRoute } from "@tanstack/react-router";
import { Phone, MessageCircle, Mail } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/contato")({
  head: () => ({ meta: [{ title: "Contato — PharPep" }] }),
  component: ContatoPage,
});

function ContatoPage() {
  return (
    <div className="min-h-screen bg-mesh">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-12 sm:py-20">
        <div className="mb-8 animate-fade-up">
          <p className="text-xs uppercase tracking-widest text-primary">Suporte</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Contato</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Fale com nossa equipe para dúvidas, pedidos ou suporte clínico.
          </p>
        </div>

        <div className="space-y-3 animate-fade-up" style={{ animationDelay: "80ms" }}>
          <a
            href="https://wa.me/5518999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/25 px-6 py-5 transition hover:bg-[#25D366]/15 hover:border-[#25D366]/40"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]/20">
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#25D366]">WhatsApp</p>
              <p className="text-xs text-muted-foreground">Atendimento rápido</p>
            </div>
          </a>

          <a
            href="tel:+5518999999999"
            className="flex items-center gap-4 rounded-2xl card-premium px-6 py-5 transition hover:border-primary/30"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">Telefone</p>
              <p className="text-xs text-muted-foreground">(18) 99999-9999</p>
            </div>
          </a>

          <a
            href="mailto:contato@pharpep.com.br"
            className="flex items-center gap-4 rounded-2xl card-premium px-6 py-5 transition hover:border-primary/30"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15">
              <Mail className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold">E-mail</p>
              <p className="text-xs text-muted-foreground">contato@pharpep.com.br</p>
            </div>
          </a>
        </div>
      </main>
    </div>
  );
}
