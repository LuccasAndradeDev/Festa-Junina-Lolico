require("dotenv").config();

const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const crypto = require("crypto");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

if (!process.env.SESSION_SECRET) {
    console.error("SESSION_SECRET não definido no arquivo .env.");
    process.exit(1);
}

app.set("trust proxy", 1);

app.use(express.json({ limit: "50kb" }));

app.use(
    helmet({
        // O validador usa html5-qrcode via CDN.
        // Vamos manter a CSP desligada por enquanto para não quebrar a câmera.
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
    })
);

const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000,
    expiration: 8 * 60 * 60 * 1000
});

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 8 * 60 * 60 * 1000
        }
    })
);
// ==========================================
// BANCO DE DADOS
// ==========================================

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error("Erro ao conectar ao MySQL:", err);
        return;
    }

    console.log("Conectado ao MySQL com sucesso!");
    connection.release();
});

// ==========================================
// ARQUIVOS PÚBLICOS
// ==========================================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// ==========================================
// FUNÇÕES DE SEGURANÇA
// ==========================================

function textoValido(valor, minimo, maximo) {
    if (typeof valor !== "string") return false;
    const texto = valor.trim();
    return texto.length >= minimo && texto.length <= maximo;
}

function idValido(valor) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0;
}

function emailValido(email) {
    if (!textoValido(email, 5, 150)) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function cpfLimpoValido(cpf) {
    if (typeof cpf !== "string" && typeof cpf !== "number") return null;
    const limpo = String(cpf).replace(/\D/g, "");
    return limpo.length === 11 ? limpo : null;
}

function telefoneLimpoValido(telefone) {
    if (typeof telefone !== "string" && typeof telefone !== "number") return null;
    let limpo = String(telefone).replace(/\D/g, "");

    // Aceita números brasileiros com DDD, com ou sem o código do país +55.
    if ((limpo.length === 12 || limpo.length === 13) && limpo.startsWith("55")) {
        limpo = limpo.slice(2);
    }

    return limpo.length === 10 || limpo.length === 11 ? limpo : null;
}

function criarErroPublico(status, mensagem) {
    const erro = new Error(mensagem);
    erro.statusPublico = status;
    erro.mensagemPublica = mensagem;
    return erro;
}

function exigirAdmin(req, res, next) {
    const usuario = req.session?.usuario;

    if (!usuario) {
        return res.status(401).json({
            sucesso: false,
            mensagem: "Faça login como administrador."
        });
    }

    if (usuario.tipo !== "admin") {
        return res.status(403).json({
            sucesso: false,
            mensagem: "Acesso não autorizado."
        });
    }

    next();
}

function exigirStaff(req, res, next) {
    const usuario = req.session?.usuario;

    if (!usuario) {
        return res.status(401).json({
            sucesso: false,
            status: "nao_autorizado",
            mensagem: "Faça login como funcionário."
        });
    }

    if (
        usuario.tipo !== "funcionario" &&
        usuario.tipo !== "admin"
    ) {
        return res.status(403).json({
            sucesso: false,
            status: "nao_autorizado",
            mensagem: "Acesso não autorizado."
        });
    }

    next();
}

function exigirCliente(req, res, next) {
    const cliente = req.session?.cliente;

    if (!cliente) {
        return res.status(401).json({
            sucesso: false,
            mensagem: "Faça login como cliente para continuar."
        });
    }

    next();
}

function usuarioPodeAcessarVenda(req, idClienteVenda) {
    const usuario = req.session?.usuario;
    const cliente = req.session?.cliente;

    if (usuario?.tipo === "admin") return true;

    if (
        cliente &&
        Number(cliente.id) === Number(idClienteVenda)
    ) {
        return true;
    }

    return false;
}

const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        sucesso: false,
        mensagem: "Muitas tentativas de login. Aguarde 15 minutos e tente novamente."
    }
});

// ==========================================
// LOGIN ADMIN / FUNCIONÁRIO
// ==========================================

app.post("/login", limiteLogin, async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const senha = String(req.body?.senha || "");
    const tipo = String(req.body?.tipo || "").trim().toLowerCase();

    if (
        !emailValido(email) ||
        !textoValido(senha, 1, 128) ||
        !["admin", "funcionario"].includes(tipo)
    ) {
        return res.status(400).json({
            sucesso: false,
            erro: "Dados de login inválidos."
        });
    }

    try {
        const [usuarios] = await db.promise().query(
            `SELECT id, nome, email, senha, tipo
             FROM usuarios
             WHERE email = ?
             AND tipo = ?
             LIMIT 1`,
            [email, tipo]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                sucesso: false,
                erro: "Usuário, senha ou tipo de acesso inválido."
            });
        }

        const usuario = usuarios[0];
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

        if (!senhaCorreta) {
            return res.status(401).json({
                sucesso: false,
                erro: "Usuário, senha ou tipo de acesso inválido."
            });
        }

        req.session.regenerate((erroSessao) => {
            if (erroSessao) {
                console.error("Erro ao regenerar sessão:", erroSessao);
                return res.status(500).json({
                    sucesso: false,
                    erro: "Erro ao iniciar sessão."
                });
            }

            req.session.usuario = {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                tipo: usuario.tipo
            };

            req.session.save((erroSalvar) => {
                if (erroSalvar) {
                    console.error("Erro ao salvar sessão:", erroSalvar);
                    return res.status(500).json({
                        sucesso: false,
                        erro: "Erro ao iniciar sessão."
                    });
                }

                return res.json({
                    sucesso: true,
                    usuario: {
                        id: usuario.id,
                        nome: usuario.nome,
                        email: usuario.email,
                        tipo: usuario.tipo
                    }
                });
            });
        });
    }
    catch (erro) {
        console.error("Erro no login de usuário:", erro);
        return res.status(500).json({
            sucesso: false,
            erro: "Erro ao realizar login."
        });
    }
});

