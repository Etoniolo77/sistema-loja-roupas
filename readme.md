# Sistema de Gerenciamento para Loja de Roupas

Sistema completo para gerenciamento de uma pequena loja de roupas, incluindo controle de vendas, estoque, cadastro de produtos, clientes e usuários.

## Funcionalidades

- **Dashboard interativo**: Visão geral de vendas, estoque e clientes
- **Controle de Vendas**: Registrar, consultar e cancelar vendas
- **Controle de Estoque**: Gerenciar entradas e saídas de produtos
- **Cadastro de Produtos**: Adicionar, editar e excluir produtos
- **Cadastro de Clientes**: Gerenciar informações de clientes
- **Gerenciamento de Usuários**: Administração de usuários e permissões
- **Relatórios Gerenciais**: Análises de vendas, estoque e clientes
- **Interface Responsiva**: Layout adaptável para dispositivos móveis e desktop
- **Tema Claro/Escuro**: Opção de escolha entre tema claro ou escuro

## Requisitos Técnicos

- Node.js (v14 ou superior)
- npm ou yarn

## Instalação

1. **Clone o repositório e acesse a pasta do projeto**

```bash
git clone [url-do-repositório]
cd loja-roupas
```

2. **Instale as dependências do servidor**

```bash
cd server
npm install
```

3. **Instale as dependências do cliente**

```bash
cd ../client
npm install
```

4. **Configure o banco de dados**

O sistema utiliza SQLite que não requer instalação adicional. O banco de dados é criado automaticamente na primeira execução.

## Executando o Sistema

### Desenvolvimento

1. **Inicie o servidor backend**

```bash
cd server
npm run dev
```

2. **Em outro terminal, inicie o cliente frontend**

```bash
cd client
npm start
```

O frontend estará disponível em `http://localhost:3000` e o backend em `http://localhost:5000`.

### Produção

1. **Construa o frontend**

```bash
cd client
npm run build
```

2. **Inicie o servidor**

```bash
cd ../server
npm start
```

O sistema completo estará disponível em `http://localhost:5000`.

## Acessando o Sistema

Acesse o sistema pelo navegador utilizando os seguintes dados de acesso padrão:

- **Administrador**:
  - Login: `admin`
  - Senha: `admin123`
  
- **Vendedor**:
  - Login: `vendedor`
  - Senha: `vend123`
  
- **Estoquista**:
  - Login: `estoque`
  - Senha: `estq123`

## Estrutura de Permissões

- **Administrador**: Acesso total ao sistema
- **Vendedor**: Acesso ao cadastro de clientes, vendas e consulta de produtos
- **Estoquista**: Acesso ao cadastro de produtos, controle de estoque e consulta de vendas

## Guia de Uso Rápido

### Realizando uma Venda

1. Acesse o menu "Vendas"
2. Clique em "Nova Venda"
3. Selecione o cliente (opcional)
4. Adicione os produtos desejados, informando a quantidade
5. Verifique o valor total no resumo da venda
6. Clique em "Finalizar Venda"

### Gerenciando o Estoque

1. Acesse o menu "Estoque"
2. Para adicionar unidades, localize o produto e clique em "Adicionar"
3. Para remover unidades, localize o produto e clique em "Remover"
4. Informe a quantidade e o motivo da movimentação

### Cadastrando Novos Produtos

1. Acesse o menu "Produtos"
2. Clique em "Novo Produto"
3. Preencha os dados: nome, tamanho, quantidade inicial e preço
4. Clique em "Salvar"

### Emitindo Relatórios

1. Acesse o menu "Relatórios"
2. Selecione o tipo de relatório desejado
3. Defina os filtros (período, categoria, etc)
4. Clique em "Gerar Relatório"
5. Utilize as opções para imprimir ou exportar (PDF/Excel)

## Manutenção e Backup

O banco de dados SQLite está localizado na pasta `server/database.sqlite`. É recomendável realizar backups frequentes deste arquivo para evitar perda de dados.

Para realizar o backup manualmente:

1. Pare o servidor
2. Copie o arquivo `database.sqlite` para um local seguro
3. Reinicie o servidor

## Suporte e Contato

Para suporte técnico ou dúvidas sobre o sistema, entre em contato com o administrador do sistema ou com o desenvolvedor responsável.

## Licença

Este software é propriedade da empresa e seu uso é restrito aos termos estabelecidos no contrato de licença.
