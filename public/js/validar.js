// ==========================================
// SEGURANÇA DO VALIDADOR
// A autorização real vem da sessão do servidor.
// ==========================================

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

let sessaoValidadorPronta = false;
let cameraAtiva = false;
let leitorQR = null;
let validando = false;

async function verificarSessaoValidador() {
    try {
        const resposta =
            await fetch("/sessao/validador");

        if (!resposta.ok) {
            window.location.replace(
                "login.html"
            );
            return false;
        }

        const dados =
            await resposta.json();

        const usuario =
            dados.usuario;

        localStorage.setItem(
            "usuario",
            usuario.tipo
        );

        localStorage.setItem(
            "nome",
            usuario.nome
        );

        localStorage.setItem(
            "usuarioId",
            usuario.id
        );

        const campoNome =
            document.getElementById(
                "nome-funcionario"
            );

        if (campoNome) {
            campoNome.textContent =
                usuario.nome ||
                "Funcionário";
        }

        sessaoValidadorPronta = true;
        return true;
    }
    catch (erro) {
        console.error(
            "Erro ao verificar sessão:",
            erro
        );

        window.location.replace(
            "login.html"
        );

        return false;
    }
}

async function sairFuncionario() {
    try {
        await fetch("/logout", {
            method: "POST"
        });
    }
    catch (erro) {
        console.error(
            "Erro ao sair:",
            erro
        );
    }
    finally {
        localStorage.removeItem(
            "usuario"
        );

        localStorage.removeItem(
            "nome"
        );

        localStorage.removeItem(
            "usuarioId"
        );

        window.location.replace(
            "login.html"
        );
    }
}

// ==========================================
// VALIDAR AUTOMATICAMENTE PELO LINK DO QR
// Só depois de confirmar a sessão.
// ==========================================

window.addEventListener(
    "DOMContentLoaded",
    async () => {

        const sessaoOk =
            await verificarSessaoValidador();

        if (!sessaoOk) {
            return;
        }

        const parametros =
            new URLSearchParams(
                window.location.search
            );

        const codigo =
            parametros.get("codigo");

        if (codigo) {

            const campoCodigo =
                document.getElementById(
                    "codigo"
                );

            if (campoCodigo) {
                campoCodigo.value =
                    codigo;
            }

            const manual =
                document.querySelector(
                    ".manual"
                );

            const botoes =
                document.querySelector(
                    ".botoes"
                );

            const reader =
                document.getElementById(
                    "reader"
                );

            if (manual) manual.style.display = "none";
            if (botoes) botoes.style.display = "none";
            if (reader) reader.style.display = "none";

            validarIngresso(codigo);
        }
    }
);


// ==========================================
// INICIAR CÂMERA
// ==========================================

async function iniciarCamera() {

    if (cameraAtiva) {
        return;
    }


    const resultado =
        document.getElementById(
            "resultado"
        );


    resultado.className =
        "aguardando";

    resultado.innerHTML = `
        <strong>
            📷 Abrindo câmera...
        </strong>
    `;


    try {

        leitorQR =
            new Html5Qrcode(
                "reader"
            );


        const configuracao = {

            fps: 10,

            qrbox: {

                width: 250,
                height: 250

            }

        };


        await leitorQR.start(

            {
                facingMode:
                    "environment"
            },

            configuracao,

            codigoLido,

            erroLeitura

        );


        cameraAtiva = true;


        resultado.className =
            "aguardando";

        resultado.innerHTML = `

            <strong>
                🔍 Procurando QR Code...
            </strong>

            <p>
                Aponte a câmera para o ingresso.
            </p>

        `;

    }
    catch (erro) {

        console.error(
            "Erro ao abrir câmera:",
            erro
        );


        resultado.className =
            "invalido";

        resultado.innerHTML = `

            <h2>
                ❌ Não foi possível abrir a câmera
            </h2>

            <p>
                Verifique se o navegador possui permissão para usar a câmera.
            </p>

        `;

    }

}


// ==========================================
// QR CODE ENCONTRADO
// ==========================================

async function codigoLido(
    codigo
) {

    if (validando) {
        return;
    }


    validando = true;


    console.log(
        "QR Code lido:",
        codigo
    );


    let codigoIngresso =
        codigo;


    // Se o QR contém uma URL,
    // pega somente ?codigo=UUID

    try {

        const url =
            new URL(codigo);

        const codigoURL =
            url.searchParams.get(
                "codigo"
            );

        if (codigoURL) {

            codigoIngresso =
                codigoURL;

        }

    }
    catch (erro) {

        // Não é URL.
        // Então provavelmente já é
        // o UUID puro.

    }


    await validarIngresso(
        codigoIngresso
    );

    // Espera um pouco antes
    // de permitir outra leitura.

    setTimeout(
        () => {

            validando = false;

        },
        2500
    );

}


// ==========================================
// ERRO NORMAL DE LEITURA
// ==========================================

function erroLeitura(erro) {

    // Não precisa mostrar erro.
    // O leitor tenta encontrar
    // o QR várias vezes por segundo.

}


// ==========================================
// PARAR CÂMERA
// ==========================================

