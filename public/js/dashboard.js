function atualizarDashboard() {

    let totalItens = 0;

    itens.forEach((_, index) => {

        totalItens += carrinho[index];

    });

    document.getElementById("total-itens").innerText = totalItens;

}

async function carregarDashboard(){

    const resposta = await fetch("/dashboard");

    const dados = await resposta.json();

    document.getElementById("dash-total").innerText =
    "R$ " + Number(dados.totalVendas).toFixed(2);

    document.getElementById("dash-vendas").innerText =
    dados.quantidadeVendas;

    document.getElementById("dash-itens").innerText =
    dados.itensVendidos;

}

carregarDashboard();
