/* MONITOR — avaliacao-nutricional.js
   Tela de Avaliação Nutricional: reúne dados já cadastrados
   (Dados Pessoais + IMC), calcula IMC / % de gordura corporal
   (método US Navy) e a Meta Calórica Diária (Mifflin-St Jeor +
   fator de atividade + ajuste manual).

   Organizado em 3 blocos, um por card, na mesma ordem da tela. */

document.addEventListener("DOMContentLoaded", () => {
  // Fator de atividade → valor interno usado no cálculo do TDEE.
  // O número nunca é exibido ao usuário, só a descrição do dia a dia.
  const ATIVIDADE_FATORES = {
    sedentario: 1.2,
    leve: 1.375,
    moderado: 1.55,
    intenso: 1.725,
    muito_intenso: 1.9,
  };

  const SEXO_LABEL = { M: "Masculino", F: "Feminino", O: "Outro" };

  // Mesma classificação de IMC (faixas da OMS) já usada em imc.js —
  // reaproduzida aqui para manter os dois cálculos de IMC do app
  // sempre consistentes entre si.
  function classificarImc(imc) {
    if (imc < 18.5) return "Abaixo do peso";
    if (imc < 25) return "Peso normal";
    if (imc < 30) return "Sobrepeso";
    if (imc < 35) return "Obesidade Grau I";
    if (imc < 40) return "Obesidade Grau II";
    return "Obesidade Grau III";
  }

  // Mesma lógica de cálculo de idade já usada em dados-pessoais.js.
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

  /* =========================================================
     CARD 1 — Informações do Usuário
     ========================================================= */

  const formMedidas = document.getElementById("form-medidas");
  const avNomeEl = document.getElementById("av-nome");
  const avIdadeEl = document.getElementById("av-idade");
  const avSexoEl = document.getElementById("av-sexo");
  const avAlturaEl = document.getElementById("av-altura");
  const avPesoInput = document.getElementById("av-peso");
  const avCinturaInput = document.getElementById("av-cintura");
  const avPescocoInput = document.getElementById("av-pescoco");
  const avQuadrilInput = document.getElementById("av-quadril");
  const medidasFeedback = document.getElementById("medidas-feedback");

  function preencherInfoSomenteLeitura() {
    const dados = getDadosPessoais();

    avNomeEl.value = dados && dados.nome ? dados.nome : "";
    avIdadeEl.value = dados && dados.dataNascimento ? `${calcularIdade(dados.dataNascimento)} anos` : "";
    avSexoEl.value = dados && dados.sexo ? SEXO_LABEL[dados.sexo] || dados.sexo : "";

    const altura = getAlturaAtual();
    avAlturaEl.value = altura ? `${altura} cm` : "";
  }

  function preencherMedidasSalvas() {
    const medidas = getAvaliacaoMedidas();
    avPesoInput.value = medidas.peso ?? "";
    avCinturaInput.value = medidas.cintura ?? "";
    avPescocoInput.value = medidas.pescoco ?? "";
    avQuadrilInput.value = medidas.quadril ?? "";
  }

  // Lê um campo numérico opcional do Card 1: retorna null se vazio,
  // ou o número se preenchido (validando que seja positivo).
  function lerCampoNumericoOpcional(input) {
    const valorBruto = input.value.trim();
    if (valorBruto === "") return { ok: true, valor: null };
    const valor = parseFloat(valorBruto);
    if (isNaN(valor) || valor <= 0) return { ok: false, valor: null };
    return { ok: true, valor };
  }

  formMedidas.addEventListener("submit", (event) => {
    event.preventDefault();
    medidasFeedback.textContent = "";
    medidasFeedback.classList.remove("success");

    const peso = lerCampoNumericoOpcional(avPesoInput);
    const cintura = lerCampoNumericoOpcional(avCinturaInput);
    const pescoco = lerCampoNumericoOpcional(avPescocoInput);
    const quadril = lerCampoNumericoOpcional(avQuadrilInput);

    if (!peso.ok || !cintura.ok || !pescoco.ok || !quadril.ok) {
      medidasFeedback.textContent = "Os campos preenchidos precisam ser números maiores que zero.";
      return;
    }

    saveAvaliacaoMedidas({
      peso: peso.valor,
      cintura: cintura.valor,
      pescoco: pescoco.valor,
      quadril: quadril.valor,
    });

    medidasFeedback.textContent = "Medidas salvas com sucesso.";
    medidasFeedback.classList.add("success");

    recalcularAvaliacaoCorporal();
    recalcularIngestaoAlimentar();
  });

  /* =========================================================
     CARD 2 — Avaliação Corporal
     ========================================================= */

  const corporalResultadoEl = document.getElementById("corporal-resultado");
  const corporalMensagemEl = document.getElementById("corporal-mensagem");
  const avImcValorEl = document.getElementById("av-imc-valor");
  const avImcClassificacaoEl = document.getElementById("av-imc-classificacao");
  const avGorduraValorEl = document.getElementById("av-gordura-valor");
  const avGorduraMetaEl = document.getElementById("av-gordura-meta");

  function calcularPercentualGorduraUsNavy(sexo, cinturaCm, pescocoCm, quadrilCm, alturaCm) {
    if (sexo === "M") {
      const base = cinturaCm - pescocoCm;
      if (base <= 0) return null;
      const denominador = 1.0324 - 0.19077 * Math.log10(base) + 0.15456 * Math.log10(alturaCm);
      return 495 / denominador - 450;
    }

    if (sexo === "F") {
      const base = cinturaCm + quadrilCm - pescocoCm;
      if (base <= 0) return null;
      const denominador = 1.29579 - 0.35004 * Math.log10(base) + 0.221 * Math.log10(alturaCm);
      return 495 / denominador - 450;
    }

    return null;
  }

  function recalcularAvaliacaoCorporal() {
    const dados = getDadosPessoais();
    const alturaCm = getAlturaAtual();
    const medidas = getAvaliacaoMedidas();

    if (!alturaCm) {
      corporalResultadoEl.classList.add("hidden");
      corporalMensagemEl.textContent = "Registre sua altura na tela de IMC para calcular a Avaliação Corporal.";
      return;
    }

    corporalResultadoEl.classList.remove("hidden");
    corporalMensagemEl.textContent = "";

    // --- IMC: só depende de peso + altura ---
    if (medidas.peso) {
      const alturaM = alturaCm / 100;
      const imc = medidas.peso / (alturaM * alturaM);
      avImcValorEl.textContent = imc.toFixed(1);
      avImcClassificacaoEl.textContent = classificarImc(imc);
    } else {
      avImcValorEl.textContent = "--";
      avImcClassificacaoEl.textContent = "Informe o peso atual no Card 1.";
    }

    // --- % de gordura corporal (método US Navy): depende do sexo
    //     (Masculino ou Feminino) + cintura + pescoço + quadril (mulheres) ---
    const sexo = dados && dados.sexo;

    if (sexo !== "M" && sexo !== "F") {
      avGorduraValorEl.textContent = "--";
      avGorduraMetaEl.textContent =
        "Defina o sexo (Masculino ou Feminino) em Dados Pessoais para calcular.";
      return;
    }

    const faltando = [];
    if (!medidas.cintura) faltando.push("cintura");
    if (!medidas.pescoco) faltando.push("pescoço");
    if (sexo === "F" && !medidas.quadril) faltando.push("quadril");

    if (faltando.length > 0) {
      avGorduraValorEl.textContent = "--";
      avGorduraMetaEl.textContent = `Complete a circunferência do(a) ${faltando.join(", ")} no Card 1 para calcular.`;
      return;
    }

    const percentualGordura = calcularPercentualGorduraUsNavy(
      sexo,
      medidas.cintura,
      medidas.pescoco,
      medidas.quadril,
      alturaCm
    );

    if (percentualGordura === null || !isFinite(percentualGordura)) {
      avGorduraValorEl.textContent = "--";
      avGorduraMetaEl.textContent = "As medidas informadas não permitem o cálculo. Confira cintura, pescoço e quadril.";
      return;
    }

    avGorduraValorEl.textContent = `${percentualGordura.toFixed(1)}%`;
    avGorduraMetaEl.textContent = "Método US Navy";
  }

  /* =========================================================
     CARD 3 — Ingestão Alimentar
     ========================================================= */

  const ingestaoMensagemEl = document.getElementById("ingestao-mensagem");
  const ingestaoConteudoEl = document.getElementById("ingestao-conteudo");
  const tmbTextoEl = document.getElementById("tmb-texto");
  const avTdeeValorEl = document.getElementById("av-tdee-valor");
  const avAjusteInput = document.getElementById("av-ajuste");
  const avMetaValorEl = document.getElementById("av-meta-valor");
  const metaCaloricaFeedback = document.getElementById("meta-calorica-feedback");
  const btnSalvarMetaCalorica = document.getElementById("btn-salvar-meta-calorica");

  function getFatorAtividadeMarcado() {
    const radio = document.querySelector('input[name="fator-atividade"]:checked');
    return radio ? radio.value : null;
  }

  function calcularTmb(sexo, pesoKg, alturaCm, idade) {
    const base = 10 * pesoKg + 6.25 * alturaCm - 5 * idade;
    return sexo === "M" ? base + 5 : base - 161;
  }

  // Recalcula TMB → TDEE → Meta Calórica Diária a partir do estado
  // atual da tela. Só exibe/atualiza os números; a persistência
  // (storage) acontece exclusivamente no clique de "Salvar".
  function recalcularIngestaoAlimentar() {
    const dados = getDadosPessoais();
    const alturaCm = getAlturaAtual();
    const medidas = getAvaliacaoMedidas();
    const sexo = dados && dados.sexo;
    const idade = dados && dados.dataNascimento ? calcularIdade(dados.dataNascimento) : null;

    const dadosCompletos = alturaCm && medidas.peso && idade !== null && (sexo === "M" || sexo === "F");

    if (!dadosCompletos) {
      ingestaoConteudoEl.classList.add("hidden");
      ingestaoMensagemEl.textContent =
        "Complete os Dados Pessoais (sexo e data de nascimento), a altura em IMC e o peso atual no Card 1 para calcular sua ingestão alimentar.";
      return;
    }

    ingestaoConteudoEl.classList.remove("hidden");
    ingestaoMensagemEl.textContent = "";

    const tmb = calcularTmb(sexo, medidas.peso, alturaCm, idade);
    tmbTextoEl.textContent = `TMB estimada — ${Math.round(tmb)} kcal`;

    const fatorChave = getFatorAtividadeMarcado();
    if (!fatorChave) {
      avTdeeValorEl.textContent = "--";
      avMetaValorEl.textContent = "--";
      return;
    }

    const tdee = tmb * ATIVIDADE_FATORES[fatorChave];
    avTdeeValorEl.textContent = Math.round(tdee);

    const ajusteRaw = avAjusteInput.value.trim();
    const ajuste = ajusteRaw === "" ? 0 : parseFloat(ajusteRaw);
    const metaFinal = tdee + (isNaN(ajuste) ? 0 : ajuste);
    avMetaValorEl.textContent = Math.round(metaFinal);
  }

  document.getElementById("fator-atividade-group").addEventListener("change", recalcularIngestaoAlimentar);
  avAjusteInput.addEventListener("input", recalcularIngestaoAlimentar);

  btnSalvarMetaCalorica.addEventListener("click", () => {
    metaCaloricaFeedback.textContent = "";
    metaCaloricaFeedback.classList.remove("success");

    const fatorChave = getFatorAtividadeMarcado();
    if (!fatorChave) {
      metaCaloricaFeedback.textContent = "Selecione um nível de atividade física.";
      return;
    }

    const ajusteRaw = avAjusteInput.value.trim();
    const ajuste = ajusteRaw === "" ? 0 : parseFloat(ajusteRaw);
    if (isNaN(ajuste)) {
      metaCaloricaFeedback.textContent = "Informe um ajuste de Kcal válido.";
      return;
    }

    const dados = getDadosPessoais();
    const alturaCm = getAlturaAtual();
    const medidas = getAvaliacaoMedidas();
    const idade = calcularIdade(dados.dataNascimento);
    const tmb = calcularTmb(dados.sexo, medidas.peso, alturaCm, idade);
    const tdee = tmb * ATIVIDADE_FATORES[fatorChave];
    const metaFinal = Math.round(tdee + ajuste);

    setFatorAtividadeSelecionado(fatorChave);
    setAjusteKcal(ajuste);

    // IMPORTANTE: a Meta Calórica Diária calculada aqui grava direto em
    // monitor_meta_kcal_dia — a MESMA chave que o modal "Metas Diárias"
    // do Registro Alimentar usa (getMetaKcalDia/setMetaKcalDia em
    // storage.js). Isso evita duas metas de Kcal divergentes no app:
    // Registro Alimentar e Dashboard já leem dessa chave, então o valor
    // definido aqui passa a valer imediatamente nas duas telas.
    setMetaKcalDia(metaFinal);

    metaCaloricaFeedback.textContent = "Meta salva com sucesso! Ela já é usada como Meta de Kcal no Registro Alimentar e no Dashboard.";
    metaCaloricaFeedback.classList.add("success");
  });

  function preencherFatorEAjusteSalvos() {
    const fatorSalvo = getFatorAtividadeSelecionado();
    if (fatorSalvo) {
      const radio = document.querySelector(`input[name="fator-atividade"][value="${fatorSalvo}"]`);
      if (radio) radio.checked = true;
    }
    avAjusteInput.value = getAjusteKcal();
  }

  /* =========================================================
     Inicialização
     ========================================================= */

  preencherInfoSomenteLeitura();
  preencherMedidasSalvas();
  preencherFatorEAjusteSalvos();
  recalcularAvaliacaoCorporal();
  recalcularIngestaoAlimentar();
});
