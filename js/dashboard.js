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

  const dashDiaAnterior = document.getElementById("dash-dia-anterior");
  const dashDiaProximo = document.getElementById("dash-dia-proximo");
  const dashDiaRangeEl = document.getElementById("dash-dia-range");
  const dashAlimentacaoLink = document.getElementById("dash-alimentacao-link");
  const dashCarouselHeader = dashAlimentacaoLink.closest(".carousel-header");

  const kcalValueEl = document.getElementById("dash-kcal-value");
  const kcalMetaEl = document.getElementById("dash-kcal-meta");
  const kcalFillEl = document.getElementById("dash-kcal-fill");
  const totalPtEl = document.getElementById("dash-total-pt");
  const totalChEl = document.getElementById("dash-total-ch");
  const totalLpEl = document.getElementById("dash-total-lp");
  const ptFillEl = document.getElementById("dash-pt-progress-fill");
  const chFillEl = document.getElementById("dash-ch-progress-fill");
  const lpFillEl = document.getElementById("dash-lp-progress-fill");
  const alimentacaoEmptyEl = document.getElementById("alimentacao-dash-empty");

  const chartKcalDiaCanvas = document.getElementById("grafico-kcal-dia-dash");
  const chartKcalDiaEmpty = document.getElementById("chart-kcal-dia-dash-empty");
  const chartCardKcalDia = chartKcalDiaCanvas.closest(".chart-card");
  const btnKcalDiaAnterior = document.getElementById("dash-kcal-dia-anterior");
  const btnKcalDiaProximo = document.getElementById("dash-kcal-dia-proximo");

  const chartExercicioCanvas = document.getElementById("grafico-exercicio-dash");
  const chartExercicioEmpty = document.getElementById("exercicio-dash-empty");

  let dataAlimentacaoAtual = hojeIso();
  let chartKcalDiaDash = null;
  const janelaKcalDiaDash = criarJanelaCarrossel(5);

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

  function irParaDiaAnteriorDash() {
    dataAlimentacaoAtual = addDiasIso(dataAlimentacaoAtual, -1);
    renderAlimentacao();
  }

  function irParaDiaProximoDash() {
    const proximo = addDiasIso(dataAlimentacaoAtual, 1);
    if (proximo > hojeIso()) return;
    dataAlimentacaoAtual = proximo;
    renderAlimentacao();
  }

  function renderAlimentacao() {
    const totais = getTotaisAlimentaresDoDia(dataAlimentacaoAtual);
    const meta = getMetaKcalDia();

    const ehHojeAlimentacao = dataAlimentacaoAtual === hojeIso();
    dashDiaRangeEl.textContent = ehHojeAlimentacao ? `Hoje · ${formatarDataBR(dataAlimentacaoAtual)}` : formatarDataBR(dataAlimentacaoAtual);
    dashDiaProximo.disabled = dataAlimentacaoAtual >= hojeIso();
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

    aplicarBarraMacro(ptFillEl, totais.pt, getMetaPtDia(), getFaixaCorPt);
    aplicarBarraMacro(chFillEl, totais.ch, getMetaChDia(), getFaixaCorChLp);
    aplicarBarraMacro(lpFillEl, totais.lp, getMetaLpDia(), getFaixaCorChLp);

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

  function renderGraficoExercicio() {
    const periodos = getPeriodosParaGrafico();

    if (periodos.length === 0) {
      chartExercicioCanvas.classList.add("hidden");
      chartExercicioEmpty.classList.remove("hidden");
      return;
    }

    chartExercicioCanvas.classList.remove("hidden");
    chartExercicioEmpty.classList.add("hidden");

    const labels = periodos.map((periodo) => formatarDataBR(periodo.dataInicio));
    const valores = periodos.map((periodo) => periodo.percentual);
    const cores = periodos.map((periodo) => getComputedColor(`--faixa-${periodo.cor}`));

    new Chart(chartExercicioCanvas.getContext("2d"), {
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
          irParaRegistroAlimentarDoDia(periodos[elements[0].index].dataInicio);
        },
        onHover: (event, elements) => {
          event.native.target.style.cursor = elements.length ? "pointer" : "default";
        },
      },
    });
  }

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

  renderUsuario();
  renderGraficoImc();
  renderAlimentacao();
  renderGraficoKcalDiaDash();
  renderGraficoExercicio();
});
