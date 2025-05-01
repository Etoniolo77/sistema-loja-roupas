-- Habilita foreign keys
PRAGMA foreign_keys = ON;

-- Criação das tabelas
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  login TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  nivel_acesso TEXT NOT NULL CHECK (nivel_acesso IN ('admin', 'vendedor', 'estoquista')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  instagram TEXT,
  whatsapp TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  tamanho TEXT NOT NULL CHECK (tamanho IN ('PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG')),
  quantidade INTEGER NOT NULL DEFAULT 0,
  preco REAL NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(nome, tamanho)
);

CREATE TABLE IF NOT EXISTS vendas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER,
  subtotal REAL NOT NULL DEFAULT 0,
  desconto_percentual REAL DEFAULT 0,
  desconto_valor REAL DEFAULT 0,
  valor_total REAL NOT NULL,
  forma_pagamento TEXT NOT NULL DEFAULT 'especie' CHECK (forma_pagamento IN ('credito', 'debito', 'pix', 'crediario', 'cheque', 'especie')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida', 'cancelada')),
  usuario_id INTEGER NOT NULL,
  observacoes TEXT,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venda_id INTEGER NOT NULL,
  valor REAL NOT NULL,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('credito', 'debito', 'pix', 'cheque', 'especie')),
  usuario_id INTEGER NOT NULL,
  observacoes TEXT,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venda_id) REFERENCES vendas(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS venda_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venda_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  quantidade INTEGER NOT NULL,
  preco_unitario REAL NOT NULL,
  subtotal REAL NOT NULL,
  FOREIGN KEY (venda_id) REFERENCES vendas(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id INTEGER NOT NULL,
  quantidade INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  motivo TEXT NOT NULL,
  usuario_id INTEGER NOT NULL,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Triggers
-- Atualizar o estoque quando um item é vendido
CREATE TRIGGER IF NOT EXISTS atualizar_estoque_apos_venda
AFTER INSERT ON venda_itens
BEGIN
  UPDATE produtos
  SET quantidade = quantidade - NEW.quantidade,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.produto_id;
END;

-- Atualizar o estoque quando um item é removido da venda
CREATE TRIGGER IF NOT EXISTS atualizar_estoque_apos_remocao_item
AFTER DELETE ON venda_itens
BEGIN
  UPDATE produtos
  SET quantidade = quantidade + OLD.quantidade,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.produto_id;
END;

-- Atualizar o timestamp de "updated_at" ao atualizar um registro
CREATE TRIGGER IF NOT EXISTS atualizar_timestamp_clientes
AFTER UPDATE ON clientes
BEGIN
  UPDATE clientes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END

CREATE TRIGGER IF NOT EXISTS atualizar_timestamp_produtos
AFTER UPDATE ON produtos
BEGIN
  UPDATE produtos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END

CREATE TRIGGER IF NOT EXISTS atualizar_timestamp_usuarios
AFTER UPDATE ON usuarios
BEGIN
  UPDATE usuarios SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END

-- Inserir usuários padrão se a tabela estiver vazia
INSERT OR IGNORE INTO usuarios (nome, login, senha, nivel_acesso)
SELECT 'Administrador', 'admin', '$2a$10$gQBNo2d8BvP5LJN9YAGZ3.SMRlU9L65nWL4hZ3Aj1d4VtLlI4NhfW', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'admin');

INSERT OR IGNORE INTO usuarios (nome, login, senha, nivel_acesso)
SELECT 'Vendedor', 'vendedor', '$2a$10$TDLkoyr7n5ewdtA6BDU1.ODEomJqFa36kRjy712VC5jU09p2Mwxfe', 'vendedor'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'vendedor');

INSERT OR IGNORE INTO usuarios (nome, login, senha, nivel_acesso)
SELECT 'Estoquista', 'estoque', '$2a$10$ntglj3Kg0iUcS8X9Eqt9iuKbNkZdUJyhiRxJZT5BiJTJ9QpwPf1.q', 'estoquista'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'estoque');
  
-- As senhas hash acima correspondem a:
-- admin: 'admin123'
-- vendedor: 'vend123'
-- estoque: 'estq123'