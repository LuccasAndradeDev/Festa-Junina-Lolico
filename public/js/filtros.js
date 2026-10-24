function normalizarCategoria(valor) {
    const categoria = String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

    if (["todos", "todas", "todas categorias"].includes(categoria)) return "todos";
    if (["ingresso", "ingressos"].includes(categoria)) return "ingressos";
    if (["bebida", "bebidas"].includes(categoria)) return "bebidas";
    if (["comida", "comidas", "alimento", "alimentos", "lanche", "lanches"].includes(categoria)) return "comidas";
    if (["jogo", "jogos", "brincadeira", "brincadeiras"].includes(categoria)) return "jogos";

    return categoria;
}

function aplicarFiltros() {
    const campoPesquisa = document.getElementById("pesquisa");
    const seletorCategoria = document.getElementById("categoria");
    const pesquisa = campoPesquisa ? campoPesquisa.value.trim().toLowerCase() : "";
    const categoriaSelecionada = seletorCategoria
        ? normalizarCategoria(seletorCategoria.value)
        : "todos";

    const filtrados = itens.filter((item) => {
        const nome = String(item.nome ?? "").toLowerCase();
        const nomeOk = nome.includes(pesquisa);
        const categoriaOk =
            categoriaSelecionada === "todos" ||
            normalizarCategoria(item.categoria) === categoriaSelecionada;

        return nomeOk && categoriaOk;
    });

    const bannerIngresso = document.querySelector(".banner-ingresso");
    if (bannerIngresso) {
        bannerIngresso.style.display =
            categoriaSelecionada === "todos" || categoriaSelecionada === "ingressos"
                ? ""
                : "none";
    }

    if (typeof renderizarProdutos === "function") {
        renderizarProdutos(filtrados);
    }
}

const campoPesquisa = document.getElementById("pesquisa");
if (campoPesquisa) {
    campoPesquisa.addEventListener("input", aplicarFiltros);
}

const seletorCategoria = document.getElementById("categoria");
if (seletorCategoria) {
    seletorCategoria.addEventListener("change", aplicarFiltros);
}
