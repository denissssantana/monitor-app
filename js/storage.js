/* =========================================================
   MONITOR — storage.js
   Camada única de acesso a dados. Hoje grava em localStorage;
   quando o backend Spring Boot existir, troque só o corpo
   destas funções por chamadas fetch() — as telas não mudam.

   ---------------------------------------------------------
   CONTRATO DE DADOS (vira o modelo do backend depois)
   ---------------------------------------------------------

   monitor_dados_pessoais  → objeto único
   {
     nome: string,
     dataNascimento: string,   // ISO "yyyy-mm-dd"
     sexo: "M" | "F" | "O"
   }

   monitor_historico_imc  → array de registros
   [
     {
       id: string,              // identificador único do registro
       data: string,            // ISO "yyyy-mm-dd" da pesagem
       peso: number,             // kg
       altura: number,           // cm
       imc: number,              // peso / (altura em metros)^2, 1 casa decimal
       classificacao: string     // texto conforme tabela da OMS
     }
   ]

   monitor_theme → "dark" | "light"

   monitor_registro_alimentar → objeto indexado por data ISO
   {
     "2026-08-23": [
       {
         id: string,
         titulo: string,          // "Café da Manhã" | "Lanche" | "Almoço" | "Jantar" | "Ceia"
         itens: [
           { id: string, nome: string, pt: number, ch: number, lp: number, kcal: number }
         ]
       }
     ]
   }

   monitor_alimentos_cadastrados → array de alimentos/pratos cadastrados
   [
     { id: string, nome: string, pt: number, ch: number, lp: number, kcal: number }
   ]

   monitor_config_exercicio → objeto único
   { tipoPeriodo: "semanal" | "quinzenal" | "mensal" }  // default para períodos novos

   monitor_periodos_exercicio → array plano com TODOS os períodos
   (passados, atual e futuros — nenhum é arquivado à parte; o
   percentual de conclusão é sempre calculado on-the-fly a partir
   dos treinos, nunca congelado)
   [
     {
       id: string,
       tipoPeriodo: "semanal" | "quinzenal" | "mensal",
       dataInicio: string,        // ISO "yyyy-mm-dd"
       dataFim: string,           // ISO "yyyy-mm-dd"
       atividades: [
         {
           id: string,
           nome: string,
           quantidadeTreinos: number,   // quantidade original cadastrada
           treinos: [
             { id: string, concluido: boolean }   // um item por treino gerado
           ]
         }
       ]
     }
   ]

   monitor_indice_periodo_exibido → string (id do período mostrado
   no carrossel da tela de Exercício Físico) ou null
   ========================================================= */

const STORAGE_KEYS = {
  DADOS_PESSOAIS: "monitor_dados_pessoais",
  HISTORICO_IMC: "monitor_historico_imc",
  THEME: "monitor_theme",
  REGISTRO_ALIMENTAR: "monitor_registro_alimentar",
  ALIMENTOS_CADASTRADOS: "monitor_alimentos_cadastrados",
  CONFIG_EXERCICIO: "monitor_config_exercicio",
  PERIODOS_EXERCICIO: "monitor_periodos_exercicio",
  INDICE_PERIODO_EXIBIDO: "monitor_indice_periodo_exibido",
};

function getDadosPessoais() {
  const raw = localStorage.getItem(STORAGE_KEYS.DADOS_PESSOAIS);
  return raw ? JSON.parse(raw) : null;
}

function saveDadosPessoais(dados) {
  localStorage.setItem(STORAGE_KEYS.DADOS_PESSOAIS, JSON.stringify(dados));
}

function getHistoricoImc() {
  const raw = localStorage.getItem(STORAGE_KEYS.HISTORICO_IMC);
  const historico = raw ? JSON.parse(raw) : [];

  let precisaMigrar = false;
  historico.forEach((registro) => {
    if (!registro.id) {
      registro.id = `${registro.data}-${Math.random().toString(36).slice(2, 8)}`;
      precisaMigrar = true;
    }
  });
  if (precisaMigrar) {
    localStorage.setItem(STORAGE_KEYS.HISTORICO_IMC, JSON.stringify(historico));
  }

  return historico;
}

function addRegistroImc(registro) {
  const historico = getHistoricoImc();
  historico.push(registro);
  localStorage.setItem(STORAGE_KEYS.HISTORICO_IMC, JSON.stringify(historico));
  return historico;
}

function updateRegistroImc(id, dadosAtualizados) {
  const historico = getHistoricoImc();
  const index = historico.findIndex((registro) => registro.id === id);
  if (index === -1) return historico;
  historico[index] = { ...historico[index], ...dadosAtualizados, id };
  localStorage.setItem(STORAGE_KEYS.HISTORICO_IMC, JSON.stringify(historico));
  return historico;
}

function deleteRegistroImc(id) {
  const historico = getHistoricoImc().filter((registro) => registro.id !== id);
  localStorage.setItem(STORAGE_KEYS.HISTORICO_IMC, JSON.stringify(historico));
  return historico;
}

function getRegistroAlimentarDia(dataIso) {
  const raw = localStorage.getItem(STORAGE_KEYS.REGISTRO_ALIMENTAR);
  const registroCompleto = raw ? JSON.parse(raw) : {};
  return registroCompleto[dataIso] || [];
}

function saveRegistroAlimentarDia(dataIso, refeicoes) {
  const raw = localStorage.getItem(STORAGE_KEYS.REGISTRO_ALIMENTAR);
  const registroCompleto = raw ? JSON.parse(raw) : {};
  registroCompleto[dataIso] = refeicoes;
  localStorage.setItem(STORAGE_KEYS.REGISTRO_ALIMENTAR, JSON.stringify(registroCompleto));
}

function getAlimentosCadastrados() {
  const raw = localStorage.getItem(STORAGE_KEYS.ALIMENTOS_CADASTRADOS);
  return raw ? JSON.parse(raw) : [];
}

function addAlimentoCadastrado(alimento) {
  const alimentos = getAlimentosCadastrados();
  alimentos.push(alimento);
  localStorage.setItem(STORAGE_KEYS.ALIMENTOS_CADASTRADOS, JSON.stringify(alimentos));
  return alimentos;
}

function buscarAlimento(query) {
  const termo = query.trim().toLowerCase();
  if (!termo) return [];
  return getAlimentosCadastrados().filter((alimento) => alimento.nome.toLowerCase().includes(termo));
}

function getConfigExercicio() {
  const raw = localStorage.getItem(STORAGE_KEYS.CONFIG_EXERCICIO);
  return raw ? JSON.parse(raw) : { tipoPeriodo: "semanal" };
}

function saveConfigExercicio(config) {
  localStorage.setItem(STORAGE_KEYS.CONFIG_EXERCICIO, JSON.stringify(config));
}

function getPeriodosExercicio() {
  const raw = localStorage.getItem(STORAGE_KEYS.PERIODOS_EXERCICIO);
  return raw ? JSON.parse(raw) : [];
}

function savePeriodosExercicio(periodos) {
  localStorage.setItem(STORAGE_KEYS.PERIODOS_EXERCICIO, JSON.stringify(periodos));
}

function getIndicePeriodoExibido() {
  return localStorage.getItem(STORAGE_KEYS.INDICE_PERIODO_EXIBIDO);
}

function saveIndicePeriodoExibido(id) {
  localStorage.setItem(STORAGE_KEYS.INDICE_PERIODO_EXIBIDO, id);
}

function getTheme() {
  return localStorage.getItem(STORAGE_KEYS.THEME);
}

function saveTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}
