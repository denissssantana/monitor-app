/* MONITOR — dashboard.js
   Resumo visual das quatro áreas (Usuário, IMC, Alimentação,
   Exercício Físico). Somente leitura via storage.js — nenhuma
   edição acontece aqui. */

document.addEventListener("DOMContentLoaded", () => {
  const usuarioNomeEl = document.getElementById("dashboard-user-nome");
  const usuarioCaptionEl = document.getElementById("dashboard-user-caption");

  const chartImcCanvas = document.getElementById("grafico-imc-dash");
  const chartImcEmpty = document.getElementById("imc-dash-empty");

  const kcalValueEl = document.getElementById("dash-kcal-value");
  const kcalMetaEl = document.getElementById("dash-kcal-meta");
  const kcalFillEl = document.getElementById("dash-kcal-fill");
  const totalPtEl = document.getElementById("dash-total-pt");
  const totalChEl = document.getElementById("dash-total-ch");
  const totalLpEl = document.getElementById("dash-total-lp");
  const alimentacaoEmptyEl = document.getElementById("alimentacao-dash-empty");

  const chartExercicioCanvas = document.getElementById("grafico-exercicio-dash");
  const chartExercicioEmpty = document.getElementById("exercicio-dash-empty");

  function hojeIso() {
    return getHojeIso();
  }

  function irParaRegistroAlimentarDoDia(dataIso) {
    window.location.href = `registro-alimentar.html?data=${dataIso}`;
  }

  function getComputedColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
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

  function renderAlimentacao() {
    const totais = getTotaisAlimentaresDoDia(hojeIso());
    const meta = getMetaKcalDia();

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

    alimentacaoEmptyEl.classList.toggle("hidden", totais.temRegistros);
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

  renderUsuario();
  renderGraficoImc();
  renderAlimentacao();
  renderGraficoExercicio();
});
