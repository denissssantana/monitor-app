/* MONITOR — dados-pessoais.js
   Preenche, valida e salva os dados pessoais do atleta.
   Calcula a idade em tempo real a partir da data de nascimento. */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-dados-pessoais");
  const nomeInput = document.getElementById("nome");
  const dataNascInput = document.getElementById("data-nascimento");
  const idadeInput = document.getElementById("idade");
  const feedback = document.getElementById("form-feedback");

  const pesoAtualTextoEl = document.getElementById("peso-atual-texto");
  const chartPesoCanvas = document.getElementById("grafico-peso");
  const chartPesoEmpty = document.getElementById("peso-chart-empty");
  const pesoInicialInput = document.getElementById("peso-inicial-input");
  const metaPesoInput = document.getElementById("meta-peso-input");
  const pesoConfigFeedback = document.getElementById("peso-config-feedback");
  const btnSalvarPesoConfig = document.getElementById("btn-salvar-peso-config");
  const progressoBloco = document.getElementById("peso-progresso-bloco");
  const progressoEmpty = document.getElementById("peso-progresso-empty");
  const progressoPercentEl = document.getElementById("peso-progresso-percent");
  const progressoValoresEl = document.getElementById("peso-progresso-valores");
  const progressoFillEl = document.getElementById("peso-progress-fill");

  let chartPeso = null;

  function getComputedColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  function renderPesoAtualTexto() {
    const ultimoRegistro = getUltimoRegistroImc();
    pesoAtualTextoEl.textContent = ultimoRegistro ? `Peso Atual — ${ultimoRegistro.peso} kg` : "";
  }

  function renderGraficoPeso() {
    const historico = getHistoricoImcOrdenado();

    if (historico.length === 0) {
      chartPesoCanvas.classList.add("hidden");
      chartPesoEmpty.classList.remove("hidden");
      if (chartPeso) {
        chartPeso.destroy();
        chartPeso = null;
      }
      return;
    }

    chartPesoCanvas.classList.remove("hidden");
    chartPesoEmpty.classList.add("hidden");

    const labels = historico.map((registro) => formatarDataBR(registro.data));
    const valores = historico.map((registro) => registro.peso);
    const corAction = getComputedColor("--accent-action");

    if (chartPeso) chartPeso.destroy();

    chartPeso = new Chart(chartPesoCanvas.getContext("2d"), {
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

  function renderProgressoMetaPeso() {
    const progresso = getProgressoMetaPeso();

    progressoFillEl.classList.remove(
      "progress-bar-horizontal__fill--verde",
      "progress-bar-horizontal__fill--amarelo",
      "progress-bar-horizontal__fill--vermelho"
    );

    if (!progresso.temDados || !progresso.temMeta) {
      progressoBloco.classList.add("hidden");
      progressoEmpty.classList.remove("hidden");
      return;
    }

    progressoBloco.classList.remove("hidden");
    progressoEmpty.classList.add("hidden");

    progressoPercentEl.textContent = `${progresso.percentual}%`;
    progressoValoresEl.textContent = `${progresso.pesoAtual} kg / meta ${progresso.meta} kg`;
    progressoFillEl.style.width = `${progresso.percentual}%`;
    if (progresso.cor) progressoFillEl.classList.add(`progress-bar-horizontal__fill--${progresso.cor}`);
  }

  function prefillPesoConfig() {
    const pesoInicial = getInitialWeight();
    pesoInicialInput.value = pesoInicial || "";
    const meta = getWeightGoal();
    metaPesoInput.value = meta || "";
  }

  btnSalvarPesoConfig.addEventListener("click", () => {
    pesoConfigFeedback.textContent = "";
    pesoConfigFeedback.classList.remove("success");

    const pesoInicial = parseFloat(pesoInicialInput.value);
    if (!pesoInicial || pesoInicial <= 0) {
      pesoConfigFeedback.textContent = "Informe um peso inicial válido.";
      return;
    }

    const meta = parseFloat(metaPesoInput.value);
    if (!meta || meta <= 0) {
      pesoConfigFeedback.textContent = "Informe uma meta de peso válida.";
      return;
    }

    setInitialWeight(pesoInicial);
    setWeightGoal(meta);
    pesoConfigFeedback.textContent = "Dados salvos com sucesso.";
    pesoConfigFeedback.classList.add("success");
    renderProgressoMetaPeso();
  });

  function calcularIdade(dataNascimentoIso) {
    const nascimento = new Date(dataNascimentoIso + "T00:00:00");
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const aindaNaoFezAniversario =
      hoje.getMonth() < nascimento.getMonth() ||
      (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
    if (aindaNaoFezAniversario) idade--;
    return idade;
  }

  function atualizarIdade() {
    if (!dataNascInput.value) {
      idadeInput.value = "";
      return;
    }
    const idade = calcularIdade(dataNascInput.value);
    idadeInput.value = idade >= 0 ? `${idade} anos` : "Data inválida";
  }

  function preencherComDadosSalvos() {
    const dados = getDadosPessoais();
    if (!dados) return;

    nomeInput.value = dados.nome || "";
    dataNascInput.value = dados.dataNascimento || "";

    if (dados.sexo) {
      const radio = document.querySelector(`input[name="sexo"][value="${dados.sexo}"]`);
      if (radio) radio.checked = true;
    }

    atualizarIdade();
  }

  dataNascInput.addEventListener("input", atualizarIdade);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    feedback.textContent = "";
    feedback.classList.remove("success");

    const nome = nomeInput.value.trim();
    const dataNascimento = dataNascInput.value;
    const sexoSelecionado = document.querySelector('input[name="sexo"]:checked');

    if (!nome) {
      feedback.textContent = "Informe o nome.";
      return;
    }
    if (!dataNascimento) {
      feedback.textContent = "Informe a data de nascimento.";
      return;
    }
    if (new Date(dataNascimento + "T00:00:00") > new Date()) {
      feedback.textContent = "A data de nascimento não pode ser no futuro.";
      return;
    }
    if (!sexoSelecionado) {
      feedback.textContent = "Selecione o sexo.";
      return;
    }

    saveDadosPessoais({
      nome,
      dataNascimento,
      sexo: sexoSelecionado.value,
    });

    feedback.textContent = "Dados salvos com sucesso.";
    feedback.classList.add("success");
  });

  preencherComDadosSalvos();
  prefillPesoConfig();
  renderPesoAtualTexto();
  renderGraficoPeso();
  renderProgressoMetaPeso();
});