async function pararCamera() {

    if (
        !leitorQR ||
        !cameraAtiva
    ) {

        return;

    }


    try {

        await leitorQR.stop();

        leitorQR.clear();

        cameraAtiva = false;


        const resultado =
            document.getElementById(
                "resultado"
            );


        resultado.className =
            "aguardando";

        resultado.innerHTML = `

            <strong>
                📷 Câmera desligada.
            </strong>

        `;

    }
    catch (erro) {

        console.error(
            "Erro ao parar câmera:",
            erro
        );

    }

}


// ==========================================
// VALIDAÇÃO MANUAL
// ==========================================

async function validarManual() {

    const campo =
        document.getElementById(
            "codigo"
        );


    const codigo =
        campo.value.trim();


    if (!codigo) {

        const resultado =
            document.getElementById(
                "resultado"
            );


        resultado.className =
            "invalido";

        resultado.innerHTML = `

            <h2>
                ❌ Código não informado
            </h2>

            <p>
                Digite o código do ingresso.
            </p>

        `;

        return;

    }


    await validarIngresso(
        codigo
    );


    campo.value = "";

}


// ==========================================
// ENVIAR CÓDIGO PARA O SERVIDOR
// ==========================================

async function validarIngresso(
    codigo
) {

    const resultado =
        document.getElementById(
            "resultado"
        );


    resultado.className =
        "aguardando";

    resultado.innerHTML = `

        <strong>
            ⏳ Validando ingresso...
        </strong>

    `;


    try {

        const resposta =
            await fetch(

                "/validar-ingresso",

                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            codigo:
                                codigo

                        })

                }

            );


        const dados =
            await resposta.json();


        // ==================================
        // INGRESSO VÁLIDO
        // ==================================

        if (
            resposta.ok &&
            dados.status === "valido"
        ) {

            resultado.className =
                "valido";


            resultado.innerHTML = `

    <div style="font-size:70px;">
        ✅
    </div>

    <h2>
        INGRESSO VÁLIDO
    </h2>

    <p>
        Entrada liberada
    </p>

    <p>
    Compra:
    <strong>
        #${dados.venda.id}
    </strong>
</p>

<p>
    Ingresso:
    <strong>
        #${dados.venda.ingresso}
    </strong>
</p>

<p>
    Cliente:
    <strong>
        ${escaparHTML(dados.venda.cliente)}
    </strong>
</p>

`;


            tocarSomSucesso();


            return;

        }


        // ==================================
        // JÁ UTILIZADO
        // ==================================

        if (
            dados.status === "usado"
        ) {

            resultado.className =
                "usado";


            let cliente = "";


            if (
                dados.venda &&
                dados.venda.cliente
            ) {

                cliente = `

                    <p>
                        Cliente:
                        <strong>
                            ${escaparHTML(dados.venda.cliente)}
                        </strong>
                    </p>

                `;

            }


           resultado.innerHTML = `

    <div style="font-size:70px;">
        ⚠️
    </div>

    <h2>
        INGRESSO JÁ UTILIZADO
    </h2>

    <p>
        ${escaparHTML(dados.mensagem)}
    </p>

    ${escaparHTML(cliente)}

`;


            tocarSomErro();


            return;

        }


        // ==================================
        // INVÁLIDO
        // ==================================

        resultado.className =
            "invalido";


        resultado.innerHTML = `

    <div style="font-size:70px;">
        ❌
    </div>

    <h2>
        INGRESSO INVÁLIDO
    </h2>

    <p>
        ${
            dados.mensagem ||
            "Código não reconhecido."
        }
    </p>

`;


        tocarSomErro();

    }
    catch (erro) {

        console.error(
            "Erro ao validar:",
            erro
        );


        resultado.className =
            "invalido";


        resultado.innerHTML = `

            <h2>
                ❌ Erro de conexão
            </h2>

            <p>
                Não foi possível comunicar com o servidor.
            </p>

        `;

    }

}


// ==========================================
// SOM DE SUCESSO
// ==========================================

function tocarSomSucesso() {

    try {

        const contexto =
            new AudioContext();


        const oscilador =
            contexto.createOscillator();


        const ganho =
            contexto.createGain();


        oscilador.connect(
            ganho
        );


        ganho.connect(
            contexto.destination
        );


        oscilador.frequency.value =
            850;


        ganho.gain.value =
            0.08;


        oscilador.start();


        setTimeout(
            () => {

                oscilador.stop();

            },
            180
        );

    }
    catch (erro) {

        console.log(
            "Som indisponível."
        );

    }

}


// ==========================================
// SOM DE ERRO
// ==========================================

function tocarSomErro() {

    try {

        const contexto =
            new AudioContext();


        const oscilador =
            contexto.createOscillator();


        const ganho =
            contexto.createGain();


        oscilador.connect(
            ganho
        );


        ganho.connect(
            contexto.destination
        );


        oscilador.frequency.value =
            220;


        ganho.gain.value =
            0.08;


        oscilador.start();


        setTimeout(
            () => {

                oscilador.stop();

            },
            300
        );

    }
    catch (erro) {

        console.log(
            "Som indisponível."
        );

    }

}