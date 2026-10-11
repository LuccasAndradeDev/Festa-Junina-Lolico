# Festa Junina Lolico

Aplicação web para simular as vendas e a organização de uma festa junina. Projeto desenvolvido para estudo e portfólio, com interface para clientes e áreas restritas para administração e validação de ingressos.

**Demonstração:** [Abrir Festa Junina Lolico](https://festa-junina-lolico-production.up.railway.app)  
**Código-fonte:** [GitHub](https://github.com/LuccasAndradeDev/Festa-Junina-Lolico)

> **Aviso:** este é um projeto demonstrativo. Os métodos de pagamento são registrados no sistema, mas não há integração com um gateway para processar pagamentos reais. Utilize somente dados fictícios na demonstração.

## Funcionalidades

- Cadastro e login de clientes.
- Login separado para administradores e funcionários.
- Catálogo de produtos com categorias, preços e estoque.
- Carrinho e registro de vendas.
- Histórico de compras do cliente.
- Área administrativa para consultar vendas e gerenciar produtos.
- Emissão de ingressos individuais com QR Code.
- Validação de ingressos por funcionários e administradores, com controle para evitar reutilização.
- Geração de comprovante de compra em PDF.
- Validação dos itens, dos preços e do estoque no servidor.
- Senhas protegidas com hash usando bcrypt.
- Sessões persistidas no MySQL.
- Proteções básicas com Helmet e limitação de tentativas de login.

## Tecnologias

- **Front-end:** HTML, CSS e JavaScript.
- **Back-end:** Node.js e Express.
- **Banco de dados:** MySQL, usando `mysql2`.
- **Autenticação e sessões:** `express-session`, `express-mysql-session` e `bcryptjs`.
- **Outros recursos:** Helmet, express-rate-limit, PDFKit e QRCode.
- **Deploy:** Railway.
- **Versionamento:** Git e GitHub.

## Estrutura do projeto

```text
.
├── public/
│   ├── css/                 # Estilos
│   ├── imagens/             # Imagens dos produtos
│   ├── js/                  # Lógica do navegador
│   ├── index.html           # Página principal
│   ├── login.html           # Acesso ao sistema
│   ├── admin.html           # Área administrativa
│   ├── adicionar-produto.html
│   ├── historico.html        # Histórico de compras
│   └── validar.html         # Validação de ingressos
├── server.js                # API e servidor Express
├── migrar-senhas-usuarios.js
├── package.json
├── package-lock.json
└── .env.example             # Modelo das variáveis de ambiente
```

## Executar localmente

### Requisitos

- Node.js (versão LTS recomendada).
- MySQL.
- Um banco MySQL com o esquema compatível com a aplicação.

### Instalação

1. Clone o repositório e entre na pasta:

   ```bash
   git clone https://github.com/LuccasAndradeDev/Festa-Junina-Lolico.git
   cd Festa-Junina-Lolico
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Copie `.env.example` para um arquivo chamado `.env` e preencha os dados do seu banco local. Gere também um valor próprio e aleatório para `SESSION_SECRET`.

4. Configure um banco de teste que contenha as tabelas necessárias à aplicação: `produtos`, `clientes`, `usuarios`, `vendas`, `itens_venda` e `ingressos_emitidos`. **O dump do banco e os dados de usuários não fazem parte deste repositório.**

5. Inicie o servidor:

   ```bash
   npm start
   ```

6. Abra [http://localhost:3000](http://localhost:3000).

## Variáveis de ambiente

Veja `.env.example` para a lista de variáveis necessárias:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: conexão com o MySQL.
- `SESSION_SECRET`: segredo para assinar as sessões.
- `NODE_ENV`: ambiente de execução.
- `PORT`: porta HTTP (o Railway define esse valor no deploy).
- `BASE_URL`: URL usada nos QR Codes dos ingressos gerados no PDF.

Não publique seu arquivo `.env`, senhas, tokens ou backups do banco de dados.

## Capturas de tela

As capturas de tela da demonstração serão adicionadas aqui após a revisão final da interface.

## Escopo e limitações

- O projeto é demonstrativo e não processa pagamentos reais.
- O banco de dados não é incluído no repositório.
- Não use informações pessoais reais na demonstração publicada.
- O script `migrar-senhas-usuarios.js` é uma ferramenta de manutenção: revise o ambiente e faça backup antes de executá-lo.

## Autor

Projeto desenvolvido como parte do aprendizado em Análise e Desenvolvimento de Sistemas.
