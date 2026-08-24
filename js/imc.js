/* MONITOR — imc.js
   Calcula o IMC, classifica conforme a tabela da OMS, salva o
   registro no histórico e desenha a evolução com Chart.js. */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-imc");
  const dataInput = document.getElementById("data-imc");
  const pesoInput = document.getElementById("peso");
  const alturaInput = document.getElementById("altura");
  const feedback = document.getElementById("imc-feedback");
  const btnNovoCalculo = document.getElementById("btn-novo-calculo");
  const chartCanvas = document.getElementById("grafico-imc");
  const chartEmpty = document.getElementById("chart-empty");
  const listaEl = document.getElementById("imc-lista");
  const listaEmptyEl = document.getElementById("imc-lista-empty");
  const modalEditar = document.getElementById("modal-editar-imc");
  const formEditar = document.getElementById("form-editar-imc");
  const editarPesoInput = document.getElementById("editar-peso");
  const editarAlturaInput = document.getElementById("editar-altura");
  const editarFeedback = document.getElementById("editar-imc-feedback");
  const btnCancelarEdicao = document.getElementById("btn-cancelar-edicao");

  const ICON_EDITAR = `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>`;
  const ICON_EXCLUIR = `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>`;

  let chart = null;
  let editandoId = null;

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

  function renderLista() {
    const historico = getHistoricoImc()
      .slice()
      .sort((a, b) => a.data.localeCompare(b.data));

    listaEl.innerHTML = "";

    if (historico.length === 0) {
      listaEl.classList.add("hidden");
      listaEmptyEl.classList.remove("hidden");
      return;
    }

    listaEl.classList.remove("hidden");
    listaEmptyEl.classList.add("hidden");

    historico.forEach((registro) => {
      const li = document.createElement("li");
      li.className = "record-item";
      li.dataset.id = registro.id;
      li.innerHTML = `
        <div class="record-item__info">
          <span class="record-item__data">${formatarDataBR(registro.data)}</span>
          <span class="record-item__valor">IMC ${registro.imc.toFixed(1)}<small>(${registro.classificacao})</small></span>
        </div>
        <div class="record-item__actions">
          <button type="button" class="icon-btn icon-btn--edit" data-action="editar" aria-label="Editar registro">${ICON_EDITAR}</button>
          <button type="button" class="icon-btn icon-btn--delete" data-action="excluir" aria-label="Excluir registro">${ICON_EXCLUIR}</button>
        </div>
      `;
      listaEl.appendChild(li);
    });
  }

  function abrirModalEdicao(id) {
    const registro = getHistoricoImc().find((item) => item.id === id);
    if (!registro) return;
    editandoId = id;
    editarPesoInput.value = registro.peso;
    editarAlturaInput.value = registro.altura;
    editarFeedback.textContent = "";
    modalEditar.classList.remove("hidden");
  }

  function fecharModalEdicao() {
    modalEditar.classList.add("hidden");
    editandoId = null;
  }

  function excluirRegistro(id) {
    if (!confirm("Excluir este registro de IMC?")) return;
    deleteRegistroImc(id);
    renderLista();
    renderGrafico();
  }

  listaEl.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.closest(".record-item").dataset.id;

    if (btn.dataset.action === "editar") {
      abrirModalEdicao(id);
    } else if (btn.dataset.action === "excluir") {
      excluirRegistro(id);
    }
  });

  btnCancelarEdicao.addEventListener("click", fecharModalEdicao);

  modalEditar.addEventListener("click", (event) => {
    if (event.target === modalEditar) fecharModalEdicao();
  });

  formEditar.addEventListener("submit", (event) => {
    event.preventDefault();
    editarFeedback.textContent = "";

    const peso = parseFloat(editarPesoInput.value);
    const alturaCm = parseFloat(editarAlturaInput.value);

    if (!peso || peso <= 0) {
      editarFeedback.textContent = "Informe um peso válido.";
      return;
    }
    if (!alturaCm || alturaCm <= 0) {
      editarFeedback.textContent = "Informe uma altura válida.";
      return;
    }

    const alturaM = alturaCm / 100;
    const imcBruto = peso / (alturaM * alturaM);
    const imc = Math.round(imcBruto * 10) / 10;
    const classificacao = classificarImc(imcBruto);

    updateRegistroImc(editandoId, { peso, altura: alturaCm, imc, classificacao });

    fecharModalEdicao();
    renderLista();
    renderGrafico();
  });

  function resetarFormulario() {
    form.reset();
    dataInput.value = hojeIso();
    feedback.textContent = "";
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

    renderLista();
    renderGrafico();
    resetarFormulario();
  });

  btnNovoCalculo.addEventListener("click", resetarFormulario);

  renderLista();
  renderGrafico();
});
