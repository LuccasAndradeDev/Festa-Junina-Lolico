const btnCliente =
    document.getElementById("btn-cliente");

const btnAdmin =
    document.getElementById("btn-admin");

const btnFuncionario =
    document.getElementById(
        "btn-funcionario"
    );

const loginClienteDiv =
    document.getElementById("login-cliente");

const cadastroClienteDiv =
    document.getElementById("cadastro-cliente");

const loginAdminDiv =
    document.getElementById("login-admin");

const loginFuncionarioDiv =
    document.getElementById(
        "login-funcionario"
    );

const subtitulo =
    document.getElementById("subtitulo");

const mensagem =
    document.getElementById("mensagem-login");



/* =========================
   MENSAGENS
========================= */

function mostrarMensagem(texto, tipo = "erro") {

    mensagem.innerText = texto;

    mensagem.style.display = "block";

    mensagem.style.padding = "10px";

    mensagem.style.marginBottom = "15px";

    mensagem.style.borderRadius = "8px";

    mensagem.style.fontWeight = "bold";

    if (tipo === "sucesso") {

        mensagem.style.background = "#d8f3dc";
        mensagem.style.color = "#1b5e20";

    } else {

        mensagem.style.background = "#fdecea";
        mensagem.style.color = "#b71c1c";

    }

}



function limparMensagem() {

    mensagem.innerText = "";

    mensagem.style.display = "none";

}



/* =========================
   TROCAR TELAS
========================= */

btnCliente.addEventListener("click", () => {

    limparMensagem();

    loginClienteDiv.style.display = "block";

    cadastroClienteDiv.style.display = "none";

    loginAdminDiv.style.display = "none";

    loginFuncionarioDiv.style.display = "none";

    subtitulo.innerText =
        "Entre com seu CPF";

});


btnAdmin.addEventListener("click", () => {

    limparMensagem();

    loginClienteDiv.style.display = "none";

    cadastroClienteDiv.style.display = "none";

    loginFuncionarioDiv.style.display = "none";

    loginAdminDiv.style.display = "block";

    subtitulo.innerText =
        "Área Administrativa";

});

btnFuncionario.addEventListener(
    "click",
    () => {

        limparMensagem();

        loginClienteDiv.style.display =
            "none";

        cadastroClienteDiv.style.display =
            "none";

        loginAdminDiv.style.display =
            "none";

        loginFuncionarioDiv.style.display =
            "block";

        subtitulo.innerText =
            "Área do Funcionário";

    }
);


function abrirCadastro() {

    limparMensagem();

    loginClienteDiv.style.display = "none";

    cadastroClienteDiv.style.display = "block";

    loginAdminDiv.style.display = "none";

    loginFuncionarioDiv.style.display =
    "none";

    subtitulo.innerText =
        "Crie sua conta";

}



function voltarLoginCliente() {

    limparMensagem();

    loginClienteDiv.style.display = "block";

    cadastroClienteDiv.style.display = "none";

    subtitulo.innerText =
        "Entre com seu CPF";

}



/* =========================
   MÁSCARA CPF
========================= */

function aplicarMascaraCPF(input) {

    let valor =
        input.value.replace(/\D/g, "");

    valor =
        valor.replace(
            /(\d{3})(\d)/,
            "$1.$2"
        );

    valor =
        valor.replace(
            /(\d{3})(\d)/,
            "$1.$2"
        );

    valor =
        valor.replace(
            /(\d{3})(\d{1,2})$/,
            "$1-$2"
        );

    input.value = valor;

}



document
    .getElementById("cpf-login")
    .addEventListener("input", function () {

        aplicarMascaraCPF(this);

    });



document
    .getElementById("cpf-cadastro")
    .addEventListener("input", function () {

        aplicarMascaraCPF(this);

    });



/* =========================
   CADASTRO
========================= */

async function cadastrarCliente() {

    const nome =
        document
            .getElementById("nome-cadastro")
            .value
            .trim();

    const cpf =
        document
            .getElementById("cpf-cadastro")
            .value
            .replace(/\D/g, "");

    const senha =
        document
            .getElementById("senha-cadastro")
            .value;

    const confirmar =
        document
            .getElementById("confirmar-senha")
            .value;


    if (
        !nome ||
        !cpf ||
        !senha ||
        !confirmar
    ) {

        mostrarMensagem(
            "Preencha todos os campos."
        );

        return;

    }


    if (cpf.length !== 11) {

        mostrarMensagem(
            "Digite um CPF válido."
        );

        return;

    }


    if (senha !== confirmar) {

        mostrarMensagem(
            "As senhas não coincidem."
        );

        return;

    }


    try {

        const resposta =
            await fetch(
                "/clientes/cadastro",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            nome,
                            cpf,
                            senha
                        })
                }
            );


        const dados =
            await resposta.json();


        if (!resposta.ok) {

            mostrarMensagem(
                dados.mensagem
            );

            return;

        }


        mostrarMensagem(
            "Conta criada com sucesso! Agora faça login.",
            "sucesso"
        );


        setTimeout(() => {

            voltarLoginCliente();

            document
                .getElementById("cpf-login")
                .value = "";

            document
                .getElementById("senha-cliente")
                .value = "";

        }, 1500);


    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            "Erro ao conectar ao servidor."
        );

    }

}



