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
const botaoExportar = document.getElementById("botaoExportar");

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
7. EXPORTAR PARA EXCEL (pedido de materiais)
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
8. ARRANQUE DA APLICAÇÃO
============================================
*/
carregarFormatos();
atualizarResumoSelecao();
