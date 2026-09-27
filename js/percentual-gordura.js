/* MONITOR — percentual-gordura.js
   Calcula o % de gordura corporal (US Navy, via calculos.js), salva
   o registro no histórico e desenha a evolução com Chart.js.
   Mesmo padrão de imc.js. Tela independente: sexo e altura são
   informados aqui mesmo (não busca nada de Dados Pessoais/IMC) e
   ficam gravados em cada registro do histórico. */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-gordura");
  const dataInput = document.getElementById("data-gordura");
  const sexoInput = document.getElementById("gordura-sexo");
  const alturaInput = document.getElementById("gordura-altura");
  const cinturaInput = document.getElementById("gordura-cintura");
  const pescocoInput = document.getElementById("gordura-pescoco");
  const quadrilField = document.getElementById("gordura-quadril-field");
  const quadrilInput = document.getElementById("gordura-quadril");
  const feedback = document.getElementById("gordura-feedback");
  const btnNovoCalculo = document.getElementById("btn-novo-calculo-gordura");
  const chartCanvas = document.getElementById("grafico-gordura");
  const chartEmpty = document.getElementById("chart-gordura-empty");
  const listaEl = document.getElementById("gordura-lista");
  const listaEmptyEl = document.getElementById("gordura-lista-empty");
  const modalEditar = document.getElementById("modal-editar-gordura");
  const formEditar = document.getElementById("form-editar-gordura");
  const editarDataInput = document.getElementById("editar-gordura-data");
  const editarSexoInput = document.getElementById("editar-gordura-sexo");
  const editarAlturaInput = document.getElementById("editar-gordura-altura");
  const editarCinturaInput = document.getElementById("editar-gordura-cintura");
  const editarPescocoInput = document.getElementById("editar-gordura-pescoco");
  const editarQuadrilField = document.getElementById("editar-gordura-quadril-field");
  const editarQuadrilInput = document.getElementById("editar-gordura-quadril");
  const editarFeedback = document.getElementById("editar-gordura-feedback");
  const btnCancelarEdicao = document.getElementById("btn-cancelar-edicao-gordura");
  const resultadoEl = document.getElementById("gordura-resultado");
  const resultadoDataEl = document.getElementById("gordura-resultado-data");
  const resultadoValorEl = document.getElementById("gordura-resultado-valor");
  const silhuetaEl = document.getElementById("gordura-silhueta");

  // Efeito "corrente elétrica" no contorno (só nesta tela; ver silhueta-gordura.js).
  ativarFaiscaSilhueta(silhuetaEl);

  const ICON_EDITAR = `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>`;
  const ICON_EXCLUIR = `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>`;

  let chart = null;
  let editandoId = null;
  let historicoAtual = [];

  function hojeIso() {
    return getHojeIso();
  }

  function irParaRegistroAlimentarDoDia(dataIso) {
    window.location.href = `registro-alimentar.html?data=${dataIso}`;
  }

  // Quadril só aparece (renderiza) quando o sexo selecionado é "F".
  function aplicarVisibilidadeQuadril(sexoEl, quadrilFieldEl, quadrilEl) {
    const feminino = sexoEl.value === "F";
    quadrilFieldEl.classList.toggle("hidden", !feminino);
    if (!feminino) quadrilEl.value = "";
  }

  dataInput.value = hojeIso();
  aplicarVisibilidadeQuadril(sexoInput, quadrilField, quadrilInput);

  sexoInput.addEventListener("change", () => aplicarVisibilidadeQuadril(sexoInput, quadrilField, quadrilInput));
  editarSexoInput.addEventListener("change", () =>
    aplicarVisibilidadeQuadril(editarSexoInput, editarQuadrilField, editarQuadrilInput)
  );

  function lerNumeroPositivo(input) {
    const valor = parseFloat(input.value);
    return valor > 0 ? valor : null;
  }

  // Valida os campos e devolve { erro } ou { sexo, altura, cintura, pescoco, quadril, percentualGordura }.
  function calcularAPartirDosCampos(sexoEl, alturaEl, cinturaEl, pescocoEl, quadrilEl) {
    const sexo = sexoEl.value;
    const alturaCm = lerNumeroPositivo(alturaEl);
    const cintura = lerNumeroPositivo(cinturaEl);
    const pescoco = lerNumeroPositivo(pescocoEl);
    const quadril = sexo === "F" ? lerNumeroPositivo(quadrilEl) : null;

    if (sexo !== "M" && sexo !== "F") return { erro: "Selecione o sexo." };
    if (!alturaCm) return { erro: "Informe uma altura válida." };
    if (!cintura) return { erro: "Informe uma circunferência da cintura válida." };
    if (!pescoco) return { erro: "Informe uma circunferência do pescoço válida." };
    if (sexo === "F" && !quadril) return { erro: "Informe uma circunferência do quadril válida." };

    const bruto = calcularPercentualGordura(sexo, alturaCm, cintura, pescoco, quadril);
    if (bruto === null) {
      return { erro: "As medidas informadas não permitem o cálculo. Confira cintura, pescoço e quadril." };
    }

    return { sexo, altura: alturaCm, cintura, pescoco, quadril, percentualGordura: Math.round(bruto * 10) / 10 };
  }

  function getComputedColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  function renderGrafico() {
    const historico = getHistoricoGorduraOrdenado();
    historicoAtual = historico;

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
    const valores = historico.map((registro) => registro.percentualGordura);
    const corAction = getComputedColor("--accent-action");

    if (chart) chart.destroy();

    chart = new Chart(chartCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "% Gordura",
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
        onClick: (event, elements) => {
          if (!elements.length) return;
          irParaRegistroAlimentarDoDia(historicoAtual[elements[0].index].data);
        },
        onHover: (event, elements) => {
          event.native.target.style.cursor = elements.length ? "pointer" : "default";
        },
      },
    });
  }

  // Registro mais recente (por data): valor + silhueta/categoria ACE.
  function renderResultadoAtual() {
    const historico = getHistoricoGorduraOrdenado();
    const ultimo = historico[historico.length - 1];

    if (!ultimo || !renderSilhuetaGordura(silhuetaEl, ultimo)) {
      resultadoEl.classList.add("hidden");
      return;
    }

    resultadoEl.classList.remove("hidden");
    resultadoDataEl.textContent = `— ${formatarDataBR(ultimo.data)}`;
    resultadoValorEl.textContent = `${ultimo.percentualGordura.toFixed(1)}%`;
  }

  function descreverMedidas(registro) {
    const partes = [`cint. ${registro.cintura}`, `pesc. ${registro.pescoco}`];
    if (registro.sexo === "F" && registro.quadril) partes.push(`quad. ${registro.quadril}`);
    return partes.join(" · ");
  }

  function renderLista() {
    const historico = getHistoricoGorduraOrdenado();

    renderResultadoAtual();
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
          <span class="record-item__valor">${registro.percentualGordura.toFixed(1)}%<small>(${descreverMedidas(registro)})</small></span>
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
    const registro = getHistoricoGordura().find((item) => item.id === id);
    if (!registro) return;
    editandoId = id;
    editarDataInput.value = registro.data;
    editarSexoInput.value = registro.sexo || "";
    editarAlturaInput.value = registro.altura ?? "";
    editarCinturaInput.value = registro.cintura;
    editarPescocoInput.value = registro.pescoco;
    editarQuadrilInput.value = registro.quadril ?? "";
    aplicarVisibilidadeQuadril(editarSexoInput, editarQuadrilField, editarQuadrilInput);
    editarFeedback.textContent = "";
    modalEditar.classList.remove("hidden");
  }

  function fecharModalEdicao() {
    modalEditar.classList.add("hidden");
    editandoId = null;
  }

  function excluirRegistro(id) {
    if (!confirm("Excluir este registro de % de gordura?")) return;
    deleteRegistroGordura(id);
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

    const data = editarDataInput.value;
    if (!data) {
      editarFeedback.textContent = "Informe a data.";
      return;
    }

    const resultado = calcularAPartirDosCampos(
      editarSexoInput,
      editarAlturaInput,
      editarCinturaInput,
      editarPescocoInput,
      editarQuadrilInput
    );
    if (resultado.erro) {
      editarFeedback.textContent = resultado.erro;
      return;
    }

    updateRegistroGordura(editandoId, { data, ...resultado });

    fecharModalEdicao();
    renderLista();
    renderGrafico();
  });

  function resetarFormulario() {
    form.reset();
    dataInput.value = hojeIso();
    aplicarVisibilidadeQuadril(sexoInput, quadrilField, quadrilInput);
    feedback.textContent = "";
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    feedback.textContent = "";

    const data = dataInput.value;
    if (!data) {
      feedback.textContent = "Informe a data.";
      return;
    }

    const resultado = calcularAPartirDosCampos(sexoInput, alturaInput, cinturaInput, pescocoInput, quadrilInput);
    if (resultado.erro) {
      feedback.textContent = resultado.erro;
      return;
    }

    addRegistroGordura({ id: Date.now().toString(), data, ...resultado });

    renderLista();
    renderGrafico();
    resetarFormulario();
  });

  btnNovoCalculo.addEventListener("click", resetarFormulario);

  renderLista();
  renderGrafico();
});