// ==========================================
// LOGOUT + CONSULTA DE SESSÃO
// ==========================================

app.post("/logout", (req, res) => {
    req.session.destroy((erro) => {
        if (erro) {
            console.error("Erro ao encerrar sessão:", erro);
            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao sair."
            });
        }

        res.clearCookie("connect.sid");
        return res.json({
            sucesso: true,
            mensagem: "Logout realizado com sucesso."
        });
    });
});

app.get("/sessao/admin", exigirAdmin, (req, res) => {
    return res.json({
        sucesso: true,
        usuario: req.session.usuario
    });
});

app.get("/sessao/validador", exigirStaff, (req, res) => {
    return res.json({
        sucesso: true,
        usuario: req.session.usuario
    });
});

app.get("/sessao/cliente", exigirCliente, (req, res) => {
    return res.json({
        sucesso: true,
        cliente: req.session.cliente
    });
});

// ==========================================
// CADASTRO DE CLIENTE
// ==========================================

app.post("/clientes/cadastro", async (req, res) => {
    const nome = String(req.body?.nome || "").trim();
    const cpfLimpo = cpfLimpoValido(req.body?.cpf);
    const telefone = telefoneLimpoValido(req.body?.telefone);
    const senha = String(req.body?.senha || "");

    if (!textoValido(nome, 2, 100)) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Informe um nome válido."
        });
    }

    if (!cpfLimpo) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "CPF inválido."
        });
    }

    if (!telefone) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Informe um telefone com DDD (10 ou 11 dígitos)."
        });
    }

    if (!textoValido(senha, 6, 128)) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "A senha deve possuir entre 6 e 128 caracteres."
        });
    }

    try {
        const [existentes] = await db.promise().query(
            `SELECT id FROM clientes WHERE cpf = ? LIMIT 1`,
            [cpfLimpo]
        );

        if (existentes.length > 0) {
            return res.status(409).json({
                sucesso: false,
                mensagem: "Este CPF já possui cadastro."
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const [resultado] = await db.promise().query(
            `INSERT INTO clientes (nome, cpf, telefone, senha)
             VALUES (?, ?, ?, ?)`,
            [nome, cpfLimpo, telefone, senhaHash]
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: "Cadastro realizado com sucesso!",
            cliente: {
                id: resultado.insertId,
                nome
            }
        });
    }
    catch (erro) {
        console.error("Erro ao cadastrar cliente:", erro);
        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao cadastrar cliente."
        });
    }
});

// ==========================================
// LOGIN CLIENTE
// ==========================================

app.post("/clientes/login", limiteLogin, async (req, res) => {
    const cpfLimpo = cpfLimpoValido(req.body?.cpf);
    const senha = String(req.body?.senha || "");

    if (!cpfLimpo || !textoValido(senha, 1, 128)) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Informe CPF e senha válidos."
        });
    }

    try {
        const [resultado] = await db.promise().query(
            `SELECT id, nome, cpf, senha
             FROM clientes
             WHERE cpf = ?
             LIMIT 1`,
            [cpfLimpo]
        );

        if (resultado.length === 0) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "CPF ou senha incorretos."
            });
        }

        const cliente = resultado[0];
        const senhaCorreta = await bcrypt.compare(senha, cliente.senha);

        if (!senhaCorreta) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "CPF ou senha incorretos."
            });
        }

        req.session.regenerate((erroSessao) => {
            if (erroSessao) {
                console.error("Erro ao regenerar sessão do cliente:", erroSessao);
                return res.status(500).json({
                    sucesso: false,
                    mensagem: "Erro ao iniciar sessão."
                });
            }

            req.session.cliente = {
                id: cliente.id,
                nome: cliente.nome,
                cpf: cliente.cpf
            };

            req.session.save((erroSalvar) => {
                if (erroSalvar) {
                    console.error("Erro ao salvar sessão do cliente:", erroSalvar);
                    return res.status(500).json({
                        sucesso: false,
                        mensagem: "Erro ao iniciar sessão."
                    });
                }

                return res.json({
                    sucesso: true,
                    mensagem: "Login realizado com sucesso!",
                    cliente: {
                        id: cliente.id,
                        nome: cliente.nome
                    }
                });
            });
        });
    }
    catch (erro) {
        console.error("Erro no login do cliente:", erro);
        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao realizar login."
        });
    }
});

