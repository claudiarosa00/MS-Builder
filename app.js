/*
============================================
1. REFERÊNCIAS AOS ELEMENTOS DA PÁGINA
============================================
*/
const areaEstado = document.getElementById("areaEstado");
const listaFormatos = document.getElementById("listaFormatos");
const campoCliente = document.getElementById("campoCliente");
const campoCampanha = document.getElementById("campoCampanha");
const resumoCampanha = document.getElementById("resumoCampanha");
const resumoSelecao = document.getElementById("resumoSelecao");

// Lista completa de formatos carregados (com um "id" único acrescentado a cada um)
// e o conjunto de ids que o utilizador foi selecionando através das checkboxes.
let todosFormatos = [];
const idsSelecionados = new Set();

/*
============================================
2. DADOS DA CAMPANHA (Cliente / Campanha)
Cada vez que o utilizador escreve num dos campos,
atualizamos uma frase de resumo, só para confirmarmos
que os valores estão a ser lidos corretamente.
Mais à frente, estes dados vão identificar o pedido
de materiais gerado no fim do processo.
============================================
*/
function atualizarResumoCampanha() {
  const cliente = campoCliente.value.trim();
  const campanha = campoCampanha.value.trim();

  if (!cliente && !campanha) {
    resumoCampanha.textContent = "";
    return;
  }
  resumoCampanha.textContent =
    `A preparar pedido de materiais para: ${cliente || "(cliente por preencher)"} — ${campanha || "(campanha por preencher)"}`;
}

campoCliente.addEventListener("input", atualizarResumoCampanha);
campoCampanha.addEventListener("input", atualizarResumoCampanha);

/*
============================================
3. CARREGAR A BASE DE FORMATOS (data/formatos.json)
Esta é a única fonte de dados da aplicação nesta fase.
Se um dia a base mudar (outro sistema, outra base de dados),
só este pedaço de código precisa de mudar — o resto da app
continua a trabalhar com a mesma lista de formatos.
============================================
*/
async function carregarFormatos() {
  mostrarEstado("A carregar formatos...");

  try {
    const resposta = await fetch("data/formatos.json");
    if (!resposta.ok) {
      throw new Error(`Não foi possível ler formatos.json (status ${resposta.status})`);
    }
    const formatos = await resposta.json();

    // Acrescenta um "id" único a cada formato (a posição na lista chega,
    // porque a lista não muda depois de carregada). É este id que as
    // checkboxes vão usar para dizer qual formato foi selecionado.
    todosFormatos = formatos.map((formato, indice) => ({ ...formato, id: indice }));

    mostrarEstado(`${todosFormatos.length} formatos carregados.`);
    mostrarFormatosAgrupados(todosFormatos);
  } catch (erro) {
    mostrarEstado(`Erro ao carregar os formatos: ${erro.message}`, true);
    console.error(erro);
  }
}

function mostrarEstado(mensagem, ehErro = false) {
  areaEstado.textContent = mensagem;
  areaEstado.classList.toggle("erro", ehErro);
}

/*
============================================
4. AGRUPAR FORMATOS POR PUBLISHER
Transforma a lista simples de formatos num objeto onde
cada chave é o nome do publisher, e o valor é a lista dos
seus formatos. Facilita depois desenhar a lista no ecrã.
============================================
*/
function agruparPorPublisher(formatos) {
  const grupos = {};
  for (const formato of formatos) {
    const nomePublisher = formato.fornecedor;
    if (!grupos[nomePublisher]) {
      grupos[nomePublisher] = [];
    }
    grupos[nomePublisher].push(formato);
  }
  return grupos;
}

/*
============================================
5. DESENHAR OS FORMATOS NO ECRÃ
Para cada publisher, cria um bloco com uma tabela dos
seus formatos e respetivas especificações.
============================================
*/
function mostrarFormatosAgrupados(formatos) {
  const grupos = agruparPorPublisher(formatos);
  const nomesPublishers = Object.keys(grupos).sort();

  listaFormatos.innerHTML = "";

  for (const nomePublisher of nomesPublishers) {
    const formatosDoPublisher = grupos[nomePublisher];
    listaFormatos.appendChild(criarBlocoPublisher(nomePublisher, formatosDoPublisher));
  }
}

function criarBlocoPublisher(nomePublisher, formatosDoPublisher) {
  const bloco = document.createElement("section");
  bloco.className = "grupo-publisher";

  const titulo = document.createElement("h2");
  titulo.textContent = nomePublisher;
  const contagem = document.createElement("span");
  contagem.className = "contagem";
  contagem.textContent = ` (${formatosDoPublisher.length} formatos)`;
  titulo.appendChild(contagem);
  bloco.appendChild(titulo);

  const tabela = document.createElement("table");
  tabela.className = "tabela-formatos";
  tabela.appendChild(criarCabecalhoTabela());

  const corpo = document.createElement("tbody");
  for (const formato of formatosDoPublisher) {
    corpo.appendChild(criarLinhaFormato(formato));
  }
  tabela.appendChild(corpo);

  bloco.appendChild(tabela);
  return bloco;
}

function criarCabecalhoTabela() {
  const cabecalho = document.createElement("thead");
  cabecalho.innerHTML = `
    <tr>
      <th></th>
      <th>Formato</th>
      <th>Grupo Digital2020</th>
      <th>Dimensão</th>
      <th>Peso</th>
      <th>Tipo de ficheiro</th>
    </tr>
  `;
  return cabecalho;
}

function criarLinhaFormato(formato) {
  const linha = document.createElement("tr");
  linha.innerHTML = `
    <td><input type="checkbox" class="checkbox-formato" data-id="${formato.id}"></td>
    <td>${formato.formato ?? ""}</td>
    <td><span class="etiqueta-dg2020">${formato.grupoDigital2020 ?? "—"}</span></td>
    <td>${formato.dimensao ?? "não especificado"}</td>
    <td>${formato.peso ?? "não especificado"}</td>
    <td>${formato.tipoFicheiro ?? "não especificado"}</td>
  `;
  return linha;
}

/*
============================================
6. SELEÇÃO DE FORMATOS
Em vez de pôr um "ouvinte" em cada checkbox (são centenas),
ouvimos os cliques uma vez no contentor todo (listaFormatos)
e verificamos se o clique foi numa checkbox. É mais eficiente
e continua a funcionar mesmo depois de a lista ser filtrada.
============================================
*/
listaFormatos.addEventListener("change", (evento) => {
  const checkbox = evento.target;
  if (!checkbox.classList.contains("checkbox-formato")) {
    return;
  }

  const id = Number(checkbox.dataset.id);
  if (checkbox.checked) {
    idsSelecionados.add(id);
  } else {
    idsSelecionados.delete(id);
  }
  atualizarResumoSelecao();
});

function atualizarResumoSelecao() {
  if (idsSelecionados.size === 0) {
    resumoSelecao.innerHTML = "";
    return;
  }

  const formatosSelecionados = todosFormatos.filter((f) => idsSelecionados.has(f.id));

  const itens = formatosSelecionados
    .map((f) => `<li>${f.fornecedor} — ${f.formato} <span class="etiqueta-dg2020">${f.grupoDigital2020 ?? "—"}</span></li>`)
    .join("");

  resumoSelecao.innerHTML = `
    <h2>Formatos selecionados (${formatosSelecionados.length})</h2>
    <ul>${itens}</ul>
  `;
}

/*
============================================
7. ARRANQUE DA APLICAÇÃO
============================================
*/
carregarFormatos();
