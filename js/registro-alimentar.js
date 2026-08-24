/* MONITOR — registro-alimentar.js
   Monta o registro alimentar do dia por blocos de refeição,
   calcula os totais de macros/kcal e mantém o cadastro simples
   de alimentos usado para sugerir macros no autocomplete. */

document.addEventListener("DOMContentLoaded", () => {
  const totalPtEl = document.getElementById("total-pt");
  const totalChEl = document.getElementById("total-ch");
  const totalLpEl = document.getElementById("total-lp");
  const totalKcalEl = document.getElementById("total-kcal");

  const formAddRefeicao = document.getElementById("form-add-refeicao");
  const tituloSelect = document.getElementById("titulo-refeicao");
  const refeicoesContainer = document.getElementById("refeicoes-container");
  const refeicoesEmpty = document.getElementById("refeicoes-empty");
  const datalistAlimentos = document.getElementById("datalist-alimentos");

  const btnCadastrarAlimento = document.getElementById("btn-cadastrar-alimento");
  const modalCadastro = document.getElementById("modal-cadastro-alimento");
  const formCadastro = document.getElementById("form-cadastro-alimento");
  const btnCancelarCadastro = document.getElementById("btn-cancelar-cadastro");
  const cadastroFeedback = document.getElementById("cadastro-alimento-feedback");

  const ICON_EXCLUIR = `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>`;

  function hojeIso() {
    return new Date().toISOString().slice(0, 10);
  }

  const dataAtual = hojeIso();
  let refeicoes = getRegistroAlimentarDia(dataAtual);

  function gerarId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function persistir() {
    saveRegistroAlimentarDia(dataAtual, refeicoes);
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

  function renderTotais() {
    let pt = 0;
    let ch = 0;
    let lp = 0;
    let kcal = 0;

    refeicoes.forEach((refeicao) => {
      refeicao.itens.forEach((item) => {
        pt += num(item.pt);
        ch += num(item.ch);
        lp += num(item.lp);
        kcal += num(item.kcal);
      });
    });

    totalPtEl.textContent = pt.toFixed(1);
    totalChEl.textContent = ch.toFixed(1);
    totalLpEl.textContent = lp.toFixed(1);
    totalKcalEl.textContent = Math.round(kcal);
  }

  function renderDatalist() {
    const alimentos = getAlimentosCadastrados();
    datalistAlimentos.innerHTML = alimentos.map((a) => `<option value="${escapeHtml(a.nome)}"></option>`).join("");
  }

  function renderRefeicoes() {
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

      const itensHtml = refeicao.itens
        .map(
          (item) => `
        <li class="food-item" data-item-id="${item.id}">
          <div class="food-item__info">
            <span class="food-item__nome">${escapeHtml(item.nome)}</span>
            <span class="food-item__macros">PT ${num(item.pt)} · CH ${num(item.ch)} · LP ${num(item.lp)} · ${num(item.kcal)} kcal</span>
          </div>
          <button type="button" class="icon-btn icon-btn--delete" data-action="remover-item" aria-label="Remover alimento">${ICON_EXCLUIR}</button>
        </li>`
        )
        .join("");

      bloco.innerHTML = `
        <div class="meal-block__header">
          <h3 class="meal-block__title">${escapeHtml(refeicao.titulo)}</h3>
          <button type="button" class="icon-btn icon-btn--delete" data-action="remover-refeicao" aria-label="Remover refeição">${ICON_EXCLUIR}</button>
        </div>
        <ul class="food-list">${itensHtml}</ul>
        <form class="food-form">
          <div class="field">
            <label>Alimento</label>
            <input type="text" class="food-nome" list="datalist-alimentos" placeholder="Nome do alimento" required />
          </div>
          <div class="macro-grid">
            <div class="field"><label>PT</label><input type="number" class="food-pt" step="0.1" min="0" inputmode="decimal" /></div>
            <div class="field"><label>CH</label><input type="number" class="food-ch" step="0.1" min="0" inputmode="decimal" /></div>
            <div class="field"><label>LP</label><input type="number" class="food-lp" step="0.1" min="0" inputmode="decimal" /></div>
            <div class="field"><label>Kcal</label><input type="number" class="food-kcal" step="1" min="0" inputmode="decimal" /></div>
          </div>
          <button type="submit" class="btn btn-secondary btn-block">Adicionar alimento</button>
        </form>
      `;

      refeicoesContainer.appendChild(bloco);
    });
  }

  function renderTudo() {
    renderRefeicoes();
    renderTotais();
  }

  formAddRefeicao.addEventListener("submit", (event) => {
    event.preventDefault();
    refeicoes.push({ id: gerarId(), titulo: tituloSelect.value, itens: [] });
    persistir();
    renderTudo();
  });

  refeicoesContainer.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;

    const blocoEl = btn.closest(".meal-block");
    const refeicaoId = blocoEl.dataset.refeicaoId;

    if (btn.dataset.action === "remover-refeicao") {
      if (!confirm("Remover esta refeição e todos os alimentos dela?")) return;
      refeicoes = refeicoes.filter((r) => r.id !== refeicaoId);
      persistir();
      renderTudo();
      return;
    }

    if (btn.dataset.action === "remover-item") {
      const itemId = btn.closest(".food-item").dataset.itemId;
      const refeicao = refeicoes.find((r) => r.id === refeicaoId);
      if (!refeicao) return;
      refeicao.itens = refeicao.itens.filter((i) => i.id !== itemId);
      persistir();
      renderTudo();
    }
  });

  refeicoesContainer.addEventListener("input", (event) => {
    const input = event.target;
    if (!input.classList.contains("food-nome")) return;

    const resultados = buscarAlimento(input.value);
    const correspondenciaExata = resultados.find(
      (alimento) => alimento.nome.toLowerCase() === input.value.trim().toLowerCase()
    );
    if (!correspondenciaExata) return;

    const bloco = input.closest(".meal-block");
    bloco.querySelector(".food-pt").value = correspondenciaExata.pt;
    bloco.querySelector(".food-ch").value = correspondenciaExata.ch;
    bloco.querySelector(".food-lp").value = correspondenciaExata.lp;
    bloco.querySelector(".food-kcal").value = correspondenciaExata.kcal;
  });

  refeicoesContainer.addEventListener("submit", (event) => {
    if (!event.target.classList.contains("food-form")) return;
    event.preventDefault();

    const form = event.target;
    const refeicaoId = form.closest(".meal-block").dataset.refeicaoId;
    const refeicao = refeicoes.find((r) => r.id === refeicaoId);
    if (!refeicao) return;

    const nome = form.querySelector(".food-nome").value.trim();
    if (!nome) return;

    refeicao.itens.push({
      id: gerarId(),
      nome,
      pt: num(form.querySelector(".food-pt").value),
      ch: num(form.querySelector(".food-ch").value),
      lp: num(form.querySelector(".food-lp").value),
      kcal: num(form.querySelector(".food-kcal").value),
    });

    persistir();
    renderTudo();
  });

  function abrirModalCadastro() {
    formCadastro.reset();
    cadastroFeedback.textContent = "";
    modalCadastro.classList.remove("hidden");
  }

  function fecharModalCadastro() {
    modalCadastro.classList.add("hidden");
  }

  btnCadastrarAlimento.addEventListener("click", abrirModalCadastro);
  btnCancelarCadastro.addEventListener("click", fecharModalCadastro);

  modalCadastro.addEventListener("click", (event) => {
    if (event.target === modalCadastro) fecharModalCadastro();
  });

  formCadastro.addEventListener("submit", (event) => {
    event.preventDefault();
    cadastroFeedback.textContent = "";

    const nome = document.getElementById("cadastro-nome").value.trim();
    if (!nome) {
      cadastroFeedback.textContent = "Informe o nome do alimento.";
      return;
    }

    addAlimentoCadastrado({
      id: gerarId(),
      nome,
      pt: num(document.getElementById("cadastro-pt").value),
      ch: num(document.getElementById("cadastro-ch").value),
      lp: num(document.getElementById("cadastro-lp").value),
      kcal: num(document.getElementById("cadastro-kcal").value),
    });

    renderDatalist();
    fecharModalCadastro();
  });

  renderDatalist();
  renderTudo();
});