// ==========================================
// LISTAR PRODUTOS
// ==========================================

app.get("/produtos", (req, res) => {
    db.query(
        `SELECT id, nome, preco, estoque, categoria, imagem
         FROM produtos`,
        (erro, resultados) => {
            if (erro) {
                console.error("Erro ao buscar produtos:", erro);
                return res.status(500).json({
                    sucesso: false,
                    mensagem: "Erro ao buscar produtos."
                });
            }

            return res.json(resultados);
        }
    );
});

// ==========================================
// REALIZAR VENDA
// Cliente vem da sessão, não do navegador.
// Preço e total são recalculados no servidor.
// ==========================================

app.post("/vendas", exigirCliente, async (req, res) => {
    const idCliente = Number(req.session.cliente.id);
    const pagamento = String(req.body?.pagamento || "").trim();
    const itens = req.body?.itens;
    const pagamentosPermitidos = [
        "PIX",
        "Cartão de Crédito",
        "Cartão de Débito",
        "Dinheiro"
    ];

    if (
        !pagamentosPermitidos.includes(pagamento) ||
        !Array.isArray(itens) ||
        itens.length === 0 ||
        itens.length > 50
    ) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Dados da venda inválidos."
        });
    }

    let connection;

    try {
        connection = await db.promise().getConnection();
        await connection.beginTransaction();

        const itensProcessados = [];
        let totalReal = 0;

        for (const item of itens) {
            const idProduto = Number(item?.id_produto);
            const quantidade = Number(item?.quantidade);

            if (
                !Number.isInteger(idProduto) ||
                idProduto <= 0 ||
                !Number.isInteger(quantidade) ||
                quantidade <= 0 ||
                quantidade > 100
            ) {
                throw criarErroPublico(400, "Item da venda inválido.");
            }

            const [produtos] = await connection.query(
                `SELECT id, nome, preco, estoque, categoria
                 FROM produtos
                 WHERE id = ?
                 FOR UPDATE`,
                [idProduto]
            );

            if (produtos.length === 0) {
                throw criarErroPublico(404, "Produto não encontrado.");
            }

            const produto = produtos[0];

            if (Number(produto.estoque) < quantidade) {
                throw criarErroPublico(
                    409,
                    `Estoque insuficiente para ${produto.nome}.`
                );
            }

            totalReal += Number(produto.preco) * quantidade;
            itensProcessados.push({ produto, quantidade });
        }

        totalReal = Number(totalReal.toFixed(2));
        const codigoVenda = crypto.randomUUID();

        const [resultadoVenda] = await connection.query(
            `INSERT INTO vendas
            (
                id_cliente,
                pagamento,
                total,
                codigo_validacao
            )
            VALUES (?, ?, ?, ?)`,
            [idCliente, pagamento, totalReal, codigoVenda]
        );

        const idVenda = resultadoVenda.insertId;
        let quantidadeIngressos = 0;

        for (const itemProcessado of itensProcessados) {
            const produto = itemProcessado.produto;
            const quantidade = itemProcessado.quantidade;

            await connection.query(
                `INSERT INTO itens_venda
                (
                    id_venda,
                    id_produto,
                    quantidade,
                    preco
                )
                VALUES (?, ?, ?, ?)`,
                [idVenda, produto.id, quantidade, produto.preco]
            );

            await connection.query(
                `UPDATE produtos
                 SET estoque = estoque - ?
                 WHERE id = ?`,
                [quantidade, produto.id]
            );

            const categoria = String(produto.categoria || "")
                .trim()
                .toLowerCase();

            if (
                categoria === "ingresso" ||
                categoria === "ingressos"
            ) {
                for (let numero = 0; numero < quantidade; numero++) {
                    const codigoIngresso = crypto.randomUUID();

                    await connection.query(
                        `INSERT INTO ingressos_emitidos
                        (
                            id_venda,
                            id_cliente,
                            codigo,
                            utilizado
                        )
                        VALUES (?, ?, ?, 0)`,
                        [idVenda, idCliente, codigoIngresso]
                    );

                    quantidadeIngressos++;
                }
            }
        }

        await connection.commit();

        return res.status(201).json({
            sucesso: true,
            mensagem: "Compra realizada com sucesso!",
            idVenda,
            total: totalReal,
            ingressosGerados: quantidadeIngressos
        });
    }
    catch (erro) {
        if (connection) {
            try {
                await connection.rollback();
            }
            catch (erroRollback) {
                console.error("Erro no rollback:", erroRollback);
            }
        }

        if (erro.statusPublico) {
            return res.status(erro.statusPublico).json({
                sucesso: false,
                mensagem: erro.mensagemPublica
            });
        }

        console.error("Erro ao realizar venda:", erro);
        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao realizar a compra."
        });
    }
    finally {
        if (connection) connection.release();
    }
});

// ==========================================
// COMPRAS DO CLIENTE
// ==========================================

