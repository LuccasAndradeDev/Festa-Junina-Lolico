function escaparHTMLProduto(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

let itens = [];

function ehIngresso(item) {
    const categoria = String(item?.categoria || "")
        .trim()
        .toLowerCase();

    return categoria === "ingresso" || categoria === "ingressos";
}


const produtosDiv =
document.getElementById("produtos");

async function carregarProdutos() {

    itens = await buscarProdutos();

    carrinho = {};

    itens.forEach((_, index) => {

        carrinho[index] = 0;

    });

    const ingresso = itens.find(ehIngresso);

    if (ingresso) {

        renderizarIngresso(ingresso);

    }

    renderizarProdutos(itens);

}

function renderizarIngresso(item) {

    const index = itens.indexOf(item);
    const estoqueRestante = Number(item.estoque) - Number(carrinho[index] || 0);

    const botao = document.getElementById("btn-comprar-ingresso") ||
                  document.getElementById("comprar-ingresso");

    if (botao) {
        botao.disabled = estoqueRestante <= 0;
        botao.textContent = estoqueRestante <= 0
            ? "Ingresso esgotado"
            : "Comprar Ingresso";
    }

    const quantidade = document.getElementById("qtd-ingresso");
    if (quantidade) {
        quantidade.textContent = carrinho[index] || 0;
    }

}

function comprarIngresso() {

    const index = itens.findIndex(ehIngresso);

    if (index === -1) return;

    if (
        (carrinho[index] || 0) <
        Number(itens[index].estoque || 0)
    ) {

        carrinho[index] =
            (carrinho[index] || 0) + 1;

    }

    const botao =
        document.getElementById("btn-comprar-ingresso") ||
        document.getElementById("comprar-ingresso");

    const contador =
        document.getElementById("contador-ingresso");

    const quantidade =
        document.getElementById("qtd-ingresso");

    if (botao) {
        botao.style.display = "none";
    }

    if (contador) {
        contador.style.display = "flex";
    }

    if (quantidade) {
        quantidade.textContent =
            carrinho[index] || 0;
    }

    atualizarTudo();
}

function aumentarIngresso() {

    const index = itens.findIndex(ehIngresso);

    if (index === -1) return;

    if (
        (carrinho[index] || 0) <
        Number(itens[index].estoque || 0)
    ) {

        carrinho[index] =
            (carrinho[index] || 0) + 1;

    }

    const quantidade =
        document.getElementById("qtd-ingresso");

    if (quantidade) {
        quantidade.textContent =
            carrinho[index] || 0;
    }

    atualizarTudo();
}

function diminuirIngresso() {

    const index = itens.findIndex(ehIngresso);

    if (index === -1) return;

    if ((carrinho[index] || 0) > 0) {
        carrinho[index]--;
    }

    const botao =
        document.getElementById("btn-comprar-ingresso") ||
        document.getElementById("comprar-ingresso");

    const contador =
        document.getElementById("contador-ingresso");

    const quantidade =
        document.getElementById("qtd-ingresso");

    if (quantidade) {
        quantidade.textContent =
            carrinho[index] || 0;
    }

    if ((carrinho[index] || 0) === 0) {

        if (contador) {
            contador.style.display = "none";
        }

        if (botao) {
            botao.style.display = "inline-block";
        }
    }

    atualizarTudo();
}

function renderizarProdutos(lista) {

    produtosDiv.innerHTML = "";

    lista.forEach((item) => {


        
        if (ehIngresso(item)) {
            return;
        }
        const index = itens.indexOf(item);

        const estoqueRestante =
        item.estoque - carrinho[index];

        produtosDiv.innerHTML += `

        <section class="card">

            <img
                src="imagens/${escaparHTMLProduto(item.imagem)}"
                class="produto-img"
            >

            <h2>${escaparHTMLProduto(item.nome)}</h2>

            <p>
                R$ ${Number(item.preco).toFixed(2)}
            </p>

            <p class="${
    estoqueRestante <= 0
    ? "❌ ESGOTADO"
    : "✅ Disponível"
}">

                ${
    estoqueRestante <= 0
    ? "❌ ESGOTADO"
    : "✅ Disponível"
}

            </p>

            <div class="contador">

                <button
                onclick="diminuir(${index})">
                -
                </button>

                <span id="qtd${index}">
                ${carrinho[index]}
                </span>

                <button
                onclick="aumentar(${index})"
                ${
                    estoqueRestante <= 0
                    ? "disabled"
                    : ""
                }>
                +
                </button>

            </div>

        </section>

        `;

    });
}