// ======================================================
// SEGURANÇA DA ÁREA ADMIN
// A autorização real vem da sessão do servidor.
// ======================================================

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function urlImagemAdmin(valor) {
    const imagem = String(valor ?? "").trim();

    if (imagem.startsWith("/produto-imagens/")) {
        return escaparHTML(imagem);
    }

    // Compatibilidade com imagens antigas em public/imagens.
    return "imagens/" + escaparHTML(imagem);
}

async function verificarSessaoAdmin() {
    try {
        const resposta = await fetch("/sessao/admin");

        if (!resposta.ok) {
            window.location.replace("login.html");
            return false;
        }

        const dados = await resposta.json();
        const nome = dados.usuario?.nome || "Administrador";

        localStorage.setItem("usuario", "admin");
        localStorage.setItem("nome", nome);

        const bemVindo = document.getElementById("bem-vindo");

        if (bemVindo) {
            bemVindo.innerText = `Bem-vindo, ${nome}!`;
        }

        return true;
    }
    catch (erro) {
        console.error("Erro ao verificar sessão:", erro);
        window.location.replace("login.html");
        return false;
    }
}

verificarSessaoAdmin();


// ======================================================
// CONTROLE DAS TELAS
// ======================================================

function esconderTelas() {

    document.getElementById("lista-produtos").style.display =
        "none";

    document.getElementById("dashboard-admin").style.display =
        "none";

    document.getElementById("historico-vendas").style.display =
        "none";

    document.getElementById("editar-produto").style.display =
        "none";

}

function marcarBotaoAtivo(idBotao) {

    document
        .querySelectorAll(".menu button")
        .forEach(botao => {

            botao.classList.remove("ativo");

        });


    const botaoAtivo =
        document.getElementById(idBotao);


    if (botaoAtivo) {

        botaoAtivo.classList.add("ativo");

    }

}
// ======================================================
// DASHBOARD
// ======================================================

async function carregarDashboard() {

    try {

        const resposta =
            await fetch("/dashboard");

        if (!resposta.ok) {

            throw new Error(
                "Erro ao buscar dashboard"
            );

        }

        const dados =
            await resposta.json();


        document.getElementById(
            "dash-faturamento"
        ).innerText =
            `R$ ${Number(
                dados.totalVendas
            ).toFixed(2)}`;


        document.getElementById(
            "dash-vendas"
        ).innerText =
            dados.quantidadeVendas;


        document.getElementById(
            "dash-itens"
        ).innerText =
            dados.itensVendidos;


    } catch (erro) {

        console.error(erro);

    }

}


document.getElementById(
    "btn-dashboard"
).onclick = () => {

    esconderTelas();
    marcarBotaoAtivo("btn-dashboard");

    document.getElementById(
        "dashboard-admin"
    ).style.display = "block";

    carregarDashboard();

};


// ======================================================
// PRODUTOS
// ======================================================

document.getElementById(
    "btn-produtos"
).onclick = async () => {

    esconderTelas();
    marcarBotaoAtivo("btn-produtos");

    const lista =
        document.getElementById(
            "lista-produtos"
        );

    lista.style.display = "block";

    lista.innerHTML =
        "<p>Carregando produtos...</p>";


    try {

        const resposta =
            await fetch("/produtos");


        if (!resposta.ok) {

            throw new Error(
                "Erro ao buscar produtos"
            );

        }


        const produtos =
            await resposta.json();


        if (produtos.length === 0) {

            lista.innerHTML =
                "<p>Nenhum produto cadastrado.</p>";

            return;

        }


        lista.innerHTML = "";


        produtos.forEach(produto => {

            lista.innerHTML += `

                <div class="produto-admin">

                    <img
                        src="${urlImagemAdmin(produto.imagem)}"
                        width="100"
                    >

                    <div>

                        <h2>
                            ${escaparHTML(produto.nome)}
                        </h2>

                        <p>
                            Categoria:
                            ${escaparHTML(produto.categoria)}
                        </p>

                        <p>
                            Preço:
                            R$
                            ${Number(
                                produto.preco
                            ).toFixed(2)}
                        </p>

                        <p>
                            Estoque:
                            ${produto.estoque}
                        </p>


                        <button
                            onclick="
                                editarProduto(
                                    ${produto.id}
                                )
                            "
                        >
                            ✏️ Editar
                        </button>


                        <button
                            onclick="
                                excluirProduto(
                                    ${produto.id}
                                )
                            "
                        >
                            🗑️ Excluir
                        </button>

                    </div>

                </div>

            `;

        });


    } catch (erro) {

        console.error(erro);

        lista.innerHTML =
            "<p>Erro ao carregar produtos.</p>";

    }

};


