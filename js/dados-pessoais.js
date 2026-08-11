/* MONITOR — dados-pessoais.js
   Preenche, valida e salva os dados pessoais do atleta.
   Calcula a idade em tempo real a partir da data de nascimento. */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-dados-pessoais");
  const nomeInput = document.getElementById("nome");
  const dataNascInput = document.getElementById("data-nascimento");
  const idadeInput = document.getElementById("idade");
  const feedback = document.getElementById("form-feedback");

  function calcularIdade(dataNascimentoIso) {
    const nascimento = new Date(dataNascimentoIso + "T00:00:00");
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const aindaNaoFezAniversario =
      hoje.getMonth() < nascimento.getMonth() ||
      (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
    if (aindaNaoFezAniversario) idade--;
    return idade;
  }

  function atualizarIdade() {
    if (!dataNascInput.value) {
      idadeInput.value = "";
      return;
    }
    const idade = calcularIdade(dataNascInput.value);
    idadeInput.value = idade >= 0 ? `${idade} anos` : "Data inválida";
  }

  function preencherComDadosSalvos() {
    const dados = getDadosPessoais();
    if (!dados) return;

    nomeInput.value = dados.nome || "";
    dataNascInput.value = dados.dataNascimento || "";

    if (dados.sexo) {
      const radio = document.querySelector(`input[name="sexo"][value="${dados.sexo}"]`);
      if (radio) radio.checked = true;
    }

    atualizarIdade();
  }

  dataNascInput.addEventListener("input", atualizarIdade);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    feedback.textContent = "";
    feedback.classList.remove("success");

    const nome = nomeInput.value.trim();
    const dataNascimento = dataNascInput.value;
    const sexoSelecionado = document.querySelector('input[name="sexo"]:checked');

    if (!nome) {
      feedback.textContent = "Informe o nome.";
      return;
    }
    if (!dataNascimento) {
      feedback.textContent = "Informe a data de nascimento.";
      return;
    }
    if (new Date(dataNascimento + "T00:00:00") > new Date()) {
      feedback.textContent = "A data de nascimento não pode ser no futuro.";
      return;
    }
    if (!sexoSelecionado) {
      feedback.textContent = "Selecione o sexo.";
      return;
    }

    saveDadosPessoais({
      nome,
      dataNascimento,
      sexo: sexoSelecionado.value,
    });

    feedback.textContent = "Dados salvos com sucesso.";
    feedback.classList.add("success");
  });

  preencherComDadosSalvos();
});
