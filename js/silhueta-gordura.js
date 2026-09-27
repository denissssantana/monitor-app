/* MONITOR — silhueta-gordura.js
   Resultado visual do % de gordura: silhueta em contorno (SVG) da
   categoria ACE do registro, com o traço na cor da faixa.
   Usado pela tela "% de Gordura" e pelo card da Dashboard.

   Os SVGs (assets/silhuetas/<masculino|feminino>-<1..5>.svg) usam
   stroke="currentColor"; o SVG é inserido inline e a cor vem da
   propriedade CSS "color" (var(--faixa-<cor>)), então acompanha a
   troca de tema. Só o SVG da faixa exibida é baixado. */

const SILHUETA_FONTE_ACE = "Classificação: American Council on Exercise (ACE)";

const silhuetaSvgCache = {};

function getUrlSilhueta(sexo, categoria) {
  const pasta = sexo === "F" ? "feminino" : "masculino";
  return `assets/silhuetas/${pasta}-${categoria}.svg`;
}

function carregarSvgSilhueta(url) {
  if (!silhuetaSvgCache[url]) {
    silhuetaSvgCache[url] = fetch(url).then((resposta) => {
      if (!resposta.ok) throw new Error(`Falha ao carregar ${url}`);
      return resposta.text();
    });
    silhuetaSvgCache[url].catch(() => delete silhuetaSvgCache[url]);
  }
  return silhuetaSvgCache[url];
}

// Preenche o container com silhueta + categoria + fonte ACE.
// Estrutura esperada dentro do container (ver percentual-gordura.html / dashboard.html):
//   .silhueta-gordura__figura, .silhueta-gordura__categoria, .silhueta-gordura__fonte
// Retorna false (e esconde o container) se o registro não permitir classificar.
function renderSilhuetaGordura(container, registro) {
  const classificacao = registro ? classificarPercentualGordura(registro.sexo, registro.percentualGordura) : null;

  if (!classificacao) {
    container.classList.add("hidden");
    return false;
  }

  const figuraEl = container.querySelector(".silhueta-gordura__figura");
  const categoriaEl = container.querySelector(".silhueta-gordura__categoria");
  const fonteEl = container.querySelector(".silhueta-gordura__fonte");

  container.classList.remove("hidden");
  container.style.setProperty("--silhueta-cor", `var(--faixa-${classificacao.cor})`);
  categoriaEl.textContent = classificacao.nome;
  fonteEl.textContent = SILHUETA_FONTE_ACE;

  const url = getUrlSilhueta(registro.sexo, classificacao.categoria);
  container.dataset.silhuetaUrl = url;
  figuraEl.innerHTML = "";

  carregarSvgSilhueta(url)
    .then((svgTexto) => {
      // Ignora respostas atrasadas se outro registro já foi renderizado.
      if (container.dataset.silhuetaUrl !== url) return;
      figuraEl.innerHTML = svgTexto;
      container.dispatchEvent(new CustomEvent("silhueta:renderizada"));
    })
    .catch(() => {
      // Sem a figura (ex.: app aberto via file://), categoria e fonte continuam visíveis.
      figuraEl.innerHTML = "";
    });

  return true;
}

/* ---------- Efeito "corrente elétrica" no contorno ----------
   Opcional por tela (hoje só a tela "% de Gordura" ativa).
   Uma cópia do SVG (.silhueta-gordura__faisca) fica sobreposta à
   silhueta, com traço mais brilhante na MESMA cor da faixa; uma
   máscara em faixa percorre essa cópia de baixo para cima (CSS em
   styles.css). Uma passada por disparo: a cada `intervaloMs`, ao
   tocar/rolar a tela e a cada nova renderização (recálculo).
   Desligado com "reduzir movimento" do sistema. */

const FAISCA_DURACAO_MS = 1500;

function ativarFaiscaSilhueta(container, intervaloMs = 7000) {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const figuraEl = container.querySelector(".silhueta-gordura__figura");
  let ultimoDisparo = 0;

  function montarCamada() {
    const base = figuraEl.querySelector("svg:not(.silhueta-gordura__faisca)");
    if (!base) return;
    const camadaAntiga = figuraEl.querySelector(".silhueta-gordura__faisca");
    if (camadaAntiga) camadaAntiga.remove();

    const camada = base.cloneNode(true);
    camada.classList.add("silhueta-gordura__faisca");
    camada.setAttribute("aria-hidden", "true");
    camada.removeAttribute("role");
    camada.addEventListener("animationend", () => camada.classList.remove("silhueta-gordura__faisca--ativa"));
    figuraEl.appendChild(camada);
  }

  // Não reinicia no meio de uma passada (evita "piscar" com toques seguidos).
  function disparar() {
    const camada = figuraEl.querySelector(".silhueta-gordura__faisca");
    if (!camada || container.classList.contains("hidden") || document.hidden) return;
    const agora = Date.now();
    if (agora - ultimoDisparo < FAISCA_DURACAO_MS) return;
    ultimoDisparo = agora;

    camada.classList.remove("silhueta-gordura__faisca--ativa");
    void camada.getBoundingClientRect(); // força reflow para reiniciar a animação
    camada.classList.add("silhueta-gordura__faisca--ativa");
  }

  container.addEventListener("silhueta:renderizada", () => {
    montarCamada();
    ultimoDisparo = 0;
    disparar();
  });

  montarCamada();
  setInterval(disparar, intervaloMs);
  ["touchstart", "scroll", "click"].forEach((evento) =>
    window.addEventListener(evento, disparar, { passive: true })
  );
}
