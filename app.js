/*
============================================
1. REFERÊNCIAS AOS ELEMENTOS DA PÁGINA
============================================
*/
const areaEstado = document.getElementById("areaEstado");
const listaFormatos = document.getElementById("listaFormatos");
const listaSpecs = document.getElementById("listaSpecs");
const indicePublishers = document.getElementById("indicePublishers");
const campoIdioma = document.getElementById("campoIdioma");
const campoCompanhia = document.getElementById("campoCompanhia");
const campoCliente = document.getElementById("campoCliente");
const campoCampanha = document.getElementById("campoCampanha");
const resumoCampanha = document.getElementById("resumoCampanha");
const resumoSelecao = document.getElementById("resumoSelecao");
const botaoExportar = document.getElementById("botaoExportar");
const botaoLimparSelecao = document.getElementById("botaoLimparSelecao");
const botoesTab = document.querySelectorAll(".tab-botao");
const paineisTab = { construir: document.getElementById("tabConstruir"), specs: document.getElementById("tabSpecs") };
const campoPesquisa = document.getElementById("campoPesquisa");
const botoesFiltroCategoria = document.querySelectorAll(".filtro-categoria");
const botaoLimparFiltros = document.getElementById("botaoLimparFiltros");
const botoesObjetivo = document.querySelectorAll(".objetivo-botao");
const mensagensSemResultados = {
  construir: document.getElementById("semResultadosConstruir"),
  specs: document.getElementById("semResultadosSpecs"),
};

// Lista completa de formatos carregados (com um "id" único acrescentado a cada um).
let todosFormatos = [];

// O pedido divide-se por objetivo de campanha: o mesmo formato pode ser
// pedido mais que uma vez (ex.: "Single Image" para Awareness E para
// Conversion), porque agência e cliente tratam-nos como criatividades/copies
// distintas mesmo quando as specs técnicas são iguais. Por isso a seleção
// não é um único conjunto de ids — é um conjunto por objetivo, e o utilizador
// vê/marca sempre o conjunto do objetivo ativo no momento.
const OBJETIVOS = ["awareness", "consideration", "conversion"];
const CHAVE_TRADUCAO_OBJETIVO = {
  awareness: "objetivoAwareness",
  consideration: "objetivoConsideration",
  conversion: "objetivoConversion",
};
let objetivoAtivo = "awareness";
const selecoesPorObjetivo = {
  awareness: new Set(),
  consideration: new Set(),
  conversion: new Set(),
};

let tabAtiva = "construir";
let categoriaFiltroAtiva = "todas";
let idiomaAtual = "pt";

