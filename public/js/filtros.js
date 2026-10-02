function aplicarFiltros() {

    const pesquisa =
        document
        .getElementById("pesquisa")
        .value
        .toLowerCase();

    const categoria =
        document
        .getElementById("categoria")
        .value;

    let filtrados =
        itens.filter(item => {

            const nomeOk =
                item.nome
                .toLowerCase()
                .includes(pesquisa);

            const categoriaOk =
                categoria === "Todos" ||
                item.categoria === categoria;

            return nomeOk && categoriaOk;

        });

    renderizarProdutos(filtrados);

}

document
.getElementById("pesquisa")
.addEventListener(
    "input",
    aplicarFiltros
);

document
.getElementById("categoria")
.addEventListener(
    "change",
    aplicarFiltros
);