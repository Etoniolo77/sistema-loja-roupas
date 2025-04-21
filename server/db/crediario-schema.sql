-- Schema para o sistema de parcelamento do crediário

CREATE TABLE IF NOT EXISTS parcelas_crediario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venda_id INTEGER NOT NULL,
  numero_parcela INTEGER NOT NULL,
  valor REAL NOT NULL,
  data_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'paga', 'cancelada')),
  pagamento_id INTEGER,
  data_pagamento TIMESTAMP,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venda_id) REFERENCES vendas(id),
  FOREIGN KEY (pagamento_id) REFERENCES pagamentos(id)
);

-- Adicionar campos para controle de parcelamento na tabela vendas
-- Verificar se as colunas já existem antes de adicioná-las e executar os comandos diretamente

-- Usando script separado para cada alteração
PRAGMA foreign_keys=off;

-- Primeiro verificamos se a coluna numero_parcelas existe
SELECT COUNT(*) AS column_exists FROM pragma_table_info('vendas') WHERE name='numero_parcelas';

-- Se a coluna não existir, adicionamos ela (este comando será executado pelo código JavaScript)
-- ALTER TABLE vendas ADD COLUMN numero_parcelas INTEGER DEFAULT 0;

-- Verificamos se a coluna data_primeira_parcela existe
SELECT COUNT(*) AS column_exists FROM pragma_table_info('vendas') WHERE name='data_primeira_parcela';

-- Se a coluna não existir, adicionamos ela (este comando será executado pelo código JavaScript)
-- ALTER TABLE vendas ADD COLUMN data_primeira_parcela DATE;

PRAGMA foreign_keys=on;