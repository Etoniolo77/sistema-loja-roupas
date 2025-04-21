-- Tabela para armazenar os inventários
CREATE TABLE IF NOT EXISTS inventarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_fim TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'finalizado', 'cancelado')),
  usuario_id INTEGER NOT NULL,
  observacoes TEXT,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Tabela para armazenar os itens de cada inventário
CREATE TABLE IF NOT EXISTS inventario_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inventario_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  quantidade_sistema INTEGER NOT NULL,
  quantidade_fisica INTEGER,
  observacao TEXT,
  FOREIGN KEY (inventario_id) REFERENCES inventarios(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- Índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_inventario_itens_inventario_id ON inventario_itens(inventario_id);
CREATE INDEX IF NOT EXISTS idx_inventario_itens_produto_id ON inventario_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_inventarios_status ON inventarios(status);