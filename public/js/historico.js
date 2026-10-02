async function carregarVendas() {

    const resposta = await fetch("/vendas");

    const vendas = await resposta.json();

    const lista =
    document.getElementById("lista-vendas");

    lista.innerHTML = "";

    vendas.forEach(venda => {

        lista.innerHTML += `

<div class="card">

    <h2>

        Venda #${venda.id}

    </h2>

    <p>

        💳 ${venda.pagamento}

    </p>

    <p>

        💰 R$ ${Number(venda.total).toFixed(2)}

    </p>

    <p>

        📅 ${new Date(venda.data_venda)
        .toLocaleString("pt-BR")}

    </p>

    <button
        onclick="verItens(${venda.id})">

        👁 Ver Itens

    </button>

    <div
        id="itens-${venda.id}"
        class="itens-venda">

    </div>

</div>
        
`;
  }
    )}

carregarVendas();

async function verItens(idVenda) {

async function verItens(idVenda) {

    console.log("ID da venda:", idVenda);

    const resposta = await fetch(`/vendas/${idVenda}`);

    const itens = await resposta.json();

    console.log("Itens recebidos:", itens);

    // resto da função...
}

    const resposta =
    await fetch(`/vendas/${idVenda}`);

    const itens =
    await resposta.json();

    const div =
    document.getElementById(
        `itens-${idVenda}`
    );

    div.innerHTML = "";

    itens.forEach(item => {

        div.innerHTML += `

        <p>

            ${item.nome}

            x${item.quantidade}

            - R$ ${Number(item.preco).toFixed(2)}

        </p>

        `;

    });

}