function buscarComprasCliente(idCliente, res) {
    db.query(
        `SELECT
            id,
            pagamento,
            total,
            data_venda,
            codigo_validacao,
            ingresso_usado,
            data_validacao
         FROM vendas
         WHERE id_cliente = ?
         ORDER BY data_venda DESC`,
        [idCliente],
        (erro, resultado) => {
            if (erro) {
                console.error("Erro ao buscar compras:", erro);
                return res.status(500).json({
                    sucesso: false,
                    mensagem: "Erro ao buscar compras."
                });
            }

            return res.json(resultado);
        }
    );
}

app.get("/minhas-compras", exigirCliente, (req, res) => {
    return buscarComprasCliente(req.session.cliente.id, res);
});

// Mantida para compatibilidade, mas sem IDOR.
app.get("/clientes/:id/compras", exigirCliente, (req, res) => {
    if (!idValido(req.params.id)) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Cliente inválido."
        });
    }

    if (Number(req.params.id) !== Number(req.session.cliente.id)) {
        return res.status(403).json({
            sucesso: false,
            mensagem: "Acesso não autorizado."
        });
    }

    return buscarComprasCliente(req.session.cliente.id, res);
});

// ==========================================
// LISTAR TODAS AS VENDAS - ADMIN
// ==========================================

app.get("/vendas", exigirAdmin, (req, res) => {
    db.query(
        `SELECT *
         FROM vendas
         ORDER BY data_venda DESC`,
        (erro, resultado) => {
            if (erro) {
                console.error("Erro ao buscar vendas:", erro);
                return res.status(500).json({
                    sucesso: false,
                    mensagem: "Erro ao buscar vendas."
                });
            }

            return res.json(resultado);
        }
    );
});

// ==========================================
// COMPROVANTE PDF
// Dono da compra ou administrador.
// ==========================================

app.get("/vendas/:id/comprovante", async (req, res) => {
    if (!idValido(req.params.id)) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Venda inválida."
        });
    }

    const idVenda = Number(req.params.id);

    try {
        const [vendas] = await db.promise().query(
            `SELECT
                vendas.id,
                vendas.id_cliente,
                vendas.pagamento,
                vendas.total,
                vendas.data_venda,
                clientes.nome,
                clientes.cpf
             FROM vendas
             INNER JOIN clientes
                ON clientes.id = vendas.id_cliente
             WHERE vendas.id = ?`,
            [idVenda]
        );

        if (vendas.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Venda não encontrada."
            });
        }

        const venda = vendas[0];

        if (!usuarioPodeAcessarVenda(req, venda.id_cliente)) {
            return res.status(req.session?.usuario || req.session?.cliente ? 403 : 401).json({
                sucesso: false,
                mensagem: "Acesso não autorizado."
            });
        }

        const [itens] = await db.promise().query(
            `SELECT
                produtos.nome,
                produtos.categoria,
                itens_venda.quantidade,
                itens_venda.preco
             FROM itens_venda
             INNER JOIN produtos
                ON produtos.id = itens_venda.id_produto
             WHERE itens_venda.id_venda = ?`,
            [idVenda]
        );

        const [ingressos] = await db.promise().query(
            `SELECT id, codigo, utilizado, data_utilizacao
             FROM ingressos_emitidos
             WHERE id_venda = ?
             ORDER BY id ASC`,
            [idVenda]
        );

        await gerarComprovantePDF(res, venda, itens, ingressos);
    }
    catch (erro) {
        console.error("Erro ao gerar comprovante:", erro);

        if (!res.headersSent) {
            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao gerar comprovante."
            });
        }
    }
});

// ==========================================
// ITENS DE UMA VENDA
// Dono da compra ou administrador.
// ==========================================

app.get("/vendas/:id", async (req, res) => {
    if (!idValido(req.params.id)) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Venda inválida."
        });
    }

    const idVenda = Number(req.params.id);

    try {
        const [vendas] = await db.promise().query(
            `SELECT id_cliente
             FROM vendas
             WHERE id = ?
             LIMIT 1`,
            [idVenda]
        );

        if (vendas.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Venda não encontrada."
            });
        }

        if (!usuarioPodeAcessarVenda(req, vendas[0].id_cliente)) {
            return res.status(req.session?.usuario || req.session?.cliente ? 403 : 401).json({
                sucesso: false,
                mensagem: "Acesso não autorizado."
            });
        }

        const [itens] = await db.promise().query(
            `SELECT
                produtos.nome,
                itens_venda.quantidade,
                itens_venda.preco
             FROM itens_venda
             INNER JOIN produtos
                ON produtos.id = itens_venda.id_produto
             WHERE itens_venda.id_venda = ?`,
            [idVenda]
        );

        return res.json(itens);
    }
    catch (erro) {
        console.error("Erro ao buscar itens da venda:", erro);
        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao buscar itens."
        });
    }
});

// ==========================================
// PEDIDOS DO FUNCIONÁRIO - CONSULTA E ENTREGA
// Funcionários e administradores podem consultar por número do pedido
// ou telefone e marcar cada item como consumido.
// ==========================================