// ======================================================
// EDITAR PRODUTO
// ======================================================

async function editarProduto(id) {

    try {

        const resposta =
            await fetch("/produtos");


        const produtos =
            await resposta.json();


        const produto =
            produtos.find(
                item => item.id === id
            );


        if (!produto) {

            alert(
                "Produto não encontrado."
            );

            return;

        }


        esconderTelas();


        document.getElementById(
            "editar-produto"
        ).style.display = "block";


        document.getElementById(
            "editar-id"
        ).value =
            produto.id;


        document.getElementById(
            "editar-nome"
        ).value =
            produto.nome;


        document.getElementById(
            "editar-preco"
        ).value =
            produto.preco;


        document.getElementById(
            "editar-estoque"
        ).value =
            produto.estoque;


        document.getElementById(
            "editar-categoria"
        ).value =
            produto.categoria;


        document.getElementById(
            "editar-imagem"
        ).value =
            produto.imagem;


    } catch (erro) {

        console.error(erro);

        alert(
            "Erro ao carregar produto."
        );

    }

}


async function salvarEdicao() {

    const id =
        document.getElementById(
            "editar-id"
        ).value;


    const nome =
        document.getElementById(
            "editar-nome"
        ).value.trim();


    const preco =
        parseFloat(
            document.getElementById(
                "editar-preco"
            ).value
        );


    const estoque =
        parseInt(
            document.getElementById(
                "editar-estoque"
            ).value
        );


    const categoria =
        document.getElementById(
            "editar-categoria"
        ).value.trim();


    const imagem =
        document.getElementById(
            "editar-imagem"
        ).value.trim();


    if (
        !nome ||
        !categoria ||
        !imagem ||
        isNaN(preco) ||
        isNaN(estoque)
    ) {

        alert(
            "Preencha todos os campos."
        );

        return;

    }


    try {

        const resposta =
            await fetch(
                `/produtos/${id}`,
                {

                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        nome,
                        preco,
                        estoque,
                        categoria,
                        imagem

                    })

                }
            );


        const dados =
            await resposta.json();


        alert(dados.mensagem);


        if (dados.sucesso) {

            document.getElementById(
                "btn-produtos"
            ).click();

        }


    } catch (erro) {

        console.error(erro);

        alert(
            "Erro ao atualizar produto."
        );

    }

}


function cancelarEdicao() {

    esconderTelas();

}


// ======================================================
// EXCLUIR PRODUTO
// ======================================================

async function excluirProduto(id) {

    const confirmar =
        confirm(
            "Remover este produto do catálogo? Ele ficará oculto na loja, mas as vendas antigas serão preservadas."
        );


    if (!confirmar) {
        return;
    }


    try {

        const resposta =
            await fetch(
                `/produtos/${id}`,
                {
                    method: "DELETE"
                }
            );


        const dados =
            await resposta.json();


        alert(dados.mensagem);


        if (dados.sucesso) {

            document.getElementById(
                "btn-produtos"
            ).click();

        }


    } catch (erro) {

        console.error(erro);

        alert(
            "Erro ao excluir produto."
        );

    }

}


// ======================================================
// CONTROLE DE ESTOQUE
// ======================================================

document.getElementById(
    "btn-estoque"
).onclick = async () => {

    esconderTelas();
    marcarBotaoAtivo("btn-estoque");

    const lista =
        document.getElementById(
            "lista-produtos"
        );


    lista.style.display = "block";


    lista.innerHTML =
        "<p>Carregando estoque...</p>";


    try {

        const resposta =
            await fetch("/produtos");


        if (!resposta.ok) {

            throw new Error(
                "Erro ao buscar produtos"
            );

        }


        const produtos =
            await resposta.json();


        lista.innerHTML = `
            <h2>📈 Controle de Estoque</h2>
        `;


        produtos.forEach(produto => {

            lista.innerHTML += `

                <div class="produto-admin">

                    <img
                        src="${urlImagemAdmin(produto.imagem)}"
                        width="80"
                    >

                    <div>

                        <h2>
                            ${escaparHTML(produto.nome)}
                        </h2>

                        <p>
                            Categoria:
                            ${escaparHTML(produto.categoria)}
                        </p>

                        <p>
                            Estoque atual:

                            <strong
                                id="estoque-${produto.id}"
                            >
                                ${produto.estoque}
                            </strong>

                        </p>


                        <button
                            onclick="
                                alterarEstoque(
                                    ${produto.id},
                                    -1
                                )
                            "
                        >
                            −
                        </button>


                        <button
                            onclick="
                                alterarEstoque(
                                    ${produto.id},
                                    1
                                )
                            "
                        >
                            +
                        </button>

                    </div>

                </div>

            `;

        });


    } catch (erro) {

        console.error(erro);

        lista.innerHTML =
            "<p>Erro ao carregar estoque.</p>";

    }

};


