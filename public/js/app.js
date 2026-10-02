// ======================================================
// SESSÃO DO CLIENTE
// localStorage fica apenas para exibição.
// A autorização real é feita pelo servidor.
// ======================================================

let clienteLogado = null;

async function verificarSessaoCliente() {
    try {
        const resposta = await fetch("/sessao/cliente");

        if (!resposta.ok) {
            window.location.replace("login.html");
            return false;
        }

        const dados = await resposta.json();
        clienteLogado = dados.cliente;

        localStorage.setItem("usuario", "cliente");
        localStorage.setItem("nome", clienteLogado.nome);

        // Mantido só para compatibilidade visual.
        // O backend não confia neste ID.
        localStorage.setItem("clienteId", clienteLogado.id);

        const texto = document.getElementById("usuario-logado");

        if (texto) {
            texto.innerText = `Usuário: ${clienteLogado.nome}`;
        }

        return true;
    }
    catch (erro) {
        console.error("Erro ao verificar sessão:", erro);
        window.location.replace("login.html");
        return false;
    }
}

async function logout() {
    try {
        await fetch("/logout", {
            method: "POST"
        });
    }
    catch (erro) {
        console.error("Erro ao sair:", erro);
    }
    finally {
        localStorage.clear();
        window.location.replace("login.html");
    }
}

function atualizarTudo() {
    atualizarCarrinho();
    atualizarDashboard();
    atualizarTotal();
    renderizarProdutos(itens);
}

document.addEventListener(
    "DOMContentLoaded",
    async () => {
        const sessaoOk =
            await verificarSessaoCliente();

        if (!sessaoOk) return;

        carregarProdutos();
    }
);
