/* MONITOR — calculos.js
   Fórmulas puras compartilhadas entre telas (sem DOM, sem storage).
   Telas que usam a mesma conta dependem só daqui, nunca uma da outra. */

// % de gordura corporal — método US Navy (medidas em cm).
// Retorna null se o sexo não for "M"/"F" ou se as medidas não
// permitirem o cálculo (log de valor <= 0 ou resultado não finito).
function calcularPercentualGordura(sexo, alturaCm, cinturaCm, pescocoCm, quadrilCm) {
  let denominador;

  if (sexo === "M") {
    const base = cinturaCm - pescocoCm;
    if (!(base > 0) || !(alturaCm > 0)) return null;
    denominador = 1.0324 - 0.19077 * Math.log10(base) + 0.15456 * Math.log10(alturaCm);
  } else if (sexo === "F") {
    const base = cinturaCm + quadrilCm - pescocoCm;
    if (!(base > 0) || !(alturaCm > 0)) return null;
    denominador = 1.29579 - 0.35004 * Math.log10(base) + 0.221 * Math.log10(alturaCm);
  } else {
    return null;
  }

  const resultado = 495 / denominador - 450;
  return isFinite(resultado) ? resultado : null;
}

// Classificação de % de gordura corporal — American Council on Exercise (ACE).
// Faixas da tabela ACE (H: 2–5 / 6–13 / 14–17 / 18–24 / 25+;
// M: 10–13 / 14–20 / 21–24 / 25–31 / 32+). Cada faixa vai até o início
// da seguinte, cobrindo os "vãos" da tabela (ex.: 5,5% em homens =
// Gordura Essencial; 13,5% = Atlético); abaixo da essencial = categoria 1.
// "cor" é a chave da variável CSS --faixa-<cor>.
const CLASSIFICACAO_GORDURA_ACE = [
  { categoria: 1, nome: "Gordura Essencial", limiteM: 6, limiteF: 14, cor: "verde-claro" },
  { categoria: 2, nome: "Atlético", limiteM: 14, limiteF: 21, cor: "verde" },
  { categoria: 3, nome: "Boa Forma (Fitness)", limiteM: 18, limiteF: 25, cor: "verde-amarelado" },
  { categoria: 4, nome: "Aceitável", limiteM: 25, limiteF: 32, cor: "amarelo" },
  { categoria: 5, nome: "Obesidade", limiteM: Infinity, limiteF: Infinity, cor: "vermelho" },
];

// Retorna { categoria, nome, cor } ou null se sexo/valor não permitirem classificar.
function classificarPercentualGordura(sexo, percentual) {
  if ((sexo !== "M" && sexo !== "F") || typeof percentual !== "number" || !isFinite(percentual)) return null;
  const chave = sexo === "M" ? "limiteM" : "limiteF";
  const faixa = CLASSIFICACAO_GORDURA_ACE.find((item) => percentual < item[chave]);
  return { categoria: faixa.categoria, nome: faixa.nome, cor: faixa.cor };
}

/* ---------- Gasto calórico (TMB / TDEE) ----------
   peso em kg, altura em cm, idade em anos, sexo "M" | "F".
   Retornam null se o sexo não for "M"/"F". */

// Harris-Benedict.
function calcularTmbHarrisBenedict(sexo, pesoKg, alturaCm, idade) {
  if (sexo === "M") return 66.5 + 13.75 * pesoKg + 5.003 * alturaCm - 6.75 * idade;
  if (sexo === "F") return 655.1 + 9.563 * pesoKg + 1.85 * alturaCm - 4.676 * idade;
  return null;
}

// Mifflin-St Jeor.
function calcularTmbMifflinStJeor(sexo, pesoKg, alturaCm, idade) {
  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * idade;
  if (sexo === "M") return base + 5;
  if (sexo === "F") return base - 161;
  return null;
}

// Gasto Calórico Diário Estimado = TMB × fator de atividade.
function calcularTdee(tmb, fatorAtividade) {
  return tmb * fatorAtividade;
}
