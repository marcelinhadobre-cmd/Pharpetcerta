-- Vincula lançamentos em finanças às vendas (10% do valor)
ALTER TABLE financas
  ADD COLUMN IF NOT EXISTS venda_id UUID UNIQUE REFERENCES vendas(id) ON DELETE CASCADE;
