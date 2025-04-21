const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, admin } = require('../middlewares/auth');
const db = require('../database');

// Configuração do multer para upload de logo
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'logo-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.png', '.jpg', '.jpeg', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Use PNG, JPG, JPEG ou GIF.'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB
});

// Obter configurações da loja
router.get('/', auth, async (req, res) => {
  try {
    // Buscar configurações do banco de dados
    const configuracoes = await db.promiseGet('SELECT * FROM configuracoes LIMIT 1');
    
    if (!configuracoes) {
      return res.status(404).json({ message: 'Configurações não encontradas' });
    }
    
    // Converter valores booleanos armazenados como INTEGER
    const configFormatted = {
      ...configuracoes,
      mostrar_estoque_baixo: configuracoes.mostrar_estoque_baixo === 1,
      permitir_venda_sem_estoque: configuracoes.permitir_venda_sem_estoque === 1
    };
    
    res.json(configFormatted);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ message: 'Erro ao buscar configurações' });
  }
});

// Atualizar configurações da loja
router.post('/', auth, admin, async (req, res) => {
  try {
    // Verificar se já existem configurações
    const configExistente = await db.promiseGet('SELECT id FROM configuracoes LIMIT 1');
    
    // Preparar os dados para atualização
    const {
      nome_loja, endereco, telefone, email, instagram, whatsapp,
      tema_cor_primaria, tema_cor_secundaria, mostrar_estoque_baixo,
      limite_estoque_baixo, permitir_venda_sem_estoque, dias_vencimento_crediario,
      markup, tema
    } = req.body;
    
    // Converter valores booleanos para INTEGER
    const mostrarEstoqueBaixoInt = mostrar_estoque_baixo ? 1 : 0;
    const permitirVendaSemEstoqueInt = permitir_venda_sem_estoque ? 1 : 0;
    
    if (configExistente) {
      // Atualizar configurações existentes
      await db.promiseRun(`
        UPDATE configuracoes SET 
          nome_loja = ?, endereco = ?, telefone = ?, email = ?, 
          instagram = ?, whatsapp = ?, tema_cor_primaria = ?, 
          tema_cor_secundaria = ?, mostrar_estoque_baixo = ?, 
          limite_estoque_baixo = ?, permitir_venda_sem_estoque = ?, 
          dias_vencimento_crediario = ?, markup = ?, tema = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        nome_loja, endereco, telefone, email, instagram, whatsapp,
        tema_cor_primaria, tema_cor_secundaria, mostrarEstoqueBaixoInt,
        limite_estoque_baixo, permitirVendaSemEstoqueInt, dias_vencimento_crediario,
        markup, tema, configExistente.id
      ]);
    } else {
      // Inserir novas configurações
      await db.promiseRun(`
        INSERT INTO configuracoes (
          nome_loja, endereco, telefone, email, instagram, whatsapp,
          tema_cor_primaria, tema_cor_secundaria, mostrar_estoque_baixo,
          limite_estoque_baixo, permitir_venda_sem_estoque, dias_vencimento_crediario,
          markup, tema
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        nome_loja, endereco, telefone, email, instagram, whatsapp,
        tema_cor_primaria, tema_cor_secundaria, mostrarEstoqueBaixoInt,
        limite_estoque_baixo, permitirVendaSemEstoqueInt, dias_vencimento_crediario,
        markup, tema
      ]);
    }
    
    res.json({ 
      message: 'Configurações atualizadas com sucesso',
      data: req.body
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ message: 'Erro ao atualizar configurações' });
  }
});

// Rota para acesso direto às configurações
router.get('/acesso', auth, async (req, res) => {
  try {
    // Verificar se o usuário tem permissão para acessar as configurações
    if (req.usuario.nivel_acesso !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado. Permissão de administrador necessária.' });
    }
    
    // Buscar configurações do banco de dados
    const configuracoes = await db.promiseGet('SELECT * FROM configuracoes LIMIT 1');
    
    if (!configuracoes) {
      return res.status(404).json({ message: 'Configurações não encontradas' });
    }
    
    // Converter valores booleanos armazenados como INTEGER
    const configFormatted = {
      ...configuracoes,
      mostrar_estoque_baixo: configuracoes.mostrar_estoque_baixo === 1,
      permitir_venda_sem_estoque: configuracoes.permitir_venda_sem_estoque === 1
    };
    
    res.json({
      success: true,
      message: 'Acesso às configurações concedido',
      data: configFormatted
    });
  } catch (error) {
    console.error('Erro ao acessar configurações:', error);
    res.status(500).json({ message: 'Erro ao acessar configurações' });
  }
});

// Rota para upload de logo
router.post('/logo', auth, admin, (req, res, next) => {
  const uploadDir = path.join(__dirname, '../uploads/logos');
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Erro ao criar diretório de uploads:', error);
      return res.status(500).json({ message: 'Erro ao criar diretório de uploads.' });
    }
  }
  upload.single('logo')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Erro no upload: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo foi enviado.' });
    }

    const configExistente = await db.promiseGet('SELECT id, logo_path FROM configuracoes LIMIT 1');
    
    // Se existir um logo anterior, deletar o arquivo
    if (configExistente && configExistente.logo_path) {
      const oldLogoPath = path.join(__dirname, '..', configExistente.logo_path);
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    // Caminho relativo para salvar no banco
    const relativePath = path.join('uploads', 'logos', req.file.filename).replace(/\\/g, '/');

    if (configExistente) {
      await db.promiseRun('UPDATE configuracoes SET logo_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
        [relativePath, configExistente.id]);
    } else {
      await db.promiseRun('INSERT INTO configuracoes (logo_path) VALUES (?)', [relativePath]);
    }

    res.json({ 
      message: 'Logo atualizado com sucesso',
      logo_path: relativePath
    });
  } catch (error) {
    console.error('Erro ao fazer upload do logo:', error);
    res.status(500).json({ message: 'Erro ao fazer upload do logo' });
  }
});

module.exports = router;