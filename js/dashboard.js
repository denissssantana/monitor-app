/* MONITOR — dashboard.js
   Resumo visual das quatro áreas (Usuário, IMC, Alimentação,
   Exercício Físico). Somente leitura via storage.js — nenhuma
   edição acontece aqui. O box de Alimentação tem seu próprio
   carrossel de dia (em memória, não persistido) e um gráfico de
   Kcal por Dia com carrossel de 5 barras independente dele. */

document.addEventListener("DOMContentLoaded", () => {
  const dashboardDateEl = document.getElementById("dashboard-date");

  const usuarioNomeEl = document.getElementById("dashboard-user-nome");
  const usuarioCaptionEl = document.getElementById("dashboard-user-caption");

  const chartImcCanvas = document.getElementById("grafico-imc-dash");
  const chartImcEmpty = document.getElementById("imc-dash-empty");

  const pesoAtualDashTextoEl = document.getElementById("peso-atual-dash-texto");
  const chartPesoCanvas = document.getElementById("grafico-peso-dash");
  const chartPesoEmpty = document.getElementById("peso-dash-empty");
  const pesoProgressoBloco = document.getElementById("peso-progresso-dash-bloco");
  const pesoProgressoEmpty = document.getElementById("peso-progresso-dash-empty");
  const pesoProgressoPercentEl = document.getElementById("peso-progresso-dash-percent");
  const pesoProgressoValoresEl = document.getElementById("peso-progresso-dash-valores");
  const pesoProgressoFillEl = document.getElementById("peso-progress-dash-fill");

  const dashDiaAnterior = document.getElementById("dash-dia-anterior");
  const dashDiaProximo = document.getElementById("dash-dia-proximo");
  const dashDiaRangeEl = document.getElementById("dash-dia-range");
  const dashAlimentacaoLink = document.getElementById("dash-alimentacao-link");
  const dashCarouselHeader = dashAlimentacaoLink.closest(".carousel-header");

  const kcalValueEl = document.getElementById("dash-kcal-value");
  const kcalMetaEl = document.getElementById("dash-kcal-meta");
  const kcalFillEl = document.getElementById("dash-kcal-fill");
  const kcalRestanteEl = document.getElementById("dash-kcal-restante");
  const totalPtEl = document.getElementById("dash-total-pt");
  const totalChEl = document.getElementById("dash-total-ch");
  const totalLpEl = document.getElementById("dash-total-lp");
  const ptFillEl = document.getElementById("dash-pt-progress-fill");
  const chFillEl = document.getElementById("dash-ch-progress-fill");
  const lpFillEl = document.getElementById("dash-lp-progress-fill");
  const metaPtWrapEl = document.getElementById("dash-meta-pt-wrap");
  const metaPtLabelEl = document.getElementById("dash-meta-pt-label");
  const metaChWrapEl = document.getElementById("dash-meta-ch-wrap");
  const metaChLabelEl = document.getElementById("dash-meta-ch-label");
  const metaLpWrapEl = document.getElementById("dash-meta-lp-wrap");
  const metaLpLabelEl = document.getElementById("dash-meta-lp-label");
  const alimentacaoEmptyEl = document.getElementById("alimentacao-dash-empty");

  const chartKcalDiaCanvas = document.getElementById("grafico-kcal-dia-dash");
  const chartKcalDiaEmpty = document.getElementById("chart-kcal-dia-dash-empty");
  const chartCardKcalDia = chartKcalDiaCanvas.closest(".chart-card");
  const btnKcalDiaAnterior = document.getElementById("dash-kcal-dia-anterior");
  const btnKcalDiaProximo = document.getElementById("dash-kcal-dia-proximo");

  const exercicioRangeEl = document.getElementById("dash-exercicio-range");
  const exercicioEmptyEl = document.getElementById("exercicio-dash-empty");
  const exercicioAtividadesEl = document.getElementById("dash-atividades-container");
  const dashboardBoxExercicio = document.getElementById("dashboard-box-exercicio");
  const dashPeriodoAnterior = document.getElementById("dash-periodo-anterior");
  const dashPeriodoProximo = document.getElementById("dash-periodo-proximo");

  let dataAlimentacaoAtual = hojeIso();
  let chartKcalDiaDash = null;
  const janelaKcalDiaDash = criarJanelaCarrossel(5);

  let periodosExercicio = [];
  let periodoExibidoIdDash = null;

  function escapeHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  }

  function hojeIso() {
    return getHojeIso();
  }

  function irParaRegistroAlimentarDoDia(dataIso) {
    window.location.href = `registro-alimentar.html?data=${dataIso}`;
  }

  function getComputedColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  function corFaixaVar(cor) {
    return cor ? getComputedColor(`--faixa-${cor}`) : getComputedColor("--accent-action");
  }

  function renderGraficoImc() {
    const historico = getHistoricoImcOrdenado();

    if (historico.length === 0) {
      chartImcCanvas.classList.add("hidden");
      chartImcEmpty.classList.remove("hidden");
      return;
    }

    chartImcCanvas.classList.remove("hidden");
    chartImcEmpty.classList.add("hidden");

    const labels = historico.map((registro) => formatarDataBR(registro.data));
    const valores = historico.map((registro) => registro.imc);
    const corAction = getComputedColor("--accent-action");

    new Chart(chartImcCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "IMC",
            data: valores,
            borderColor: corAction,
            backgroundColor: corAction + "26",
            pointBackgroundColor: corAction,
            pointRadius: 3,
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: false },
        },
        onClick: (event, elements) => {
          if (!elements.length) return;
          irParaRegistroAlimentarDoDia(historico[elements[0].index].data);
        },
        onHover: (event, elements) => {
          event.native.target.style.cursor = elements.length ? "pointer" : "default";
        },
      },
    });
  }

  function renderPesoAtualTexto() {
    const ultimoRegistro = getUltimoRegistroImc();
    pesoAtualDashTextoEl.textContent = ultimoRegistro ? `Peso Atual — ${ultimoRegistro.peso} kg` : "";
  }

  function renderGraficoPeso() {
    const historico = getHistoricoImcOrdenado();

    if (historico.length === 0) {
      chartPesoCanvas.classList.add("hidden");
      chartPesoEmpty.classList.remove("hidden");
      return;
    }

    chartPesoCanvas.classList.remove("hidden");
    chartPesoEmpty.classList.add("hidden");

    const labels = historico.map((registro) => formatarDataBR(registro.data));
    const valores = historico.map((registro) => registro.peso);
    const corAction = getComputedColor("--accent-action");

    new Chart(chartPesoCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Peso (kg)",
            data: valores,
            borderColor: corAction,
            backgroundColor: corAction + "26",
            pointBackgroundColor: corAction,
            pointRadius: 3,
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: false },
        },
      },
    });
  }

  function renderProgressoMetaPeso() {
    const progresso = getProgressoMetaPeso();

    pesoProgressoFillEl.classList.remove(
      "progress-bar-horizontal__fill--verde",
      "progress-bar-horizontal__fill--amarelo",
      "progress-bar-horizontal__fill--vermelho"
    );

    if (!progresso.temDados || !progresso.temMeta) {
      pesoProgressoBloco.classList.add("hidden");
      pesoProgressoEmpty.classList.remove("hidden");
      return;
    }

    pesoProgressoBloco.classList.remove("hidden");
    pesoProgressoEmpty.classList.add("hidden");

    pesoProgressoPercentEl.textContent = `${progresso.percentual}%`;
    pesoProgressoValoresEl.textContent = `${progresso.pesoAtual} kg / meta ${progresso.meta} kg`;
    pesoProgressoFillEl.style.width = `${progresso.percentual}%`;
    if (progresso.cor) pesoProgressoFillEl.classList.add(`progress-bar-horizontal__fill--${progresso.cor}`);
  }

  function renderKcalRestante(el, kcalConsumida, meta) {
    el.classList.remove("kcal-overview__restante--vermelho");

    if (!meta) {
      el.classList.add("hidden");
      el.textContent = "";
      return;
    }

    el.classList.remove("hidden");
    const restante = Math.round(meta - kcalConsumida);
    if (restante >= 0) {
      el.textContent = `${restante} kcal restantes`;
    } else {
      el.textContent = `${restante} kcal (meta excedida)`;
      el.classList.add("kcal-overview__restante--vermelho");
    }
  }

  function aplicarBarraMacro(fillEl, consumido, meta, corFn) {
    fillEl.classList.remove(
      "progress-bar-horizontal__fill--verde",
      "progress-bar-horizontal__fill--amarelo",
      "progress-bar-horizontal__fill--vermelho"
    );

    if (!meta) {
      fillEl.style.width = "0%";
      return;
    }

    fillEl.style.width = `${Math.min(100, Math.round((consumido / meta) * 100))}%`;
    const cor = corFn(consumido, meta);
    if (cor) fillEl.classList.add(`progress-bar-horizontal__fill--${cor}`);
  }

  function aplicarMetaMacro(wrapEl, labelEl, meta) {
    if (!meta) {
      wrapEl.classList.add("hidden");
      return;
    }
    labelEl.textContent = meta;
    wrapEl.classList.remove("hidden");
  }

  function irParaDiaAnteriorDash() {
    dataAlimentacaoAtual = addDiasIso(dataAlimentacaoAtual, -1);
    renderAlimentacao();
  }

  function irParaDiaProximoDash() {
    dataAlimentacaoAtual = addDiasIso(dataAlimentacaoAtual, 1);
    renderAlimentacao();
  }

  function renderAlimentacao() {
    const totais = getTotaisAlimentaresDoDia(dataAlimentacaoAtual);
    const meta = getMetaKcalDia();
    const hoje = hojeIso();

    if (dataAlimentacaoAtual === hoje) {
      dashDiaRangeEl.textContent = `Hoje · ${formatarDataBR(dataAlimentacaoAtual)}`;
    } else if (dataAlimentacaoAtual > hoje) {
      dashDiaRangeEl.textContent = `Planejado · ${formatarDataBR(dataAlimentacaoAtual)}`;
    } else {
      dashDiaRangeEl.textContent = formatarDataBR(dataAlimentacaoAtual);
    }
    dashAlimentacaoLink.href = `registro-alimentar.html?data=${dataAlimentacaoAtual}`;

    kcalValueEl.textContent = Math.round(totais.kcal);
    totalPtEl.textContent = totais.pt.toFixed(1);
    totalChEl.textContent = totais.ch.toFixed(1);
    totalLpEl.textContent = totais.lp.toFixed(1);

    kcalFillEl.classList.remove(
      "progress-bar-horizontal__fill--verde",
      "progress-bar-horizontal__fill--amarelo",
      "progress-bar-horizontal__fill--vermelho"
    );

    if (meta) {
      kcalMetaEl.textContent = meta;
      const percentual = Math.min(100, Math.round((totais.kcal / meta) * 100));
      kcalFillEl.style.width = `${percentual}%`;

      const cor = getFaixaCorKcal(totais.kcal, meta);
      if (cor) kcalFillEl.classList.add(`progress-bar-horizontal__fill--${cor}`);
    } else {
      kcalMetaEl.textContent = "--";
      kcalFillEl.style.width = "0%";
    }

    renderKcalRestante(kcalRestanteEl, totais.kcal, meta);

    aplicarBarraMacro(ptFillEl, totais.pt, getMetaPtDia(), getFaixaCorPt);
    aplicarBarraMacro(chFillEl, totais.ch, getMetaChDia(), getFaixaCorChLp);
    aplicarBarraMacro(lpFillEl, totais.lp, getMetaLpDia(), getFaixaCorChLp);

    aplicarMetaMacro(metaPtWrapEl, metaPtLabelEl, getMetaPtDia());
    aplicarMetaMacro(metaChWrapEl, metaChLabelEl, getMetaChDia());
    aplicarMetaMacro(metaLpWrapEl, metaLpLabelEl, getMetaLpDia());

    alimentacaoEmptyEl.classList.toggle("hidden", totais.temRegistros);
  }

  function renderGraficoKcalDiaDash() {
    const historico = getHistoricoKcalPorDia();

    if (historico.length === 0) {
      chartKcalDiaCanvas.classList.add("hidden");
      chartKcalDiaEmpty.classList.remove("hidden");
      btnKcalDiaAnterior.disabled = true;
      btnKcalDiaProximo.disabled = true;
      janelaKcalDiaDash.resetar();
      if (chartKcalDiaDash) {
        chartKcalDiaDash.destroy();
        chartKcalDiaDash = null;
      }
      return;
    }

    const inicio = janelaKcalDiaDash.preparar(historico.length);

    chartKcalDiaCanvas.classList.remove("hidden");
    chartKcalDiaEmpty.classList.add("hidden");

    const visiveis = historico.slice(inicio, inicio + janelaKcalDiaDash.tamanho);
    const labels = visiveis.map((dia) => formatarDataBR(dia.data));
    const valores = visiveis.map((dia) => Math.round(dia.kcal));
    const cores = visiveis.map((dia) => corFaixaVar(dia.cor));

    const meta = getMetaKcalDia();
    const maiorKcal = Math.max(...historico.map((dia) => dia.kcal), meta || 0);
    const eixoMax = maiorKcal > 0 ? Math.ceil(maiorKcal * 1.15) : 100;

    btnKcalDiaAnterior.disabled = !janelaKcalDiaDash.podeVoltar();
    btnKcalDiaProximo.disabled = !janelaKcalDiaDash.podeAvancar(historico.length);

    if (chartKcalDiaDash) chartKcalDiaDash.destroy();

    chartKcalDiaDash = new Chart(chartKcalDiaCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Kcal",
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
          y: { beginAtZero: true, max: eixoMax },
        },
        onClick: (event, elements) => {
          if (!elements.length) return;
          irParaRegistroAlimentarDoDia(visiveis[elements[0].index].data);
        },
        onHover: (event, elements) => {
          event.native.target.style.cursor = elements.length ? "pointer" : "default";
        },
      },
    });
  }

  function diasDoPeriodoDash(tipoPeriodo) {
    if (tipoPeriodo === "quinzenal") return 15;
    if (tipoPeriodo === "mensal") return 30;
    return 7;
  }

  function gerarIdDash() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function criarNovoPeriodoDash(tipoPeriodo, dataInicio) {
    const dias = diasDoPeriodoDash(tipoPeriodo);
    return {
      id: gerarIdDash(),
      tipoPeriodo,
      dataInicio,
      dataFim: addDiasIso(dataInicio, dias - 1),
      atividades: [],
    };
  }

  function periodosOrdenadosDash() {
    return periodosExercicio.slice().sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
  }

  function periodoExibidoDash() {
    return periodosExercicio.find((p) => p.id === periodoExibidoIdDash);
  }

  function bootstrapExercicioDash() {
    periodosExercicio = getPeriodosExercicio();

    if (periodosExercicio.length === 0) {
      const tipoPeriodo = getConfigExercicio().tipoPeriodo || "semanal";
      const novo = criarNovoPeriodoDash(tipoPeriodo, hojeIso());
      periodosExercicio.push(novo);
      savePeriodosExercicio(periodosExercicio);
      periodoExibidoIdDash = novo.id;
      return;
    }

    const hoje = hojeIso();
    const emAndamento = periodosExercicio.find((p) => hoje >= p.dataInicio && hoje <= p.dataFim);
    const ordenados = periodosOrdenadosDash();
    periodoExibidoIdDash = emAndamento ? emAndamento.id : ordenados[ordenados.length - 1].id;
  }

  function irParaPeriodoAnteriorDash() {
    const ordenados = periodosOrdenadosDash();
    const idx = ordenados.findIndex((p) => p.id === periodoExibidoIdDash);

    if (idx > 0) {
      periodoExibidoIdDash = ordenados[idx - 1].id;
    } else {
      const primeiro = ordenados[0];
      const tipoPeriodo = getConfigExercicio().tipoPeriodo || "semanal";
      const dias = diasDoPeriodoDash(tipoPeriodo);
      const dataFim = addDiasIso(primeiro.dataInicio, -1);
      const novo = { id: gerarIdDash(), tipoPeriodo, dataInicio: addDiasIso(dataFim, -(dias - 1)), dataFim, atividades: [] };
      periodosExercicio.push(novo);
      savePeriodosExercicio(periodosExercicio);
      periodoExibidoIdDash = novo.id;
    }

    renderProgressoExercicio();
  }

  function irParaPeriodoProximoDash() {
    const ordenados = periodosOrdenadosDash();
    const idx = ordenados.findIndex((p) => p.id === periodoExibidoIdDash);

    if (idx < ordenados.length - 1) {
      periodoExibidoIdDash = ordenados[idx + 1].id;
    } else {
      const ultimo = ordenados[ordenados.length - 1];
      const tipoPeriodo = getConfigExercicio().tipoPeriodo || "semanal";
      const novo = criarNovoPeriodoDash(tipoPeriodo, addDiasIso(ultimo.dataFim, 1));
      periodosExercicio.push(novo);
      savePeriodosExercicio(periodosExercicio);
      periodoExibidoIdDash = novo.id;
    }

    renderProgressoExercicio();
  }

  function renderProgressoExercicio() {
    const periodo = periodoExibidoDash();

    if (!periodo || periodo.atividades.length === 0) {
      exercicioAtividadesEl.innerHTML = "";
      exercicioRangeEl.classList.add("hidden");
      exercicioEmptyEl.classList.remove("hidden");
      return;
    }

    exercicioRangeEl.classList.remove("hidden");
    exercicioEmptyEl.classList.add("hidden");
    exercicioRangeEl.textContent = `${formatarDataBR(periodo.dataInicio)} – ${formatarDataBR(periodo.dataFim)}`;

    exercicioAtividadesEl.innerHTML = periodo.atividades
      .map((atividade) => {
        const total = atividade.treinos.length;
        const concluidos = atividade.treinos.filter((t) => t.concluido).length;
        const percentual = total === 0 ? 0 : Math.round((concluidos / total) * 100);
        const cor = getFaixaCorProgresso(percentual);

        const treinosHtml = atividade.treinos
          .map(
            (treino, index) => `
          <li class="checklist-item${treino.concluido ? " checklist-item--concluido" : ""}" data-atividade-id="${atividade.id}" data-treino-id="${treino.id}">
            <label class="checklist-item__check">
              <input type="checkbox" class="checklist-item__checkbox" ${treino.concluido ? "checked" : ""} />
              <span class="checklist-item__custom"></span>
            </label>
            <span class="checklist-item__nome">${escapeHtml(atividade.nome)} ${index + 1}</span>
          </li>`
          )
          .join("");

        return `
        <div class="atividade-block" data-atividade-id="${atividade.id}">
          <div class="atividade-block__header">
            <h3 class="atividade-block__title">${escapeHtml(atividade.nome)} <span class="atividade-block__count">(${atividade.treinos.length} ${atividade.treinos.length === 1 ? "treino" : "treinos"})</span></h3>
          </div>
          <div class="exercicio-layout">
            <div class="exercicio-main">
              <ul class="checklist">${treinosHtml}</ul>
            </div>
            <aside class="progress-bar-vertical progress-bar-vertical--dash" aria-label="Progresso de ${escapeHtml(atividade.nome)}">
              <div class="progress-bar-vertical__track">
                <div class="progress-bar-vertical__fill progress-bar-vertical__fill--${cor}" style="height: ${percentual}%"></div>
              </div>
              <p class="progress-bar-vertical__label">${percentual}%</p>
            </aside>
          </div>
        </div>`;
      })
      .join("");
  }

  function atualizarBarraAtividadeDash(atividade) {
    const bloco = exercicioAtividadesEl.querySelector(`.atividade-block[data-atividade-id="${atividade.id}"]`);
    if (!bloco) return;

    const total = atividade.treinos.length;
    const concluidos = atividade.treinos.filter((t) => t.concluido).length;
    const percentual = total === 0 ? 0 : Math.round((concluidos / total) * 100);

    const fillEl = bloco.querySelector(".progress-bar-vertical__fill");
    const labelEl = bloco.querySelector(".progress-bar-vertical__label");

    fillEl.style.height = `${percentual}%`;
    fillEl.classList.remove(
      "progress-bar-vertical__fill--verde",
      "progress-bar-vertical__fill--amarelo",
      "progress-bar-vertical__fill--vermelho"
    );
    fillEl.classList.add(`progress-bar-vertical__fill--${getFaixaCorProgresso(percentual)}`);
    labelEl.textContent = `${percentual}%`;
  }

  exercicioAtividadesEl.addEventListener("change", (event) => {
    if (!event.target.classList.contains("checklist-item__checkbox")) return;

    const item = event.target.closest(".checklist-item");
    const periodo = periodoExibidoDash();
    const atividade = periodo && periodo.atividades.find((a) => a.id === item.dataset.atividadeId);
    const treino = atividade && atividade.treinos.find((t) => t.id === item.dataset.treinoId);
    if (!treino) return;

    treino.concluido = event.target.checked;
    savePeriodosExercicio(periodosExercicio);

    item.classList.toggle("checklist-item--concluido", treino.concluido);
    atualizarBarraAtividadeDash(atividade);
  });

  dashPeriodoAnterior.addEventListener("click", irParaPeriodoAnteriorDash);
  dashPeriodoProximo.addEventListener("click", irParaPeriodoProximoDash);
  anexarSwipeCarrossel(dashboardBoxExercicio, { aoVoltar: irParaPeriodoAnteriorDash, aoAvancar: irParaPeriodoProximoDash });

  function renderUsuario() {
    const nome = getNomeUsuario();
    if (nome) {
      usuarioNomeEl.textContent = nome;
      usuarioCaptionEl.classList.add("hidden");
    } else {
      usuarioNomeEl.textContent = "Usuário";
      usuarioCaptionEl.classList.remove("hidden");
    }
  }

  dashboardDateEl.textContent = formatarDataBR(hojeIso());

  function irParaKcalDiaAnteriorDash() {
    janelaKcalDiaDash.voltar();
    renderGraficoKcalDiaDash();
  }

  function irParaKcalDiaProximoDash() {
    janelaKcalDiaDash.avancar();
    renderGraficoKcalDiaDash();
  }

  dashDiaAnterior.addEventListener("click", irParaDiaAnteriorDash);
  dashDiaProximo.addEventListener("click", irParaDiaProximoDash);
  anexarSwipeCarrossel(dashCarouselHeader, { aoVoltar: irParaDiaAnteriorDash, aoAvancar: irParaDiaProximoDash });

  btnKcalDiaAnterior.addEventListener("click", irParaKcalDiaAnteriorDash);
  btnKcalDiaProximo.addEventListener("click", irParaKcalDiaProximoDash);
  anexarSwipeCarrossel(chartCardKcalDia, { aoVoltar: irParaKcalDiaAnteriorDash, aoAvancar: irParaKcalDiaProximoDash });

  bootstrapExercicioDash();

  renderUsuario();
  renderPesoAtualTexto();
  renderGraficoPeso();
  renderProgressoMetaPeso();
  renderGraficoImc();
  renderAlimentacao();
  renderGraficoKcalDiaDash();
  renderProgressoExercicio();
});
