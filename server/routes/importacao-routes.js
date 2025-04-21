const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const db = require('../database');
const { auth: authMiddleware } = require('../middlewares/auth');

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    // Cria o diretório de uploads se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Filtro para aceitar apenas arquivos CSV e XLS/XLSX
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.csv', '.xls', '.xlsx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Use CSV, XLS ou XLSX.'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // Limite de 10MB
});

// Função para processar arquivo CSV
const processCSV = (filePath, tipo) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// Função para processar arquivo XLS/XLSX
const processExcel = (filePath, tipo) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    return Promise.resolve(data);
  } catch (error) {
    return Promise.reject(error);
  }
};

// Função para validar dados de produtos
const validarProdutos = (produtos) => {
  const erros = [];
  const validados = [];
  
  produtos.forEach((produto, index) => {
    const linha = index + 2; // +2 porque a linha 1 é o cabeçalho
    const erro = { linha, mensagens: [] };
    
    // Validar campos obrigatórios
    if (!produto.nome) erro.mensagens.push('Nome é obrigatório');
    if (!produto.tamanho) {
      erro.mensagens.push('Tamanho é obrigatório');
    } else if (!['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'].includes(produto.tamanho.toUpperCase())) {
      erro.mensagens.push('Tamanho inválido. Use: PP, P, M, G, GG, XG, XXG');
    }
    if (produto.quantidade === undefined || isNaN(Number(produto.quantidade))) {
      erro.mensagens.push('Quantidade é obrigatória e deve ser um número');
    }
    if (produto.preco === undefined || isNaN(Number(produto.preco))) {
      erro.mensagens.push('Preço é obrigatório e deve ser um número');
    }
    
    if (erro.mensagens.length > 0) {
      erros.push(erro);
    } else {
      validados.push({
        nome: produto.nome,
        tamanho: produto.tamanho.toUpperCase(),
        quantidade: Number(produto.quantidade),
        preco: Number(produto.preco)
      });
    }
  });
  
  return { erros, validados };
};

// Função para validar dados de clientes
const validarClientes = (clientes) => {
  const erros = [];
  const validados = [];
  
  clientes.forEach((cliente, index) => {
    const linha = index + 2; // +2 porque a linha 1 é o cabeçalho
    const erro = { linha, mensagens: [] };
    
    // Validar campos obrigatórios
    if (!cliente.nome) erro.mensagens.push('Nome é obrigatório');
    if (!cliente.whatsapp) erro.mensagens.push('WhatsApp é obrigatório');
    
    if (erro.mensagens.length > 0) {
      erros.push(erro);
    } else {
      validados.push({
        nome: cliente.nome,
        instagram: cliente.instagram || null,
        whatsapp: cliente.whatsapp,
        observacoes: cliente.observacoes || null
      });
    }
  });
  
  return { erros, validados };
};

// Função para validar dados de usuários
const validarUsuarios = (usuarios) => {
  const erros = [];
  const validados = [];
  
  usuarios.forEach((usuario, index) => {
    const linha = index + 2; // +2 porque a linha 1 é o cabeçalho
    const erro = { linha, mensagens: [] };
    
    // Validar campos obrigatórios
    if (!usuario.nome) erro.mensagens.push('Nome é obrigatório');
    if (!usuario.login) erro.mensagens.push('Login é obrigatório');
    if (!usuario.senha) erro.mensagens.push('Senha é obrigatória');
    if (!usuario.nivel_acesso) {
      erro.mensagens.push('Nível de acesso é obrigatório');
    } else if (!['admin', 'vendedor', 'estoquista'].includes(usuario.nivel_acesso.toLowerCase())) {
      erro.mensagens.push('Nível de acesso inválido. Use: admin, vendedor, estoquista');
    }
    
    if (erro.mensagens.length > 0) {
      erros.push(erro);
    } else {
      validados.push({
        nome: usuario.nome,
        login: usuario.login,
        senha: usuario.senha,
        nivel_acesso: usuario.nivel_acesso.toLowerCase()
      });
    }
  });
  
  return { erros, validados };
};

