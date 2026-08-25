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
           {
             id: string,
             nome: string,
             quantidade: number,        // quantidade real consumida
             unidade: "g" | "ml" | "uni",
             pt: number, ch: number, lp: number, kcal: number,
             // valores ABSOLUTOS já referentes à quantidade consumida
             // (se veio da base, já escalados a partir da referência;
             // se digitado livre, o valor informado pelo usuário)
             alimentoBaseId: string | null   // origem na base, se houver
           }
         ]
       }
     ]
   }

   monitor_alimentos_base → array da base reutilizável de alimentos/pratos
   [
     {
       id: string,
       nome: string,
       quantidadeReferencia: number,  // ex.: 100
       unidade: "g" | "ml" | "uni",
       pt: number, ch: number, lp: number, kcal: number,
       // valores nutricionais correspondentes à quantidadeReferencia
       tipo: "componente" | "refeicao_completa"
       // "componente": alimento simples (ex.: arroz, ovo)
       // "refeicao_completa": prato pronto/marmita — mesmo cálculo,
       // campo é só classificação (prepara migração ao backend)
     }
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
             { id: string, concluido: boolean, data: string }
             // um item por treino gerado; "data" (ISO) é atribuída
             // automaticamente distribuindo os treinos pelos dias do
             // período — usada para o gráfico "semáforo" por dia
           ]
         }
       ]
     }
   ]

   monitor_indice_periodo_exibido → string (id do período mostrado
   no carrossel da tela de Exercício Físico) ou null

   monitor_altura_atual → number (cm) ou null
   Altura é um dado fixo, editável mas não solicitado a cada novo
   registro de IMC. Cada registro do histórico ainda guarda sua
   própria altura (necessária para o cálculo daquele IMC), mas o
   formulário de novo registro é pré-preenchido com este valor.

   monitor_meta_kcal_dia → number (kcal) ou null
   Meta diária de Kcal, definida uma vez e reaproveitada em todos
   os dias até o usuário alterá-la. Base do percentual exibido nas
   barras de status de Alimentação (tela e Dashboard).
   ========================================================= */

const STORAGE_KEYS = {
  DADOS_PESSOAIS: "monitor_dados_pessoais",
  HISTORICO_IMC: "monitor_historico_imc",
  THEME: "monitor_theme",
  REGISTRO_ALIMENTAR: "monitor_registro_alimentar",
  ALIMENTOS_BASE: "monitor_alimentos_base",
  CONFIG_EXERCICIO: "monitor_config_exercicio",
  PERIODOS_EXERCICIO: "monitor_periodos_exercicio",
  INDICE_PERIODO_EXIBIDO: "monitor_indice_periodo_exibido",
  ALTURA_ATUAL: "monitor_altura_atual",
  META_KCAL_DIA: "monitor_meta_kcal_dia",
};

function getHojeIso() {
  return formatarDataIso(new Date());
}

