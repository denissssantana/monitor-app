/* MONITOR — cadastro-alimentos.js
   Mantém a base de alimentos reutilizável (monitor_alimentos_base),
   usada pelo dropdown/autocomplete do Registro Alimentar. */

document.addEventListener("DOMContentLoaded", () => {
  const formCadastro = document.getElementById("form-cadastro-alimento");
  const cadastroFeedback = document.getElementById("cadastro-alimento-feedback");
  const alimentosBaseListaEl = document.getElementById("alimentos-base-lista");
  const alimentosBaseListaEmptyEl = document.getElementById("alimentos-base-lista-empty");

  const modalEditarAlimento = document.getElementById("modal-editar-alimento");
  const formEditarAlimento = document.getElementById("form-editar-alimento");
  const editarAlimentoNomeInput = document.getElementById("editar-alimento-nome");
  const editarAlimentoTipoSelect = document.getElementById("editar-alimento-tipo");
  const editarAlimentoQuantidadeInput = document.getElementById("editar-alimento-quantidade");
  const editarAlimentoUnidadeSelect = document.getElementById("editar-alimento-unidade");
  const editarAlimentoPtInput = document.getElementById("editar-alimento-pt");
  const editarAlimentoChInput = document.getElementById("editar-alimento-ch");
  const editarAlimentoLpInput = document.getElementById("editar-alimento-lp");
  const editarAlimentoKcalInput = document.getElementById("editar-alimento-kcal");
  const editarAlimentoFeedback = document.getElementById("editar-alimento-feedback");
  const btnCancelarEdicaoAlimento = document.getElementById("btn-cancelar-edicao-alimento");

  const ICON_EDITAR = `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>`;
  const ICON_EXCLUIR = `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>`;

  const TIPO_LABEL = {
    componente: "Componente",
    refeicao_completa: "Refeição completa",
  };

  let editandoAlimentoId = null;

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
      const tipo = alimento.tipo || "componente";
      li.innerHTML = `
        <div class="record-item__info">
          <span class="food-item__nome">${escapeHtml(alimento.nome)} <small>${num(alimento.quantidadeReferencia)}${alimento.unidade} · ${TIPO_LABEL[tipo]}</small></span>
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
    editarAlimentoTipoSelect.value = alimento.tipo || "componente";
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
      tipo: editarAlimentoTipoSelect.value,
      quantidadeReferencia,
      unidade: editarAlimentoUnidadeSelect.value,
      kcal: num(editarAlimentoKcalInput.value),
      pt: num(editarAlimentoPtInput.value),
      ch: num(editarAlimentoChInput.value),
      lp: num(editarAlimentoLpInput.value),
    });

    fecharModalEdicaoAlimento();
    renderAlimentosBaseLista();
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
      tipo: document.getElementById("cadastro-tipo").value,
      quantidadeReferencia,
      unidade: document.getElementById("cadastro-unidade").value,
      kcal: num(document.getElementById("cadastro-kcal").value),
      pt: num(document.getElementById("cadastro-pt").value),
      ch: num(document.getElementById("cadastro-ch").value),
      lp: num(document.getElementById("cadastro-lp").value),
    });

    formCadastro.reset();
    document.getElementById("cadastro-unidade").value = "g";
    document.getElementById("cadastro-tipo").value = "componente";
    cadastroFeedback.textContent = "Alimento salvo na base.";
    cadastroFeedback.classList.add("success");
    renderAlimentosBaseLista();
  });

  renderAlimentosBaseLista();
});