app.get("/funcionario/pedidos", exigirStaff, async (req, res) => {
    const entrada = String(req.query?.busca || "").trim();
    let digitos = entrada.replace(/\D/g, "");

    if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
        digitos = digitos.slice(2);
    }

    if (!digitos) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Informe o número do pedido ou o telefone do cliente."
        });
    }

    const buscarPorTelefone = digitos.length === 10 || digitos.length === 11;

    if (!buscarPorTelefone && digitos.length > 9) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Informe um número de pedido ou um telefone brasileiro com DDD."
        });
    }

    try {
        const sqlVendas = `
            SELECT
                v.id,
                v.data_venda,
                v.total,
                v.pagamento,
                c.nome AS cliente,
                RIGHT(COALESCE(c.telefone, ''), 4) AS telefone_final
            FROM vendas v
            INNER JOIN clientes c ON c.id = v.id_cliente
            WHERE ${buscarPorTelefone ? "c.telefone = ?" : "v.id = ?"}
            ORDER BY v.data_venda DESC
            LIMIT 20
        `;

        const valorBusca = buscarPorTelefone ? digitos : Number(digitos);
        const [vendas] = await db.promise().query(sqlVendas, [valorBusca]);

        if (vendas.length === 0) {
            return res.json({
                sucesso: true,
                pedidos: [],
                mensagem: "Nenhum pedido encontrado."
            });
        }

        const idsVendas = vendas.map((venda) => Number(venda.id));
        const [itens] = await db.promise().query(
            `SELECT
                iv.id,
                iv.id_venda,
                p.nome,
                p.categoria,
                iv.quantidade,
                iv.quantidade_consumida,
                iv.preco
             FROM itens_venda iv
             INNER JOIN produtos p ON p.id = iv.id_produto
             WHERE iv.id_venda IN (?)
             ORDER BY iv.id ASC`,
            [idsVendas]
        );

        const pedidosPorId = new Map(
            vendas.map((venda) => [
                String(venda.id),
                {
                    id: Number(venda.id),
                    data_venda: venda.data_venda,
                    total: Number(venda.total),
                    pagamento: venda.pagamento,
                    cliente: venda.cliente,
                    telefone_final: venda.telefone_final || "",
                    itens: []
                }
            ])
        );

        for (const item of itens) {
            const pedido = pedidosPorId.get(String(item.id_venda));
            if (!pedido) continue;

            pedido.itens.push({
                id: Number(item.id),
                nome: item.nome,
                categoria: item.categoria,
                quantidade: Number(item.quantidade),
                quantidade_consumida: Number(item.quantidade_consumida || 0),
                preco: Number(item.preco)
            });
        }

        return res.json({
            sucesso: true,
            pedidos: Array.from(pedidosPorId.values())
        });
    }
    catch (erro) {
        console.error("Erro ao consultar pedidos para entrega:", erro);
        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao consultar pedidos."
        });
    }
});

app.post(
    "/funcionario/pedidos/:id/itens/:idItem/consumir",
    exigirStaff,
    async (req, res) => {
        const idVenda = Number(req.params.id);
        const idItem = Number(req.params.idItem);

        if (!idValido(idVenda) || !idValido(idItem)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Pedido ou item inválido."
            });
        }

        let connection;

        try {
            connection = await db.promise().getConnection();
            await connection.beginTransaction();

            const [itens] = await connection.query(
                `SELECT id, quantidade, quantidade_consumida
                 FROM itens_venda
                 WHERE id = ? AND id_venda = ?
                 FOR UPDATE`,
                [idItem, idVenda]
            );

            if (itens.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    sucesso: false,
                    mensagem: "Item não encontrado neste pedido."
                });
            }

            const quantidade = Number(itens[0].quantidade);
            const quantidadeConsumida = Number(itens[0].quantidade_consumida || 0);

            if (quantidadeConsumida >= quantidade) {
                await connection.rollback();
                return res.status(409).json({
                    sucesso: false,
                    completo: true,
                    quantidade,
                    quantidade_consumida: quantidadeConsumida,
                    mensagem: "Todas as unidades deste item já foram entregues."
                });
            }

            const novaQuantidadeConsumida = quantidadeConsumida + 1;
            const completo = novaQuantidadeConsumida >= quantidade;

            const [atualizacao] = await connection.query(
                `UPDATE itens_venda
                 SET quantidade_consumida = ?,
                     consumido = ?
                 WHERE id = ? AND id_venda = ? AND quantidade_consumida = ?`,
                [
                    novaQuantidadeConsumida,
                    completo ? 1 : 0,
                    idItem,
                    idVenda,
                    quantidadeConsumida
                ]
            );

            if (atualizacao.affectedRows !== 1) {
                await connection.rollback();
                return res.status(409).json({
                    sucesso: false,
                    mensagem: "O item já foi marcado como consumido por outro funcionário."
                });
            }

            await connection.commit();

            return res.json({
                sucesso: true,
                completo,
                quantidade,
                quantidade_consumida: novaQuantidadeConsumida,
                mensagem: completo
                    ? "Todas as unidades deste item foram entregues."
                    : `Unidade entregue. Progresso: ${novaQuantidadeConsumida} de ${quantidade}.`
            });
        }
        catch (erro) {
            if (connection) {
                try {
                    await connection.rollback();
                }
                catch (erroRollback) {
                    console.error("Erro ao desfazer marcação de consumo:", erroRollback);
                }
            }

            console.error("Erro ao marcar item como consumido:", erro);
            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao atualizar o consumo do item."
            });
        }
        finally {
            if (connection) connection.release();
        }
    }
);

