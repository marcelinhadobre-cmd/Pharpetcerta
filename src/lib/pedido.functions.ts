import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface PedidoPayload {
  user_id: string | null;
  cliente_nome: string;
  cliente_cpf: string;
  cliente_telefone: string;
  endereco_cep: string;
  endereco_rua: string;
  endereco_numero: string;
  endereco_complemento: string;
  endereco_bairro: string;
  endereco_cidade: string;
  endereco_uf: string;
  itens: Array<{ id: string; name: string; price: number; quantity: number }>;
  subtotal: number;
  frete: number;
  frete_regiao: string;
  total: number;
  pagamento: string;
}

export const insertPedido = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as PedidoPayload)
  .handler(async ({ data }) => {
    const { data: inserted, error } = await (supabaseAdmin as any)
      .from("pharpep_pedidos")
      .insert(data)
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, id: inserted?.id as string | undefined };
  });
