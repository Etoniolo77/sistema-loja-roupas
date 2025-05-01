-- Tabela para armazenar devoluções
CREATE TABLE IF NOT EXISTS devolucoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venda_id INTEGER NOT NULL,
  cliente_id INTEGER NOT NULL,
  motivo TEXT NOT NULL,
  valor_total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
  usuario_id INTEGER NOT NULL,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venda_id) REFERENCES vendas(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Tabela para armazenar itens devolvidos
CREATE TABLE IF NOT EXISTS devolucao_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  devolucao_id INTEGER NOT NULL,
  venda_item_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  quantidade INTEGER NOT NULL,
  preco_unitario REAL NOT NULL,
  subtotal REAL NOT NULL,
  FOREIGN KEY (devolucao_id) REFERENCES devolucoes(id),
  FOREIGN KEY (venda_item_id) REFERENCES venda_itens(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- Tabela para armazenar créditos dos clientes
CREATE TABLE IF NOT EXISTS creditos_cliente (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  valor REAL NOT NULL,
  origem TEXT NOT NULL CHECK (origem IN ('devolucao', 'manual')),
  devolucao_id INTEGER,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'utilizado', 'expirado')),
  data_expiracao TIMESTAMP,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (devolucao_id) REFERENCES devolucoes(id)
);

-- Tabela para armazenar o uso dos créditos
CREATE TABLE IF NOT EXISTS uso_creditos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  credito_id INTEGER NOT NULL,
  venda_id INTEGER NOT NULL,
  valor_usado REAL NOT NULL,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (credito_id) REFERENCES creditos_cliente(id),
  FOREIGN KEY (venda_id) REFERENCES vendas(id)
);

-- Trigger para atualizar o estoque quando uma devolução é aprovada
CREATE TRIGGER IF NOT EXISTS atualizar_estoque_apos_devolucao
AFTER UPDATE ON devolucoes
WHEN NEW.status = 'aprovada' AND OLD.status = 'pendente'
BEGIN
  UPDATE produtos
  SET quantidade = quantidade + (
    SELECT di.quantidade
    FROM devolucao_itens di
    WHERE di.devolucao_id = NEW.id
    AND di.produto_id = produtos.id
  )
  WHERE id IN (
    SELECT produto_id
    FROM devolucao_itens
    WHERE devolucao_id = NEW.id
  );
  
  INSERT INTO creditos_cliente (cliente_id, valor, origem, devolucao_id, data_expiracao)
  VALUES (
    NEW.cliente_id,
    NEW.valor_total,
    'devolucao',
    NEW.id,
    datetime('now', '+180 days')
  );
END;

