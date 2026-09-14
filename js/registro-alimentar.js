/* MONITOR — registro-alimentar.js
   Monta o registro alimentar de um dia (hoje por padrão, ou uma data
   histórica via ?data=yyyy-mm-dd) por blocos de refeição, calcula os
   totais de macros/kcal contra a meta diária, e usa a base de
   alimentos (cadastrada em cadastro-alimentos.html) para autocomplete
   e cálculo proporcional de macros pela quantidade real consumida.
   A navegação entre dias (carrossel) troca `dataSelecionada` em
   memória e re-renderiza — não recarrega a página. */

document.addEventListener("DOMContentLoaded", () => {
  const totalKcalEl = document.getElementById("total-kcal");
  const totalPtEl = document.getElementById("total-pt");
  const totalChEl = document.getElementById("total-ch");
  const totalLpEl = document.getElementById("total-lp");
  const metaKcalLabelEl = document.getElementById("meta-kcal-label");
  const metaKcalEmptyEl = document.getElementById("meta-kcal-empty");
  const kcalProgressFillEl = document.getElementById("kcal-progress-fill");
  const ptProgressFillEl = document.getElementById("pt-progress-fill");
  const chProgressFillEl = document.getElementById("ch-progress-fill");
  const lpProgressFillEl = document.getElementById("lp-progress-fill");
  const metaPtWrapEl = document.getElementById("meta-pt-wrap");
  const metaPtLabelEl = document.getElementById("meta-pt-label");
  const metaChWrapEl = document.getElementById("meta-ch-wrap");
  const metaChLabelEl = document.getElementById("meta-ch-label");
  const metaLpWrapEl = document.getElementById("meta-lp-wrap");
  const metaLpLabelEl = document.getElementById("meta-lp-label");

  const carouselDiaEl = document.getElementById("carousel-dia");
  const btnDiaAnterior = document.getElementById("btn-dia-anterior");
  const btnDiaProximo = document.getElementById("btn-dia-proximo");
  const diaRangeEl = document.getElementById("dia-range");
  const diaInput = document.getElementById("dia-input");
  const kcalRestanteEl = document.getElementById("kcal-restante");

  const historicoBannerEl = document.getElementById("historico-banner");
  const historicoBannerTextoEl = document.getElementById("historico-banner-texto");

  const btnEditarMeta = document.getElementById("btn-editar-meta");
  const modalMetaKcal = document.getElementById("modal-meta-kcal");
  const formMetaKcal = document.getElementById("form-meta-kcal");
  const metaKcalInput = document.getElementById("meta-kcal-input");
  const metaPtInput = document.getElementById("meta-pt-input");
  const metaChInput = document.getElementById("meta-ch-input");
  const metaLpInput = document.getElementById("meta-lp-input");
  const metaKcalFeedback = document.getElementById("meta-kcal-feedback");
  const btnCancelarMeta = document.getElementById("btn-cancelar-meta");

  const formAddRefeicao = document.getElementById("form-add-refeicao");
  const tituloSelect = document.getElementById("titulo-refeicao");
  const refeicoesContainer = document.getElementById("refeicoes-container");
  const refeicoesEmpty = document.getElementById("refeicoes-empty");
  const datalistAlimentos = document.getElementById("datalist-alimentos");

  const chartKcalDiaCanvas = document.getElementById("grafico-kcal-dia");
  const chartKcalDiaEmpty = document.getElementById("chart-kcal-dia-empty");
  const chartCardKcalDia = chartKcalDiaCanvas.closest(".chart-card");
  const btnKcalDiaAnterior = document.getElementById("btn-kcal-dia-anterior");
  const btnKcalDiaProximo = document.getElementById("btn-kcal-dia-proximo");

  const modalEditarItem = document.getElementById("modal-editar-item-refeicao");
  const formEditarItem = document.getElementById("form-editar-item-refeicao");
  const editarItemNomeInput = document.getElementById("editar-item-nome");
  const editarItemQuantidadeInput = document.getElementById("editar-item-quantidade");
  const editarItemUnidadeSelect = document.getElementById("editar-item-unidade");
  const editarItemKcalInput = document.getElementById("editar-item-kcal");
  const editarItemPtInput = document.getElementById("editar-item-pt");
  const editarItemChInput = document.getElementById("editar-item-ch");
  const editarItemLpInput = document.getElementById("editar-item-lp");
  const editarItemFeedback = document.getElementById("editar-item-feedback");
  const btnCancelarEdicaoItem = document.getElementById("btn-cancelar-edicao-item");

  const ICON_EDITAR = `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>`;
  const ICON_EXCLUIR = `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>`;
  const ICON_INCLUIR_BASE = `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18"></rect><path d="M12 8v8M8 12h8"></path></svg>`;

  let editandoItemRefeicaoId = null;
  let editandoItemId = null;
  const refeicoesComFormAberto = new Set();

  const dataHoje = getHojeIso();
  const params = new URLSearchParams(window.location.search);
  const dataParam = params.get("data");
  let dataSelecionada = dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam) ? dataParam : dataHoje;

  let chartKcalDia = null;
  const janelaKcalDia = criarJanelaCarrossel(5);

  function ehHoje() {
    return dataSelecionada === dataHoje;
  }

  function gerarId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function num(valor) {
    const n = parseFloat(valor);
    return Number.isFinite(n) ? n : 0;
  }

  function escapeHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  }

  function getComputedColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  function irParaDia(novaData) {
    dataSelecionada = novaData;
    refeicoesComFormAberto.clear();
    fecharModalEdicaoItem();
    renderTudo();
  }

  function irParaDiaAnterior() {
    irParaDia(addDiasIso(dataSelecionada, -1));
  }

  function irParaDiaProximo() {
    irParaDia(addDiasIso(dataSelecionada, 1));
  }

  function atualizarCarouselDia() {
    diaInput.value = dataSelecionada;

    if (ehHoje()) {
      diaRangeEl.textContent = `Hoje · ${formatarDataBR(dataSelecionada)}`;
      historicoBannerEl.classList.add("hidden");
      refeicoesEmpty.textContent = "Nenhuma refeição registrada hoje. Adicione a primeira acima.";
      return;
    }

    diaRangeEl.textContent = formatarDataBR(dataSelecionada);
    historicoBannerEl.classList.remove("hidden");

    if (dataSelecionada > dataHoje) {
      historicoBannerTextoEl.textContent = `Planejado — ${formatarDataBR(dataSelecionada)}`;
      refeicoesEmpty.textContent = "Nenhuma refeição planejada para esta data. Adicione a primeira acima.";
    } else {
      historicoBannerTextoEl.textContent = `Histórico — ${formatarDataBR(dataSelecionada)}`;
      refeicoesEmpty.textContent = "Nenhum registro alimentar para esta data.";
    }
  }

  function calcularTotaisRefeicao(itens) {
    const totais = { pt: 0, ch: 0, lp: 0, kcal: 0 };
    itens.forEach((item) => {
      totais.pt += Number(item.pt) || 0;
      totais.ch += Number(item.ch) || 0;
      totais.lp += Number(item.lp) || 0;
      totais.kcal += Number(item.kcal) || 0;
    });
    return totais;
  }

  function renderKcalRestante(el, kcalConsumida, meta) {
    el.classList.remove("kcal-overview__restante--vermelho");

    if (!meta) {
      el.classList.add("hidden");
      el.textContent = "";
      return;
    }

    el.classList.remove("hidden");
    const restante = Math.round(meta - kcalConsumida);
    if (restante >= 0) {
      el.textContent = `${restante} kcal restantes`;
    } else {
      el.textContent = `${restante} kcal (meta excedida)`;
      el.classList.add("kcal-overview__restante--vermelho");
    }
  }

  function aplicarBarraMacro(fillEl, consumido, meta, corFn) {
    fillEl.classList.remove(
      "progress-bar-horizontal__fill--verde",
      "progress-bar-horizontal__fill--amarelo",
      "progress-bar-horizontal__fill--vermelho"
    );

    if (!meta) {
      fillEl.style.width = "0%";
      return;
    }

    fillEl.style.width = `${Math.min(100, Math.round((consumido / meta) * 100))}%`;
    const cor = corFn(consumido, meta);
    if (cor) fillEl.classList.add(`progress-bar-horizontal__fill--${cor}`);
  }

  function aplicarMetaMacro(wrapEl, labelEl, meta) {
    if (!meta) {
      wrapEl.classList.add("hidden");
      return;
    }
    labelEl.textContent = meta;
    wrapEl.classList.remove("hidden");
  }

  function renderKcalOverview() {
    const totais = getTotaisAlimentaresDoDia(dataSelecionada);

    totalKcalEl.textContent = Math.round(totais.kcal);
    totalPtEl.textContent = totais.pt.toFixed(1);
    totalChEl.textContent = totais.ch.toFixed(1);
    totalLpEl.textContent = totais.lp.toFixed(1);

    const meta = getMetaKcalDia();
    kcalProgressFillEl.classList.remove(
      "progress-bar-horizontal__fill--verde",
      "progress-bar-horizontal__fill--amarelo",
      "progress-bar-horizontal__fill--vermelho"
    );

    if (!meta) {
      metaKcalLabelEl.textContent = "--";
      kcalProgressFillEl.style.width = "0%";
      metaKcalEmptyEl.classList.remove("hidden");
    } else {
      metaKcalLabelEl.textContent = meta;
      const percentualReal = (totais.kcal / meta) * 100;
      kcalProgressFillEl.style.width = `${Math.min(100, Math.round(percentualReal))}%`;
      metaKcalEmptyEl.classList.add("hidden");

      const cor = getFaixaCorKcal(totais.kcal, meta);
      if (cor) kcalProgressFillEl.classList.add(`progress-bar-horizontal__fill--${cor}`);
    }

    renderKcalRestante(kcalRestanteEl, totais.kcal, meta);

    aplicarBarraMacro(ptProgressFillEl, totais.pt, getMetaPtDia(), getFaixaCorPt);
    aplicarBarraMacro(chProgressFillEl, totais.ch, getMetaChDia(), getFaixaCorChLp);
    aplicarBarraMacro(lpProgressFillEl, totais.lp, getMetaLpDia(), getFaixaCorChLp);

    aplicarMetaMacro(metaPtWrapEl, metaPtLabelEl, getMetaPtDia());
    aplicarMetaMacro(metaChWrapEl, metaChLabelEl, getMetaChDia());
    aplicarMetaMacro(metaLpWrapEl, metaLpLabelEl, getMetaLpDia());
  }

  function abrirModalMeta() {
    const meta = getMetaKcalDia();
    metaKcalInput.value = meta || "";
    metaPtInput.value = getMetaPtDia() || "";
    metaChInput.value = getMetaChDia() || "";
    metaLpInput.value = getMetaLpDia() || "";
    metaKcalFeedback.textContent = "";
    modalMetaKcal.classList.remove("hidden");
  }

  function fecharModalMeta() {
    modalMetaKcal.classList.add("hidden");
  }

  btnEditarMeta.addEventListener("click", abrirModalMeta);
  btnCancelarMeta.addEventListener("click", fecharModalMeta);

  modalMetaKcal.addEventListener("click", (event) => {
    if (event.target === modalMetaKcal) fecharModalMeta();
  });

  formMetaKcal.addEventListener("submit", (event) => {
    event.preventDefault();
    metaKcalFeedback.textContent = "";

    const valor = parseFloat(metaKcalInput.value);
    if (!valor || valor <= 0) {
      metaKcalFeedback.textContent = "Informe uma meta de Kcal válida.";
      return;
    }

    setMetaKcalDia(valor);

    const valorPt = parseFloat(metaPtInput.value);
    if (valorPt > 0) setMetaPtDia(valorPt);
    const valorCh = parseFloat(metaChInput.value);
    if (valorCh > 0) setMetaChDia(valorCh);
    const valorLp = parseFloat(metaLpInput.value);
    if (valorLp > 0) setMetaLpDia(valorLp);

    fecharModalMeta();
    renderTudo();
  });

  function renderDatalist() {
    const alimentos = getAlimentosBase()
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    datalistAlimentos.innerHTML = alimentos.map((a) => `<option value="${escapeHtml(a.nome)}"></option>`).join("");
  }

  function aplicarProporcao(form, alimentoBase) {
    const quantidade = num(form.querySelector(".food-quantidade").value);
    const fator = alimentoBase.quantidadeReferencia > 0 ? quantidade / alimentoBase.quantidadeReferencia : 0;
    form.querySelector(".food-kcal").value = Math.round(alimentoBase.kcal * fator);
    form.querySelector(".food-pt").value = (alimentoBase.pt * fator).toFixed(1);
    form.querySelector(".food-ch").value = (alimentoBase.ch * fator).toFixed(1);
    form.querySelector(".food-lp").value = (alimentoBase.lp * fator).toFixed(1);
  }

  function incluirItemNaBase(item) {
    const jaExiste = getAlimentosBase().some(
      (alimento) => alimento.nome.trim().toLowerCase() === item.nome.trim().toLowerCase()
    );
    if (jaExiste) {
      alert("Este alimento já está na base.");
      return;
    }

    salvarAlimentoBase({
      id: gerarId(),
      nome: item.nome,
      tipo: "componente",
      quantidadeReferencia: num(item.quantidade),
      unidade: item.unidade,
      kcal: num(item.kcal),
      pt: num(item.pt),
      ch: num(item.ch),
      lp: num(item.lp),
    });

    renderDatalist();
    alert("Alimento incluído na Base de Alimentos.");
  }

  function renderRefeicoes() {
    const refeicoes = getRegistroAlimentarPorData(dataSelecionada);
    refeicoesContainer.innerHTML = "";

    if (refeicoes.length === 0) {
      refeicoesEmpty.classList.remove("hidden");
    } else {
      refeicoesEmpty.classList.add("hidden");
    }

    refeicoes.forEach((refeicao) => {
      const bloco = document.createElement("div");
      bloco.className = "meal-block";
      bloco.dataset.refeicaoId = refeicao.id;

      const itensHtml =
        refeicao.itens.length > 0
          ? `<ul class="food-list">${refeicao.itens
              .map(
                (item) => `
        <li class="food-item" data-item-id="${item.id}">
          <div class="food-item__info">
            <span class="food-item__nome">${escapeHtml(item.nome)} <small>${num(item.quantidade)}${item.unidade}</small></span>
            <span class="food-item__macros">Kcal ${num(item.kcal)} · PT ${num(item.pt)} · CH ${num(item.ch)} · LP ${num(item.lp)}</span>
          </div>
          <div class="food-item__actions">
            <button type="button" class="icon-btn icon-btn--add" data-action="incluir-base" aria-label="Incluir na Base de Alimentos">${ICON_INCLUIR_BASE}</button>
            <button type="button" class="icon-btn icon-btn--edit" data-action="editar-item" aria-label="Editar alimento">${ICON_EDITAR}</button>
            <button type="button" class="icon-btn icon-btn--delete" data-action="remover-item" aria-label="Remover alimento">${ICON_EXCLUIR}</button>
          </div>
        </li>`
              )
              .join("")}</ul>`
          : "";

      const totaisHtml =
        refeicao.itens.length > 0
          ? (() => {
              const totais = calcularTotaisRefeicao(refeicao.itens);
              return `
        <div class="meal-block__totals">
          <div class="meal-block__total">
            <span class="meal-block__total-label">Kcal</span>
            <span class="meal-block__total-value">${Math.round(totais.kcal)}</span>
          </div>
          <div class="meal-block__total">
            <span class="meal-block__total-label">PT</span>
            <span class="meal-block__total-value">${totais.pt.toFixed(1)}</span>
          </div>
          <div class="meal-block__total">
            <span class="meal-block__total-label">CH</span>
            <span class="meal-block__total-value">${totais.ch.toFixed(1)}</span>
          </div>
          <div class="meal-block__total">
            <span class="meal-block__total-label">LP</span>
            <span class="meal-block__total-value">${totais.lp.toFixed(1)}</span>
          </div>
        </div>`;
            })()
          : "";

      const formAberto = refeicao.itens.length === 0 || refeicoesComFormAberto.has(refeicao.id);

      const formHtml = formAberto
        ? `
        <form class="food-form">
          <div class="field">
            <label>Alimento</label>
            <input type="text" class="food-nome" list="datalist-alimentos" placeholder="Selecione da base ou digite um novo" required />
          </div>
          <div class="field-row">
            <div class="field"><label>Quantidade</label><input type="number" class="food-quantidade" step="0.1" min="0" inputmode="decimal" required /></div>
            <div class="field">
              <label>Unidade</label>
              <select class="food-unidade">
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="uni">uni</option>
              </select>
            </div>
          </div>
          <div class="macro-grid">
            <div class="field"><label>Kcal</label><input type="number" class="food-kcal" step="1" min="0" inputmode="decimal" /></div>
            <div class="field"><label>PT</label><input type="number" class="food-pt" step="0.1" min="0" inputmode="decimal" /></div>
            <div class="field"><label>CH</label><input type="number" class="food-ch" step="0.1" min="0" inputmode="decimal" /></div>
            <div class="field"><label>LP</label><input type="number" class="food-lp" step="0.1" min="0" inputmode="decimal" /></div>
          </div>
          <div class="actions">
            <button type="submit" class="btn btn-secondary btn-block">Adicionar</button>
            ${refeicao.itens.length > 0 ? `<button type="button" class="btn btn-secondary btn-block" data-action="fechar-form">Cancelar</button>` : ""}
          </div>
        </form>`
        : `<button type="button" class="btn btn-secondary btn-block meal-block__add-btn" data-action="abrir-form">+ Adicionar alimento</button>`;

      bloco.innerHTML = `
        <div class="meal-block__header">
          <h3 class="meal-block__title">${escapeHtml(refeicao.titulo)}</h3>
          <button type="button" class="icon-btn icon-btn--delete" data-action="remover-refeicao" aria-label="Remover refeição">${ICON_EXCLUIR}</button>
        </div>
        ${itensHtml}
        ${totaisHtml}
        ${formHtml}
      `;

      refeicoesContainer.appendChild(bloco);
    });
  }

  function corFaixaVar(cor) {
    return cor ? getComputedColor(`--faixa-${cor}`) : getComputedColor("--accent-action");
  }

  function renderGraficoKcalDia() {
    const historico = getHistoricoKcalPorDia();

    if (historico.length === 0) {
      chartKcalDiaCanvas.classList.add("hidden");
      chartKcalDiaEmpty.classList.remove("hidden");
      btnKcalDiaAnterior.disabled = true;
      btnKcalDiaProximo.disabled = true;
      janelaKcalDia.resetar();
      if (chartKcalDia) {
        chartKcalDia.destroy();
        chartKcalDia = null;
      }
      return;
    }

    const inicio = janelaKcalDia.preparar(historico.length);

    chartKcalDiaCanvas.classList.remove("hidden");
    chartKcalDiaEmpty.classList.add("hidden");

    const visiveis = historico.slice(inicio, inicio + janelaKcalDia.tamanho);
    const labels = visiveis.map((dia) => formatarDataBR(dia.data));
    const valores = visiveis.map((dia) => Math.round(dia.kcal));
    const cores = visiveis.map((dia) => corFaixaVar(dia.cor));

    const meta = getMetaKcalDia();
    const maiorKcal = Math.max(...historico.map((dia) => dia.kcal), meta || 0);
    const eixoMax = maiorKcal > 0 ? Math.ceil(maiorKcal * 1.15) : 100;

    btnKcalDiaAnterior.disabled = !janelaKcalDia.podeVoltar();
    btnKcalDiaProximo.disabled = !janelaKcalDia.podeAvancar(historico.length);

    if (chartKcalDia) chartKcalDia.destroy();

    chartKcalDia = new Chart(chartKcalDiaCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Kcal",
            data: valores,
            backgroundColor: cores,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true, max: eixoMax },
        },
        onClick: (event, elements) => {
          if (!elements.length) return;
          irParaDia(visiveis[elements[0].index].data);
        },
        onHover: (event, elements) => {
          event.native.target.style.cursor = elements.length ? "pointer" : "default";
        },
      },
    });
  }

  function renderTudo() {
    atualizarCarouselDia();
    renderRefeicoes();
    renderKcalOverview();
    renderGraficoKcalDia();
  }

  formAddRefeicao.addEventListener("submit", (event) => {
    event.preventDefault();
    const refeicoes = getRegistroAlimentarPorData(dataSelecionada);
    refeicoes.push({ id: gerarId(), titulo: tituloSelect.value, itens: [] });
    saveRegistroAlimentarDia(dataSelecionada, refeicoes);
    renderTudo();
  });

  refeicoesContainer.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;

    const blocoEl = btn.closest(".meal-block");
    const refeicaoId = blocoEl.dataset.refeicaoId;

    if (btn.dataset.action === "remover-refeicao") {
      if (!confirm("Remover esta refeição e todos os alimentos dela?")) return;
      const refeicoes = getRegistroAlimentarPorData(dataSelecionada).filter((r) => r.id !== refeicaoId);
      saveRegistroAlimentarDia(dataSelecionada, refeicoes);
      refeicoesComFormAberto.delete(refeicaoId);
      renderTudo();
      return;
    }

    if (btn.dataset.action === "remover-item") {
      const itemId = btn.closest(".food-item").dataset.itemId;
      excluirAlimentoDaRefeicao(dataSelecionada, refeicaoId, itemId);
      renderTudo();
      return;
    }

    if (btn.dataset.action === "editar-item") {
      const itemId = btn.closest(".food-item").dataset.itemId;
      abrirModalEdicaoItem(refeicaoId, itemId);
      return;
    }

    if (btn.dataset.action === "incluir-base") {
      const itemId = btn.closest(".food-item").dataset.itemId;
      const refeicao = getRegistroAlimentarPorData(dataSelecionada).find((r) => r.id === refeicaoId);
      const item = refeicao && refeicao.itens.find((i) => i.id === itemId);
      if (item) incluirItemNaBase(item);
      return;
    }

    if (btn.dataset.action === "abrir-form") {
      refeicoesComFormAberto.add(refeicaoId);
      renderTudo();
      return;
    }

    if (btn.dataset.action === "fechar-form") {
      refeicoesComFormAberto.delete(refeicaoId);
      renderTudo();
    }
  });

  refeicoesContainer.addEventListener("input", (event) => {
    const input = event.target;
    const form = input.closest(".food-form");
    if (!form) return;

    if (input.classList.contains("food-nome")) {
      const resultados = buscarAlimentoBase(input.value);
      const match = resultados.find((alimento) => alimento.nome.toLowerCase() === input.value.trim().toLowerCase());
      const unidadeSelect = form.querySelector(".food-unidade");
      const quantidadeInput = form.querySelector(".food-quantidade");

      if (match) {
        form.dataset.baseId = match.id;
        unidadeSelect.value = match.unidade;
        unidadeSelect.disabled = true;
        if (!quantidadeInput.value) quantidadeInput.value = match.quantidadeReferencia;
        aplicarProporcao(form, match);
      } else {
        delete form.dataset.baseId;
        unidadeSelect.disabled = false;
      }
      return;
    }

    if (input.classList.contains("food-quantidade") && form.dataset.baseId) {
      const match = getAlimentosBase().find((alimento) => alimento.id === form.dataset.baseId);
      if (match) aplicarProporcao(form, match);
    }
  });

  refeicoesContainer.addEventListener("submit", (event) => {
    if (!event.target.classList.contains("food-form")) return;
    event.preventDefault();

    const form = event.target;
    const refeicaoId = form.closest(".meal-block").dataset.refeicaoId;

    const nome = form.querySelector(".food-nome").value.trim();
    if (!nome) return;
    const quantidade = num(form.querySelector(".food-quantidade").value);
    if (!quantidade || quantidade <= 0) return;

    adicionarAlimentoNaRefeicao(dataSelecionada, refeicaoId, {
      id: gerarId(),
      nome,
      quantidade,
      unidade: form.querySelector(".food-unidade").value,
      kcal: num(form.querySelector(".food-kcal").value),
      pt: num(form.querySelector(".food-pt").value),
      ch: num(form.querySelector(".food-ch").value),
      lp: num(form.querySelector(".food-lp").value),
      alimentoBaseId: form.dataset.baseId || null,
    });

    refeicoesComFormAberto.delete(refeicaoId);
    renderTudo();
  });

  function abrirModalEdicaoItem(refeicaoId, itemId) {
    const refeicoes = getRegistroAlimentarPorData(dataSelecionada);
    const refeicao = refeicoes.find((r) => r.id === refeicaoId);
    const item = refeicao && refeicao.itens.find((i) => i.id === itemId);
    if (!item) return;

    editandoItemRefeicaoId = refeicaoId;
    editandoItemId = itemId;
    editarItemNomeInput.value = item.nome;
    editarItemQuantidadeInput.value = item.quantidade;
    editarItemUnidadeSelect.value = item.unidade;
    editarItemKcalInput.value = item.kcal;
    editarItemPtInput.value = item.pt;
    editarItemChInput.value = item.ch;
    editarItemLpInput.value = item.lp;
    editarItemFeedback.textContent = "";
    modalEditarItem.classList.remove("hidden");
  }

  function fecharModalEdicaoItem() {
    modalEditarItem.classList.add("hidden");
    editandoItemRefeicaoId = null;
    editandoItemId = null;
  }

  btnCancelarEdicaoItem.addEventListener("click", fecharModalEdicaoItem);

  modalEditarItem.addEventListener("click", (event) => {
    if (event.target === modalEditarItem) fecharModalEdicaoItem();
  });

  formEditarItem.addEventListener("submit", (event) => {
    event.preventDefault();
    editarItemFeedback.textContent = "";

    const nome = editarItemNomeInput.value.trim();
    if (!nome) {
      editarItemFeedback.textContent = "Informe o nome do alimento.";
      return;
    }
    const quantidade = num(editarItemQuantidadeInput.value);
    if (!quantidade || quantidade <= 0) {
      editarItemFeedback.textContent = "Informe uma quantidade válida.";
      return;
    }

    editarAlimentoDaRefeicao(dataSelecionada, editandoItemRefeicaoId, editandoItemId, {
      nome,
      quantidade,
      unidade: editarItemUnidadeSelect.value,
      kcal: num(editarItemKcalInput.value),
      pt: num(editarItemPtInput.value),
      ch: num(editarItemChInput.value),
      lp: num(editarItemLpInput.value),
    });

    fecharModalEdicaoItem();
    renderTudo();
  });

  function irParaKcalDiaAnterior() {
    janelaKcalDia.voltar();
    renderGraficoKcalDia();
  }

  function irParaKcalDiaProximo() {
    janelaKcalDia.avancar();
    renderGraficoKcalDia();
  }

  btnDiaAnterior.addEventListener("click", irParaDiaAnterior);
  btnDiaProximo.addEventListener("click", irParaDiaProximo);
  anexarSwipeCarrossel(carouselDiaEl, { aoVoltar: irParaDiaAnterior, aoAvancar: irParaDiaProximo });

  diaInput.addEventListener("change", () => {
    if (diaInput.value) irParaDia(diaInput.value);
  });

  btnKcalDiaAnterior.addEventListener("click", irParaKcalDiaAnterior);
  btnKcalDiaProximo.addEventListener("click", irParaKcalDiaProximo);
  anexarSwipeCarrossel(chartCardKcalDia, { aoVoltar: irParaKcalDiaAnterior, aoAvancar: irParaKcalDiaProximo });

  renderDatalist();
  renderTudo();

  if (ehHoje() && !getMetaKcalDia()) {
    abrirModalMeta();
  }
});