// Função para inserir produtos no banco de dados
const inserirProdutos = async (produtos) => {
  const resultados = { sucesso: 0, falhas: 0, mensagens: [] };
  
  for (const produto of produtos) {
    try {
      await db.promiseRun(
        'INSERT INTO produtos (nome, tamanho, quantidade, preco) VALUES (?, ?, ?, ?)',
        [produto.nome, produto.tamanho, produto.quantidade, produto.preco]
      );
      resultados.sucesso++;
    } catch (error) {
      resultados.falhas++;
      // Verificar se é erro de duplicidade
      if (error.message.includes('UNIQUE constraint failed')) {
        resultados.mensagens.push(`Produto "${produto.nome}" tamanho "${produto.tamanho}" já existe.`);
        // Atualizar o produto existente
        try {
          await db.promiseRun(
            'UPDATE produtos SET quantidade = quantidade + ?, preco = ?, updated_at = CURRENT_TIMESTAMP WHERE nome = ? AND tamanho = ?',
            [produto.quantidade, produto.preco, produto.nome, produto.tamanho]
          );
          resultados.sucesso++;
          resultados.falhas--;
        } catch (updateError) {
          resultados.mensagens.push(`Erro ao atualizar produto "${produto.nome}": ${updateError.message}`);
        }
      } else {
        resultados.mensagens.push(`Erro ao inserir produto "${produto.nome}": ${error.message}`);
      }
    }
  }
  
  return resultados;
};

// Função para inserir clientes no banco de dados
const inserirClientes = async (clientes) => {
  const resultados = { sucesso: 0, falhas: 0, mensagens: [] };
  
  for (const cliente of clientes) {
    try {
      await db.promiseRun(
        'INSERT INTO clientes (nome, instagram, whatsapp, observacoes) VALUES (?, ?, ?, ?)',
        [cliente.nome, cliente.instagram, cliente.whatsapp, cliente.observacoes]
      );
      resultados.sucesso++;
    } catch (error) {
      resultados.falhas++;
      resultados.mensagens.push(`Erro ao inserir cliente "${cliente.nome}": ${error.message}`);
    }
  }
  
  return resultados;
};

// Função para inserir usuários no banco de dados
const inserirUsuarios = async (usuarios) => {
  const resultados = { sucesso: 0, falhas: 0, mensagens: [] };
  
  for (const usuario of usuarios) {
    try {
      await db.promiseRun(
        'INSERT INTO usuarios (nome, login, senha, nivel_acesso) VALUES (?, ?, ?, ?)',
        [usuario.nome, usuario.login, usuario.senha, usuario.nivel_acesso]
      );
      resultados.sucesso++;
    } catch (error) {
      resultados.falhas++;
      // Verificar se é erro de duplicidade
      if (error.message.includes('UNIQUE constraint failed')) {
        resultados.mensagens.push(`Usuário com login "${usuario.login}" já existe.`);
      } else {
        resultados.mensagens.push(`Erro ao inserir usuário "${usuario.nome}": ${error.message}`);
      }
    }
  }
  
  return resultados;
};

// Rota para upload e processamento de arquivo
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const tipo = req.body.tipo; // 'produtos', 'clientes', 'usuarios'
    
    if (!tipo) {
      return res.status(400).json({ error: 'Tipo de dados não especificado' });
    }
    
    let dados;
    if (fileExt === '.csv') {
      dados = await processCSV(filePath, tipo);
    } else {
      dados = await processExcel(filePath, tipo);
    }
    
    // Validar dados conforme o tipo
    let validacao;
    let resultadoInsercao;
    
    switch (tipo) {
      case 'produtos':
        validacao = validarProdutos(dados);
        if (validacao.erros.length > 0) {
          return res.status(400).json({ 
            error: 'Dados inválidos', 
            erros: validacao.erros 
          });
        }
        resultadoInsercao = await inserirProdutos(validacao.validados);
        break;
        
      case 'clientes':
        validacao = validarClientes(dados);
        if (validacao.erros.length > 0) {
          return res.status(400).json({ 
            error: 'Dados inválidos', 
            erros: validacao.erros 
          });
        }
        resultadoInsercao = await inserirClientes(validacao.validados);
        break;
        
      case 'usuarios':
        validacao = validarUsuarios(dados);
        if (validacao.erros.length > 0) {
          return res.status(400).json({ 
            error: 'Dados inválidos', 
            erros: validacao.erros 
          });
        }
        resultadoInsercao = await inserirUsuarios(validacao.validados);
        break;
        
      default:
        return res.status(400).json({ error: 'Tipo de dados não suportado' });
    }
    
    // Remover o arquivo após processamento
    fs.unlinkSync(filePath);
    
    res.json({
      message: 'Arquivo processado com sucesso',
      resultado: resultadoInsercao
    });
    
  } catch (error) {
    console.error('Erro ao processar arquivo:', error);
    res.status(500).json({ error: 'Erro ao processar arquivo', detalhes: error.message });
  }
});

