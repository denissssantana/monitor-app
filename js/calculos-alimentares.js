/* MONITOR — calculos-alimentares.js
   Tela "Cálculos Alimentares": recomendação calórica diária por
   método selecionável. Independente das outras telas — depende só de
   calculos.js (fórmulas), componentes-energia.js (fator de atividade
   e ajuste de kcal) e da própria chave no storage.

   Organizado em blocos, na mesma ordem da tela:
   seletor de método / campos / fator de atividade / cálculo / resultado. */

document.addEventListener("DOMContentLoaded", () => {
  /* =========================================================
     Métodos disponíveis
     Cada método declara os campos que exige (data-campo no HTML)
     e como calcula a TMB a partir desses valores. Um método futuro
     com outros campos só precisa declarar a própria lista aqui
     (e ter os campos correspondentes no HTML).
     ========================================================= */

  const METODOS_CALCULO = {
    harris_benedict: {
      nome: "Harris-Benedict",
      campos: ["sexo", "idade", "peso", "altura"],
      calcularTmb: (v) => calcularTmbHarrisBenedict(v.sexo, v.peso, v.altura, v.idade),
      fonte: null,
    },
    mifflin_st_jeor: {
      nome: "Mifflin-St Jeor",
      campos: ["sexo", "idade", "peso", "altura"],
      calcularTmb: (v) => calcularTmbMifflinStJeor(v.sexo, v.peso, v.altura, v.idade),
      fonte:
        "Método Mifflin-St Jeor — recomendado pela Academy of Nutrition and Dietetics (EUA) como a equação mais precisa para estimativa de gasto calórico em adultos.",
    },
  };

  const METODO_PADRAO = "harris_benedict";

  /* =========================================================
     BLOCO 1 — Seletor de método
     ========================================================= */

  const metodoSelect = document.getElementById("ca-metodo");

  metodoSelect.innerHTML = Object.entries(METODOS_CALCULO)
    .map(([chave, metodo]) => `<option value="${chave}">${metodo.nome}</option>`)
    .join("");

  function getMetodoAtual() {
    return METODOS_CALCULO[metodoSelect.value] || METODOS_CALCULO[METODO_PADRAO];
  }

  /* =========================================================
     BLOCO 2 — Campos de entrada
     ========================================================= */

  // Campo → { elemento, leitura do valor validado (null se vazio/inválido) }
  const CAMPOS = {
    sexo: {
      el: document.getElementById("ca-sexo"),
      ler: (el) => (el.value === "M" || el.value === "F" ? el.value : null),
      rotulo: "sexo",
    },
    idade: {
      el: document.getElementById("ca-idade"),
      ler: (el) => {
        const valor = parseFloat(el.value);
        return valor > 0 ? valor : null;
      },
      rotulo: "idade",
    },
    peso: {
      el: document.getElementById("ca-peso"),
      ler: (el) => {
        const valor = parseFloat(el.value);
        return valor > 0 ? valor : null;
      },
      rotulo: "peso",
    },
    altura: {
      el: document.getElementById("ca-altura"),
      ler: (el) => {
        const valor = parseFloat(el.value);
        return valor > 0 ? valor : null;
      },
      rotulo: "altura",
    },
  };

  // Mostra só os campos do método atual. Os valores dos campos ocultos
  // não são apagados, então voltar a um método anterior mantém o que
  // já foi digitado. Linhas (.field-row) sem nenhum campo visível somem.
  function aplicarCamposDoMetodo() {
    const exigidos = getMetodoAtual().campos;

    document.querySelectorAll("[data-campo]").forEach((fieldEl) => {
      fieldEl.classList.toggle("hidden", !exigidos.includes(fieldEl.dataset.campo));
    });

    document.querySelectorAll(".field-row").forEach((linhaEl) => {
      const temVisivel = [...linhaEl.querySelectorAll("[data-campo]")].some(
        (fieldEl) => !fieldEl.classList.contains("hidden")
      );
      linhaEl.classList.toggle("hidden", !temVisivel);
    });
  }

  /* =========================================================
     BLOCO 3 — Fator de atividade (componente compartilhado)
     ========================================================= */

  const fatorAtividade = montarFatorAtividade(document.getElementById("ca-fator-atividade"), "ca");

  /* =========================================================
     BLOCO 4 — Cálculo
     Devolve { erro } ou { tmb, tdee, meta }.
     ========================================================= */

  const ajusteKcal = montarAjusteKcal(document.getElementById("ca-ajuste-kcal"), "ca");

  function calcular() {
    const metodo = getMetodoAtual();
    const valores = {};
    const faltando = [];

    metodo.campos.forEach((nomeCampo) => {
      const campo = CAMPOS[nomeCampo];
      const valor = campo.ler(campo.el);
      if (valor === null) faltando.push(campo.rotulo);
      valores[nomeCampo] = valor;
    });

    if (faltando.length > 0) {
      return { erro: `Preencha ${faltando.join(", ")} para calcular.` };
    }

    const tmb = metodo.calcularTmb(valores);
    if (tmb === null || !isFinite(tmb)) {
      return { erro: "Os dados informados não permitem o cálculo." };
    }

    const fator = fatorAtividade.getFator();
    if (!fator) {
      return { tmb, erro: "Selecione o nível de atividade física." };
    }

    const tdee = calcularTdee(tmb, fator);
    const ajuste = ajusteKcal.getValor();
    const meta = isNaN(ajuste) ? tdee : tdee + ajuste;

    return { tmb, tdee, meta };
  }

  /* =========================================================
     BLOCO 5 — Resultado
     ========================================================= */

  const mensagemEl = document.getElementById("ca-mensagem");
  const resultadoEl = document.getElementById("ca-resultado");
  const tmbTextoEl = document.getElementById("ca-tmb-texto");
  const tdeeValorEl = document.getElementById("ca-tdee-valor");
  const metaValorEl = document.getElementById("ca-meta-valor");
  const fonteEl = document.getElementById("ca-fonte");

  function renderResultado() {
    const metodo = getMetodoAtual();
    const resultado = calcular();

    fonteEl.textContent = metodo.fonte || "";
    fonteEl.classList.toggle("hidden", !metodo.fonte);

    // Sem TMB (dados incompletos): esconde o bloco de números.
    if (resultado.tmb === undefined) {
      resultadoEl.classList.add("hidden");
      mensagemEl.textContent = resultado.erro;
      return;
    }

    resultadoEl.classList.remove("hidden");
    tmbTextoEl.textContent = `TMB estimada (${metodo.nome}) — ${Math.round(resultado.tmb)} kcal`;

    // TMB pronta, mas falta o fator de atividade.
    if (resultado.erro) {
      mensagemEl.textContent = resultado.erro;
      tdeeValorEl.textContent = "--";
      metaValorEl.textContent = "--";
      return;
    }

    mensagemEl.textContent = "";
    tdeeValorEl.textContent = Math.round(resultado.tdee);
    metaValorEl.textContent = Math.round(resultado.meta);
  }

  /* =========================================================
     Persistência (chave própria da tela) e inicialização
     ========================================================= */

  function numeroOuNull(el) {
    const valor = parseFloat(el.value);
    return isNaN(valor) ? null : valor;
  }

  function salvarEstado() {
    const ajuste = ajusteKcal.getValor();
    saveCalculosAlimentares({
      metodo: metodoSelect.value,
      sexo: CAMPOS.sexo.el.value,
      idade: numeroOuNull(CAMPOS.idade.el),
      peso: numeroOuNull(CAMPOS.peso.el),
      altura: numeroOuNull(CAMPOS.altura.el),
      fatorAtividade: fatorAtividade.getChave(),
      ajusteKcal: isNaN(ajuste) ? null : ajuste,
    });
  }

  function restaurarEstado() {
    const estado = getCalculosAlimentares();
    metodoSelect.value = estado && METODOS_CALCULO[estado.metodo] ? estado.metodo : METODO_PADRAO;
    if (!estado) return;

    CAMPOS.sexo.el.value = estado.sexo || "";
    CAMPOS.idade.el.value = estado.idade ?? "";
    CAMPOS.peso.el.value = estado.peso ?? "";
    CAMPOS.altura.el.value = estado.altura ?? "";
    if (estado.fatorAtividade) fatorAtividade.setChave(estado.fatorAtividade);
    if (estado.ajusteKcal) ajusteKcal.setValor(estado.ajusteKcal);
  }

  function aoAlterar() {
    renderResultado();
    salvarEstado();
  }

  metodoSelect.addEventListener("change", () => {
    aplicarCamposDoMetodo();
    aoAlterar();
  });
  Object.values(CAMPOS).forEach((campo) => campo.el.addEventListener("input", aoAlterar));
  CAMPOS.sexo.el.addEventListener("change", aoAlterar);
  fatorAtividade.aoMudar(aoAlterar);
  ajusteKcal.aoMudar(aoAlterar);

  restaurarEstado();
  aplicarCamposDoMetodo();
  renderResultado();
});