// ==========================================
// DASHBOARD - ADMIN
// ==========================================

app.get("/dashboard", exigirAdmin, (req, res) => {
    db.query(
        `SELECT
            COUNT(*) AS quantidadeVendas,
            SUM(total) AS totalVendas
         FROM vendas`,
        (erro, resultado) => {
            if (erro) {
                console.error("Erro ao carregar dashboard:", erro);
                return res.status(500).json({
                    sucesso: false,
                    mensagem: "Erro ao carregar dashboard."
                });
            }

            db.query(
                `SELECT SUM(quantidade) AS itensVendidos
                 FROM itens_venda`,
                (erro2, resultado2) => {
                    if (erro2) {
                        console.error("Erro ao carregar itens vendidos:", erro2);
                        return res.status(500).json({
                            sucesso: false,
                            mensagem: "Erro ao carregar dashboard."
                        });
                    }

                    return res.json({
                        totalVendas: resultado[0].totalVendas || 0,
                        quantidadeVendas: resultado[0].quantidadeVendas || 0,
                        itensVendidos: resultado2[0].itensVendidos || 0
                    });
                }
            );
        }
    );
});

// ==========================================
// VALIDAÇÃO DE PRODUTO ADMIN
// ==========================================

function validarProduto(body) {
    const nome = String(body?.nome || "").trim();
    const categoria = String(body?.categoria || "").trim();
    const imagem = String(body?.imagem || "").trim();
    const preco = Number(body?.preco);
    const estoque = Number(body?.estoque);

    if (!textoValido(nome, 1, 100)) {
        return { erro: "Nome do produto inválido." };
    }

    if (!Number.isFinite(preco) || preco < 0 || preco > 100000) {
        return { erro: "Preço inválido." };
    }

    if (!Number.isInteger(estoque) || estoque < 0 || estoque > 1000000) {
        return { erro: "Estoque inválido." };
    }

    if (!textoValido(categoria, 1, 60)) {
        return { erro: "Categoria inválida." };
    }

    if (
        !textoValido(imagem, 1, 200) ||
        imagem.includes("..") ||
        /[<>"']/.test(imagem)
    ) {
        return { erro: "Nome da imagem inválido." };
    }

    return {
        produto: {
            nome,
            preco,
            estoque,
            categoria,
            imagem
        }
    };
}

// ==========================================
// CADASTRAR PRODUTO
// ==========================================

app.post("/produtos", exigirAdmin, (req, res) => {
    const validacao = validarProduto(req.body);

    if (validacao.erro) {
        return res.status(400).json({
            sucesso: false,
            mensagem: validacao.erro
        });
    }

    const { nome, preco, estoque, categoria, imagem } = validacao.produto;

    db.query(
        `INSERT INTO produtos
        (nome, preco, estoque, categoria, imagem)
        VALUES (?, ?, ?, ?, ?)`,
        [nome, preco, estoque, categoria, imagem],
        (erro) => {
            if (erro) {
                console.error("Erro ao cadastrar produto:", erro);
                return res.status(500).json({
                    sucesso: false,
                    mensagem: "Erro ao cadastrar produto."
                });
            }

            return res.json({
                sucesso: true,
                mensagem: "Produto cadastrado com sucesso!"
            });
        }
    );
});

// ==========================================
// EDITAR PRODUTO
// ==========================================

app.put("/produtos/:id", exigirAdmin, (req, res) => {
    if (!idValido(req.params.id)) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Produto inválido."
        });
    }

    const validacao = validarProduto(req.body);

    if (validacao.erro) {
        return res.status(400).json({
            sucesso: false,
            mensagem: validacao.erro
        });
    }

    const { nome, preco, estoque, categoria, imagem } = validacao.produto;

    db.query(
        `UPDATE produtos
         SET nome = ?, preco = ?, estoque = ?, categoria = ?, imagem = ?
         WHERE id = ?`,
        [nome, preco, estoque, categoria, imagem, Number(req.params.id)],
        (erro, resultado) => {
            if (erro) {
                console.error("Erro ao atualizar produto:", erro);
                return res.status(500).json({
                    sucesso: false,
                    mensagem: "Erro ao atualizar produto."
                });
            }

            if (resultado.affectedRows === 0) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: "Produto não encontrado."
                });
            }

            return res.json({
                sucesso: true,
                mensagem: "Produto atualizado com sucesso!"
            });
        }
    );
});

// ==========================================
// EXCLUIR PRODUTO
// ==========================================

