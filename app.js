/*
============================================
1. REFERÊNCIAS AOS ELEMENTOS DA PÁGINA
============================================
*/
const areaEstado = document.getElementById("areaEstado");
const listaFormatos = document.getElementById("listaFormatos");
const listaSpecs = document.getElementById("listaSpecs");
const indicePublishers = document.getElementById("indicePublishers");
const campoCliente = document.getElementById("campoCliente");
const campoCampanha = document.getElementById("campoCampanha");
const resumoCampanha = document.getElementById("resumoCampanha");
const resumoSelecao = document.getElementById("resumoSelecao");
const botaoExportar = document.getElementById("botaoExportar");
const botoesTab = document.querySelectorAll(".tab-botao");
const paineisTab = { construir: document.getElementById("tabConstruir"), specs: document.getElementById("tabSpecs") };

// Lista completa de formatos carregados (com um "id" único acrescentado a cada um)
// e o conjunto de ids que o utilizador foi selecionando através das checkboxes.
let todosFormatos = [];
const idsSelecionados = new Set();
let tabAtiva = "construir";

/*
============================================
2. TABS (Construir Pedido / Base de Specs)
Trocar de tab é só mostrar/esconder o painel certo e
voltar a construir o índice lateral, porque cada tab
tem a sua própria lista de secções por publisher.
============================================
*/
botoesTab.forEach((botao) => {
  botao.addEventListener("click", () => mudarTab(botao.dataset.tab));
});

function mudarTab(nomeTab) {
  tabAtiva = nomeTab;
  for (const [nome, painel] of Object.entries(paineisTab)) {
    painel.hidden = nome !== nomeTab;
  }
  botoesTab.forEach((botao) => {
    const ativo = botao.dataset.tab === nomeTab;
    botao.classList.toggle("ativo", ativo);
    botao.setAttribute("aria-selected", ativo);
  });
  atualizarIndicePublishers();
}

/*
============================================
3. DADOS DA CAMPANHA (Cliente / Campanha)
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
4. CARREGAR A BASE DE FORMATOS (data/formatos.json)
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
    mostrarFormatosAgrupados(listaFormatos, todosFormatos, { comCheckbox: true, comLink: false, simplificado: true, prefixoId: "construir" });
    mostrarFormatosAgrupados(listaSpecs, todosFormatos, { comCheckbox: false, comLink: true, simplificado: false, prefixoId: "specs" });
    atualizarIndicePublishers();
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
5. AGRUPAR FORMATOS POR PUBLISHER
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

// Transforma "Media Capital" em "media-capital", para usar em ids de HTML.
function paraIdHtml(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// A que categoria do índice pertence um publisher, a partir dos seus
// próprios formatos: o Google fica à parte (é comprado de forma diferente
// dos publishers "tradicionais"); os restantes seguem o campo "canal"
// que já vem da base (Paid Social vs. Internet/Compra Direta).
const ORDEM_CATEGORIAS = ["Social Media", "Compra Direta", "Google ou Search"];

function categoriaDoPublisher(nomePublisher, formatosDoPublisher) {
  if (nomePublisher === "Google") {
    return "Google ou Search";
  }
  return formatosDoPublisher[0].canal === "Paid Social" ? "Social Media" : "Compra Direta";
}

/*
============================================
6. DESENHAR OS FORMATOS NO ECRÃ
Serve tanto para a tab "Construir Pedido" (com checkboxes)
como para a tab "Base de Specs" (sem checkboxes, com link).
opcoes.prefixoId garante que os ids das secções não se
repetem entre as duas tabs (têm de ser únicos na página).
============================================
*/
function mostrarFormatosAgrupados(contentor, formatos, opcoes) {
  const grupos = agruparPorPublisher(formatos);
  const nomesPublishers = Object.keys(grupos).sort();

  contentor.innerHTML = "";

  for (const nomePublisher of nomesPublishers) {
    const formatosDoPublisher = grupos[nomePublisher];
    contentor.appendChild(criarBlocoPublisher(nomePublisher, formatosDoPublisher, opcoes));
  }
}

