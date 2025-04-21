-- Habilita foreign keys
PRAGMA foreign_keys = ON;

-- Criação da tabela de Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  telefone TEXT,
  referencia TEXT,
  anotacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criação da tabela de Encomendas
CREATE TABLE IF NOT EXISTS encomendas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  tamanho TEXT NOT NULL CHECK (tamanho IN ('PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG')),
  observacao TEXT,
  atendida BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- Alteração da tabela de Produtos para adicionar a coluna fornecedor_id
ALTER TABLE produtos ADD COLUMN fornecedor_id INTEGER;
ALTER TABLE produtos ADD FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id);

-- Alteração da tabela de Clientes para adicionar os novos campos
ALTER TABLE clientes ADD COLUMN cpf TEXT;
ALTER TABLE clientes ADD COLUMN data_nascimento TEXT;
ALTER TABLE clientes ADD COLUMN endereco TEXT;

-- Triggers para atualizar o timestamp de "updated_at" ao atualizar um registro
CREATE TRIGGER IF NOT EXISTS atualizar_timestamp_fornecedores
AFTER UPDATE ON fornecedores
BEGIN
  UPDATE fornecedores SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS atualizar_timestamp_encomendas
AFTER UPDATE ON encomendas
BEGIN
  UPDATE encomendas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;