app.delete("/produtos/:id", exigirAdmin, (req, res) => {
    if (!idValido(req.params.id)) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Produto inválido."
        });
    }

    db.query(
        `DELETE FROM produtos WHERE id = ?`,
        [Number(req.params.id)],
        (erro, resultado) => {
            if (erro) {
                console.error("Erro ao excluir produto:", erro);
                return res.status(500).json({
                    sucesso: false,
                    mensagem: "Erro ao excluir produto."
                });
            }

            if (resultado.affectedRows === 0) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: "Produto não encontrado."
                });
            }

            return res.json({
                sucesso: true,
                mensagem: "Produto excluído com sucesso!"
            });
        }
    );
});

// ==========================================
// VALIDAR INGRESSO INDIVIDUAL
// Somente funcionário/admin autenticado.
// ==========================================

app.post("/validar-ingresso", exigirStaff, async (req, res) => {
    const codigo = String(req.body?.codigo || "").trim();

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(codigo)) {
        return res.status(400).json({
            sucesso: false,
            status: "invalido",
            mensagem: "Código inválido."
        });
    }

    let connection;

    try {
        connection = await db.promise().getConnection();
        await connection.beginTransaction();

        const [resultado] = await connection.query(
            `SELECT
                ingressos_emitidos.id AS id_ingresso,
                ingressos_emitidos.id_venda,
                ingressos_emitidos.codigo,
                ingressos_emitidos.utilizado,
                ingressos_emitidos.data_utilizacao,
                clientes.nome AS cliente
             FROM ingressos_emitidos
             INNER JOIN clientes
                ON clientes.id = ingressos_emitidos.id_cliente
             WHERE ingressos_emitidos.codigo = ?
             FOR UPDATE`,
            [codigo]
        );

        if (resultado.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                sucesso: false,
                status: "invalido",
                mensagem: "Ingresso inválido."
            });
        }

        const ingresso = resultado[0];

        if (ingresso.utilizado) {
            await connection.rollback();
            return res.status(409).json({
                sucesso: false,
                status: "usado",
                mensagem: "Este ingresso já foi utilizado.",
                venda: {
                    id: ingresso.id_venda,
                    ingresso: ingresso.id_ingresso,
                    cliente: ingresso.cliente,
                    dataValidacao: ingresso.data_utilizacao
                }
            });
        }

        const [atualizacao] = await connection.query(
            `UPDATE ingressos_emitidos
             SET utilizado = 1,
                 data_utilizacao = NOW()
             WHERE id = ?
             AND utilizado = 0`,
            [ingresso.id_ingresso]
        );

        if (atualizacao.affectedRows === 0) {
            await connection.rollback();
            return res.status(409).json({
                sucesso: false,
                status: "usado",
                mensagem: "Este ingresso já foi utilizado."
            });
        }

        await connection.commit();

        return res.json({
            sucesso: true,
            status: "valido",
            mensagem: "Ingresso validado com sucesso!",
            venda: {
                id: ingresso.id_venda,
                ingresso: ingresso.id_ingresso,
                cliente: ingresso.cliente
            }
        });
    }
    catch (erro) {
        console.error("Erro ao validar ingresso:", erro);

        if (connection) {
            try {
                await connection.rollback();
            }
            catch (erroRollback) {
                console.error("Erro no rollback:", erroRollback);
            }
        }

        return res.status(500).json({
            sucesso: false,
            status: "erro",
            mensagem: "Erro ao validar ingresso."
        });
    }
    finally {
        if (connection) connection.release();
    }
});

// ==========================================
// GERAR PDF
// COMPROVANTE + INGRESSOS INDIVIDUAIS
// ==========================================

