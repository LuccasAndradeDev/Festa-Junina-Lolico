async function buscarProdutos() {

    try {

        const resposta = await fetch("/produtos");

        if (!resposta.ok) {

            throw new Error("Erro ao buscar produtos");

        }

        return await resposta.json();

    }
    catch (erro) {

        console.error(erro);

        return [];

    }

}