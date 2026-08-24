/* MONITOR — registro-alimentar.js
   Monta o registro alimentar do dia por blocos de refeição, calcula
   os totais de macros/kcal contra a meta diária, e mantém a base de
   alimentos reutilizável (bloco compacto, recolhido) usada tanto
   para o autocomplete quanto para o cálculo proporcional de macros
   pela quantidade real consumida em cada refeição. */

document.addEventListener("DOMContentLoaded", () => {
  const totalKcalEl = document.getElementById("total-kcal");
  const totalPtEl = document.getElementById("total-pt");
  const totalChEl = document.getElementById("total-ch");
  const totalLpEl = document.getElementById("total-lp");
  const metaKcalLabelEl = document.getElementById("meta-kcal-label");
  const metaKcalEmptyEl = document.getElementById("meta-kcal-empty");
  const kcalProgressFillEl = document.getElementById("kcal-progress-fill");

  const btnEditarMeta = document.getElementById("btn-editar-meta");
  const modalMetaKcal = document.getElementById("modal-meta-kcal");
  const formMetaKcal = document.getElementById("form-meta-kcal");
  const metaKcalInput = document.getElementById("meta-kcal-input");
  const metaKcalFeedback = document.getElementById("meta-kcal-feedback");
  const btnCancelarMeta = document.getElementById("btn-cancelar-meta");

  const formAddRefeicao = document.getElementById("form-add-refeicao");
  const tituloSelect = document.getElementById("titulo-refeicao");
  const refeicoesContainer = document.getElementById("refeicoes-container");
  const refeicoesEmpty = document.getElementById("refeicoes-empty");
  const datalistAlimentos = document.getElementById("datalist-alimentos");

  const formCadastro = document.getElementById("form-cadastro-alimento");
  const cadastroFeedback = document.getElementById("cadastro-alimento-feedback");
  const alimentosBaseListaEl = document.getElementById("alimentos-base-lista");
  const alimentosBaseListaEmptyEl = document.getElementById("alimentos-base-lista-empty");

  const modalEditarAlimento = document.getElementById("modal-editar-alimento");
  const formEditarAlimento = document.getElementById("form-editar-alimento");
  const editarAlimentoNomeInput = document.getElementById("editar-alimento-nome");
  const editarAlimentoQuantidadeInput = document.getElementById("editar-alimento-quantidade");
  const editarAlimentoUnidadeSelect = document.getElementById("editar-alimento-unidade");
  const editarAlimentoPtInput = document.getElementById("editar-alimento-pt");
  const editarAlimentoChInput = document.getElementById("editar-alimento-ch");
  const editarAlimentoLpInput = document.getElementById("editar-alimento-lp");
  const editarAlimentoKcalInput = document.getElementById("editar-alimento-kcal");
  const editarAlimentoFeedback = document.getElementById("editar-alimento-feedback");
  const btnCancelarEdicaoAlimento = document.getElementById("btn-cancelar-edicao-alimento");

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

  let editandoAlimentoId = null;
  let editandoItemRefeicaoId = null;
  let editandoItemId = null;

  function hojeIso() {
    return new Date().toISOString().slice(0, 10);
  }

  const dataAtual = hojeIso();

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

  function renderKcalOverview() {
    const totais = getTotaisAlimentaresDoDia(dataAtual);

    totalKcalEl.textContent = Math.round(totais.kcal);
    totalPtEl.textContent = totais.pt.toFixed(1);
    totalChEl.textContent = totais.ch.toFixed(1);
    totalLpEl.textContent = totais.lp.toFixed(1);

    const meta = getMetaKcalDia();
    if (!meta) {
      metaKcalLabelEl.textContent = "--";
      kcalProgressFillEl.style.width = "0%";
      metaKcalEmptyEl.classList.remove("hidden");
    } else {
      metaKcalLabelEl.textContent = meta;
      const percentual = Math.min(100, Math.round((totais.kcal / meta) * 100));
      kcalProgressFillEl.style.width = `${percentual}%`;
      metaKcalEmptyEl.classList.add("hidden");
    }
  }

  function abrirModalMeta() {
    const meta = getMetaKcalDia();
    metaKcalInput.value = meta || "";
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
    fecharModalMeta();
    renderKcalOverview();
  });

  function renderDatalist() {
    const alimentos = getAlimentosBase();
    datalistAlimentos.innerHTML = alimentos.map((a) => `<option value="${escapeHtml(a.nome)}"></option>`).join("");
  }

  function renderAlimentosBaseLista() {
    const alimentos = getAlimentosBase();
    alimentosBaseListaEl.innerHTML = "";

    if (alimentos.length === 0) {
      alimentosBaseListaEl.classList.add("hidden");
      alimentosBaseListaEmptyEl.classList.remove("hidden");
      return;
    }

    alimentosBaseListaEl.classList.remove("hidden");
    alimentosBaseListaEmptyEl.classList.add("hidden");

    alimentos.forEach((alimento) => {
      const li = document.createElement("li");
      li.className = "record-item";
      li.dataset.id = alimento.id;
      li.innerHTML = `
        <div class="record-item__info">
          <span class="food-item__nome">${escapeHtml(alimento.nome)} <small>${num(alimento.quantidadeReferencia)}${alimento.unidade}</small></span>
          <span class="food-item__macros">Kcal ${num(alimento.kcal)} · PT ${num(alimento.pt)} · CH ${num(alimento.ch)} · LP ${num(alimento.lp)}</span>
        </div>
        <div class="record-item__actions">
          <button type="button" class="icon-btn icon-btn--edit" data-action="editar" aria-label="Editar alimento">${ICON_EDITAR}</button>
          <button type="button" class="icon-btn icon-btn--delete" data-action="excluir" aria-label="Excluir alimento">${ICON_EXCLUIR}</button>
        </div>
      `;
      alimentosBaseListaEl.appendChild(li);
    });
  }

  function abrirModalEdicaoAlimento(id) {
    const alimento = getAlimentosBase().find((item) => item.id === id);
    if (!alimento) return;
    editandoAlimentoId = id;
    editarAlimentoNomeInput.value = alimento.nome;
    editarAlimentoQuantidadeInput.value = alimento.quantidadeReferencia;
    editarAlimentoUnidadeSelect.value = alimento.unidade;
    editarAlimentoKcalInput.value = alimento.kcal;
    editarAlimentoPtInput.value = alimento.pt;
    editarAlimentoChInput.value = alimento.ch;
    editarAlimentoLpInput.value = alimento.lp;
    editarAlimentoFeedback.textContent = "";
    modalEditarAlimento.classList.remove("hidden");
  }

  function fecharModalEdicaoAlimento() {
    modalEditarAlimento.classList.add("hidden");
    editandoAlimentoId = null;
  }

  function excluirAlimento(id) {
    if (!confirm("Excluir este alimento da base?")) return;
    excluirAlimentoBase(id);
    renderAlimentosBaseLista();
    renderDatalist();
  }

  alimentosBaseListaEl.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.closest(".record-item").dataset.id;

    if (btn.dataset.action === "editar") {
      abrirModalEdicaoAlimento(id);
    } else if (btn.dataset.action === "excluir") {
      excluirAlimento(id);
    }
  });

  btnCancelarEdicaoAlimento.addEventListener("click", fecharModalEdicaoAlimento);

  modalEditarAlimento.addEventListener("click", (event) => {
    if (event.target === modalEditarAlimento) fecharModalEdicaoAlimento();
  });

  formEditarAlimento.addEventListener("submit", (event) => {
    event.preventDefault();
    editarAlimentoFeedback.textContent = "";

    const nome = editarAlimentoNomeInput.value.trim();
    if (!nome) {
      editarAlimentoFeedback.textContent = "Informe o nome do alimento.";
      return;
    }
    const quantidadeReferencia = num(editarAlimentoQuantidadeInput.value);
    if (!quantidadeReferencia || quantidadeReferencia <= 0) {
      editarAlimentoFeedback.textContent = "Informe uma quantidade de referência válida.";
      return;
    }

    editarAlimentoBase(editandoAlimentoId, {
      nome,
      quantidadeReferencia,
      unidade: editarAlimentoUnidadeSelect.value,
      kcal: num(editarAlimentoKcalInput.value),
      pt: num(editarAlimentoPtInput.value),
      ch: num(editarAlimentoChInput.value),
      lp: num(editarAlimentoLpInput.value),
    });

    fecharModalEdicaoAlimento();
    renderAlimentosBaseLista();
    renderDatalist();
  });

  formCadastro.addEventListener("submit", (event) => {
    event.preventDefault();
    cadastroFeedback.classList.remove("success");
    cadastroFeedback.textContent = "";

    const nome = document.getElementById("cadastro-nome").value.trim();
    if (!nome) {
      cadastroFeedback.textContent = "Informe o nome do alimento.";
      return;
    }
    const quantidadeReferencia = num(document.getElementById("cadastro-quantidade").value);
    if (!quantidadeReferencia || quantidadeReferencia <= 0) {
      cadastroFeedback.textContent = "Informe uma quantidade de referência válida.";
      return;
    }

    salvarAlimentoBase({
      id: gerarId(),
      nome,
      quantidadeReferencia,
      unidade: document.getElementById("cadastro-unidade").value,
      kcal: num(document.getElementById("cadastro-kcal").value),
      pt: num(document.getElementById("cadastro-pt").value),
      ch: num(document.getElementById("cadastro-ch").value),
      lp: num(document.getElementById("cadastro-lp").value),
    });

    formCadastro.reset();
    document.getElementById("cadastro-unidade").value = "g";
    cadastroFeedback.textContent = "Alimento salvo na base.";
    cadastroFeedback.classList.add("success");
    renderAlimentosBaseLista();
    renderDatalist();
  });

  function aplicarProporcao(form, alimentoBase) {
    const quantidade = num(form.querySelector(".food-quantidade").value);
    const fator = alimentoBase.quantidadeReferencia > 0 ? quantidade / alimentoBase.quantidadeReferencia : 0;
    form.querySelector(".food-kcal").value = Math.round(alimentoBase.kcal * fator);
    form.querySelector(".food-pt").value = (alimentoBase.pt * fator).toFixed(1);
    form.querySelector(".food-ch").value = (alimentoBase.ch * fator).toFixed(1);
    form.querySelector(".food-lp").value = (alimentoBase.lp * fator).toFixed(1);
  }

  function renderRefeicoes() {
    const refeicoes = getRegistroAlimentarDia(dataAtual);
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
            <button type="button" class="icon-btn icon-btn--edit" data-action="editar-item" aria-label="Editar alimento">${ICON_EDITAR}</button>
            <button type="button" class="icon-btn icon-btn--delete" data-action="remover-item" aria-label="Remover alimento">${ICON_EXCLUIR}</button>
          </div>
        </li>`
              )
              .join("")}</ul>`
          : "";

      bloco.innerHTML = `
        <div class="meal-block__header">
          <h3 class="meal-block__title">${escapeHtml(refeicao.titulo)}</h3>
          <button type="button" class="icon-btn icon-btn--delete" data-action="remover-refeicao" aria-label="Remover refeição">${ICON_EXCLUIR}</button>
        </div>
        ${itensHtml}
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
              </select>
            </div>
          </div>
          <div class="macro-grid">
            <div class="field"><label>Kcal</label><input type="number" class="food-kcal" step="1" min="0" inputmode="decimal" /></div>
            <div class="field"><label>PT</label><input type="number" class="food-pt" step="0.1" min="0" inputmode="decimal" /></div>
            <div class="field"><label>CH</label><input type="number" class="food-ch" step="0.1" min="0" inputmode="decimal" /></div>
            <div class="field"><label>LP</label><input type="number" class="food-lp" step="0.1" min="0" inputmode="decimal" /></div>
          </div>
          <button type="submit" class="btn btn-secondary btn-block">Adicionar</button>
        </form>
      `;

      refeicoesContainer.appendChild(bloco);
    });
  }

  function renderTudo() {
    renderRefeicoes();
    renderKcalOverview();
  }

  formAddRefeicao.addEventListener("submit", (event) => {
    event.preventDefault();
    const refeicoes = getRegistroAlimentarDia(dataAtual);
    refeicoes.push({ id: gerarId(), titulo: tituloSelect.value, itens: [] });
    saveRegistroAlimentarDia(dataAtual, refeicoes);
    renderTudo();
  });

  refeicoesContainer.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;

    const blocoEl = btn.closest(".meal-block");
    const refeicaoId = blocoEl.dataset.refeicaoId;

    if (btn.dataset.action === "remover-refeicao") {
      if (!confirm("Remover esta refeição e todos os alimentos dela?")) return;
      const refeicoes = getRegistroAlimentarDia(dataAtual).filter((r) => r.id !== refeicaoId);
      saveRegistroAlimentarDia(dataAtual, refeicoes);
      renderTudo();
      return;
    }

    if (btn.dataset.action === "remover-item") {
      const itemId = btn.closest(".food-item").dataset.itemId;
      excluirAlimentoDaRefeicao(dataAtual, refeicaoId, itemId);
      renderTudo();
      return;
    }

    if (btn.dataset.action === "editar-item") {
      const itemId = btn.closest(".food-item").dataset.itemId;
      abrirModalEdicaoItem(refeicaoId, itemId);
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

    adicionarAlimentoNaRefeicao(dataAtual, refeicaoId, {
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

    renderTudo();
  });

  function abrirModalEdicaoItem(refeicaoId, itemId) {
    const refeicoes = getRegistroAlimentarDia(dataAtual);
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

    editarAlimentoDaRefeicao(dataAtual, editandoItemRefeicaoId, editandoItemId, {
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

  renderAlimentosBaseLista();
  renderDatalist();
  renderTudo();

  if (!getMetaKcalDia()) {
    abrirModalMeta();
  }
});