function criarBlocoPublisher(nomePublisher, formatosDoPublisher, opcoes) {
  const bloco = document.createElement("section");
  bloco.className = "grupo-publisher";
  bloco.id = `${opcoes.prefixoId}-pub-${paraIdHtml(nomePublisher)}`;
  bloco.dataset.publisher = nomePublisher;
  bloco.dataset.categoria = categoriaDoPublisher(nomePublisher, formatosDoPublisher);

  const titulo = document.createElement("h2");
  titulo.textContent = nomePublisher;
  const contagem = document.createElement("span");
  contagem.className = "contagem";
  contagem.textContent = ` (${formatosDoPublisher.length} formatos)`;
  titulo.appendChild(contagem);
  bloco.appendChild(titulo);

  const tabela = document.createElement("table");
  tabela.className = "tabela-formatos";
  tabela.appendChild(criarCabecalhoTabela(opcoes));

  const corpo = document.createElement("tbody");
  for (const formato of formatosDoPublisher) {
    corpo.appendChild(criarLinhaFormato(formato, opcoes));
  }
  tabela.appendChild(corpo);

  bloco.appendChild(tabela);
  return bloco;
}

function criarCabecalhoTabela(opcoes) {
  const cabecalho = document.createElement("thead");
  const colunaCheckbox = opcoes.comCheckbox ? "<th></th>" : "";
  const colunaLink = opcoes.comLink ? "<th>Fonte</th>" : "";

  // Na tab "Construir Pedido" (simplificado) só mostramos o essencial para
  // escolher — nome do formato e o grupo Digital2020. As specs completas
  // (dimensão, peso, tipo de ficheiro) ficam só na tab "Base de Specs",
  // para a seleção não ficar cheia de informação que ainda não é precisa.
  if (opcoes.simplificado) {
    cabecalho.innerHTML = `
      <tr>
        ${colunaCheckbox}
        <th>Formato</th>
        <th>Grupo Digital2020</th>
      </tr>
    `;
    return cabecalho;
  }

  cabecalho.innerHTML = `
    <tr>
      ${colunaCheckbox}
      <th>Formato</th>
      <th>Grupo Digital2020</th>
      <th>Dimensão</th>
      <th>Peso</th>
      <th>Tipo de ficheiro</th>
      ${colunaLink}
    </tr>
  `;
  return cabecalho;
}

function criarLinhaFormato(formato, opcoes) {
  const linha = document.createElement("tr");
  const colunaCheckbox = opcoes.comCheckbox
    ? `<td><input type="checkbox" class="checkbox-formato" data-id="${formato.id}"></td>`
    : "";

  if (opcoes.simplificado) {
    linha.innerHTML = `
      ${colunaCheckbox}
      <td>${formato.formato ?? ""}</td>
      <td><span class="etiqueta-dg2020">${formato.grupoDigital2020 ?? "—"}</span></td>
    `;
    return linha;
  }

  const colunaLink = opcoes.comLink
    ? `<td>${formato.link ? `<a href="${formato.link}" target="_blank" rel="noopener">Ver specs ↗</a>` : "—"}</td>`
    : "";
  linha.innerHTML = `
    ${colunaCheckbox}
    <td>${formato.formato ?? ""}</td>
    <td><span class="etiqueta-dg2020">${formato.grupoDigital2020 ?? "—"}</span></td>
    <td>${formato.dimensao ?? "não especificado"}</td>
    <td>${formato.peso ?? "não especificado"}</td>
    <td>${formato.tipoFicheiro ?? "não especificado"}</td>
    ${colunaLink}
  `;
  return linha;
}

