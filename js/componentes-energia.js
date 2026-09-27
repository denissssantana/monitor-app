/* MONITOR — componentes-energia.js
   Componentes de tela compartilhados para cálculo de gasto calórico:
   - Nível de atividade física (radios em linguagem simples; o número
     do fator nunca é exibido ao usuário)
   - Ajuste manual (+/− kcal) com o texto explicativo de déficit/superávit
   Mesma marcação/textos/fatores da Avaliação Nutricional. Não dependem
   de nenhuma tela nem de storage — cada tela decide onde persistir. */

// Chave → fator interno + descrição exibida. Mesmas chaves gravadas em
// monitor_avaliacao_fator_atividade, para manter compatibilidade.
const FATORES_ATIVIDADE = [
  { chave: "sedentario", fator: 1.2, descricao: "Pouco ou nenhum exercício, rotina parada" },
  { chave: "leve", fator: 1.375, descricao: "Exercício leve, 1 a 3 vezes por semana" },
  { chave: "moderado", fator: 1.55, descricao: "Exercício moderado, 3 a 5 vezes por semana" },
  { chave: "intenso", fator: 1.725, descricao: "Exercício intenso, 6 a 7 vezes por semana" },
  {
    chave: "muito_intenso",
    fator: 1.9,
    descricao: "Exercício muito intenso todos os dias, ou trabalho físico pesado + treino",
  },
];

function getFatorAtividadePorChave(chave) {
  const item = FATORES_ATIVIDADE.find((opcao) => opcao.chave === chave);
  return item ? item.fator : null;
}

// Monta o bloco "Nível de atividade física" dentro de `container`.
// `prefixo` evita colisão de ids/name se houver mais de um na página.
// Retorna { getChave, setChave, getFator, aoMudar(callback) }.
function montarFatorAtividade(container, prefixo) {
  const name = `${prefixo}-fator-atividade`;

  const opcoesHtml = FATORES_ATIVIDADE.map(
    (opcao) => `
      <div class="radio-option">
        <input type="radio" id="${prefixo}-fator-${opcao.chave}" name="${name}" value="${opcao.chave}" />
        <label for="${prefixo}-fator-${opcao.chave}">${opcao.descricao}</label>
      </div>`
  ).join("");

  container.innerHTML = `
    <div class="field">
      <label>Nível de atividade física</label>
      <div class="radio-group radio-group--stack">${opcoesHtml}</div>
    </div>`;

  const grupo = container.querySelector(".radio-group");

  function getChave() {
    const marcado = grupo.querySelector(`input[name="${name}"]:checked`);
    return marcado ? marcado.value : null;
  }

  return {
    getChave,
    getFator: () => getFatorAtividadePorChave(getChave()),
    setChave(chave) {
      const radio = grupo.querySelector(`input[name="${name}"][value="${chave}"]`);
      if (radio) radio.checked = true;
    },
    aoMudar(callback) {
      grupo.addEventListener("change", callback);
    },
  };
}

// Monta o campo "Ajuste (kcal)" + texto explicativo dentro de `container`.
// Retorna { getValor, setValor, aoMudar(callback) }.
// getValor(): 0 se vazio, número se válido, NaN se inválido.
function montarAjusteKcal(container, prefixo) {
  const id = `${prefixo}-ajuste`;

  container.innerHTML = `
    <div class="field">
      <label for="${id}">Ajuste (kcal)</label>
      <input type="number" id="${id}" step="50" inputmode="decimal" placeholder="Ex.: -300 ou +300" />
    </div>
    <p class="form-feedback">Ajuste negativo gera déficit calórico (perda de peso). Ajuste positivo gera superávit calórico (ganho de peso).</p>`;

  const input = container.querySelector(`#${id}`);

  return {
    getValor() {
      const bruto = input.value.trim();
      return bruto === "" ? 0 : parseFloat(bruto);
    },
    setValor(valor) {
      input.value = valor === null || valor === undefined ? "" : valor;
    },
    aoMudar(callback) {
      input.addEventListener("input", callback);
    },
  };
}