/* =========================
   LOGIN CLIENTE
========================= */

async function loginCliente() {

    const cpf =
        document
            .getElementById("cpf-login")
            .value
            .replace(/\D/g, "");

    const senha =
        document
            .getElementById("senha-cliente")
            .value;


    if (!cpf || !senha) {

        mostrarMensagem(
            "Informe CPF e senha."
        );

        return;

    }


    try {

        const resposta =
            await fetch(
                "/clientes/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            cpf,
                            senha
                        })
                }
            );


        const dados =
            await resposta.json();


        if (!resposta.ok) {

            mostrarMensagem(
                dados.mensagem
            );

            return;

        }


        localStorage.setItem(
            "usuario",
            "cliente"
        );

        localStorage.setItem(
            "nome",
            dados.cliente.nome
        );

        localStorage.setItem(
            "clienteId",
            dados.cliente.id
        );


        window.location.href =
            "index.html";


    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            "Erro ao conectar ao servidor."
        );

    }

}



/* =========================
   LOGIN ADMIN
========================= */

async function fazerLogin() {

    const email =
        document
            .getElementById("email")
            .value
            .trim();

    const senha =
        document
            .getElementById("senha")
            .value;


    if (!email || !senha) {

        mostrarMensagem(
            "Preencha email e senha."
        );

        return;

    }


    try {

        const resposta =
            await fetch(
                "/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            email,
                            senha,
                            tipo: "admin"
                        })
                }
            );


        const dados =
            await resposta.json();


        if (!resposta.ok) {

            mostrarMensagem(
                dados.erro
            );

            return;

        }


        localStorage.setItem(
            "usuario",
            dados.usuario.tipo
        );

        localStorage.setItem(
            "nome",
            dados.usuario.nome
        );


        window.location.href =
            "admin.html";


    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            "Erro ao conectar ao servidor."
        );

    }

}

/* =========================
   LOGIN FUNCIONÁRIO
========================= */

async function loginFuncionario() {

    const email =
        document
            .getElementById(
                "email-funcionario"
            )
            .value
            .trim();

    const senha =
        document
            .getElementById(
                "senha-funcionario"
            )
            .value;


    if (!email || !senha) {

        mostrarMensagem(
            "Preencha email e senha."
        );

        return;
    }


    try {

        const resposta =
            await fetch(
                "/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            email,
                            senha,
                            tipo:
                                "funcionario"
                        })
                }
            );


        const dados =
            await resposta.json();


        if (!resposta.ok) {

            mostrarMensagem(
                dados.erro ||
                "Login inválido."
            );

            return;
        }


        localStorage.setItem(
            "usuario",
            dados.usuario.tipo
        );

        localStorage.setItem(
            "nome",
            dados.usuario.nome
        );

        localStorage.setItem(
            "usuarioId",
            dados.usuario.id
        );


        window.location.href =
            "validar.html";


    }
    catch (erro) {

        console.error(erro);

        mostrarMensagem(
            "Erro ao conectar ao servidor."
        );

    }

}

/* =========================
   MOSTRAR SENHA FUNCIONÁRIO
========================= */

function mostrarSenhaFuncionario() {

    const senha =
        document.getElementById(
            "senha-funcionario"
        );

    const olho =
        loginFuncionarioDiv.querySelector(
            ".eye"
        );


    if (senha.type === "password") {

        senha.type = "text";

        olho.classList.remove(
            "fa-eye"
        );

        olho.classList.add(
            "fa-eye-slash"
        );

    }
    else {

        senha.type = "password";

        olho.classList.remove(
            "fa-eye-slash"
        );

        olho.classList.add(
            "fa-eye"
        );

    }

}

/* =========================
   MOSTRAR SENHA ADMIN
========================= */

function mostrarSenha() {

    const senha =
        document.getElementById("senha");

    const olho =
        loginAdminDiv.querySelector(".eye");


    if (
        senha.type === "password"
    ) {

        senha.type = "text";

        olho.classList.remove(
            "fa-eye"
        );

        olho.classList.add(
            "fa-eye-slash"
        );

    } else {

        senha.type = "password";

        olho.classList.remove(
            "fa-eye-slash"
        );

        olho.classList.add(
            "fa-eye"
        );

    }

}



/* =========================
   MOSTRAR SENHA CLIENTE
========================= */

function mostrarSenhaCliente() {

    const senha =
        document.getElementById(
            "senha-cliente"
        );

    const olho =
        loginClienteDiv.querySelector(".eye");


    if (
        senha.type === "password"
    ) {

        senha.type = "text";

        olho.classList.remove(
            "fa-eye"
        );

        olho.classList.add(
            "fa-eye-slash"
        );

    } else {

        senha.type = "password";

        olho.classList.remove(
            "fa-eye-slash"
        );

        olho.classList.add(
            "fa-eye"
        );

    }

}