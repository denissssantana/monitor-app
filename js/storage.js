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
   ========================================================= */

const STORAGE_KEYS = {
  DADOS_PESSOAIS: "monitor_dados_pessoais",
  HISTORICO_IMC: "monitor_historico_imc",
  THEME: "monitor_theme",
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
  return raw ? JSON.parse(raw) : [];
}

function addRegistroImc(registro) {
  const historico = getHistoricoImc();
  historico.push(registro);
  localStorage.setItem(STORAGE_KEYS.HISTORICO_IMC, JSON.stringify(historico));
  return historico;
}

function getTheme() {
  return localStorage.getItem(STORAGE_KEYS.THEME);
}

function saveTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}
