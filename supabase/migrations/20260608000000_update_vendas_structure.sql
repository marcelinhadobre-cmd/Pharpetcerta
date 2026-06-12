-- Atualiza estrutura da tabela vendas para suportar múltiplos itens
-- Remove coluna produto obsoleta e adiciona colunas JSONB para itens e descontos

-- Adicionar colunas JSONB se não existirem
ALTER TABLE vendas 
  ADD COLUMN IF NOT EXISTS itens JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS descontos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS frete NUMERIC(10,2) DEFAULT 0;

-- Remover coluna produto obsoleta (após garantir que itens existe)
ALTER TABLE vendas 
  DROP COLUMN IF EXISTS produto;