function formatarDataIso(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarDataBR(dataIso) {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano.slice(2)}`;
}

function addDiasIso(dataIso, dias) {
  const data = new Date(dataIso + "T00:00:00");
  data.setDate(data.getDate() + dias);
  return formatarDataIso(data);
}

function getDadosPessoais() {
  const raw = localStorage.getItem(STORAGE_KEYS.DADOS_PESSOAIS);
  return raw ? JSON.parse(raw) : null;
}

function saveDadosPessoais(dados) {
  localStorage.setItem(STORAGE_KEYS.DADOS_PESSOAIS, JSON.stringify(dados));
}

function getNomeUsuario() {
  const dados = getDadosPessoais();
  return dados && dados.nome ? dados.nome : "";
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

function getHistoricoImcOrdenado() {
  return getHistoricoImc()
    .slice()
    .sort((a, b) => a.data.localeCompare(b.data));
}

function getUltimoRegistroImc() {
  const historico = getHistoricoImcOrdenado();
  return historico.length > 0 ? historico[historico.length - 1] : null;
}

function getAlturaAtual() {
  const raw = localStorage.getItem(STORAGE_KEYS.ALTURA_ATUAL);
  if (raw !== null) return parseFloat(raw);

  const ultimoRegistro = getUltimoRegistroImc();
  if (ultimoRegistro) {
    setAlturaAtual(ultimoRegistro.altura);
    return ultimoRegistro.altura;
  }

  return null;
}

function setAlturaAtual(altura) {
  localStorage.setItem(STORAGE_KEYS.ALTURA_ATUAL, String(altura));
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

function getRegistroAlimentarPorData(dataIso) {
  return getRegistroAlimentarDia(dataIso);
}

function adicionarAlimentoNaRefeicao(dataIso, refeicaoId, item) {
  const refeicoes = getRegistroAlimentarDia(dataIso);
  const refeicao = refeicoes.find((r) => r.id === refeicaoId);
  if (!refeicao) return refeicoes;
  refeicao.itens.push(item);
  saveRegistroAlimentarDia(dataIso, refeicoes);
  return refeicoes;
}

function editarAlimentoDaRefeicao(dataIso, refeicaoId, itemId, novosValores) {
  const refeicoes = getRegistroAlimentarDia(dataIso);
  const refeicao = refeicoes.find((r) => r.id === refeicaoId);
  if (!refeicao) return refeicoes;
  const index = refeicao.itens.findIndex((item) => item.id === itemId);
  if (index === -1) return refeicoes;
  refeicao.itens[index] = { ...refeicao.itens[index], ...novosValores, id: itemId };
  saveRegistroAlimentarDia(dataIso, refeicoes);
  return refeicoes;
}

function excluirAlimentoDaRefeicao(dataIso, refeicaoId, itemId) {
  const refeicoes = getRegistroAlimentarDia(dataIso);
  const refeicao = refeicoes.find((r) => r.id === refeicaoId);
  if (!refeicao) return refeicoes;
  refeicao.itens = refeicao.itens.filter((item) => item.id !== itemId);
  saveRegistroAlimentarDia(dataIso, refeicoes);
  return refeicoes;
}

function getTotaisAlimentaresDoDia(dataIso) {
  const refeicoes = getRegistroAlimentarDia(dataIso);
  const totais = { pt: 0, ch: 0, lp: 0, kcal: 0, temRegistros: false };

  refeicoes.forEach((refeicao) => {
    refeicao.itens.forEach((item) => {
      totais.pt += Number(item.pt) || 0;
      totais.ch += Number(item.ch) || 0;
      totais.lp += Number(item.lp) || 0;
      totais.kcal += Number(item.kcal) || 0;
      totais.temRegistros = true;
    });
  });

  return totais;
}

function getMetaKcalDia() {
  const raw = localStorage.getItem(STORAGE_KEYS.META_KCAL_DIA);
  return raw !== null ? parseFloat(raw) : null;
}

function setMetaKcalDia(valor) {
  localStorage.setItem(STORAGE_KEYS.META_KCAL_DIA, String(valor));
}

function getFaixaCorKcal(kcalConsumida, metaKcalDia) {
  if (!metaKcalDia) return null;
  const percentual = (kcalConsumida / metaKcalDia) * 100;
  if (percentual <= 100) return "verde";
  if (percentual <= 120) return "amarelo";
  return "vermelho";
}

function getAlimentosBase() {
  const raw = localStorage.getItem(STORAGE_KEYS.ALIMENTOS_BASE);
  return raw ? JSON.parse(raw) : [];
}

function salvarAlimentoBase(alimento) {
  const alimentos = getAlimentosBase();
  alimentos.push(alimento);
  localStorage.setItem(STORAGE_KEYS.ALIMENTOS_BASE, JSON.stringify(alimentos));
  return alimentos;
}

function editarAlimentoBase(id, novosValores) {
  const alimentos = getAlimentosBase();
  const index = alimentos.findIndex((alimento) => alimento.id === id);
  if (index === -1) return alimentos;
  alimentos[index] = { ...alimentos[index], ...novosValores, id };
  localStorage.setItem(STORAGE_KEYS.ALIMENTOS_BASE, JSON.stringify(alimentos));
  return alimentos;
}

function excluirAlimentoBase(id) {
  const alimentos = getAlimentosBase().filter((alimento) => alimento.id !== id);
  localStorage.setItem(STORAGE_KEYS.ALIMENTOS_BASE, JSON.stringify(alimentos));
  return alimentos;
}

function buscarAlimentoBase(query) {
  const termo = query.trim().toLowerCase();
  if (!termo) return [];
  return getAlimentosBase().filter((alimento) => alimento.nome.toLowerCase().includes(termo));
}

function getConfigExercicio() {
  const raw = localStorage.getItem(STORAGE_KEYS.CONFIG_EXERCICIO);
  return raw ? JSON.parse(raw) : { tipoPeriodo: "semanal" };
}

function saveConfigExercicio(config) {
  localStorage.setItem(STORAGE_KEYS.CONFIG_EXERCICIO, JSON.stringify(config));
}

function distribuirDatasTreinos(dataInicio, dataFim, quantidade) {
  const inicio = new Date(dataInicio + "T00:00:00");
  const fim = new Date(dataFim + "T00:00:00");
  const totalDias = Math.max(1, Math.round((fim - inicio) / 86400000) + 1);
  const datas = [];
  for (let i = 0; i < quantidade; i++) {
    const offset = Math.floor((i * totalDias) / quantidade);
    const data = new Date(inicio);
    data.setDate(data.getDate() + offset);
    datas.push(formatarDataIso(data));
  }
  return datas;
}

function getPeriodosExercicio() {
  const raw = localStorage.getItem(STORAGE_KEYS.PERIODOS_EXERCICIO);
  const periodos = raw ? JSON.parse(raw) : [];

  let precisaMigrar = false;
  periodos.forEach((periodo) => {
    periodo.atividades.forEach((atividade) => {
      const semData = atividade.treinos.some((treino) => !treino.data);
      if (semData) {
        const datas = distribuirDatasTreinos(periodo.dataInicio, periodo.dataFim, atividade.treinos.length);
        atividade.treinos.forEach((treino, index) => {
          if (!treino.data) treino.data = datas[index];
        });
        precisaMigrar = true;
      }
    });
  });
  if (precisaMigrar) {
    localStorage.setItem(STORAGE_KEYS.PERIODOS_EXERCICIO, JSON.stringify(periodos));
  }

  return periodos;
}

function getFaixaCorDiaExercicio(percentual) {
  if (percentual >= 100) return "verde";
  if (percentual > 0) return "amarelo";
  return "vermelho";
}

function getTreinosPorDiaOrdenado() {
  const periodos = getPeriodosExercicio();
  const porDia = {};

  periodos.forEach((periodo) => {
    periodo.atividades.forEach((atividade) => {
      atividade.treinos.forEach((treino) => {
        if (!treino.data) return;
        if (!porDia[treino.data]) porDia[treino.data] = { data: treino.data, total: 0, concluidos: 0 };
        porDia[treino.data].total += 1;
        if (treino.concluido) porDia[treino.data].concluidos += 1;
      });
    });
  });

  return Object.values(porDia)
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((dia) => {
      const percentual = dia.total === 0 ? 0 : Math.round((dia.concluidos / dia.total) * 1000) / 10;
      return { ...dia, percentual, cor: getFaixaCorDiaExercicio(percentual) };
    });
}

function savePeriodosExercicio(periodos) {
  localStorage.setItem(STORAGE_KEYS.PERIODOS_EXERCICIO, JSON.stringify(periodos));
}

function getFaixaCorPeriodo(percentual) {
  if (percentual >= 80) return "verde";
  if (percentual >= 50) return "amarelo";
  return "vermelho";
}

function getPeriodosParaGrafico() {
  return getPeriodosExercicio()
    .slice()
    .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio))
    .map((periodo) => {
      let total = 0;
      let concluidos = 0;
      periodo.atividades.forEach((atividade) => {
        total += atividade.treinos.length;
        concluidos += atividade.treinos.filter((treino) => treino.concluido).length;
      });
      const percentual = total === 0 ? 0 : Math.round((concluidos / total) * 1000) / 10;
      return {
        id: periodo.id,
        dataInicio: periodo.dataInicio,
        dataFim: periodo.dataFim,
        percentual,
        cor: getFaixaCorPeriodo(percentual),
      };
    });
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
