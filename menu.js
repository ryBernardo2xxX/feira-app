const secoes = [
    'inicio',
    'adicionar',
    'lista-previa',
    'hortifruti',
    'carrinho',
    'historico'
];

function ocultarTodas() {
    secoes.forEach((id) => {
        const secao = document.getElementById(id);

        if (secao) {
            secao.hidden = true;
        }
    });
}

function atualizarMenuAtivo(id) {
    const botoes = document.querySelectorAll(
        '.especifications button[data-secao]'
    );

    botoes.forEach((botao) => {
        const ativo = botao.dataset.secao === id;

        botao.classList.toggle('active', ativo);

        if (ativo) {
            botao.setAttribute('aria-current', 'page');
        } else {
            botao.removeAttribute('aria-current');
        }
    });
}

function mostrarSecao(id) {
    const secao = document.getElementById(id);

    if (!secao) {
        console.error(`Seção "${id}" não encontrada.`);
        return;
    }

    ocultarTodas();

    secao.hidden = false;

    atualizarMenuAtivo(id);

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

document.addEventListener('DOMContentLoaded', () => {
    mostrarSecao('inicio');
});