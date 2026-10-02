async function salvarProduto() {

    const nome = document.getElementById("nome").value.trim();

    const preco = parseFloat(
        document.getElementById("preco").value
    );

    const estoque = parseInt(
        document.getElementById("estoque").value
    );

    const categoria = document.getElementById("categoria").value.trim();

    const imagem = document.getElementById("imagem").value.trim();

    if (!nome || !categoria || !imagem || isNaN(preco) || isNaN(estoque)) {

        alert("Preencha todos os campos.");

        return;

    }

    try {

        const resposta = await fetch("/produtos", {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                nome,
                preco,
                estoque,
                categoria,
                imagem

            })

        });

        const dados = await resposta.json();

        alert(dados.mensagem);

        if (dados.sucesso) {

            window.location.href = "admin.html";

        }

    } catch (erro) {

        console.error(erro);

        alert("Erro ao salvar produto.");

    }

}