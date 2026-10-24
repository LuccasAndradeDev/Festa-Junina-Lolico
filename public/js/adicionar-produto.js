const campoImagem = document.getElementById("imagem");
const imagemPreview = document.getElementById("imagem-preview");
const btnSalvarProduto = document.getElementById("btn-salvar-produto");

function lerArquivoComoDataURL(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(String(leitor.result || ""));
        leitor.onerror = () => reject(new Error("Não foi possível ler a imagem."));
        leitor.readAsDataURL(arquivo);
    });
}

if (campoImagem) {
    campoImagem.addEventListener("change", () => {
        const arquivo = campoImagem.files?.[0];

        if (imagemPreview) {
            imagemPreview.removeAttribute("src");
            imagemPreview.style.display = "none";
        }

        if (!arquivo) return;

        const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
        if (!tiposPermitidos.includes(arquivo.type)) {
            alert("Selecione uma imagem JPEG, PNG ou WebP.");
            campoImagem.value = "";
            return;
        }

        if (arquivo.size > 2 * 1024 * 1024) {
            alert("A imagem deve ter no máximo 2 MiB.");
            campoImagem.value = "";
            return;
        }

        if (imagemPreview) {
            const urlTemporaria = URL.createObjectURL(arquivo);
            imagemPreview.src = urlTemporaria;
            imagemPreview.style.display = "block";
            imagemPreview.onload = () => URL.revokeObjectURL(urlTemporaria);
        }
    });
}

async function salvarProduto() {
    const nome = document.getElementById("nome").value.trim();
    const preco = Number.parseFloat(document.getElementById("preco").value);
    const estoque = Number.parseInt(document.getElementById("estoque").value, 10);
    const categoria = document.getElementById("categoria").value.trim();
    const arquivo = campoImagem?.files?.[0];

    if (!nome || !categoria || !arquivo || !Number.isFinite(preco) || !Number.isInteger(estoque)) {
        alert("Preencha todos os campos e selecione uma imagem.");
        return;
    }

    if (estoque < 0 || preco < 0) {
        alert("O preço e o estoque não podem ser negativos.");
        return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
        alert("Selecione uma imagem JPEG, PNG ou WebP.");
        return;
    }

    if (arquivo.size > 2 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 2 MiB.");
        return;
    }

    if (btnSalvarProduto) {
        btnSalvarProduto.disabled = true;
        btnSalvarProduto.textContent = "Enviando imagem...";
    }

    try {
        const imagemData = await lerArquivoComoDataURL(arquivo);
        const respostaUpload = await fetch("/upload-imagem", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imagemData })
        });

        const dadosUpload = await respostaUpload.json();

        if (!respostaUpload.ok || !dadosUpload.sucesso || !dadosUpload.imagem) {
            throw new Error(dadosUpload.mensagem || "Não foi possível enviar a imagem.");
        }

        if (btnSalvarProduto) {
            btnSalvarProduto.textContent = "Salvando produto...";
        }

        const resposta = await fetch("/produtos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nome,
                preco,
                estoque,
                categoria,
                imagem: dadosUpload.imagem
            })
        });

        const dados = await resposta.json();
        alert(dados.mensagem || (resposta.ok ? "Produto cadastrado." : "Erro ao salvar produto."));

        if (resposta.ok && dados.sucesso) {
            window.location.href = "admin.html";
        }
    }
    catch (erro) {
        console.error("Erro ao cadastrar produto:", erro);
        alert(erro.message || "Erro ao salvar o produto.");
    }
    finally {
        if (btnSalvarProduto) {
            btnSalvarProduto.disabled = false;
            btnSalvarProduto.textContent = "Salvar Produto";
        }
    }
}