/*
============================================
2. TRADUÇÕES (Português / English / Español / Français)
Só traduzimos o texto da interface (menus, botões, mensagens)
e os cabeçalhos do Excel exportado. Os DADOS em si — nomes de
formatos, dimensões, publishers — nunca são traduzidos, porque
vêm da base real e alterá-los seria falsificar informação técnica.

t(chave) devolve o texto na língua atual. Para textos com partes
variáveis (ex.: contagens, nomes), usa-se formatar(chave, valores),
que substitui marcadores como {n} pelo valor indicado.
============================================
*/
const TRADUCOES = {
  subtitulo: { pt: "Construtor de Specs Criativas", en: "Creative Specs Builder", es: "Generador de Especificaciones Creativas", fr: "Générateur de Spécifications Créatives" },
  indiceAriaLabel: { pt: "Índice de publishers", en: "Publisher index", es: "Índice de editores", fr: "Index des éditeurs" },
  excelValorMeioDigital: { pt: "Digital", en: "Digital", es: "Digital", fr: "Numérique" },
  labelIdioma: { pt: "Idioma", en: "Language", es: "Idioma", fr: "Langue" },
  labelCompanhia: { pt: "Companhia", en: "Company", es: "Compañía", fr: "Société" },
  opcaoSelecionar: { pt: "— Selecionar —", en: "— Select —", es: "— Seleccionar —", fr: "— Sélectionner —" },
  labelCliente: { pt: "Cliente", en: "Client", es: "Cliente", fr: "Client" },
  placeholderCliente: { pt: "Nome do cliente", en: "Client name", es: "Nombre del cliente", fr: "Nom du client" },
  labelCampanha: { pt: "Campanha", en: "Campaign", es: "Campaña", fr: "Campagne" },
  labelObjetivo: { pt: "Objetivo", en: "Objective", es: "Objetivo", fr: "Objectif" },
  objetivoAwareness: { pt: "Awareness", en: "Awareness", es: "Awareness", fr: "Awareness" },
  objetivoConsideration: { pt: "Consideration", en: "Consideration", es: "Consideration", fr: "Consideration" },
  objetivoConversion: { pt: "Conversion", en: "Conversion", es: "Conversion", fr: "Conversion" },
  placeholderCampanha: { pt: "Nome da campanha", en: "Campaign name", es: "Nombre de la campaña", fr: "Nom de la campagne" },
  tabConstruir: { pt: "Construir Pedido", en: "Create Request", es: "Crear Solicitud", fr: "Créer la Demande" },
  tabSpecs: { pt: "Biblioteca de Formatos", en: "Format Library", es: "Biblioteca de Formatos", fr: "Bibliothèque de Formats" },
  placeholderPesquisa: { pt: "Pesquisar formato ou publisher...", en: "Search format or publisher...", es: "Buscar formato o editor...", fr: "Rechercher un format ou un éditeur..." },
  filtroTodas: { pt: "Todas", en: "All", es: "Todas", fr: "Toutes" },
  filtroSocialMedia: { pt: "Social Media", en: "Social Media", es: "Social Media", fr: "Social Media" },
  filtroCompraDireta: { pt: "Compra Direta", en: "Direct Buy", es: "Compra Directa", fr: "Achat Direct" },
  filtroGoogleSearch: { pt: "Google ou Search", en: "Google & Search", es: "Google o Búsqueda", fr: "Google ou Recherche" },
  botaoLimparFiltros: { pt: "Limpar filtros", en: "Clear filters", es: "Limpiar filtros", fr: "Effacer les filtres" },
  botaoLimparSelecao: { pt: "Limpar seleção", en: "Clear selection", es: "Limpiar selección", fr: "Effacer la sélection" },
  botaoExportar: { pt: "Exportar para Excel", en: "Export to Excel", es: "Exportar a Excel", fr: "Exporter vers Excel" },
  semResultados: { pt: "Nenhum formato encontrado com estes filtros.", en: "No formats found with these filters.", es: "No se encontraron formatos con estos filtros.", fr: "Aucun format trouvé avec ces filtres." },
  estadoCarregando: { pt: "A carregar formatos...", en: "Loading formats...", es: "Cargando formatos...", fr: "Chargement des formats..." },
  estadoErro: { pt: "Erro ao carregar os formatos: {msg}", en: "Error loading formats: {msg}", es: "Error al cargar los formatos: {msg}", fr: "Erreur lors du chargement des formats : {msg}" },
  resumoCampanhaTexto: { pt: "A preparar pedido para: {cliente} — {campanha}", en: "Preparing request for: {cliente} — {campanha}", es: "Preparando la solicitud para: {cliente} — {campanha}", fr: "Préparation de la demande pour : {cliente} — {campanha}" },
  clientePorPreencher: { pt: "(cliente por preencher)", en: "(client pending)", es: "(cliente por completar)", fr: "(client à renseigner)" },
  campanhaPorPreencher: { pt: "(campanha por preencher)", en: "(campaign pending)", es: "(campaña por completar)", fr: "(campagne à renseigner)" },
  contagemFormatos: { pt: " ({n} formatos)", en: " ({n} formats)", es: " ({n} formatos)", fr: " ({n} formats)" },
  colFormato: { pt: "Formato", en: "Format", es: "Formato", fr: "Format" },
  colGrupoDigital2020: { pt: "Grupo Digital2020", en: "Digital2020 Group", es: "Grupo Digital2020", fr: "Groupe Digital2020" },
  colDimensao: { pt: "Dimensão", en: "Dimensions", es: "Dimensión", fr: "Dimensions" },
  colPeso: { pt: "Peso", en: "File Size", es: "Peso", fr: "Poids" },
  colTipoFicheiro: { pt: "Tipo de ficheiro", en: "File Type", es: "Tipo de archivo", fr: "Type de fichier" },
  colFonte: { pt: "Fonte", en: "Source", es: "Fuente", fr: "Source" },
  colCanal: { pt: "Canal", en: "Channel", es: "Canal", fr: "Canal" },
  colPlataforma: { pt: "Plataforma/Publisher", en: "Platform/Publisher", es: "Plataforma/Publisher", fr: "Plateforme/Éditeur" },
  colLink: { pt: "Link", en: "Link", es: "Enlace", fr: "Lien" },
  canalInternet: { pt: "Internet", en: "Internet", es: "Internet", fr: "Internet" },
  canalSocialMedia: { pt: "Social Media", en: "Social Media", es: "Social Media", fr: "Social Media" },
  canalGoogle: { pt: "Google", en: "Google", es: "Google", fr: "Google" },
  colDataEntrega: { pt: "Data de entrega", en: "Delivery Date", es: "Fecha de entrega", fr: "Date de livraison" },
  naoEspecificado: { pt: "não especificado", en: "not specified", es: "no especificado", fr: "non spécifié" },
  verSpecsLink: { pt: "Ver specs ↗", en: "View specs ↗", es: "Ver especificaciones ↗", fr: "Voir les spécifications ↗" },
  resumoSelecaoTitulo: { pt: "Formatos selecionados ({n})", en: "Selected formats ({n})", es: "Formatos seleccionados ({n})", fr: "Formats sélectionnés ({n})" },
  excelLabelCompanhia: { pt: "Companhia:", en: "Company:", es: "Compañía:", fr: "Société:" },
  excelLabelCliente: { pt: "Cliente:", en: "Client:", es: "Cliente:", fr: "Client:" },
  excelLabelCampanha: { pt: "Campanha:", en: "Campaign:", es: "Campaña:", fr: "Campagne:" },
  excelLabelMeio: { pt: "Meio:", en: "Media:", es: "Medio:", fr: "Média:" },
  excelNomeFolha: { pt: "Pedido de Specs", en: "Creative Specs Request", es: "Solicitud de Especificaciones", fr: "Demande de Spécifications" },
  excelNomeFicheiroPrefixo: { pt: "Pedido_Specs", en: "Creative_Specs_Request", es: "Solicitud_Especificaciones", fr: "Demande_Specifications" },
  valorPreencher: { pt: "(preencher)", en: "(fill in)", es: "(completar)", fr: "(à renseigner)" },
};