async function alterarEstoque(
    id,
    quantidade
) {

    try {

        const resposta =
            await fetch("/produtos");


        const produtos =
            await resposta.json();


        const produto =
            produtos.find(
                item => item.id === id
            );


        if (!produto) {

            alert(
                "Produto não encontrado."
            );

            return;

        }


        const novoEstoque =
            Number(produto.estoque)
            + quantidade;


        if (novoEstoque < 0) {
            return;
        }


        const atualizar =
            await fetch(
                `/produtos/${id}`,
                {

                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        nome: produto.nome,
                        preco: produto.preco,
                        estoque: novoEstoque,
                        categoria: produto.categoria,
                        imagem: produto.imagem

                    })

                }
            );


        const dados =
            await atualizar.json();


        if (!dados.sucesso) {

            alert(dados.mensagem);

            return;

        }


        const campo =
            document.getElementById(
                `estoque-${id}`
            );


        if (campo) {

            campo.innerText =
                novoEstoque;

        }


    } catch (erro) {

        console.error(erro);

        alert(
            "Erro ao alterar estoque."
        );

    }

}


// ======================================================
// HISTÓRICO DE VENDAS
// ======================================================

document.getElementById(
    "btn-vendas"
).onclick = async () => {

    esconderTelas();
    marcarBotaoAtivo("btn-vendas");


    const tela =
        document.getElementById(
            "historico-vendas"
        );


    const lista =
        document.getElementById(
            "lista-vendas"
        );


    tela.style.display =
        "block";


    lista.innerHTML =
        "<p>Carregando vendas...</p>";


    try {

        const resposta =
            await fetch("/vendas");


        if (!resposta.ok) {

            throw new Error(
                "Erro ao buscar vendas"
            );

        }


        const vendas =
            await resposta.json();


        if (vendas.length === 0) {

            lista.innerHTML =
                "<p>Nenhuma venda registrada.</p>";

            return;

        }


        lista.innerHTML = "";


        vendas.forEach(venda => {

            lista.innerHTML += `

                <div class="venda-admin">

                    <h3>
                        Venda #${venda.id}
                    </h3>

                    <p>
                        Pagamento:
                        ${escaparHTML(venda.pagamento)}
                    </p>

                    <p>
                        Total:
                        R$
                        ${Number(
                            venda.total
                        ).toFixed(2)}
                    </p>

                    <p>
                        Data:
                        ${
                            venda.data_venda
                                ? new Date(
                                    venda.data_venda
                                ).toLocaleString(
                                    "pt-BR"
                                )
                                : "Não informada"
                        }
                    </p>


                    <button
                        onclick="
                            verItensVenda(
                                ${venda.id}
                            )
                        "
                    >
                        🔎 Ver itens
                    </button>


                    <div
                        id="itens-venda-${venda.id}"
                    ></div>

                </div>

            `;

        });


    } catch (erro) {

        console.error(erro);

        lista.innerHTML =
            "<p>Erro ao carregar histórico.</p>";

    }

};


async function verItensVenda(id) {

    const div =
        document.getElementById(
            `itens-venda-${id}`
        );


    if (!div) return;


    div.innerHTML =
        "<p>Carregando itens...</p>";


    try {

        const resposta =
            await fetch(
                `/vendas/${id}`
            );


        const itens =
            await resposta.json();


        if (itens.length === 0) {

            div.innerHTML =
                "<p>Nenhum item encontrado.</p>";

            return;

        }


        div.innerHTML = `

            <div class="itens-venda">

                ${itens.map(item => `

                    <p>

                        ${escaparHTML(item.nome)}

                        —

                        ${item.quantidade}x

                        —

                        R$
                        ${Number(
                            item.preco
                        ).toFixed(2)}

                    </p>

                `).join("")}

            </div>

        `;


    } catch (erro) {

        console.error(erro);

        div.innerHTML =
            "<p>Erro ao carregar itens.</p>";

    }

}


// ======================================================
// ADICIONAR PRODUTO
// ======================================================

document.getElementById(
    "btn-adicionar"
).onclick = () => {

    window.location.href =
        "adicionar-produto.html";

};


// ======================================================
// SAIR
// ======================================================

document.getElementById(
    "btn-sair"
).onclick = async () => {

    try {
        await fetch("/logout", {
            method: "POST"
        });
    }
    catch (erro) {
        console.error(
            "Erro ao encerrar sessão:",
            erro
        );
    }
    finally {
        localStorage.clear();

        window.location.replace(
            "login.html"
        );
    }

};