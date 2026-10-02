function escaparHTMLCarrinho(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

let carrinho = {};

function aumentar(index) {

    console.log("Clique no +", index);

    if (carrinho[index] < itens[index].estoque) {

        carrinho[index]++;

        renderizarProdutos(itens);

        atualizarTudo();

    }

}

function diminuir(index) {

    if (carrinho[index] > 0) {

        carrinho[index]--;

        renderizarProdutos(itens);

        atualizarTudo();

    }

}

function atualizarCarrinho() {

    const lista =
        document.getElementById("lista-carrinho");

    const totalCarrinho =
        document.getElementById("total-carrinho");

    lista.innerHTML = "";

    let vazio = true;
    let total = 0;

    itens.forEach((item, index) => {

        if (carrinho[index] > 0) {

            vazio = false;

            const subtotal =
                item.preco * carrinho[index];

            total += subtotal;

            lista.innerHTML += `
                <p>
                    ${escaparHTMLCarrinho(item.nome)}
                    x${carrinho[index]}
                    = R$ ${subtotal.toFixed(2)}
                </p>
            `;

        }

    });

    if (vazio) {

        lista.innerHTML =
            "<p>Nenhum item adicionado.</p>";

    }

    totalCarrinho.innerText =
        total.toFixed(2);

}

function atualizarTotal() {

    let total = 0;

    itens.forEach((item, index) => {

        total +=
            item.preco * carrinho[index];

    });

    document.getElementById("total")
        .innerText =
        total.toFixed(2);

}


// ==========================================
// NOTIFICAÇÕES
// ==========================================

function mostrarNotificacao(tipo, titulo, mensagem) {

    const notificacao =
        document.getElementById("notificacao");

    const icone =
        document.getElementById("notificacao-icone");

    const tituloElemento =
        document.getElementById("notificacao-titulo");

    const mensagemElemento =
        document.getElementById("notificacao-mensagem");

    notificacao.className =
        `notificacao ${tipo} mostrar`;

    if (tipo === "sucesso") {

        icone.innerText = "✅";

    }
    else if (tipo === "erro") {

        icone.innerText = "❌";

    }
    else {

        icone.innerText = "⚠️";

    }

    tituloElemento.innerText =
        titulo;

    mensagemElemento.innerText =
        mensagem;

    setTimeout(() => {

        notificacao.classList.remove("mostrar");

    }, 4000);

}


// ==========================================
// FINALIZAR COMPRA
// ==========================================

async function comprar() {

    const pagamento =
        document.getElementById("pagamento").value;

    let total = 0;

    const itensVenda = [];

    itens.forEach((item, index) => {

        if (carrinho[index] > 0) {

            const subtotal =
                item.preco * carrinho[index];

            total += subtotal;

            itensVenda.push({

                id_produto: item.id,

                quantidade: carrinho[index],

                preco: item.preco

            });

        }

    });

    if (total === 0) {

        mostrarNotificacao(
            "aviso",
            "Carrinho vazio",
            "Adicione pelo menos um item antes de finalizar a compra."
        );

        return;

    }

    try {

        const resposta =
            await fetch("/vendas", {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    pagamento,

                    itens: itensVenda

                })

            });

        const dados =
            await resposta.json();

        if (!resposta.ok) {

            mostrarNotificacao(
                "erro",
                "Não foi possível concluir",
                dados.mensagem ||
                dados.erro ||
                "Ocorreu um erro ao registrar sua compra."
            );

            return;

        }

        mostrarNotificacao(
            "sucesso",
            "Compra realizada!",
            dados.mensagem ||
            "Sua compra foi registrada com sucesso."
        );

    }
    catch (erro) {

        console.error(erro);

        mostrarNotificacao(
            "erro",
            "Não foi possível concluir",
            "Ocorreu um erro ao registrar sua compra. Tente novamente."
        );

        return;

    }

    // Limpa o carrinho depois da compra

    itens.forEach((_, index) => {

        carrinho[index] = 0;

    });

    renderizarProdutos(itens);

    atualizarTudo();

}


// ==========================================
// MINHAS COMPRAS
// ==========================================

async function carregarMinhasCompras() {

    const lista =
        document.getElementById(
            "lista-minhas-compras"
        );

    if (lista.style.display === "block") {
        lista.style.display = "none";
        lista.innerHTML = "";
        return;
    }

    try {

        const resposta =
            await fetch(
                "/minhas-compras"
            );

        const compras =
            await resposta.json();

        if (!resposta.ok) {

            mostrarNotificacao(
                "erro",
                "Erro",
                compras.mensagem ||
                "Não foi possível buscar suas compras."
            );

            return;

        }

        lista.style.display = "block";

        lista.innerHTML = "";

        if (compras.length === 0) {

            lista.innerHTML = `
                <p class="sem-compras">
                    Você ainda não realizou nenhuma compra.
                </p>
            `;

            return;

        }

        compras.forEach(compra => {

            const data =
                new Date(
                    compra.data_venda
                ).toLocaleString("pt-BR");

            lista.innerHTML += `

                <div class="compra-cliente">

                    <div>

                        <h3>
                            Compra #${compra.id}
                        </h3>

                        <p>
                            📅 ${data}
                        </p>

                        <p>
                            💳 ${escaparHTMLCarrinho(compra.pagamento)}
                        </p>

                        <strong>
                            R$ ${Number(
                                compra.total
                            ).toFixed(2)}
                        </strong>

                    </div>

                    <button
                        type="button"
                        onclick="verDetalhesCompra(${compra.id})"
                    >
                        Ver detalhes
                    </button>
<button
    type="button"
    onclick="baixarComprovante(${compra.id})"
>
    📄 Baixar comprovante
</button>
                    <div
                        id="detalhes-compra-${compra.id}"
                        class="detalhes-compra"
                    ></div>

                </div>

            `;

        });

    }
    catch (erro) {

        console.error(erro);

        mostrarNotificacao(
            "erro",
            "Erro de conexão",
            "Não foi possível carregar suas compras."
        );

    }

}


// ==========================================
// DETALHES DA COMPRA
// ==========================================

async function verDetalhesCompra(idVenda) {

    const caixa =
        document.getElementById(
            `detalhes-compra-${idVenda}`
        );

    if (caixa.innerHTML !== "") {

        caixa.innerHTML = "";

        return;

    }

    try {

        const resposta =
            await fetch(
                `/vendas/${idVenda}`
            );

        const itensCompra =
            await resposta.json();

        if (!resposta.ok) {

            caixa.innerHTML =
                "<p>Erro ao carregar detalhes.</p>";

            return;

        }

        caixa.innerHTML =
            "<h4>Itens da compra:</h4>";

        itensCompra.forEach(item => {

            const subtotal =
                Number(item.preco) *
                Number(item.quantidade);

            caixa.innerHTML += `

                <p>
                    ${escaparHTMLCarrinho(item.nome)}
                    × ${item.quantidade}
                    — R$ ${subtotal.toFixed(2)}
                </p>

            `;

        });

    }
    catch (erro) {

        console.error(erro);

        caixa.innerHTML =
            "<p>Erro ao carregar detalhes.</p>";

    }

}
function baixarComprovante(idVenda) {

    window.open(
        `/vendas/${idVenda}/comprovante`,
        "_blank"
    );

}