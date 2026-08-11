/* MONITOR — imc.js
   Calcula o IMC, classifica conforme a tabela da OMS, salva o
   registro no histórico e desenha a evolução com Chart.js. */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-imc");
  const dataInput = document.getElementById("data-imc");
  const pesoInput = document.getElementById("peso");
  const alturaInput = document.getElementById("altura");
  const feedback = document.getElementById("imc-feedback");
  const resultado = document.getElementById("imc-resultado");
  const resultadoValor = document.getElementById("imc-valor");
  const resultadoClassificacao = document.getElementById("imc-classificacao");
  const btnNovoCalculo = document.getElementById("btn-novo-calculo");
  const chartCanvas = document.getElementById("grafico-imc");
  const chartEmpty = document.getElementById("chart-empty");

  let chart = null;

  function hojeIso() {
    return new Date().toISOString().slice(0, 10);
  }

  dataInput.value = hojeIso();

  function classificarImc(imc) {
    if (imc < 18.5) return "Abaixo do peso";
    if (imc < 25) return "Peso normal";
    if (imc < 30) return "Sobrepeso";
    if (imc < 35) return "Obesidade Grau I";
    if (imc < 40) return "Obesidade Grau II";
    return "Obesidade Grau III";
  }

  function corParaImc(imc) {
    if (imc < 18.5) return getComputedColor("--accent-warning");
    if (imc < 25) return getComputedColor("--accent-success");
    if (imc < 30) return getComputedColor("--accent-warning");
    return getComputedColor("--accent-action");
  }

  function getComputedColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  function formatarDataBR(dataIso) {
    const [ano, mes, dia] = dataIso.split("-");
    return `${dia}/${mes}/${ano.slice(2)}`;
  }

  function renderGrafico() {
    const historico = getHistoricoImc()
      .slice()
      .sort((a, b) => a.data.localeCompare(b.data));

    if (historico.length === 0) {
      chartCanvas.classList.add("hidden");
      chartEmpty.classList.remove("hidden");
      if (chart) {
        chart.destroy();
        chart = null;
      }
      return;
    }

    chartCanvas.classList.remove("hidden");
    chartEmpty.classList.add("hidden");

    const labels = historico.map((registro) => formatarDataBR(registro.data));
    const valores = historico.map((registro) => registro.imc);
    const corAction = getComputedColor("--accent-action");

    if (chart) chart.destroy();

    chart = new Chart(chartCanvas.getContext("2d"), {
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
            pointRadius: 4,
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

  function limparResultado() {
    resultado.classList.add("hidden");
    resultadoValor.textContent = "";
    resultadoClassificacao.textContent = "";
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    feedback.textContent = "";

    const data = dataInput.value;
    const peso = parseFloat(pesoInput.value);
    const alturaCm = parseFloat(alturaInput.value);

    if (!data) {
      feedback.textContent = "Informe a data.";
      return;
    }
    if (!peso || peso <= 0) {
      feedback.textContent = "Informe um peso válido.";
      return;
    }
    if (!alturaCm || alturaCm <= 0) {
      feedback.textContent = "Informe uma altura válida.";
      return;
    }

    const alturaM = alturaCm / 100;
    const imcBruto = peso / (alturaM * alturaM);
    const imc = Math.round(imcBruto * 10) / 10;
    const classificacao = classificarImc(imcBruto);

    addRegistroImc({
      id: Date.now().toString(),
      data,
      peso,
      altura: alturaCm,
      imc,
      classificacao,
    });

    resultadoValor.textContent = imc.toFixed(1);
    resultadoValor.style.color = corParaImc(imcBruto);
    resultadoClassificacao.textContent = classificacao;
    resultado.classList.remove("hidden");

    renderGrafico();
  });

  btnNovoCalculo.addEventListener("click", () => {
    form.reset();
    dataInput.value = hojeIso();
    feedback.textContent = "";
    limparResultado();
  });

  renderGrafico();
});