// Rota para obter modelos de importação
router.get('/modelos/:tipo', (req, res) => {
  const tipo = req.params.tipo;
  const modelosDir = path.join(__dirname, '../modelos');
  
  // Cria o diretório de modelos se não existir
  if (!fs.existsSync(modelosDir)) {
    fs.mkdirSync(modelosDir, { recursive: true });
  }
  
  let dados;
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(7);
  const nomeArquivo = `modelo_${tipo}_${timestamp}_${uniqueId}.xlsx`;
  
  switch (tipo) {
    case 'produtos':
      dados = [
        { nome: 'Camiseta Básica', tamanho: 'M', quantidade: 10, preco: 49.90 },
        { nome: 'Calça Jeans', tamanho: 'G', quantidade: 5, preco: 89.90 }
      ];
      break;
      
    case 'clientes':
      dados = [
        { nome: 'João Silva', instagram: '@joaosilva', whatsapp: '(11) 98765-4321', observacoes: 'Cliente frequente' },
        { nome: 'Maria Oliveira', instagram: '@mariaoliveira', whatsapp: '(11) 91234-5678', observacoes: 'Prefere roupas escuras' }
      ];
      break;
      
    case 'usuarios':
      dados = [
        { nome: 'Administrador', login: 'admin', senha: 'senha123', nivel_acesso: 'admin' },
        { nome: 'Vendedor', login: 'vendedor', senha: 'senha123', nivel_acesso: 'vendedor' }
      ];
      break;
      
    default:
      return res.status(400).json({ error: 'Tipo de modelo não suportado' });
  }
  
  // Criar o arquivo de modelo com nome único
  const modeloPath = path.join(modelosDir, nomeArquivo);
  
  try {
    // Criar uma nova planilha
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(dados);
    xlsx.utils.book_append_sheet(wb, ws, 'Modelo');
    xlsx.writeFile(wb, modeloPath);
    
    // Enviar o arquivo para download com nome amigável
    const nomeAmigavel = `modelo_${tipo}.xlsx`;
    res.download(modeloPath, nomeAmigavel, (err) => {
      if (err) {
        console.error('Erro ao enviar arquivo de modelo:', err);
        // Remover o arquivo em caso de erro
        fs.unlink(modeloPath, () => {});
        return res.status(500).json({ error: 'Erro ao gerar modelo' });
      }
      // Aguardar um pequeno intervalo antes de remover o arquivo
      setTimeout(() => {
        fs.unlink(modeloPath, (unlinkErr) => {
          if (unlinkErr) console.error('Erro ao remover arquivo temporário:', unlinkErr);
        });
      }, 1000);
    });
  } catch (error) {
    console.error('Erro ao gerar arquivo de modelo:', error);
    res.status(500).json({ error: 'Erro ao gerar modelo' });
  }
});

// Rota principal para a página de importação
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    let dados;
    if (fileExt === '.csv') {
      dados = await processCSV(filePath);
    } else {
      dados = await processExcel(filePath);
    }
    
    // Detectar automaticamente o tipo de dados com base nos cabeçalhos
    let tipo;
    if (dados.length > 0) {
      const primeiraLinha = dados[0];
      if ('tamanho' in primeiraLinha && 'preco' in primeiraLinha) {
        tipo = 'produtos';
      } else if ('whatsapp' in primeiraLinha) {
        tipo = 'clientes';
      } else if ('login' in primeiraLinha && 'nivel_acesso' in primeiraLinha) {
        tipo = 'usuarios';
      }
    }
    
    if (!tipo) {
      // Remover o arquivo se não conseguir detectar o tipo
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Não foi possível detectar o tipo de dados no arquivo' });
    }
    
    // Validar e inserir dados conforme o tipo detectado
    let validacao;
    let resultadoInsercao;
    
    switch (tipo) {
      case 'produtos':
        validacao = validarProdutos(dados);
        if (validacao.erros.length > 0) {
          fs.unlinkSync(filePath);
          return res.status(400).json({ 
            error: 'Dados inválidos', 
            erros: validacao.erros 
          });
        }
        resultadoInsercao = await inserirProdutos(validacao.validados);
        break;
        
      case 'clientes':
        validacao = validarClientes(dados);
        if (validacao.erros.length > 0) {
          fs.unlinkSync(filePath);
          return res.status(400).json({ 
            error: 'Dados inválidos', 
            erros: validacao.erros 
          });
        }
        resultadoInsercao = await inserirClientes(validacao.validados);
        break;
        
      case 'usuarios':
        validacao = validarUsuarios(dados);
        if (validacao.erros.length > 0) {
          fs.unlinkSync(filePath);
          return res.status(400).json({ 
            error: 'Dados inválidos', 
            erros: validacao.erros 
          });
        }
        resultadoInsercao = await inserirUsuarios(validacao.validados);
        break;
    }
    
    // Remover o arquivo após processamento
    fs.unlinkSync(filePath);
    
    res.json({
      message: 'Arquivo processado com sucesso',
      tipo: tipo,
      resultado: resultadoInsercao
    });
    
  } catch (error) {
    console.error('Erro ao processar arquivo:', error);
    res.status(500).json({ error: 'Erro ao processar arquivo', detalhes: error.message });
  }
});

module.exports = router;