/*
============================================
7. ÍNDICE LATERAL DE PUBLISHERS (agrupado por categoria)
Constrói a lista de links a partir das secções que já
estão desenhadas na tab ativa (lê o "data-publisher" e o
"data-categoria" que cada bloco de publisher já tem).
Clicar num link salta para essa secção com scroll suave.
============================================
*/
function atualizarIndicePublishers() {
  const painelAtivo = paineisTab[tabAtiva];
  const blocos = [...painelAtivo.querySelectorAll(".grupo-publisher")];

  indicePublishers.innerHTML = "";

  for (const categoria of ORDEM_CATEGORIAS) {
    const blocosDaCategoria = blocos.filter((bloco) => bloco.dataset.categoria === categoria);
    if (blocosDaCategoria.length === 0) {
      continue;
    }

    const titulo = document.createElement("h3");
    titulo.className = "indice-categoria";
    titulo.textContent = categoria;
    indicePublishers.appendChild(titulo);

    blocosDaCategoria.forEach((bloco) => {
      const link = document.createElement("a");
      link.href = `#${bloco.id}`;
      link.textContent = bloco.dataset.publisher;
      link.addEventListener("click", (evento) => {
        evento.preventDefault();
        bloco.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      indicePublishers.appendChild(link);
    });
  }
}

/*
============================================
8. SELEÇÃO DE FORMATOS
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
  botaoExportar.disabled = idsSelecionados.size === 0;

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
9. EXPORTAR PARA EXCEL (pedido de materiais)
Gera um ficheiro .xlsx, no estilo do template real da
agência (cabeçalho azul, bloco Cliente/Campanha/Meio no
topo), só com os formatos que o utilizador selecionou.
Usa a biblioteca ExcelJS (lib/exceljs.min.js).
============================================
*/
botaoExportar.addEventListener("click", exportarSelecaoParaExcel);

async function exportarSelecaoParaExcel() {
  const formatosSelecionados = todosFormatos.filter((f) => idsSelecionados.has(f.id));
  if (formatosSelecionados.length === 0) {
    return;
  }

  const cliente = campoCliente.value.trim() || "(preencher)";
  const campanha = campoCampanha.value.trim() || "(preencher)";

  const workbook = new ExcelJS.Workbook();
  const folha = workbook.addWorksheet("Pedido de Materiais");

  // --- Larguras de coluna. Têm de ser definidas ANTES de escrever
  // valores nas células, senão o ExcelJS troca-nos as voltas e perde
  // o conteúdo já escrito (foi um bug que apanhámos a testar). ---
  folha.columns = [
    { width: 5 }, { width: 20 }, { width: 28 }, { width: 45 }, { width: 16 }, { width: 22 }, { width: 20 },
  ];

  // --- Bloco Cliente / Campanha / Meio, no topo (tal como no template da agência) ---
  const estiloRotulo = { font: { name: "Arial", size: 10, bold: true, color: { argb: "FF5B6678" } } };
  folha.getCell("E3").value = "Cliente:";
  folha.getCell("E3").style = estiloRotulo;
  folha.getCell("F3").value = cliente;
  folha.getCell("E4").value = "Campanha:";
  folha.getCell("E4").style = estiloRotulo;
  folha.getCell("F4").value = campanha;
  folha.getCell("E5").value = "Meio:";
  folha.getCell("E5").style = estiloRotulo;
  folha.getCell("F5").value = "Digital";

  // --- Cabeçalho da tabela (linha 9, tal como no template da agência) ---
  const linhaCabecalho = 9;
  const colunas = ["#", "Canal", "Formato", "Dimensão", "Peso", "Tipo de Ficheiro", "Data de entrega"];
  colunas.forEach((titulo, indice) => {
    const celula = folha.getCell(linhaCabecalho, indice + 1);
    celula.value = titulo;
    celula.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF328CF5" } };
    celula.alignment = { vertical: "middle", wrapText: true };
  });

  // --- Uma linha por formato selecionado ---
  formatosSelecionados.forEach((formato, indice) => {
    const linha = folha.getRow(linhaCabecalho + 1 + indice);
    linha.values = [
      indice + 1,
      formato.fornecedor,
      formato.formato,
      formato.dimensao || "não especificado",
      formato.peso || "não especificado",
      formato.tipoFicheiro || "não especificado",
      "",
    ];
    linha.eachCell((celula) => {
      celula.font = { name: "Arial", size: 10, color: { argb: "FF0F1724" } };
      celula.alignment = { vertical: "top", wrapText: true };
    });
  });

  // --- Gerar o ficheiro e fazer o download no browser ---
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const nomeFicheiro = `Pedido_Materiais_${cliente}_${campanha}.xlsx`.replace(/[\\/:*?"<>|]/g, "-");

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nomeFicheiro;
  link.click();
  URL.revokeObjectURL(link.href);
}

/*
============================================
10. ARRANQUE DA APLICAÇÃO
============================================
*/
carregarFormatos();
atualizarResumoSelecao();
