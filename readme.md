# Sistema de Gerenciamento para Loja de Roupas

Este sistema oferece funcionalidades completas para gerenciamento de uma pequena loja de roupas, incluindo controle de vendas, estoque, cadastro de produtos, clientes e usuários.

## Funcionalidades

- Controle de vendas (registrar, consultar histórico, cancelar)
- Controle de estoque (adicionar, remover e atualizar produtos)
- Cadastro de produtos
- Cadastro de clientes 
- Gerenciamento de usuários (com diferentes níveis de acesso)
- Relatórios gerenciais
- Dashboard interativo

## Requisitos

- Node.js 14.x ou superior
- npm 6.x ou superior

## Instalação

1. Clone o repositório:
```
git clone https://github.com/seu-usuario/sistema-loja-roupas.git
cd sistema-loja-roupas
```

2. Instale as dependências:
```
npm run install-all
```

3. Configure o arquivo `.env` na raiz do projeto:
```
PORT=5000
JWT_SECRET=chavesecretaparaomeuapp
NODE_ENV=development
```

4. Inicialize o banco de dados com dados de exemplo:
```
npm run seed
```

## Executando o Sistema

Para executar tanto o backend quanto o frontend simultaneamente:

```
npm run dev
```

Isso irá iniciar:
- Backend na porta 5000 (http://localhost:5000)
- Frontend na porta 3000 (http://localhost:3000)

## Usuários para Teste

O sistema vem com 3 usuários pré-cadastrados:

| Usuário   | Senha     | Perfil     |
|-----------|-----------|------------|
| admin     | admin123  | Administrador |
| vendedor  | vend123   | Vendedor   |
| estoque   | estq123   | Estoquista |

## Estrutura de Diretórios

```
sistema-loja-roupas/
├── client/                # Frontend React
│   ├── public/
│   └── src/
│       ├── components/    # Componentes reutilizáveis
│       ├── contexts/      # Contextos React
│       ├── pages/         # Páginas da aplicação
│       └── App.js         # Componente principal
├── server/                # Backend Node.js
│   ├── middlewares/       # Middlewares Express
│   ├── routes/            # Rotas da API
│   ├── utils/             # Utilitários
│   ├── database.js        # Configuração do banco de dados
│   ├── schema.sql         # Estrutura do banco de dados
│   └── server.js          # Servidor Express
└── package.json           # Dependências e scripts
```

## Solução de Problemas

Se encontrar problemas ao iniciar o sistema:

1. Verifique se o servidor está em execução na porta 5000
2. Certifique-se de que o banco de dados foi inicializado com `npm run seed`
3. Limpe os caches do navegador ou utilize modo anônimo
4. Verifique se todas as dependências foram instaladas corretamente