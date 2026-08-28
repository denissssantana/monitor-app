/* MONITOR — carousel-chart.js
   Helper compartilhado para o padrão de carrossel de 5 itens usado em
   todos os gráficos de barras (Exercício e Alimentação): janela fixa,
   eixo fixo, setas que desabilitam nas pontas, e swipe. Cada tela
   continua responsável por criar/destruir sua própria instância do
   Chart.js — este helper só controla a posição da janela. */

function criarJanelaCarrossel(tamanho = 5) {
  let inicio = 0;
  let pronto = false;

  return {
    tamanho,
    preparar(total) {
      if (!pronto) {
        inicio = Math.max(0, total - tamanho);
        pronto = true;
      }
      const max = Math.max(0, total - tamanho);
      inicio = Math.min(Math.max(0, inicio), max);
      return inicio;
    },
    voltar() {
      inicio -= tamanho;
    },
    avancar() {
      inicio += tamanho;
    },
    getInicio() {
      return inicio;
    },
    podeVoltar() {
      return inicio > 0;
    },
    podeAvancar(total) {
      return inicio + tamanho < total;
    },
    resetar() {
      pronto = false;
      inicio = 0;
    },
  };
}

function ehElementoInterativoCarrossel(el) {
  return el.closest("input, button, label, a, select");
}

function anexarSwipeCarrossel(elemento, { aoVoltar, aoAvancar, limiarPx = 60 } = {}) {
  let startX = null;
  let startY = null;

  elemento.addEventListener("pointerdown", (event) => {
    if (ehElementoInterativoCarrossel(event.target)) {
      startX = null;
      return;
    }
    startX = event.clientX;
    startY = event.clientY;
  });

  elemento.addEventListener("pointerup", (event) => {
    if (startX === null) return;

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    startX = null;

    if (Math.abs(deltaX) > limiarPx && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        aoAvancar && aoAvancar();
      } else {
        aoVoltar && aoVoltar();
      }
    }
  });
}