function t(chave) {
  return TRADUCOES[chave][idiomaAtual] || TRADUCOES[chave].pt;
}

function formatar(chave, valores) {
  let texto = t(chave);
  for (const [marcador, valor] of Object.entries(valores)) {
    texto = texto.replace(`{${marcador}}`, valor);
  }
  return texto;
}

// Aplica as traduções a todo o texto estático da página (o que está
// marcado no HTML com data-i18n / data-i18n-placeholder). O texto
// gerado dinamicamente (tabelas, mensagens) é tratado à parte, nas
// funções que o constroem.
function aplicarTraducoesEstaticas() {
  document.querySelectorAll("[data-i18n]").forEach((elemento) => {
    elemento.textContent = t(elemento.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((elemento) => {
    elemento.placeholder = t(elemento.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((elemento) => {
    elemento.setAttribute("aria-label", t(elemento.dataset.i18nAriaLabel));
  });

  // O título "CSBuilder" nunca se traduz (é o nome do produto) — só a
  // parte descritiva a seguir ao travessão, tanto no separador do browser
  // como no atributo "lang" da página (importante para leitores de ecrã).
  document.title = `CSBuilder — ${t("subtitulo")}`;
  document.documentElement.lang = idiomaAtual;
}

campoIdioma.addEventListener("change", () => {
  idiomaAtual = campoIdioma.value;
  aplicarTraducoesEstaticas();
  atualizarResumoCampanha();
  // Refazer as duas listas e o resumo da seleção, para os textos
  // gerados em JavaScript (cabeçalhos de tabela, "não especificado",
  // etc.) mudarem de língua também — sem voltar a carregar os dados.
  mostrarFormatosAgrupados(listaFormatos, todosFormatos, { comCheckbox: true, comLink: false, simplificado: true, prefixoId: "construir" });
  mostrarFormatosAgrupados(listaSpecs, todosFormatos, { comCheckbox: false, comLink: true, simplificado: false, prefixoId: "specs" });
  aplicarFiltros();
  atualizarResumoSelecao();
});

/*
============================================
3. TABS (Construir Pedido / Biblioteca de Formatos)
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
  aplicarFiltros();
}

/*
============================================
4. DADOS DA CAMPANHA (Cliente / Campanha)
============================================
*/
function atualizarResumoCampanha() {
  const cliente = campoCliente.value.trim();
  const campanha = campoCampanha.value.trim();

  if (!cliente && !campanha) {
    resumoCampanha.textContent = "";
    return;
  }
  resumoCampanha.textContent = formatar("resumoCampanhaTexto", {
    cliente: cliente || t("clientePorPreencher"),
    campanha: campanha || t("campanhaPorPreencher"),
  });
}

campoCliente.addEventListener("input", atualizarResumoCampanha);
campoCampanha.addEventListener("input", atualizarResumoCampanha);

// A Companhia decide o template do Excel — sempre que muda, o botão de
// exportar tem de ser reavaliado (só liga se também houver seleção).
campoCompanhia.addEventListener("change", atualizarResumoSelecao);

/*
============================================
5. CARREGAR A BASE DE FORMATOS (data/formatos.json)
Esta é a única fonte de dados da aplicação nesta fase.
Se um dia a base mudar (outro sistema, outra base de dados),
só este pedaço de código precisa de mudar — o resto da app
continua a trabalhar com a mesma lista de formatos.
============================================
*/
async function carregarFormatos() {
  mostrarEstado(t("estadoCarregando"));

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

    // Depois de carregado com sucesso não há nada útil a dizer aqui — a
    // própria lista de formatos a aparecer no ecrã já confirma que correu
    // bem, por isso limpamos a mensagem de "A carregar..." sem a substituir.
    mostrarEstado("");
    mostrarFormatosAgrupados(listaFormatos, todosFormatos, { comCheckbox: true, comLink: false, simplificado: true, prefixoId: "construir" });
    mostrarFormatosAgrupados(listaSpecs, todosFormatos, { comCheckbox: false, comLink: true, simplificado: false, prefixoId: "specs" });
    aplicarFiltros();
  } catch (erro) {
    mostrarEstado(formatar("estadoErro", { msg: erro.message }), true);
    console.error(erro);
  }
}

function mostrarEstado(mensagem, ehErro = false) {
  areaEstado.textContent = mensagem;
  areaEstado.classList.toggle("erro", ehErro);
}

/*
============================================
6. AGRUPAR FORMATOS POR PUBLISHER
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
const CHAVE_TRADUCAO_CATEGORIA = {
  "Social Media": "filtroSocialMedia",
  "Compra Direta": "filtroCompraDireta",
  "Google ou Search": "filtroGoogleSearch",
};

function categoriaDoPublisher(nomePublisher, formatosDoPublisher) {
  if (nomePublisher === "Google") {
    return "Google ou Search";
  }
  return formatosDoPublisher[0].canal === "Paid Social" ? "Social Media" : "Compra Direta";
}

/*
============================================
7. DESENHAR OS FORMATOS NO ECRÃ
Serve tanto para a tab "Construir Pedido" (com checkboxes)
como para a tab "Biblioteca de Formatos" (sem checkboxes, com link).
opcoes.prefixoId garante que os ids das secções não se
repetem entre as duas tabs (têm de ser únicos na página).
============================================
*/
function mostrarFormatosAgrupados(contentor, formatos, opcoes) {
  const grupos = agruparPorPublisher(formatos);

  // Ordem de aparecimento: primeiro por canal, pela ordem fixa definida em
  // ORDEM_CATEGORIAS (Social Media, Compra Direta, Google ou Search); dentro
  // de cada canal, os publishers ficam por ordem alfabética.
  const nomesPublishers = Object.keys(grupos).sort((a, b) => {
    const posicaoA = ORDEM_CATEGORIAS.indexOf(categoriaDoPublisher(a, grupos[a]));
    const posicaoB = ORDEM_CATEGORIAS.indexOf(categoriaDoPublisher(b, grupos[b]));
    if (posicaoA !== posicaoB) {
      return posicaoA - posicaoB;
    }
    return a.localeCompare(b, "pt");
  });

  contentor.innerHTML = "";

  for (const nomePublisher of nomesPublishers) {
    // Dentro do publisher, os próprios formatos também ficam por ordem
    // alfabética (em vez da ordem em que vieram da base).
    const formatosDoPublisher = [...grupos[nomePublisher]].sort((a, b) =>
      (a.formato || "").localeCompare(b.formato || "", "pt")
    );
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
  contagem.textContent = formatar("contagemFormatos", { n: formatosDoPublisher.length });
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
  const colunaCheckbox = opcoes.comCheckbox ? '<th class="coluna-checkbox"></th>' : "";
  const colunaLink = opcoes.comLink ? `<th>${t("colFonte")}</th>` : "";

  // Na tab "Construir Pedido" (simplificado) só mostramos o essencial para
  // escolher — nome do formato e o grupo Digital2020. As specs completas
  // (dimensão, peso, tipo de ficheiro) ficam só na tab "Biblioteca de Formatos",
  // para a seleção não ficar cheia de informação que ainda não é precisa.
  if (opcoes.simplificado) {
    cabecalho.innerHTML = `
      <tr>
        ${colunaCheckbox}
        <th>${t("colFormato")}</th>
        <th>${t("colGrupoDigital2020")}</th>
      </tr>
    `;
    return cabecalho;
  }

  cabecalho.innerHTML = `
    <tr>
      ${colunaCheckbox}
      <th>${t("colFormato")}</th>
      <th>${t("colGrupoDigital2020")}</th>
      <th>${t("colDimensao")}</th>
      <th>${t("colPeso")}</th>
      <th>${t("colTipoFicheiro")}</th>
      ${colunaLink}
    </tr>
  `;
  return cabecalho;
}

function criarLinhaFormato(formato, opcoes) {
  const linha = document.createElement("tr");
  // Marca a checkbox logo na criação se este formato já estiver selecionado
  // (importante para a lista continuar correta depois de trocar de idioma
  // ou de filtro, que voltam a desenhar as linhas do zero).
  const colunaCheckbox = opcoes.comCheckbox
    ? `<td class="coluna-checkbox"><input type="checkbox" class="checkbox-formato" data-id="${formato.id}" ${selecoesPorObjetivo[objetivoAtivo].has(formato.id) ? "checked" : ""}></td>`
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
    ? `<td>${formato.link ? `<a href="${formato.link}" target="_blank" rel="noopener">${t("verSpecsLink")}</a>` : "—"}</td>`
    : "";
  linha.innerHTML = `
    ${colunaCheckbox}
    <td>${formato.formato ?? ""}</td>
    <td><span class="etiqueta-dg2020">${formato.grupoDigital2020 ?? "—"}</span></td>
    <td>${formato.dimensao ?? t("naoEspecificado")}</td>
    <td>${formato.peso ?? t("naoEspecificado")}</td>
    <td>${formato.tipoFicheiro ?? t("naoEspecificado")}</td>
    ${colunaLink}
  `;
  return linha;
}

/*
============================================
8. ÍNDICE LATERAL DE PUBLISHERS (agrupado por categoria)
Constrói a lista de links a partir das secções que já
estão desenhadas na tab ativa (lê o "data-publisher" e o
"data-categoria" que cada bloco de publisher já tem).
Clicar num link salta para essa secção com scroll suave.
============================================
*/
function atualizarIndicePublishers() {
  const painelAtivo = paineisTab[tabAtiva];
  // Só entram no índice os publishers que ainda têm alguma linha visível
  // (ou seja, que os filtros não escondam por completo).
  const blocos = [...painelAtivo.querySelectorAll(".grupo-publisher")].filter(
    (bloco) => bloco.style.display !== "none"
  );

  indicePublishers.innerHTML = "";

  for (const categoria of ORDEM_CATEGORIAS) {
    const blocosDaCategoria = blocos.filter((bloco) => bloco.dataset.categoria === categoria);
    if (blocosDaCategoria.length === 0) {
      continue;
    }

    const titulo = document.createElement("h3");
    titulo.className = "indice-categoria";
    titulo.textContent = t(CHAVE_TRADUCAO_CATEGORIA[categoria]);
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
9. FILTROS (pesquisa + categoria)
Em vez de esconder e voltar a construir a lista toda,
só ligamos/desligamos a visibilidade das linhas e dos
blocos de publisher que já existem no ecrã — mais rápido,
e mantém a seleção que já foi feita.
============================================
*/
campoPesquisa.addEventListener("input", aplicarFiltros);
botoesFiltroCategoria.forEach((botao) => {
  botao.addEventListener("click", () => {
    categoriaFiltroAtiva = botao.dataset.categoria;
    botoesFiltroCategoria.forEach((b) => b.classList.toggle("ativo", b === botao));
    aplicarFiltros();
  });
});

function aplicarFiltros() {
  const painelAtivo = paineisTab[tabAtiva];
  const texto = campoPesquisa.value.trim().toLowerCase();
  const blocos = painelAtivo.querySelectorAll(".grupo-publisher");
  let algumVisivel = false;

  blocos.forEach((bloco) => {
    const categoriaCombina = categoriaFiltroAtiva === "todas" || bloco.dataset.categoria === categoriaFiltroAtiva;

    let linhasVisiveisNoBloco = 0;
    bloco.querySelectorAll("tbody tr").forEach((linha) => {
      const combinaTexto = !texto || linha.textContent.toLowerCase().includes(texto);
      const visivel = categoriaCombina && combinaTexto;
      linha.style.display = visivel ? "" : "none";
      if (visivel) {
        linhasVisiveisNoBloco++;
      }
    });

    const blocoVisivel = linhasVisiveisNoBloco > 0;
    bloco.style.display = blocoVisivel ? "" : "none";
    if (blocoVisivel) {
      algumVisivel = true;
    }
  });

  mensagensSemResultados[tabAtiva].hidden = algumVisivel;
  atualizarIndicePublishers();
}

// Repõe a pesquisa e a categoria em "Todas", sem mexer na seleção.
botaoLimparFiltros.addEventListener("click", () => {
  campoPesquisa.value = "";
  categoriaFiltroAtiva = "todas";
  botoesFiltroCategoria.forEach((botao) => botao.classList.toggle("ativo", botao.dataset.categoria === "todas"));
  aplicarFiltros();
});

/*
============================================
10. SELEÇÃO DE FORMATOS
Em vez de pôr um "ouvinte" em cada checkbox (são centenas),
ouvimos os cliques uma vez no contentor todo (listaFormatos)
e verificamos se o clique foi numa checkbox. É mais eficiente
e continua a funcionar mesmo depois de a lista ser filtrada.

A seleção está dividida por objetivo (ver OBJETIVOS, mais acima):
o que a checkbox marca/desmarca é sempre o conjunto do objetivo
ativo no momento (selecoesPorObjetivo[objetivoAtivo]).
============================================
*/
listaFormatos.addEventListener("change", (evento) => {
  const checkbox = evento.target;
  if (!checkbox.classList.contains("checkbox-formato")) {
    return;
  }

  const id = Number(checkbox.dataset.id);
  if (checkbox.checked) {
    selecoesPorObjetivo[objetivoAtivo].add(id);
  } else {
    selecoesPorObjetivo[objetivoAtivo].delete(id);
  }
  atualizarResumoSelecao();
});

// Troca o objetivo ativo: a lista de formatos mantém-se (não se re-filtra
// nem se re-desenha), só o estado das checkboxes muda, para refletir a
// seleção já feita nesse objetivo.
botoesObjetivo.forEach((botao) => {
  botao.addEventListener("click", () => {
    objetivoAtivo = botao.dataset.objetivo;
    botoesObjetivo.forEach((b) => b.classList.toggle("ativo", b === botao));
    sincronizarCheckboxesComObjetivoAtivo();
    atualizarResumoSelecao();
  });
});

function sincronizarCheckboxesComObjetivoAtivo() {
  const selecaoAtiva = selecoesPorObjetivo[objetivoAtivo];
  listaFormatos.querySelectorAll(".checkbox-formato").forEach((checkbox) => {
    checkbox.checked = selecaoAtiva.has(Number(checkbox.dataset.id));
  });
}

// Esvazia a seleção dos TRÊS objetivos (é um "recomeçar o pedido do zero"),
// não só a do objetivo ativo no momento.
botaoLimparSelecao.addEventListener("click", () => {
  listaFormatos.querySelectorAll(".checkbox-formato:checked").forEach((checkbox) => {
    checkbox.checked = false;
  });
  OBJETIVOS.forEach((objetivo) => selecoesPorObjetivo[objetivo].clear());
  atualizarResumoSelecao();
});

function totalFormatosSelecionados() {
  return OBJETIVOS.reduce((total, objetivo) => total + selecoesPorObjetivo[objetivo].size, 0);
}

function atualizarContagensObjetivo() {
  document.querySelectorAll(".objetivo-contagem").forEach((etiqueta) => {
    const objetivo = etiqueta.dataset.contagem;
    const n = selecoesPorObjetivo[objetivo].size;
    etiqueta.textContent = n > 0 ? `(${n})` : "";
  });
}

function atualizarResumoSelecao() {
  atualizarContagensObjetivo();

  const total = totalFormatosSelecionados();

  // A Companhia é obrigatória porque é ela que decide qual o template
  // (cor + logótipo) a usar no Excel — sem ela escolhida, não há como
  // saber qual gerar, por isso o botão de exportar fica bloqueado.
  botaoExportar.disabled = total === 0 || campoCompanhia.value === "";
  botaoLimparSelecao.disabled = total === 0;

  if (total === 0) {
    resumoSelecao.innerHTML = "";
    return;
  }

  const grupos = OBJETIVOS
    .filter((objetivo) => selecoesPorObjetivo[objetivo].size > 0)
    .map((objetivo) => {
      const formatosDoObjetivo = todosFormatos.filter((f) => selecoesPorObjetivo[objetivo].has(f.id));
      const itensObjetivo = formatosDoObjetivo
        .map((f) => `<li>${f.fornecedor} — ${f.formato} <span class="etiqueta-dg2020">${f.grupoDigital2020 ?? "—"}</span></li>`)
        .join("");
      return `<li class="resumo-grupo-objetivo"><strong>${t(CHAVE_TRADUCAO_OBJETIVO[objetivo])}</strong><ul>${itensObjetivo}</ul></li>`;
    })
    .join("");

  resumoSelecao.innerHTML = `
    <h2>${formatar("resumoSelecaoTitulo", { n: total })}</h2>
    <ul class="resumo-grupos">${grupos}</ul>
  `;
}

/*
============================================
11. EXPORTAR PARA EXCEL (pedido de specs)
Gera um ficheiro .xlsx, no estilo do template real da
agência (cabeçalho colorido, bloco Companhia/Cliente/
Campanha/Meio no topo), só com os formatos selecionados.
A cor do cabeçalho e o logótipo mudam consoante a
Companhia escolhida (Havas Media ou Arena Media).
Usa a biblioteca ExcelJS (lib/exceljs.min.js).
============================================
*/
const CONFIGURACAO_COMPANHIA = {
  "Havas Media": {
    corCabecalho: "FFE60000",
    ficheiroLogo: "assets/logo-havas-media.png",
    proporcaoLogo: 372 / 160,
  },
  "Arena Media": {
    corCabecalho: "FF328CF5",
    ficheiroLogo: "assets/logo-arena-media.png",
    proporcaoLogo: 1557 / 368,
  },
};

// Uma borda cinza-claro, para a tabela ficar bem definida sem
// precisarmos das gridlines do Excel (que desligamos à parte).
const BORDA_CLARA = { style: "thin", color: { argb: "FFDCDCDC" } };
const ESTILO_BORDA_COMPLETA = { top: BORDA_CLARA, left: BORDA_CLARA, bottom: BORDA_CLARA, right: BORDA_CLARA };

// A coluna "Canal" no Excel mostra a categoria de compra (Internet /
// Social Media / Google), não o publisher em si — o Google fica à
// parte (é comprado de forma diferente dos publishers "tradicionais"),
// tal como no índice lateral (ver categoriaDoPublisher, mais acima).
function canalExibicaoFormato(formato) {
  if (formato.fornecedor === "Google") {
    return t("canalGoogle");
  }
  return formato.canal === "Paid Social" ? t("canalSocialMedia") : t("canalInternet");
}

// Escreve uma secção completa (título do objetivo + cabeçalho da tabela +
// uma linha por formato) a partir da linha indicada, e devolve a próxima
// linha livre (já com uma linha em branco a separar da secção seguinte).
function escreverSeccaoObjetivo(folha, linhaInicio, tituloSeccao, formatosDaSeccao, config) {
  let linha = linhaInicio;

  folha.mergeCells(linha, 1, linha, 9);
  const celulaTitulo = folha.getCell(linha, 1);
  celulaTitulo.value = tituloSeccao;
  celulaTitulo.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  celulaTitulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A1A" } };
  celulaTitulo.alignment = { vertical: "middle", horizontal: "left" };
  linha += 1;

  const colunas = ["#", t("colCanal"), t("colPlataforma"), t("colFormato"), t("colDimensao"), t("colPeso"), t("colTipoFicheiro"), t("colLink"), t("colDataEntrega")];
  colunas.forEach((titulo, indice) => {
    const celula = folha.getCell(linha, indice + 1);
    celula.value = titulo;
    celula.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: config.corCabecalho } };
    celula.alignment = { vertical: "middle", wrapText: true };
    celula.border = ESTILO_BORDA_COMPLETA;
  });
  linha += 1;

  formatosDaSeccao.forEach((formato, indice) => {
    const linhaFormato = folha.getRow(linha + indice);
    linhaFormato.values = [
      indice + 1,
      canalExibicaoFormato(formato),
      formato.veiculo,
      formato.formato,
      formato.dimensao || t("naoEspecificado"),
      formato.peso || t("naoEspecificado"),
      formato.tipoFicheiro || t("naoEspecificado"),
      formato.link ? { text: formato.link, hyperlink: formato.link } : t("naoEspecificado"),
      "",
    ];
    linhaFormato.eachCell((celula) => {
      celula.font = { name: "Arial", size: 10, color: { argb: "FF0F1724" } };
      celula.alignment = { vertical: "top", wrapText: true };
      celula.border = ESTILO_BORDA_COMPLETA;
    });
    // O texto do link fica na cor de destaque, sublinhado, para
    // parecer clicável mesmo antes de o utilizador lhe tocar.
    if (formato.link) {
      linhaFormato.getCell(8).font = { name: "Arial", size: 10, color: { argb: "FF1155CC" }, underline: true };
    }
  });
  linha += formatosDaSeccao.length;

  return linha + 1; // uma linha em branco antes da secção seguinte
}

botaoExportar.addEventListener("click", exportarSelecaoParaExcel);

async function exportarSelecaoParaExcel() {
  const companhia = campoCompanhia.value;
  if (totalFormatosSelecionados() === 0 || !companhia) {
    return;
  }

  const config = CONFIGURACAO_COMPANHIA[companhia];
  const cliente = campoCliente.value.trim() || t("valorPreencher");
  const campanha = campoCampanha.value.trim() || t("valorPreencher");

  const workbook = new ExcelJS.Workbook();
  const folha = workbook.addWorksheet(t("excelNomeFolha"));

  // Sem gridlines — só a tabela em si vai ter linhas (mais abaixo),
  // para o Excel ficar limpo e não parecer uma grelha genérica.
  folha.views = [{ showGridLines: false }];

  // --- Larguras de coluna. Têm de ser definidas ANTES de escrever
  // valores nas células, senão o ExcelJS troca-nos as voltas e perde
  // o conteúdo já escrito (foi um bug que apanhámos a testar). ---
  folha.columns = [
    { width: 5 }, { width: 14 }, { width: 20 }, { width: 28 }, { width: 45 }, { width: 16 }, { width: 22 }, { width: 40 }, { width: 20 },
  ];

  // --- Logótipo da companhia escolhida, no canto superior esquerdo ---
  const respostaLogo = await fetch(config.ficheiroLogo);
  const bufferLogo = await respostaLogo.arrayBuffer();
  const idImagemLogo = workbook.addImage({ buffer: bufferLogo, extension: "png" });
  const alturaLogo = 50;
  const larguraLogo = Math.round(alturaLogo * config.proporcaoLogo);
  // Âncora em B2 (col:1, row:1) em vez de A1 (col:0, row:0): a coluna A
  // e a linha 1 ficam livres e funcionam como margem real à esquerda e
  // por cima do logótipo, que assim já não fica colado ao canto da folha.
  folha.addImage(idImagemLogo, { tl: { col: 1, row: 1 }, ext: { width: larguraLogo, height: alturaLogo } });

  // --- Bloco Companhia / Cliente / Campanha / Meio, no topo ---
  const estiloRotulo = { font: { name: "Arial", size: 10, bold: true, color: { argb: "FF5B6678" } } };
  folha.getCell("E3").value = t("excelLabelCompanhia");
  folha.getCell("E3").style = estiloRotulo;
  folha.getCell("F3").value = companhia;
  folha.getCell("E4").value = t("excelLabelCliente");
  folha.getCell("E4").style = estiloRotulo;
  folha.getCell("F4").value = cliente;
  folha.getCell("E5").value = t("excelLabelCampanha");
  folha.getCell("E5").style = estiloRotulo;
  folha.getCell("F5").value = campanha;
  folha.getCell("E6").value = t("excelLabelMeio");
  folha.getCell("E6").style = estiloRotulo;
  folha.getCell("F6").value = t("excelValorMeioDigital");

  // --- Uma secção por objetivo (Awareness / Consideration / Conversion),
  // cada uma com o seu próprio cabeçalho de tabela — o mesmo formato pode
  // aparecer em mais que uma secção, porque foi pedido para objetivos
  // diferentes. Objetivos sem nenhum formato selecionado não geram secção. ---
  let linhaAtual = 10;
  OBJETIVOS.forEach((objetivo) => {
    const formatosDoObjetivo = todosFormatos.filter((f) => selecoesPorObjetivo[objetivo].has(f.id));
    if (formatosDoObjetivo.length === 0) {
      return;
    }
    linhaAtual = escreverSeccaoObjetivo(folha, linhaAtual, t(CHAVE_TRADUCAO_OBJETIVO[objetivo]), formatosDoObjetivo, config);
  });

  // --- Gerar o ficheiro e fazer o download no browser ---
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const nomeFicheiro = `${t("excelNomeFicheiroPrefixo")}_${cliente}_${campanha}.xlsx`.replace(/[\\/:*?"<>|]/g, "-");

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nomeFicheiro;
  link.click();
  URL.revokeObjectURL(link.href);
}

/*
============================================
12. ARRANQUE DA APLICAÇÃO
============================================
*/
aplicarTraducoesEstaticas();
carregarFormatos();
atualizarResumoSelecao();
