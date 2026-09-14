/* MONITOR — exercicio-fisico.js
   Cada período de treino é um objeto permanente num array plano
   (monitor_periodos_exercicio) — nunca é arquivado ou congelado.
   O carrossel navega entre períodos existentes e cria um novo em
   branco ao passar do primeiro ou do último. O percentual de
   conclusão (barra lateral e gráfico) é sempre recalculado a
   partir dos treinos atuais, nunca armazenado. */

document.addEventListener("DOMContentLoaded", () => {
  const tipoPeriodoSelect = document.getElementById("tipo-periodo");

  const formAddAtividade = document.getElementById("form-add-atividade");
  const atividadeNomeInput = document.getElementById("atividade-nome");
  const atividadeQtdInput = document.getElementById("atividade-qtd");
  const atividadeFeedback = document.getElementById("atividade-feedback");

  const carouselCard = document.getElementById("carousel-periodo");
  const btnPeriodoAnterior = document.getElementById("btn-periodo-anterior");
  const btnPeriodoProximo = document.getElementById("btn-periodo-proximo");
  const periodoRangeEl = document.getElementById("periodo-range");
  const atividadesContainer = document.getElementById("atividades-container");
  const atividadesEmptyEl = document.getElementById("atividades-empty");
  const btnExcluirPeriodo = document.getElementById("btn-excluir-periodo");

  const progressFillEl = document.getElementById("progress-fill");
  const progressLabelEl = document.getElementById("progress-label");

  const chartCanvas = document.getElementById("grafico-exercicio");
  const chartEmpty = document.getElementById("chart-exercicio-empty");
  const chartCardPeriodo = document.getElementById("chart-card-periodo");
  const btnPeriodoHistAnterior = document.getElementById("btn-periodo-hist-anterior");
  const btnPeriodoHistProximo = document.getElementById("btn-periodo-hist-proximo");

  const chartSemaforoCanvas = document.getElementById("grafico-exercicio-semaforo");
  const chartSemaforoEmpty = document.getElementById("chart-exercicio-semaforo-empty");
  const chartCardSemaforo = document.getElementById("chart-card-semaforo");
  const btnSemaforoAnterior = document.getElementById("btn-semaforo-anterior");
  const btnSemaforoProximo = document.getElementById("btn-semaforo-proximo");

  const ICON_EXCLUIR = `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>`;

  let chart = null;
  let chartSemaforo = null;
  let periodos = [];
  let periodoExibidoId = null;
  let diasSemaforoVisiveis = [];
  const janelaSemaforo = criarJanelaCarrossel(5);
  const janelaPeriodo = criarJanelaCarrossel(5);

  function hojeIso() {
    return getHojeIso();
  }

  function addDias(dataIso, dias) {
    return addDiasIso(dataIso, dias);
  }

  function gerarId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function irParaRegistroAlimentarDoDia(dataIso) {
    window.location.href = `registro-alimentar.html?data=${dataIso}`;
  }

  function diasDoPeriodo(tipoPeriodo) {
    if (tipoPeriodo === "quinzenal") return 15;
    if (tipoPeriodo === "mensal") return 30;
    return 7;
  }

  function getComputedColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  function escapeHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  }

  function criarNovoPeriodo(tipoPeriodo, dataInicio) {
    const dias = diasDoPeriodo(tipoPeriodo);
    return {
      id: gerarId(),
      tipoPeriodo,
      dataInicio,
      dataFim: addDias(dataInicio, dias - 1),
      atividades: [],
    };
  }

  function periodosOrdenados() {
    return periodos.slice().sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
  }

  function periodoExibido() {
    return periodos.find((p) => p.id === periodoExibidoId);
  }

  function totalETreinosConcluidos(periodo) {
    let total = 0;
    let concluidos = 0;
    periodo.atividades.forEach((atividade) => {
      total += atividade.treinos.length;
      concluidos += atividade.treinos.filter((t) => t.concluido).length;
    });
    return { total, concluidos };
  }

  function percentualDoPeriodo(periodo) {
    const { total, concluidos } = totalETreinosConcluidos(periodo);
    return total === 0 ? 0 : Math.round((concluidos / total) * 1000) / 10;
  }

  function persistirPeriodos() {
    savePeriodosExercicio(periodos);
  }

  function exibirPeriodo(id) {
    periodoExibidoId = id;
    saveIndicePeriodoExibido(id);
  }

  function bootstrap() {
    periodos = getPeriodosExercicio();

    if (periodos.length === 0) {
      const tipoPeriodo = getConfigExercicio().tipoPeriodo || "semanal";
      const novo = criarNovoPeriodo(tipoPeriodo, hojeIso());
      periodos.push(novo);
      persistirPeriodos();
      exibirPeriodo(novo.id);
      return;
    }

    const salvo = getIndicePeriodoExibido();
    if (salvo && periodos.some((p) => p.id === salvo)) {
      periodoExibidoId = salvo;
      return;
    }

    const hoje = hojeIso();
    const emAndamento = periodos.find((p) => hoje >= p.dataInicio && hoje <= p.dataFim);
    const ordenados = periodosOrdenados();
    exibirPeriodo(emAndamento ? emAndamento.id : ordenados[ordenados.length - 1].id);
  }

  function irParaAnterior() {
    const ordenados = periodosOrdenados();
    const idx = ordenados.findIndex((p) => p.id === periodoExibidoId);

    if (idx > 0) {
      exibirPeriodo(ordenados[idx - 1].id);
    } else {
      const primeiro = ordenados[0];
      const tipoPeriodo = getConfigExercicio().tipoPeriodo || "semanal";
      const dias = diasDoPeriodo(tipoPeriodo);
      const dataFim = addDias(primeiro.dataInicio, -1);
      const novo = { id: gerarId(), tipoPeriodo, dataInicio: addDias(dataFim, -(dias - 1)), dataFim, atividades: [] };
      periodos.push(novo);
      persistirPeriodos();
      exibirPeriodo(novo.id);
    }

    renderTudo();
  }

  function irParaProximo() {
    const ordenados = periodosOrdenados();
    const idx = ordenados.findIndex((p) => p.id === periodoExibidoId);

    if (idx < ordenados.length - 1) {
      exibirPeriodo(ordenados[idx + 1].id);
    } else {
      const ultimo = ordenados[ordenados.length - 1];
      const tipoPeriodo = getConfigExercicio().tipoPeriodo || "semanal";
      const novo = criarNovoPeriodo(tipoPeriodo, addDias(ultimo.dataFim, 1));
      periodos.push(novo);
      persistirPeriodos();
      exibirPeriodo(novo.id);
    }

    renderTudo();
  }

  function excluirPeriodoExibido() {
    if (!confirm("Excluir este período? Todas as atividades e treinos dele serão apagados permanentemente.")) return;

    const ordenados = periodosOrdenados();
    const idx = ordenados.findIndex((p) => p.id === periodoExibidoId);

    periodos = periodos.filter((p) => p.id !== periodoExibidoId);
    persistirPeriodos();

    if (periodos.length === 0) {
      const tipoPeriodo = getConfigExercicio().tipoPeriodo || "semanal";
      const novo = criarNovoPeriodo(tipoPeriodo, hojeIso());
      periodos.push(novo);
      persistirPeriodos();
      exibirPeriodo(novo.id);
    } else {
      const restantesOrdenados = periodosOrdenados();
      const vizinho = restantesOrdenados[Math.min(idx, restantesOrdenados.length - 1)];
      exibirPeriodo(vizinho.id);
    }

    renderTudo();
  }

  function atualizarBarraProgresso(periodo) {
    const { total, concluidos } = totalETreinosConcluidos(periodo);
    const percentual = total === 0 ? 0 : Math.round((concluidos / total) * 100);

    progressFillEl.style.height = `${percentual}%`;
    progressLabelEl.textContent = `${percentual}%`;

    progressFillEl.classList.remove(
      "progress-bar-vertical__fill--verde",
      "progress-bar-vertical__fill--amarelo",
      "progress-bar-vertical__fill--vermelho"
    );
    progressFillEl.classList.add(`progress-bar-vertical__fill--${getFaixaCorProgresso(percentual)}`);
  }

  function renderCarousel() {
    const periodo = periodoExibido();

    tipoPeriodoSelect.value = periodo.tipoPeriodo;
    periodoRangeEl.textContent = `${formatarDataBR(periodo.dataInicio)} – ${formatarDataBR(periodo.dataFim)}`;

    atividadesContainer.innerHTML = "";

    if (periodo.atividades.length === 0) {
      atividadesContainer.classList.add("hidden");
      atividadesEmptyEl.classList.remove("hidden");
      atualizarBarraProgresso(periodo);
      return;
    }

    atividadesContainer.classList.remove("hidden");
    atividadesEmptyEl.classList.add("hidden");

    periodo.atividades.forEach((atividade) => {
      const bloco = document.createElement("div");
      bloco.className = "atividade-block";
      bloco.dataset.atividadeId = atividade.id;

      const treinosHtml = atividade.treinos
        .map(
          (treino, index) => `
        <li class="checklist-item${treino.concluido ? " checklist-item--concluido" : ""}" data-treino-id="${treino.id}">
          <label class="checklist-item__check">
            <input type="checkbox" class="checklist-item__checkbox" ${treino.concluido ? "checked" : ""} />
            <span class="checklist-item__custom"></span>
          </label>
          <span class="checklist-item__nome">${escapeHtml(atividade.nome)} ${index + 1}</span>
        </li>`
        )
        .join("");

      bloco.innerHTML = `
        <div class="atividade-block__header">
          <h3 class="atividade-block__title">${escapeHtml(atividade.nome)} <span class="atividade-block__count">(${atividade.treinos.length} ${atividade.treinos.length === 1 ? "treino" : "treinos"})</span></h3>
          <button type="button" class="icon-btn icon-btn--delete" data-action="remover-atividade" aria-label="Remover atividade">${ICON_EXCLUIR}</button>
        </div>
        <ul class="checklist">${treinosHtml}</ul>
      `;

      atividadesContainer.appendChild(bloco);
    });

    atualizarBarraProgresso(periodo);
  }

  function renderGraficoHistorico() {
    const ordenados = periodosOrdenados();

    if (ordenados.length === 0) {
      chartCanvas.classList.add("hidden");
      chartEmpty.classList.remove("hidden");
      btnPeriodoHistAnterior.disabled = true;
      btnPeriodoHistProximo.disabled = true;
      janelaPeriodo.resetar();
      if (chart) {
        chart.destroy();
        chart = null;
      }
      return;
    }

    const inicio = janelaPeriodo.preparar(ordenados.length);

    chartCanvas.classList.remove("hidden");
    chartEmpty.classList.add("hidden");

    const periodosVisiveis = ordenados.slice(inicio, inicio + janelaPeriodo.tamanho);
    const labels = periodosVisiveis.map((periodo) => formatarDataBR(periodo.dataInicio));
    const valores = periodosVisiveis.map((periodo) => percentualDoPeriodo(periodo));
    const cores = valores.map((percentual) => corFaixaVar(getFaixaCorPeriodo(percentual)));

    btnPeriodoHistAnterior.disabled = !janelaPeriodo.podeVoltar();
    btnPeriodoHistProximo.disabled = !janelaPeriodo.podeAvancar(ordenados.length);

    if (chart) chart.destroy();

    chart = new Chart(chartCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "% Concluído",
            data: valores,
            backgroundColor: cores,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true, max: 100 },
        },
        onClick: (event, elements) => {
          if (!elements.length) return;
          irParaRegistroAlimentarDoDia(periodosVisiveis[elements[0].index].dataInicio);
        },
        onHover: (event, elements) => {
          event.native.target.style.cursor = elements.length ? "pointer" : "default";
        },
      },
    });
  }

  function irParaPeriodoHistAnterior() {
    janelaPeriodo.voltar();
    renderGraficoHistorico();
  }

  function irParaPeriodoHistProximo() {
    janelaPeriodo.avancar();
    renderGraficoHistorico();
  }

  function corFaixaVar(cor) {
    return getComputedColor(`--faixa-${cor}`);
  }

  function renderGraficoSemaforo() {
    const dias = getTreinosPorDiaOrdenado();

    if (dias.length === 0) {
      chartSemaforoCanvas.classList.add("hidden");
      chartSemaforoEmpty.classList.remove("hidden");
      btnSemaforoAnterior.disabled = true;
      btnSemaforoProximo.disabled = true;
      janelaSemaforo.resetar();
      if (chartSemaforo) {
        chartSemaforo.destroy();
        chartSemaforo = null;
      }
      return;
    }

    const inicio = janelaSemaforo.preparar(dias.length);

    chartSemaforoCanvas.classList.remove("hidden");
    chartSemaforoEmpty.classList.add("hidden");

    diasSemaforoVisiveis = dias.slice(inicio, inicio + janelaSemaforo.tamanho);
    const labels = diasSemaforoVisiveis.map((dia) => formatarDataBR(dia.data));
    const valores = diasSemaforoVisiveis.map((dia) => dia.percentual);
    const cores = diasSemaforoVisiveis.map((dia) => corFaixaVar(dia.cor));

    btnSemaforoAnterior.disabled = !janelaSemaforo.podeVoltar();
    btnSemaforoProximo.disabled = !janelaSemaforo.podeAvancar(dias.length);

    if (chartSemaforo) chartSemaforo.destroy();

    chartSemaforo = new Chart(chartSemaforoCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "% Concluído",
            data: valores,
            backgroundColor: cores,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true, max: 100 },
        },
        onClick: (event, elements) => {
          if (!elements.length) return;
          irParaRegistroAlimentarDoDia(diasSemaforoVisiveis[elements[0].index].data);
        },
        onHover: (event, elements) => {
          event.native.target.style.cursor = elements.length ? "pointer" : "default";
        },
      },
    });
  }

  function irParaSemaforoAnterior() {
    janelaSemaforo.voltar();
    renderGraficoSemaforo();
  }

  function irParaSemaforoProximo() {
    janelaSemaforo.avancar();
    renderGraficoSemaforo();
  }

  function renderTudo() {
    renderCarousel();
    renderGraficoHistorico();
    renderGraficoSemaforo();
  }

  tipoPeriodoSelect.addEventListener("change", () => {
    const periodo = periodoExibido();
    const tipoPeriodo = tipoPeriodoSelect.value;

    periodo.tipoPeriodo = tipoPeriodo;
    periodo.dataFim = addDias(periodo.dataInicio, diasDoPeriodo(tipoPeriodo) - 1);
    persistirPeriodos();
    saveConfigExercicio({ tipoPeriodo });

    renderTudo();
  });

  formAddAtividade.addEventListener("submit", (event) => {
    event.preventDefault();
    atividadeFeedback.textContent = "";

    const nome = atividadeNomeInput.value.trim();
    const quantidade = parseInt(atividadeQtdInput.value, 10);

    if (!nome) {
      atividadeFeedback.textContent = "Informe o nome da atividade.";
      return;
    }
    if (!quantidade || quantidade <= 0) {
      atividadeFeedback.textContent = "Informe uma quantidade de treinos válida.";
      return;
    }

    const periodo = periodoExibido();
    const datas = distribuirDatasTreinos(periodo.dataInicio, periodo.dataFim, quantidade);
    const treinos = datas.map((data) => ({ id: gerarId(), concluido: false, data }));
    periodo.atividades.push({ id: gerarId(), nome, quantidadeTreinos: quantidade, treinos });
    persistirPeriodos();

    formAddAtividade.reset();
    atividadeQtdInput.value = 1;
    renderTudo();
  });

  atividadesContainer.addEventListener("change", (event) => {
    if (!event.target.classList.contains("checklist-item__checkbox")) return;

    const atividadeId = event.target.closest(".atividade-block").dataset.atividadeId;
    const treinoId = event.target.closest(".checklist-item").dataset.treinoId;
    const atividade = periodoExibido().atividades.find((a) => a.id === atividadeId);
    const treino = atividade && atividade.treinos.find((t) => t.id === treinoId);
    if (!treino) return;

    treino.concluido = event.target.checked;
    persistirPeriodos();
    renderTudo();
  });

  atividadesContainer.addEventListener("click", (event) => {
    const btn = event.target.closest('button[data-action="remover-atividade"]');
    if (!btn) return;

    if (!confirm("Remover esta atividade e todos os seus treinos deste período?")) return;

    const atividadeId = btn.closest(".atividade-block").dataset.atividadeId;
    const periodo = periodoExibido();
    periodo.atividades = periodo.atividades.filter((a) => a.id !== atividadeId);
    persistirPeriodos();
    renderTudo();
  });

  btnPeriodoAnterior.addEventListener("click", irParaAnterior);
  btnPeriodoProximo.addEventListener("click", irParaProximo);
  btnExcluirPeriodo.addEventListener("click", excluirPeriodoExibido);
  btnSemaforoAnterior.addEventListener("click", irParaSemaforoAnterior);
  btnSemaforoProximo.addEventListener("click", irParaSemaforoProximo);
  anexarSwipeCarrossel(chartCardSemaforo, { aoVoltar: irParaSemaforoAnterior, aoAvancar: irParaSemaforoProximo });

  btnPeriodoHistAnterior.addEventListener("click", irParaPeriodoHistAnterior);
  btnPeriodoHistProximo.addEventListener("click", irParaPeriodoHistProximo);
  anexarSwipeCarrossel(chartCardPeriodo, { aoVoltar: irParaPeriodoHistAnterior, aoAvancar: irParaPeriodoHistProximo });

  let swipeStartX = null;
  let swipeStartY = null;

  function ehElementoInterativo(el) {
    return el.closest("input, button, label, a, select");
  }

  carouselCard.addEventListener("pointerdown", (event) => {
    if (ehElementoInterativo(event.target)) {
      swipeStartX = null;
      return;
    }
    swipeStartX = event.clientX;
    swipeStartY = event.clientY;
  });

  carouselCard.addEventListener("pointerup", (event) => {
    if (swipeStartX === null) return;

    const deltaX = event.clientX - swipeStartX;
    const deltaY = event.clientY - swipeStartY;
    swipeStartX = null;

    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        irParaProximo();
      } else {
        irParaAnterior();
      }
    }
  });

  bootstrap();
  renderTudo();
});