async function gerarComprovantePDF(
    res,
    venda,
    itens,
    ingressos
) {

    try {

        const doc =
            new PDFDocument({

                size: "A4",

                margin: 50,

                autoFirstPage: true

            });


        res.setHeader(

            "Content-Type",

            "application/pdf"

        );


        res.setHeader(

            "Content-Disposition",

            `attachment; filename=comprovante-${venda.id}.pdf`

        );


        doc.pipe(res);


        // =====================================
        // PÁGINA 1 - COMPROVANTE
        // =====================================

        doc
            .fontSize(25)
            .text(

                "Festa Junina Lolico",

                {
                    align:
                        "center"
                }

            );


        doc.moveDown(0.5);


        doc
            .fontSize(16)
            .text(

                "Comprovante de Compra",

                {
                    align:
                        "center"
                }

            );


        doc.moveDown(2);


        doc
            .fontSize(12)
            .text(
                `Compra: #${venda.id}`
            );


        const data =
            new Date(
                venda.data_venda
            ).toLocaleString(
                "pt-BR"
            );


        doc.text(
            `Data: ${data}`
        );


        doc.moveDown();


        doc.text(
            `Cliente: ${venda.nome}`
        );


        const cpf =
            String(
                venda.cpf
            ).padStart(
                11,
                "0"
            );


        const cpfMascarado =

            `***.${cpf.substring(
                3,
                6
            )}.${cpf.substring(
                6,
                9
            )}-**`;


        doc.text(
            `CPF: ${cpfMascarado}`
        );


        doc.text(
            `Pagamento: ${venda.pagamento}`
        );


        doc.moveDown(2);


        // =====================================
        // ITENS
        // =====================================

        doc
            .fontSize(15)
            .text(
                "Itens da compra"
            );


        doc.moveDown();


        itens.forEach(
            (item) => {

                const subtotal =

                    Number(
                        item.preco
                    ) *

                    Number(
                        item.quantidade
                    );


                doc
                    .fontSize(11)
                    .text(

                        `${item.nome} - ${item.quantidade}x - R$ ${subtotal.toFixed(2)}`

                    );


                doc.moveDown(0.5);

            }
        );


        doc.moveDown();


        doc
            .fontSize(16)
            .text(

                `Total: R$ ${Number(
                    venda.total
                ).toFixed(2)}`,

                {
                    align:
                        "right"
                }

            );


        doc.moveDown(2);


        // =====================================
        // QUANTIDADE DE INGRESSOS
        // =====================================

        if (
            ingressos.length > 0
        ) {

            doc
                .fontSize(12)
                .text(

                    `Ingressos emitidos: ${ingressos.length}`,

                    {
                        align:
                            "center"
                    }

                );


            doc.moveDown();


            doc
                .fontSize(10)
                .text(

                    "Cada ingresso possui um QR Code individual. As páginas seguintes são os ingressos para entrada no evento.",

                    {
                        align:
                            "center"
                    }

                );

        }
        else {

            doc
                .fontSize(11)
                .text(

                    "Esta compra não possui ingressos.",

                    {
                        align:
                            "center"
                    }

                );

        }


        // =====================================
        // UM INGRESSO POR PÁGINA
        // =====================================

        for (
            let i = 0;
            i < ingressos.length;
            i++
        ) {

            const ingresso =
                ingressos[i];


            doc.addPage();


            // =================================
            // TÍTULO
            // =================================

            doc
                .fontSize(26)
                .text(

                    "Festa Junina Lolico",

                    {
                        align:
                            "center"
                    }

                );


            doc.moveDown();


            doc
                .fontSize(20)
                .text(

                    `INGRESSO ${i + 1} DE ${ingressos.length}`,

                    {
                        align:
                            "center"
                    }

                );


            doc.moveDown(1.5);


            doc
                .fontSize(12)
                .text(

                    `Compra #${venda.id}`,

                    {
                        align:
                            "center"
                    }

                );


            doc.text(

                `Cliente: ${venda.nome}`,

                {
                    align:
                        "center"
                }

            );


            doc.moveDown(1.5);


            // =================================
            // QR
            // =================================

            const baseURL =
                process.env.BASE_URL ||
                "http://localhost:3000";


            const urlValidacao =

                `${baseURL}/validar.html?codigo=${encodeURIComponent(
                    ingresso.codigo
                )}`;


            const qrDataURL =
                await QRCode.toDataURL(

                    urlValidacao,

                    {

                        width:
                            400,

                        margin:
                            2

                    }

                );


            const qrBase64 =
                qrDataURL.replace(

                    /^data:image\/png;base64,/,

                    ""

                );


            const qrBuffer =
                Buffer.from(

                    qrBase64,

                    "base64"

                );


            const tamanhoQR =
                220;


            const xQR =

                (
                    doc.page.width -
                    tamanhoQR
                ) / 2;


            doc.image(

                qrBuffer,

                xQR,

                doc.y,

                {

                    width:
                        tamanhoQR

                }

            );


            doc.y +=
                tamanhoQR + 20;


            // =================================
            // CÓDIGO MANUAL
            // =================================

            doc
                .fontSize(10)
                .text(

                    "Código do ingresso:",

                    {
                        align:
                            "center"
                    }

                );


            doc.moveDown(0.3);


            doc
                .fontSize(8)
                .text(

                    ingresso.codigo,

                    {
                        align:
                            "center"
                    }

                );


            doc.moveDown(1.5);


            doc
                .fontSize(12)
                .text(

                    "Apresente este QR Code na entrada do evento.",

                    {
                        align:
                            "center"
                    }

                );


            doc.moveDown();


            doc
                .fontSize(10)
                .text(

                    "Este ingresso é individual e só pode ser utilizado uma vez.",

                    {
                        align:
                            "center"
                    }

                );


            if (
                ingresso.utilizado
            ) {

                doc.moveDown(2);


                doc
                    .fontSize(16)
                    .text(

                        "INGRESSO JÁ UTILIZADO",

                        {
                            align:
                                "center"
                        }

                    );

            }

        }


        doc.end();

    }
    catch (erro) {

        console.error(
            "Erro ao gerar PDF:",
            erro
        );


        if (
            !res.headersSent
        ) {

            res.status(500).json({

                mensagem:
                    "Erro ao gerar comprovante."

            });

        }

    }

}

// ==========================================
// SERVIDOR
// ==========================================

const PORT = process.env.PORT || 3000;

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "Servidor rodando:"
        );

        console.log(
            "http://localhost:3000"
        );

        console.log(
            "http://192.168.1.12:3000"
        );

    }
);