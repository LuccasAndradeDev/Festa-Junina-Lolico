require("dotenv").config();

const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

async function executar() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [usuarios] = await db.query(
            `SELECT id, email, senha, tipo
             FROM usuarios`
        );

        let migrados = 0;
        let jaProtegidos = 0;

        for (const usuario of usuarios) {
            const senhaAtual = String(usuario.senha || "");

            if (/^\$2[aby]\$\d{2}\$/.test(senhaAtual)) {
                jaProtegidos++;
                continue;
            }

            if (!senhaAtual) {
                console.warn(
                    `Usuário ${usuario.email} está sem senha. Pulando.`
                );
                continue;
            }

            const hash = await bcrypt.hash(senhaAtual, 10);

            await db.query(
                `UPDATE usuarios
                 SET senha = ?
                 WHERE id = ?`,
                [hash, usuario.id]
            );

            migrados++;
            console.log(
                `Senha protegida: ${usuario.email} (${usuario.tipo})`
            );
        }

        console.log("---------------------------------");
        console.log(`Migrados: ${migrados}`);
        console.log(`Já protegidos: ${jaProtegidos}`);
        console.log("Migração concluída.");
    }
    finally {
        await db.end();
    }
}

executar().catch((erro) => {
    console.error("Erro na migração de senhas:", erro);
    process.exit(1);
});
