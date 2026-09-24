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
const botaoSelecionarTodos = document.getElementById("botaoSelecionarTodos");
const botaoLimparSelecao = document.getElementById("botaoLimparSelecao");
const botoesTab = document.querySelectorAll(".tab-botao");
// A configuração do pedido, a barra de ações e as duas listas já não vivem
// dentro de uma secção "painel" única por tab — ficam soltas na página (para
// a ordem visual poder ser: config do pedido → filtros → lista), e cada uma
// leva o atributo data-tab-visivel a dizer a que tab pertence. paineisTab
// continua a apontar para o contentor de cada lista (onde vivem os blocos
// .grupo-publisher), usado para filtrar/pesquisar só dentro da tab ativa.
const paineisTab = { construir: document.getElementById("listaFormatos"), specs: document.getElementById("listaSpecs") };
const elementosPorTab = document.querySelectorAll("[data-tab-visivel]");
const campoPesquisa = document.getElementById("campoPesquisa");
const botoesFiltroCategoria = document.querySelectorAll(".filtro-categoria");
const botaoLimparFiltros = document.getElementById("botaoLimparFiltros");
const botoesObjetivo = document.querySelectorAll(".objetivo-botao");
const botaoVoltarTopo = document.getElementById("botaoVoltarTopo");
const notificacaoToast = document.getElementById("notificacaoToast");
const modalConfirmacao = document.getElementById("modalConfirmacao");
const modalConfirmacaoTexto = document.getElementById("modalConfirmacaoTexto");
const modalBotaoCancelar = document.getElementById("modalBotaoCancelar");
const modalBotaoConfirmar = document.getElementById("modalBotaoConfirmar");
const mensagensSemResultados = {
  construir: document.getElementById("semResultadosConstruir"),
  specs: document.getElementById("semResultadosSpecs"),
};

// Lista completa de formatos carregados (com um "id" único acrescentado a cada um).
let todosFormatos = [];

// Traduções das specs (Dimensão, Aspect Ratio, Peso, Tipo de Ficheiro,
// Copies) para EN/ES/FR — ficheiro à parte do Excel (ver secção 5), para a
// empresa que mantém a base não ter de se preocupar com idiomas. Chave:
// "<Fornecedor>|<Veículo>|<Formato>" (o texto original em português, tal
// como vem da base — ver chaveTraducao). Uma linha sem tradução, ou um
// formato novo que a base ainda não tenha, mostra sempre o texto original
// em português — nunca inventamos uma tradução em runtime.
let TRADUCOES_SPECS = {};

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

// A duração do spot (TV/Rádio) é outra coisa que varia por seleção, não só
// por objetivo — o mesmo "Spot TV" pode ser pedido em mais que uma duração
// ao mesmo tempo (ex.: 30" para o spot principal + 15" recortado para outro
// momento da campanha), cada uma um pedido de spot distinto. Por isso
// guarda-se à parte, também por objetivo, indexado pelo id do formato (só
// relevante para formatos de TV/Rádio — ver formatoTemDuracao). Cada
// entrada é { padrao: Set<string> (subconjunto de DURACOES_PADRAO
// escolhido), outroAtivo: boolean, outroValor: string }. Quando não há
// entrada, assume-se só DURACAO_OMISSAO (30", a duração mais comum), nunca
// fica por preencher.
const DURACOES_PADRAO = ["15", "20", "30"];
const DURACAO_OMISSAO = "30";
const duracoesPorObjetivo = {
  awareness: new Map(),
  consideration: new Map(),
  conversion: new Map(),
};

// Só os formatos de "spot" (o clássico anúncio de X segundos) têm secundagem
// escolhível — os restantes formatos de TV (Ecrã Fracionado, Telepromoção,
// ...) têm a sua própria duração fixa ou nem o conceito se aplica da mesma
// forma, por isso não ganham o seletor 15″/20″/30″/Outro nem a coluna
// Secundagem no Excel (essa informação, quando existe, já vem nas
// Observações desse formato).
function formatoTemDuracao(formato) {
  const grupo = grupoMeioDoFormato(formato);
  if (grupo !== "TV" && grupo !== "Rádio") {
    return false;
  }
  return (formato.formato || "").toLowerCase().includes("spot");
}

// Estado de duração para leitura (renderização) — nunca cria/guarda nada,
// devolve o valor por omissão (só 30") quando ainda não há escolha explícita.
function estadoDuracaoOuOmissao(formato, objetivo) {
  return duracoesPorObjetivo[objetivo].get(formato.id) || { padrao: new Set([DURACAO_OMISSAO]), outroAtivo: false, outroValor: "" };
}

// Garante uma entrada real no mapa (criando-a com o valor por omissão se
// for a primeira interação) para poder ser alterada — só chamar a partir
// de um evento do utilizador, nunca da renderização.
function garantirEstadoDuracao(formato, objetivo) {
  const mapa = duracoesPorObjetivo[objetivo];
  let estado = mapa.get(formato.id);
  if (!estado) {
    estado = { padrao: new Set([DURACAO_OMISSAO]), outroAtivo: false, outroValor: "" };
    mapa.set(formato.id, estado);
  }
  return estado;
}

// As durações efetivamente escolhidas para este formato+objetivo, na ordem
// 15/20/30 seguida de "Outro" (se ativo e preenchido) — nunca uma lista
// vazia quando o formato tem duração (cai sempre em [DURACAO_OMISSAO]).
function duracoesEfetivasDoFormato(formato, objetivo) {
  if (!formatoTemDuracao(formato)) {
    return [];
  }
  const estado = estadoDuracaoOuOmissao(formato, objetivo);
  const valores = DURACOES_PADRAO.filter((valor) => estado.padrao.has(valor));
  if (estado.outroAtivo && estado.outroValor.trim()) {
    valores.push(estado.outroValor.trim());
  }
  return valores.length > 0 ? valores : [DURACAO_OMISSAO];
}
const selecoesPorObjetivo = {
  awareness: new Set(),
  consideration: new Set(),
  conversion: new Set(),
};

// Alguns concessionários de OOH (JCDecaux, MOP, DreamMedia) deixam escolher
// entre entregar a arte final (eles produzem os cartazes) ou entregar os
// cartazes já produzidos na morada deles — mas só faz sentido para o Mupi
// em PAPEL (o Mupi Digital é um ficheiro entregue normalmente, sem essa
// questão). Um formato de Mupi papel só pode ficar marcado na seleção
// depois de esta escolha estar feita (ver o listener de "checkbox-formato").
// Guarda-se por objetivo, tal como a duração — a mesma pergunta pode ter
// respostas diferentes consoante o objetivo da campanha.
function formatoEhMupiPapel(formato) {
  if (grupoMeioDoFormato(formato) !== "OOH") {
    return false;
  }
  const nome = (formato.formato || "").toLowerCase();
  return nome.includes("mupi") && !nome.includes("digital");
}
const entregaMupiPorObjetivo = {
  awareness: new Map(),
  consideration: new Map(),
  conversion: new Map(),
};
function entregaEfetivaDoFormato(formato, objetivo) {
  return entregaMupiPorObjetivo[objetivo].get(formato.id) || null;
}

// Morada e horário de entrega dos cartazes já produzidos, por concessionário
// — texto fornecido pela própria Cláudia, mostrado tal como está (nunca
// traduzido, tal como um nome próprio ou um endereço). Só sai no Excel
// exportado (coluna "Morada de Entrega", ver moradaEntregaMupi em
// COLUNAS_EXCEL_DISPONIVEIS) quando "Entrega na Morada" foi a opção
// escolhida — não aparece no construtor, para não sobrecarregar a linha.
const MORADA_ENTREGA_MUPI_PAPEL = {
  "JCDecaux": "Caso entreguem cartazes nas nossas instalações, os mesmos deverão ser acompanhados de uma impressão da campanha a afixar. A entrega dos cartazes deve ser efetuada das 07h00 às 12h00 e das 13h30 às 16h00 nas instalações da JCDecaux – Portão 1. Morada: Beco da Aviação, nº 1, Granja do Alpriate, 2625-607 Vialonga – Portugal.",
  "MOP": "Morada de entrega: R. Mário Castelhano, 42 - Armazém 7, Lux Parque - Queluz de Baixo, 2734-502 Barcarena. Horário: 8h-12h e 13h-17h. Tel: +351 214 355 485.",
  "DreamMedia": "Morada de entrega: Rua Manuel da Maia, nº 4, 2680-186 Loures. Horário: 8h-12h e 13h-17h.",
};

// Pedir o mesmo formato para vários temas/criatividades diferentes (TV,
// Rádio e OOH) é, tal como a duração, mais que um pedido de facto — cada
// tema ganha a sua própria linha no Excel (ver escreverSeccaoObjetivo).
// Aqui só se escolhe a QUANTIDADE (não o nome de cada tema, que fica por
// preencher à mão depois no Excel, em "Tema 1"/"Tema 2"/...). Sem entrada
// no mapa assume-se 1 (um único pedido, sem divisão por tema).
const MEIOS_COM_TEMA = new Set(["TV", "Rádio", "OOH"]);
const LIMITE_MAXIMO_TEMAS = 10;
const temasPorObjetivo = {
  awareness: new Map(),
  consideration: new Map(),
  conversion: new Map(),
};
function contagemTemasDoFormato(formato, objetivo) {
  return temasPorObjetivo[objetivo].get(formato.id) || 1;
}

let tabAtiva = "construir";
let categoriaFiltroAtiva = "todas";
let idiomaAtual = "pt";

/*
============================================
2. TRADUÇÕES (Português / English / Español / Français)
Traduzimos o texto da interface (menus, botões, mensagens), os
cabeçalhos do Excel exportado, e também as specs de cada formato
(Dimensão, Aspect Ratio, Peso, Tipo de Ficheiro, Copies, e por
vezes o próprio nome do formato) — estas últimas através de
TRADUCOES_SPECS (ver textoTraduzido, e a secção 5 mais abaixo),
um ficheiro à parte do Excel. Nomes de publisher e de veículo
nunca são traduzidos (são nomes próprios).

t(chave) devolve o texto na língua atual. Para textos com partes
variáveis (ex.: contagens, nomes), usa-se formatar(chave, valores),
que substitui marcadores como {n} pelo valor indicado.
============================================
*/
const TRADUCOES = {
  subtitulo: { pt: "Construtor de Specs Criativas", en: "Creative Specs Builder", es: "Generador de Especificaciones Creativas", fr: "Générateur de Spécifications Créatives" },
  linkSaltarConteudo: { pt: "Saltar para o formulário do pedido", en: "Skip to the request form", es: "Saltar al formulario del pedido", fr: "Passer au formulaire de la demande" },
  avisoObjetivo: { pt: "Cada objetivo tem a sua própria seleção — o mesmo formato pode ser pedido em mais do que um.", en: "Each objective has its own selection — the same format can be requested for more than one.", es: "Cada objetivo tiene su propia selección — el mismo formato puede pedirse en más de uno.", fr: "Chaque objectif a sa propre sélection — le même format peut être demandé pour plusieurs objectifs." },
  avisoPersistencia: { pt: "A tua seleção fica guardada neste dispositivo, mesmo que recarregues a página.", en: "Your selection stays saved on this device, even if you reload the page.", es: "Tu selección queda guardada en este dispositivo, aunque recargues la página.", fr: "Ta sélection reste enregistrée sur cet appareil, même si tu recharges la page." },
  // Duas versões (singular/plural) para a concordância ficar correta com
  // n=1 — "os 1 formatos" está gramaticalmente errado (ver auditoria UX
  // global). formatarContagem() escolhe a chave certa consoante o n.
  confirmarLimparSelecaoUm: { pt: "Limpar o {n} formato selecionado nos 3 objetivos? Esta ação não pode ser desfeita.", en: "Clear the {n} selected format across all 3 objectives? This action cannot be undone.", es: "¿Borrar el {n} formato seleccionado en los 3 objetivos? Esta acción no se puede deshacer.", fr: "Effacer le {n} format sélectionné dans les 3 objectifs ? Cette action est irréversible." },
  confirmarLimparSelecao: { pt: "Limpar os {n} formatos selecionados nos 3 objetivos? Esta ação não pode ser desfeita.", en: "Clear the {n} selected formats across all 3 objectives? This action cannot be undone.", es: "¿Borrar los {n} formatos seleccionados en los 3 objetivos? Esta acción no se puede deshacer.", fr: "Effacer les {n} formats sélectionnés dans les 3 objectifs ? Cette action est irréversible." },
  colEntrega: { pt: "Entrega", en: "Delivery", es: "Entrega", fr: "Livraison" },
  colEntregaAF: { pt: "Entrega AF", en: "AF Delivery", es: "Entrega AF", fr: "Livraison AF" },
  colEntregaMorada: { pt: "Entrega na Morada", en: "Delivery to Address", es: "Entrega en la Dirección", fr: "Livraison à l'Adresse" },
  colMoradaEntrega: { pt: "Morada de Entrega", en: "Delivery Address", es: "Dirección de Entrega", fr: "Adresse de Livraison" },
  avisoEscolherEntregaMupi: { pt: "Escolhe primeiro onde entregar este mupi de papel.", en: "Choose where to deliver this paper mupi first.", es: "Elige primero dónde entregar este mupi de papel.", fr: "Choisis d'abord où livrer ce mupi papier." },
  avisoMupisSaltadosSelecionarTodos: { pt: "{n} mupi(s) de papel ficaram por selecionar — falta escolher onde entregar.", en: "{n} paper mupi(s) were left unselected — delivery choice still missing.", es: "{n} mupi(s) de papel quedaron sin seleccionar — falta elegir dónde entregar.", fr: "{n} mupi(s) papier n'ont pas été sélectionnés — choix de livraison manquant." },
  colTemasBuilder: { pt: "Temas", en: "Themes", es: "Temas", fr: "Thèmes" },
  temasDiminuir: { pt: "Diminuir número de temas de {formato}", en: "Decrease number of themes for {formato}", es: "Disminuir número de temas de {formato}", fr: "Diminuer le nombre de thèmes de {formato}" },
  temasAumentar: { pt: "Aumentar número de temas de {formato}", en: "Increase number of themes for {formato}", es: "Aumentar número de temas de {formato}", fr: "Augmenter le nombre de thèmes de {formato}" },
  temaNumero: { pt: "Tema {n}", en: "Theme {n}", es: "Tema {n}", fr: "Thème {n}" },
  resumoNumeroTemas: { pt: "{n} temas", en: "{n} themes", es: "{n} temas", fr: "{n} thèmes" },
  modalCancelar: { pt: "Cancelar", en: "Cancel", es: "Cancelar", fr: "Annuler" },
  modalConfirmar: { pt: "Confirmar", en: "Confirm", es: "Confirmar", fr: "Confirmer" },
  indiceAriaLabel: { pt: "Índice de publishers", en: "Publisher index", es: "Índice de editores", fr: "Index des éditeurs" },
  excelValorMeioDigital: { pt: "Digital", en: "Digital", es: "Digital", fr: "Numérique" },
  meioOOH: { pt: "OOH", en: "OOH", es: "OOH", fr: "OOH" },
  meioTV: { pt: "TV", en: "TV", es: "TV", fr: "TV" },
  meioRadio: { pt: "Rádio", en: "Radio", es: "Radio", fr: "Radio" },
  meioCinema: { pt: "Cinema", en: "Cinema", es: "Cine", fr: "Cinéma" },
  meioImprensa: { pt: "Imprensa", en: "Press", es: "Prensa", fr: "Presse" },
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
  filtroGoogleSearch: { pt: "Google", en: "Google", es: "Google", fr: "Google" },
  filtroProgramatico: { pt: "Programático", en: "Programmatic", es: "Programática", fr: "Programmatique" },
  labelOnline: { pt: "Online", en: "Online", es: "Online", fr: "Online" },
  labelOffline: { pt: "Offline", en: "Offline", es: "Offline", fr: "Offline" },
  botaoLimparFiltros: { pt: "Limpar filtros", en: "Clear filters", es: "Limpiar filtros", fr: "Effacer les filtres" },
  botaoLimparSelecao: { pt: "Limpar seleção", en: "Clear selection", es: "Limpiar selección", fr: "Effacer la sélection" },
  botaoSelecionarTodos: { pt: "Selecionar todos", en: "Select all", es: "Seleccionar todos", fr: "Tout sélectionner" },
  botaoVoltarTopo: { pt: "Voltar ao topo", en: "Back to top", es: "Volver arriba", fr: "Retour en haut" },
  notificacaoExportado: { pt: "Pedido exportado com sucesso.", en: "Request exported successfully.", es: "Solicitud exportada correctamente.", fr: "Demande exportée avec succès." },
  botaoExportar: { pt: "Exportar para Excel", en: "Export to Excel", es: "Exportar a Excel", fr: "Exporter vers Excel" },
  semResultados: { pt: "Nenhum formato encontrado com estes filtros.", en: "No formats found with these filters.", es: "No se encontraron formatos con estos filtros.", fr: "Aucun format trouvé avec ces filtres." },
  estadoCarregando: { pt: "A carregar formatos...", en: "Loading formats...", es: "Cargando formatos...", fr: "Chargement des formats..." },
  estadoErro: { pt: "Erro ao carregar os formatos: {msg}", en: "Error loading formats: {msg}", es: "Error al cargar los formatos: {msg}", fr: "Erreur lors du chargement des formats : {msg}" },
  resumoCampanhaTexto: { pt: "A preparar pedido para: {cliente} — {campanha}", en: "Preparing request for: {cliente} — {campanha}", es: "Preparando la solicitud para: {cliente} — {campanha}", fr: "Préparation de la demande pour : {cliente} — {campanha}" },
  clientePorPreencher: { pt: "(cliente por preencher)", en: "(client pending)", es: "(cliente por completar)", fr: "(client à renseigner)" },
  campanhaPorPreencher: { pt: "(campanha por preencher)", en: "(campaign pending)", es: "(campaña por completar)", fr: "(campagne à renseigner)" },
  contagemFormatoUm: { pt: " ({n} formato)", en: " ({n} format)", es: " ({n} formato)", fr: " ({n} format)" },
  contagemFormatos: { pt: " ({n} formatos)", en: " ({n} formats)", es: " ({n} formatos)", fr: " ({n} formats)" },
  colFormato: { pt: "Formato", en: "Format", es: "Formato", fr: "Format" },
  colVeiculo: { pt: "Veículo", en: "Vehicle", es: "Vehículo", fr: "Support" },
  colDuracao: { pt: "Duração do Spot", en: "Spot Duration", es: "Duración del Spot", fr: "Durée du Spot" },
  colSecundagem: { pt: "Secundagem", en: "Duration", es: "Duración", fr: "Durée" },
  duracaoOutro: { pt: "Outro", en: "Other", es: "Otro", fr: "Autre" },
  placeholderDuracaoOutro: { pt: "segundos", en: "seconds", es: "segundos", fr: "secondes" },
  colGrupoDigital2020: { pt: "Grupo Digital2020", en: "Digital2020 Group", es: "Grupo Digital2020", fr: "Groupe Digital2020" },
  colDimensao: { pt: "Dimensão", en: "Dimensions", es: "Dimensión", fr: "Dimensions" },
  colAspectRatio: { pt: "Aspect Ratio", en: "Aspect Ratio", es: "Aspect Ratio", fr: "Aspect Ratio" },
  colPeso: { pt: "Peso", en: "File Size", es: "Peso", fr: "Poids" },
  colTipoFicheiro: { pt: "Tipo de ficheiro", en: "File Type", es: "Tipo de archivo", fr: "Type de fichier" },
  colCopies: { pt: "Copies", en: "Copy", es: "Copies", fr: "Copies" },
  colObservacoes: { pt: "Observações", en: "Notes", es: "Observaciones", fr: "Remarques" },
  colTema: { pt: "Tema", en: "Theme", es: "Tema", fr: "Thème" },
  colFonte: { pt: "Fonte", en: "Source", es: "Fuente", fr: "Source" },
  colCanal: { pt: "Canal", en: "Channel", es: "Canal", fr: "Canal" },
  colPlataforma: { pt: "Plataforma/Publisher", en: "Platform/Publisher", es: "Plataforma/Publisher", fr: "Plateforme/Éditeur" },
  colEstacao: { pt: "Estação", en: "Station", es: "Estación", fr: "Station" },
  colConcessionario: { pt: "Concessionário", en: "Concessionaire", es: "Concesionario", fr: "Concessionnaire" },
  colTitulo: { pt: "Título", en: "Title", es: "Título", fr: "Titre" },
  colLink: { pt: "Link", en: "Link", es: "Enlace", fr: "Lien" },
  canalInternet: { pt: "Internet", en: "Internet", es: "Internet", fr: "Internet" },
  canalSocialMedia: { pt: "Social Media", en: "Social Media", es: "Social Media", fr: "Social Media" },
  canalGoogle: { pt: "Google", en: "Google", es: "Google", fr: "Google" },
  canalProgramatico: { pt: "Programático", en: "Programmatic", es: "Programática", fr: "Programmatique" },
  colDataEntrega: { pt: "Data de entrega", en: "Delivery Date", es: "Fecha de entrega", fr: "Date de livraison" },
  naoEspecificado: { pt: "não especificado", en: "not specified", es: "no especificado", fr: "non spécifié" },
  verSpecsLink: { pt: "Ver specs ↗", en: "View specs ↗", es: "Ver especificaciones ↗", fr: "Voir les spécifications ↗" },
  verSpecsLinkComNome: { pt: "Ver specs de {formato} ↗", en: "View specs for {formato} ↗", es: "Ver especificaciones de {formato} ↗", fr: "Voir les spécifications de {formato} ↗" },
  resumoSelecaoTitulo: { pt: "Formatos selecionados ({n})", en: "Selected formats ({n})", es: "Formatos seleccionados ({n})", fr: "Formats sélectionnés ({n})" },
  excelLabelCompanhia: { pt: "Companhia:", en: "Company:", es: "Compañía:", fr: "Société:" },
  excelLabelCliente: { pt: "Cliente:", en: "Client:", es: "Cliente:", fr: "Client:" },
  excelLabelCampanha: { pt: "Campanha:", en: "Campaign:", es: "Campaña:", fr: "Campagne:" },
  excelLabelMeio: { pt: "Meio:", en: "Media:", es: "Medio:", fr: "Média:" },
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

// Como formatar(), mas escolhe entre duas chaves (singular/plural) consoante
// valores.n — sem isto, frases como "({n} formatos)" saem gramaticalmente
// erradas com n=1 ("1 formatos") em todas as línguas (ver auditoria UX
// global). chaveSingular é só usada quando n === 1.
function formatarContagem(chaveSingular, chavePlural, valores) {
  return formatar(valores.n === 1 ? chaveSingular : chavePlural, valores);
}

// Devolve o valor de um campo de specs (dimensao, aspectRatio, peso,
// tipoFicheiro, copies, ou o próprio nome do formato) na língua atual.
// Em português devolve sempre o texto original da base. Nas outras línguas,
// procura em TRADUCOES_SPECS pela chave "Fornecedor|Formato"; se não houver
// tradução para essa linha ou esse campo (ex.: base atualizada mas
// traduções ainda não), cai para o texto original em vez de mostrar vazio.
// A chave inclui o Veículo (não só Fornecedor+Formato) porque um mesmo
// Fornecedor pode ter vários Veículos com o mesmo nome de Formato — ex.:
// "Correio da Manhã" tem "Página" no jornal diário, no suplemento Mais
// Sport e em cada uma das 3 revistas semanais, cada um com dimensões
// diferentes. Sem o Veículo na chave, a tradução de um "roubava" a dos
// outros.
function chaveTraducao(formato) {
  return `${formato.fornecedor}|${formato.veiculo}|${formato.formato}`;
}

function textoTraduzido(formato, campo) {
  if (idiomaAtual === "pt") {
    return formato[campo];
  }
  const traducao = TRADUCOES_SPECS[chaveTraducao(formato)];
  const valorTraduzido = traducao && traducao[idiomaAtual] && traducao[idiomaAtual][campo];
  return valorTraduzido || formato[campo];
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
  document.querySelectorAll("[data-i18n-title]").forEach((elemento) => {
    elemento.setAttribute("title", t(elemento.dataset.i18nTitle));
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
  elementosPorTab.forEach((elemento) => {
    elemento.hidden = elemento.dataset.tabVisivel !== nomeTab;
  });
  botoesTab.forEach((botao) => {
    const ativo = botao.dataset.tab === nomeTab;
    botao.classList.toggle("ativo", ativo);
    // aria-current (não aria-selected) porque estes botões não seguem o
    // padrão ARIA completo de tabs (não há role="tab"/"tabpanel" nem
    // navegação por setas) — aria-selected só é válido dentro desse
    // padrão; aria-current="true" descreve corretamente "a vista atual
    // dentro de um conjunto" sem prometer um contrato que não existe.
    if (ativo) {
      botao.setAttribute("aria-current", "true");
    } else {
      botao.removeAttribute("aria-current");
    }
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

  resumoCampanha.textContent = (!cliente && !campanha) ? "" : formatar("resumoCampanhaTexto", {
    cliente: cliente || t("clientePorPreencher"),
    campanha: campanha || t("campanhaPorPreencher"),
  });
  guardarEstadoLocal();
}

campoCliente.addEventListener("input", atualizarResumoCampanha);
campoCampanha.addEventListener("input", atualizarResumoCampanha);

// A Companhia decide o template do Excel — sempre que muda, o botão de
// exportar tem de ser reavaliado (só liga se também houver seleção).
campoCompanhia.addEventListener("change", atualizarResumoSelecao);

/*
============================================
5. CARREGAR A BASE DE FORMATOS (data/base-formatos.xlsx)
Esta é a única fonte de dados da aplicação nesta fase — lida
diretamente do Excel, com o ExcelJS (a mesma biblioteca já usada
para gerar o Excel exportado). Para atualizar a base, basta
substituir este ficheiro no servidor, mantendo o mesmo nome e as
mesmas colunas — não é preciso nenhuma conversão à parte.
Se um dia a base mudar de sítio (outro sistema, outra base de
dados), só este pedaço de código precisa de mudar — o resto da
app continua a trabalhar com a mesma lista de formatos.
============================================
*/
const FICHEIRO_BASE_FORMATOS = "data/base-formatos.xlsx";

// Ficheiro à parte com as traduções EN/ES/FR das specs (ver TRADUCOES_SPECS,
// mais acima) — não faz parte do Excel para a empresa que mantém a base não
// ter de preencher colunas de tradução sempre que atualiza specs.
const FICHEIRO_TRADUCOES_SPECS = "data/traducoes-specs.json";

// Nome de cada coluna no Excel (linha 1) → nome do campo interno
// correspondente. Ler pelo nome da coluna (em vez de pela posição)
// significa que a empresa que mantém a base pode reordenar colunas
// sem partir a leitura — só o nome do cabeçalho é que tem de bater certo.
const CABECALHOS_BASE_EXCEL = {
  "Meio": "meio",
  "Canal": "canal",
  "Fornecedor": "fornecedor",
  "Veículo": "veiculo",
  "Grupo Digital2020": "grupoDigital2020",
  "Formato": "formato",
  "Dimensão": "dimensao",
  "Aspect Ratio": "aspectRatio",
  "Peso": "peso",
  "Tipo de Ficheiro": "tipoFicheiro",
  "Copies": "copies",
  "Observações": "observacoes",
  "Link": "link",
};

// O valor de uma célula do ExcelJS nem sempre é uma string simples — uma
// célula com hyperlink, por exemplo, vem como { text, hyperlink }. Esta
// função devolve sempre o texto "certo" independentemente do tipo de célula.
function textoCelula(celula) {
  const valor = celula.value;
  if (valor === null || valor === undefined) {
    return "";
  }
  if (typeof valor === "object") {
    if (valor.hyperlink) {
      return valor.hyperlink;
    }
    if (valor.richText) {
      return valor.richText.map((parte) => parte.text).join("");
    }
    if (valor.text !== undefined) {
      return String(valor.text);
    }
    if (valor.result !== undefined) {
      return String(valor.result);
    }
    return String(valor);
  }
  return String(valor).trim();
}
async function carregarFormatos() {
  mostrarEstado(t("estadoCarregando"));

  try {
    const resposta = await fetch(FICHEIRO_BASE_FORMATOS);
    if (!resposta.ok) {
      throw new Error(`Não foi possível ler ${FICHEIRO_BASE_FORMATOS} (status ${resposta.status})`);
    }
    const bufferExcel = await resposta.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bufferExcel);
    const folha = workbook.worksheets[0];

    // A linha 1 é o cabeçalho: descobre em que coluna está cada campo,
    // pelo nome (ver CABECALHOS_BASE_EXCEL) — não pela posição.
    const colunaPorIndice = {};
    folha.getRow(1).eachCell((celula, indice) => {
      const campo = CABECALHOS_BASE_EXCEL[textoCelula(celula)];
      if (campo) {
        colunaPorIndice[indice] = campo;
      }
    });

    const formatos = [];
    folha.eachRow((linha, numeroLinha) => {
      if (numeroLinha === 1) {
        return; // já foi lida como cabeçalho
      }
      const formato = {};
      linha.eachCell({ includeEmpty: true }, (celula, indice) => {
        const campo = colunaPorIndice[indice];
        if (campo) {
          formato[campo] = textoCelula(celula);
        }
      });
      // Ignora linhas completamente vazias (ex.: espaço deixado no fim do Excel).
      if (Object.values(formato).some((valor) => valor !== "")) {
        formatos.push(formato);
      }
    });

    // Acrescenta um "id" único a cada formato (a posição na lista chega,
    // porque a lista não muda depois de carregada). É este id que as
    // checkboxes vão usar para dizer qual formato foi selecionado.
    todosFormatos = formatos.map((formato, indice) => ({ ...formato, id: indice }));

    // Traduções das specs (EN/ES/FR): se o ficheiro não existir ou vier
    // inválido, a app continua a funcionar normalmente — só mostra o texto
    // original em português nas outras línguas (ver textoTraduzido).
    try {
      const respostaTraducoes = await fetch(FICHEIRO_TRADUCOES_SPECS);
      TRADUCOES_SPECS = respostaTraducoes.ok ? await respostaTraducoes.json() : {};
    } catch (erroTraducoes) {
      TRADUCOES_SPECS = {};
    }

    // Restaura Companhia/Cliente/Campanha + seleção de um pedido em curso
    // (ver secção 14), antes de desenhar as listas — assim as checkboxes já
    // nascem marcadas com a seleção guardada, em vez de precisarem de um
    // segundo desenho.
    restaurarEstadoLocal();

    // Depois de carregado com sucesso não há nada útil a dizer aqui — a
    // própria lista de formatos a aparecer no ecrã já confirma que correu
    // bem, por isso limpamos a mensagem de "A carregar..." sem a substituir.
    mostrarEstado("");
    mostrarFormatosAgrupados(listaFormatos, todosFormatos, { comCheckbox: true, comLink: false, simplificado: true, prefixoId: "construir" });
    mostrarFormatosAgrupados(listaSpecs, todosFormatos, { comCheckbox: false, comLink: true, simplificado: false, prefixoId: "specs" });
    aplicarFiltros();
    atualizarResumoCampanha();
    atualizarResumoSelecao();
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
// próprios formatos: primeiro separamos por meio (Digital vs. os meios
// offline — OOH, TV, Rádio, Cinema, Imprensa — usando o mesmo mapeamento
// de grupoMeioDoFormato/VALOR_BASE_PARA_GRUPO_MEIO já usado na exportação
// para Excel, para "o que é online vs. offline" viver num só sítio); só
// dentro do Digital é que faz sentido subdividir por Google / Social Media
// / Programático / Compra Direta, a partir do campo "canal" da base.
const ORDEM_CATEGORIAS = [
  "Social Media",
  "Compra Direta",
  "Google ou Search",
  "Programático",
  "OOH",
  "TV",
  "Rádio",
  "Cinema",
  "Imprensa",
];
const CATEGORIAS_ONLINE = new Set(["Social Media", "Compra Direta", "Google ou Search", "Programático"]);
const CHAVE_TRADUCAO_CATEGORIA = {
  "Social Media": "filtroSocialMedia",
  "Compra Direta": "filtroCompraDireta",
  "Google ou Search": "filtroGoogleSearch",
  "Programático": "filtroProgramatico",
  "OOH": "meioOOH",
  "TV": "meioTV",
  "Rádio": "meioRadio",
  "Cinema": "meioCinema",
  "Imprensa": "meioImprensa",
};

function categoriaDoPublisher(nomePublisher, formatosDoPublisher) {
  const grupoMeio = grupoMeioDoFormato(formatosDoPublisher[0]);
  if (grupoMeio !== "Digital") {
    return grupoMeio;
  }
  // Os vários tipos de campanha do Google (Display Network, Demand Gen, App
  // Campaigns, Performance Max, Search, Vídeo) ficam cada um no seu próprio
  // bloco de publisher, mas todos pertencem à mesma categoria "Google ou Search".
  if (nomePublisher.startsWith("Google")) {
    return "Google ou Search";
  }
  const canal = formatosDoPublisher[0].canal;
  if (canal === "Paid Social") {
    return "Social Media";
  }
  if (canal === "Programático") {
    return "Programático";
  }
  return "Compra Direta";
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
  // ORDEM_CATEGORIAS (Social Media, Compra Direta, Google ou Search,
  // Programático, e depois os meios offline — OOH, TV, Rádio, Cinema,
  // Imprensa); dentro de cada categoria, os publishers ficam por ordem
  // alfabética.
  const nomesPublishers = Object.keys(grupos).sort((a, b) => {
    const posicaoA = ORDEM_CATEGORIAS.indexOf(categoriaDoPublisher(a, grupos[a]));
    const posicaoB = ORDEM_CATEGORIAS.indexOf(categoriaDoPublisher(b, grupos[b]));
    if (posicaoA !== posicaoB) {
      return posicaoA - posicaoB;
    }
    return a.localeCompare(b, "pt");
  });

  contentor.innerHTML = "";

  // Ao mudar de categoria, insere um cabeçalho a identificá-la — e, sempre
  // que se muda de Online para Offline (ou vice-versa), um cabeçalho maior
  // a marcar essa fronteira, para ficar claro visualmente que OOH (e no
  // futuro TV/Rádio/Cinema/Imprensa) não é "Compra Direta" nem nenhuma
  // outra categoria online.
  let categoriaAnterior = null;
  let grupoOnlineOfflineAnterior = null;
  for (const nomePublisher of nomesPublishers) {
    // Dentro do publisher, as linhas ficam por ordem alfabética — primeiro
    // pelo Veículo (relevante nos publishers com vários, ex.: "Correio da
    // Manhã" ou "TVI"/"CNN Portugal"; nos restantes, onde Veículo = Fornecedor
    // em todas as linhas, este critério não muda nada), depois pelo Formato.
    const formatosDoPublisher = [...grupos[nomePublisher]].sort((a, b) => {
      const veiculoA = a.veiculo || "";
      const veiculoB = b.veiculo || "";
      if (veiculoA !== veiculoB) {
        return veiculoA.localeCompare(veiculoB, "pt");
      }
      return (a.formato || "").localeCompare(b.formato || "", "pt");
    });
    const categoria = categoriaDoPublisher(nomePublisher, formatosDoPublisher);
    if (categoria !== categoriaAnterior) {
      const grupoOnlineOffline = CATEGORIAS_ONLINE.has(categoria) ? "online" : "offline";
      if (grupoOnlineOffline !== grupoOnlineOfflineAnterior) {
        contentor.appendChild(criarCabecalhoOnlineOffline(grupoOnlineOffline));
        grupoOnlineOfflineAnterior = grupoOnlineOffline;
      }
      contentor.appendChild(criarCabecalhoCategoria(categoria));
      categoriaAnterior = categoria;
    }
    contentor.appendChild(criarBlocoPublisher(nomePublisher, formatosDoPublisher, opcoes));
  }
}

function criarCabecalhoOnlineOffline(grupoOnlineOffline) {
  const cabecalho = document.createElement("h2");
  cabecalho.className = `cabecalho-online-offline cabecalho-online-offline--${grupoOnlineOffline}`;
  cabecalho.textContent = t(grupoOnlineOffline === "online" ? "labelOnline" : "labelOffline");
  cabecalho.dataset.grupo = grupoOnlineOffline;
  return cabecalho;
}

function criarCabecalhoCategoria(categoria) {
  const cabecalho = document.createElement("h3");
  cabecalho.className = "cabecalho-categoria";
  cabecalho.textContent = t(CHAVE_TRADUCAO_CATEGORIA[categoria]);
  cabecalho.dataset.categoria = categoria;
  return cabecalho;
}

function criarBlocoPublisher(nomePublisher, formatosDoPublisher, opcoes) {
  const bloco = document.createElement("section");
  bloco.className = "grupo-publisher";
  bloco.id = `${opcoes.prefixoId}-pub-${paraIdHtml(nomePublisher)}`;
  bloco.dataset.publisher = nomePublisher;
  bloco.dataset.categoria = categoriaDoPublisher(nomePublisher, formatosDoPublisher);

  const titulo = document.createElement("h4");
  titulo.textContent = nomePublisher;
  const contagem = document.createElement("span");
  contagem.className = "contagem";
  contagem.textContent = formatarContagem("contagemFormatoUm", "contagemFormatos", { n: formatosDoPublisher.length });
  titulo.appendChild(contagem);
  bloco.appendChild(titulo);

  // O Grupo Digital2020 é uma taxonomia exclusiva dos meios digitais — não
  // existe (nem faz sentido) para publishers offline (OOH, e no futuro
  // TV/Rádio/Cinema/Imprensa), por isso nem a coluna é desenhada para eles.
  // Um publisher pertence sempre por inteiro a um único meio, daí bastar
  // olhar para o primeiro formato para decidir.
  //
  // O Veículo só ganha coluna própria quando, dentro deste publisher, há
  // mais que um veículo distinto do próprio nome do publisher — ex.:
  // "Correio da Manhã" tem o jornal diário, o suplemento Mais Sport e 3
  // revistas semanais, todos com formatos de nome igual ("Página",
  // "Rodapé", ...) mas dimensões diferentes; sem a coluna não daria para
  // os distinguir. Para a maioria dos publishers (onde Veículo = Fornecedor)
  // a coluna nem aparece, para não ficar redundante.
  // A Duração do Spot só faz sentido para formatos de "spot" (ver
  // formatoTemDuracao), e só na tab "Construir Pedido" (onde há uma
  // seleção concreta a que a duração se aplica) — na Biblioteca de
  // Formatos, que só mostra as specs "em bruto", não aparece. A coluna
  // liga-se por publisher (basta UM formato do bloco precisar dela — ex.:
  // o bloco "TV" tem "Spot TV" a par de "Ecrã Fracionado"/"Telepromoção",
  // que não são spots), mas cada LINHA decide por si própria se mostra o
  // seletor ou só um traço (ver criarLinhaFormato) — nunca basta olhar
  // só para o primeiro formato do bloco, porque um publisher pode
  // misturar formatos com e sem esse conceito.
  // O Copies também só existe para meios digitais (é uma noção de
  // criatividades/versões de anúncio online) — os meios offline (OOH, TV,
  // Rádio, Cinema, Imprensa) não têm essa coluna na Biblioteca de Formatos.
  //
  // A Entrega (AF vs. morada) só faz sentido para o Mupi em papel de
  // alguns concessionários de OOH (ver formatoEhMupiPapel), e só no
  // construtor — tal como a Duração, liga-se por publisher mas cada linha
  // decide por si própria se mostra o seletor.
  //
  // Os Temas (TV/Rádio/OOH) aplicam-se a qualquer formato destes meios, no
  // construtor — ver MEIOS_COM_TEMA.
  //
  // A Entrega de TV (sempre "GoFastWay") é fixa e não depende de nenhuma
  // escolha do utilizador — por isso aparece também na Biblioteca de
  // Formatos (não só no construtor, ao contrário da Entrega dos Mupis).
  const opcoesComMeio = {
    ...opcoes,
    comGrupoDigital2020: grupoMeioDoFormato(formatosDoPublisher[0]) === "Digital",
    comCopies: grupoMeioDoFormato(formatosDoPublisher[0]) === "Digital",
    comVeiculo: formatosDoPublisher.some((f) => f.veiculo && f.veiculo !== nomePublisher),
    comDuracao: opcoes.simplificado && formatosDoPublisher.some(formatoTemDuracao),
    comEntregaMupi: opcoes.simplificado && formatosDoPublisher.some(formatoEhMupiPapel),
    comTemas: opcoes.simplificado && MEIOS_COM_TEMA.has(grupoMeioDoFormato(formatosDoPublisher[0])),
    comEntregaTV: grupoMeioDoFormato(formatosDoPublisher[0]) === "TV",
  };

  const tabela = document.createElement("table");
  tabela.className = "tabela-formatos";
  tabela.appendChild(criarCabecalhoTabela(opcoesComMeio));

  const corpo = document.createElement("tbody");
  for (const formato of formatosDoPublisher) {
    corpo.appendChild(criarLinhaFormato(formato, opcoesComMeio));
  }
  tabela.appendChild(corpo);

  // Em ecrãs estreitos a tabela pode não caber (muitas colunas, ou uma
  // Observação longa) — o scroll horizontal fica contido dentro deste
  // wrapper, em vez de forçar a página inteira a deslizar de lado.
  const tabelaEnvolvente = document.createElement("div");
  tabelaEnvolvente.className = "tabela-formatos-wrap";
  tabelaEnvolvente.appendChild(tabela);

  bloco.appendChild(tabelaEnvolvente);
  return bloco;
}

function criarCabecalhoTabela(opcoes) {
  const cabecalho = document.createElement("thead");
  const colunaCheckbox = opcoes.comCheckbox ? '<th class="coluna-checkbox" scope="col"></th>' : "";
  const colunaLink = opcoes.comLink ? `<th scope="col">${t("colFonte")}</th>` : "";
  const colunaGrupoDigital2020 = opcoes.comGrupoDigital2020 ? `<th scope="col">${t("colGrupoDigital2020")}</th>` : "";
  const colunaVeiculo = opcoes.comVeiculo ? `<th scope="col">${t("colVeiculo")}</th>` : "";
  const colunaDuracao = opcoes.comDuracao ? `<th scope="col">${t("colDuracao")}</th>` : "";
  const colunaEntregaMupi = opcoes.comEntregaMupi ? `<th scope="col">${t("colEntrega")}</th>` : "";
  const colunaTemas = opcoes.comTemas ? `<th scope="col">${t("colTemasBuilder")}</th>` : "";
  const colunaCopies = opcoes.comCopies ? `<th scope="col">${t("colCopies")}</th>` : "";
  const colunaEntregaTV = opcoes.comEntregaTV ? `<th scope="col">${t("colEntrega")}</th>` : "";

  // Na tab "Construir Pedido" (simplificado) só mostramos o essencial para
  // escolher — nome do formato e o grupo Digital2020. As specs completas
  // (dimensão, peso, tipo de ficheiro) ficam só na tab "Biblioteca de Formatos",
  // para a seleção não ficar cheia de informação que ainda não é precisa.
  if (opcoes.simplificado) {
    cabecalho.innerHTML = `
      <tr>
        ${colunaCheckbox}
        <th scope="col">${t("colFormato")}</th>
        ${colunaVeiculo}
        ${colunaGrupoDigital2020}
        ${colunaDuracao}
        ${colunaEntregaMupi}
        ${colunaTemas}
      </tr>
    `;
    return cabecalho;
  }

  cabecalho.innerHTML = `
    <tr>
      ${colunaCheckbox}
      <th scope="col">${t("colFormato")}</th>
      ${colunaVeiculo}
      ${colunaGrupoDigital2020}
      <th scope="col">${t("colDimensao")}</th>
      <th scope="col">${t("colAspectRatio")}</th>
      <th scope="col">${t("colPeso")}</th>
      <th scope="col">${t("colTipoFicheiro")}</th>
      ${colunaCopies}
      ${colunaEntregaTV}
      <th scope="col">${t("colObservacoes")}</th>
      ${colunaLink}
    </tr>
  `;
  return cabecalho;
}

// Checkboxes com as durações mais comuns (15"/20"/30") + "Outro" — mais que
// uma pode estar marcada ao mesmo tempo, porque o mesmo formato pode ser
// pedido em mais que uma duração (cada uma um spot distinto). Quando
// "Outro" está marcado, aparece a seguir uma caixa de texto editável (ver
// o listener de "checkbox-duracao"/"checkbox-duracao-outro"/
// "input-duracao-outro" mais abaixo). O estado mostrado vem sempre do
// objetivo ativo no momento (a mesma seleção pode ter durações diferentes
// consoante o objetivo).
function criarCelulaDuracao(formato) {
  const estado = estadoDuracaoOuOmissao(formato, objetivoAtivo);
  const opcoesPadrao = DURACOES_PADRAO
    .map((valor) => `
      <label class="opcao-duracao">
        <input type="checkbox" class="checkbox-duracao" data-id="${formato.id}" value="${valor}" ${estado.padrao.has(valor) ? "checked" : ""}>
        ${valor}″
      </label>
    `)
    .join("");
  return `
    <div class="grupo-duracao" data-id="${formato.id}">
      ${opcoesPadrao}
      <label class="opcao-duracao opcao-duracao-outro">
        <input type="checkbox" class="checkbox-duracao-outro" data-id="${formato.id}" ${estado.outroAtivo ? "checked" : ""}>
        ${t("duracaoOutro")}
      </label>
      <input type="text" class="input-duracao-outro" data-id="${formato.id}"
        value="${estado.outroAtivo ? (estado.outroValor || "") : ""}" placeholder="${t("placeholderDuracaoOutro")}" ${estado.outroAtivo ? "" : "hidden"}>
    </div>
  `;
}

// Escolha de entrega dos Mupis em papel (AF vs. morada do concessionário) —
// ver formatoEhMupiPapel/entregaEfetivaDoFormato. Nenhuma das duas vem
// marcada por omissão: escolher aqui é o que permite marcar a checkbox do
// formato (ver o listener de "checkbox-formato"). A morada em si não
// aparece aqui (só no Excel exportado, ver moradaEntregaMupi em
// COLUNAS_EXCEL_DISPONIVEIS) — pedido explícito, para não sobrecarregar
// esta linha com um ícone de info.
//
// role="radiogroup" + aria-labelledby a apontar para o nome do formato:
// sem isto, um leitor de ecrã anuncia "Entrega AF"/"Entrega na Morada"
// repetido em cada Mupi de papel, sem dizer a que formato pertence cada
// grupo — o mesmo problema que a checkbox de formato já resolve com
// aria-labelledby (ver auditoria de acessibilidade, ronda 2).
function criarCelulaEntregaMupi(formato, idNomeFormato) {
  const escolha = entregaEfetivaDoFormato(formato, objetivoAtivo);
  return `
    <div class="grupo-entrega-mupi" data-id="${formato.id}" role="radiogroup" aria-labelledby="${idNomeFormato}">
      <label class="opcao-entrega-mupi">
        <input type="radio" class="radio-entrega-mupi" name="entrega-mupi-${formato.id}" data-id="${formato.id}" value="af" ${escolha === "af" ? "checked" : ""}>
        ${t("colEntregaAF")}
      </label>
      <label class="opcao-entrega-mupi">
        <input type="radio" class="radio-entrega-mupi" name="entrega-mupi-${formato.id}" data-id="${formato.id}" value="morada" ${escolha === "morada" ? "checked" : ""}>
        ${t("colEntregaMorada")}
      </label>
    </div>
  `;
}

// Contador +/- do número de temas/criatividades (TV/Rádio/OOH) — ver
// MEIOS_COM_TEMA/contagemTemasDoFormato. Só a quantidade é escolhida aqui;
// os nomes de cada tema ("Tema 1", "Tema 2", ...) ficam por preencher à
// mão no Excel exportado. O nome do formato entra no próprio aria-label
// dos botões (não há aqui nenhum elemento "nome" a que apontar via
// aria-labelledby, ao contrário da Entrega) — sem isto, os botões de
// TODAS as linhas de TV/Rádio/OOH soariam exatamente iguais a quem usa
// leitor de ecrã. O valor tem aria-live para anunciar a mudança ao clicar.
function criarCelulaTemas(formato, nomeFormatoTexto) {
  const contagem = contagemTemasDoFormato(formato, objetivoAtivo);
  return `
    <div class="grupo-temas" data-id="${formato.id}">
      <button type="button" class="botao-tema-menos" data-id="${formato.id}" aria-label="${formatar("temasDiminuir", { formato: nomeFormatoTexto })}" ${contagem <= 1 ? "disabled" : ""}>−</button>
      <span class="valor-temas" data-id="${formato.id}" aria-live="polite">${contagem}</span>
      <button type="button" class="botao-tema-mais" data-id="${formato.id}" aria-label="${formatar("temasAumentar", { formato: nomeFormatoTexto })}" ${contagem >= LIMITE_MAXIMO_TEMAS ? "disabled" : ""}>+</button>
    </div>
  `;
}

function criarLinhaFormato(formato, opcoes) {
  const linha = document.createElement("tr");
  // Id da célula com o nome do formato, para a checkbox se associar a ela
  // via aria-labelledby — sem isto, um leitor de ecrã só anuncia "checkbox,
  // não selecionada", repetido em cada linha, sem dizer a que formato
  // corresponde (ver auditoria de acessibilidade).
  const idNomeFormato = `formato-nome-${opcoes.prefixoId}-${formato.id}`;
  // Nome do formato na língua atual — usado tanto na célula do nome como
  // para dar contexto (a que formato pertence) aos controlos de Entrega/
  // Temas mais abaixo, que de outro modo soariam todos iguais para quem
  // usa leitor de ecrã (ver auditoria de acessibilidade).
  const nomeFormatoTexto = textoTraduzido(formato, "formato") ?? "";
  // Marca a checkbox logo na criação se este formato já estiver selecionado
  // (importante para a lista continuar correta depois de trocar de idioma
  // ou de filtro, que voltam a desenhar as linhas do zero).
  // Um Mupi de papel sem entrega ainda escolhida ganha uma pista visual
  // discreta (cursor "help" + opacidade reduzida) em vez de texto extra —
  // sem isto, a única forma de descobrir a regra era tentar marcar e ver
  // o toast (ver auditoria de acessibilidade, ronda 2).
  const entregaPendente = formatoEhMupiPapel(formato) && !entregaEfetivaDoFormato(formato, objetivoAtivo);
  const colunaCheckbox = opcoes.comCheckbox
    ? `<td class="coluna-checkbox"><input type="checkbox" class="checkbox-formato${entregaPendente ? " checkbox-formato--pendente" : ""}" data-id="${formato.id}" aria-labelledby="${idNomeFormato}" ${selecoesPorObjetivo[objetivoAtivo].has(formato.id) ? "checked" : ""}></td>`
    : "";
  const colunaGrupoDigital2020 = opcoes.comGrupoDigital2020
    ? `<td><span class="etiqueta-dg2020">${formato.grupoDigital2020 ?? "—"}</span></td>`
    : "";
  const colunaVeiculo = opcoes.comVeiculo ? `<td>${formato.veiculo ?? "—"}</td>` : "";
  // opcoes.comDuracao diz se ESTE PUBLISHER tem a coluna (basta um formato
  // do bloco precisar); dentro dela, cada linha ainda decide por si própria
  // se mostra o seletor ou só um traço — um publisher pode misturar
  // formatos de spot com outros que não têm essa noção (ex.: "TV" tem
  // "Spot TV" a par de "Ecrã Fracionado").
  const colunaDuracao = opcoes.comDuracao
    ? `<td>${formatoTemDuracao(formato) ? criarCelulaDuracao(formato) : "—"}</td>`
    : "";
  // Tal como a Duração, a Entrega liga-se por publisher (comEntregaMupi),
  // mas cada linha decide por si própria se mostra o seletor — um bloco de
  // OOH pode misturar Mupi papel com outros formatos sem essa noção.
  const colunaEntregaMupi = opcoes.comEntregaMupi
    ? `<td>${formatoEhMupiPapel(formato) ? criarCelulaEntregaMupi(formato, idNomeFormato) : "—"}</td>`
    : "";
  // Os Temas aplicam-se a qualquer formato do meio (não há exceção por
  // linha, ao contrário de Duração/Entrega).
  const colunaTemas = opcoes.comTemas ? `<td>${criarCelulaTemas(formato, nomeFormatoTexto)}</td>` : "";

  if (opcoes.simplificado) {
    linha.innerHTML = `
      ${colunaCheckbox}
      <td id="${idNomeFormato}">${nomeFormatoTexto}</td>
      ${colunaVeiculo}
      ${colunaGrupoDigital2020}
      ${colunaDuracao}
      ${colunaEntregaMupi}
      ${colunaTemas}
    `;
    return linha;
  }

  // aria-label com o nome do formato: sem isto, uma pessoa a navegar pela
  // lista de links do leitor de ecrã só ouviria "Ver specs" repetido,
  // dezenas de vezes, sem saber a que formato cada link pertence.
  const colunaLink = opcoes.comLink
    ? `<td>${formato.link ? `<a href="${formato.link}" target="_blank" rel="noopener" aria-label="${formatar("verSpecsLinkComNome", { formato: nomeFormatoTexto })}">${t("verSpecsLink")}</a>` : "—"}</td>`
    : "";
  // O Copies só existe para meios digitais (ver comCopies em
  // criarBlocoPublisher) — um publisher offline não desenha esta coluna.
  const colunaCopies = opcoes.comCopies ? `<td>${textoTraduzido(formato, "copies") || "—"}</td>` : "";
  // A Entrega de TV é sempre "GoFastWay" — não vem da base, é um valor
  // fixo (ver entregaTV em COLUNAS_EXCEL_DISPONIVEIS, a mesma ideia usada
  // aqui na Biblioteca de Formatos).
  const colunaEntregaTV = opcoes.comEntregaTV ? `<td>GoFastWay</td>` : "";
  linha.innerHTML = `
    ${colunaCheckbox}
    <td id="${idNomeFormato}">${nomeFormatoTexto}</td>
    ${colunaVeiculo}
    ${colunaGrupoDigital2020}
    <td>${textoTraduzido(formato, "dimensao") ?? t("naoEspecificado")}</td>
    <td>${textoTraduzido(formato, "aspectRatio") || "—"}</td>
    <td>${textoTraduzido(formato, "peso") ?? t("naoEspecificado")}</td>
    <td>${textoTraduzido(formato, "tipoFicheiro") ?? t("naoEspecificado")}</td>
    ${colunaCopies}
    ${colunaEntregaTV}
    <td class="coluna-observacoes">${textoTraduzido(formato, "observacoes") || "—"}</td>
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

Cada categoria (Social Media, Compra Direta, ..., OOH) é recolhível:
começa fechada, só mostrando o nome, e só ao clicar no nome (ou na
setinha) é que aparecem os publishers lá dentro — evita um índice
enorme logo de início. O estado (que categorias estão abertas) vive
fora da função, para sobreviver a re-renderizações do índice (troca de
filtro, de idioma, de tab).
============================================
*/
const categoriasIndiceExpandidas = new Set();

// TV e Rádio não têm o botão recolhível ▸ — nenhum formato desses meios
// fica associado a um canal ou estação em concreto (ver README), por isso
// há sempre um único publisher lá dentro ("TV"/"Rádio"), e nesse caso o
// próprio nome da categoria já é o link direto para essa secção (ver mais
// abaixo). Se um dia passar a haver mais que um publisher nestas
// categorias, cai-se de volta na lista de links sempre visível (sem
// dropdown, mas sem um único link direto).
const CATEGORIAS_SEM_DROPDOWN_INDICE = new Set(["TV", "Rádio"]);

function atualizarIndicePublishers() {
  const painelAtivo = paineisTab[tabAtiva];
  // Só entram no índice os publishers que ainda têm alguma linha visível
  // (ou seja, que os filtros não escondam por completo).
  const blocos = [...painelAtivo.querySelectorAll(".grupo-publisher")].filter(
    (bloco) => bloco.style.display !== "none"
  );

  indicePublishers.innerHTML = "";

  // Tal como no conteúdo principal, agrupa visualmente as categorias online
  // (Social Media, Compra Direta, Google ou Search, Programático) à parte
  // das offline (OOH, e no futuro TV/Rádio/Cinema/Imprensa), com um
  // cabeçalho "Online"/"Offline" sempre que se muda de um grupo para o outro.
  let grupoOnlineOfflineAnterior = null;
  for (const categoria of ORDEM_CATEGORIAS) {
    const blocosDaCategoria = blocos.filter((bloco) => bloco.dataset.categoria === categoria);
    if (blocosDaCategoria.length === 0) {
      continue;
    }

    const grupoOnlineOffline = CATEGORIAS_ONLINE.has(categoria) ? "online" : "offline";
    if (grupoOnlineOffline !== grupoOnlineOfflineAnterior) {
      const rotulo = document.createElement("h2");
      rotulo.className = `indice-online-offline indice-online-offline--${grupoOnlineOffline}`;
      rotulo.textContent = t(grupoOnlineOffline === "online" ? "labelOnline" : "labelOffline");
      indicePublishers.appendChild(rotulo);
      grupoOnlineOfflineAnterior = grupoOnlineOffline;
    }

    const semDropdown = CATEGORIAS_SEM_DROPDOWN_INDICE.has(categoria);

    // Com um só publisher lá dentro (o caso normal de TV/Rádio — nenhum
    // formato fica associado a um canal ou estação em concreto, ver
    // formatoTemDuracao/README), nem faz sentido mostrar o nome do
    // publisher outra vez por baixo: o nome da própria categoria já é o
    // link direto para essa secção, sem nenhum passo de abrir/fechar.
    if (semDropdown && blocosDaCategoria.length === 1) {
      const bloco = blocosDaCategoria[0];
      const link = document.createElement("a");
      link.className = "indice-categoria indice-categoria--link";
      link.href = `#${bloco.id}`;
      link.innerHTML = `<span class="indice-categoria-seta" aria-hidden="true">▸</span><span>${t(CHAVE_TRADUCAO_CATEGORIA[categoria])}</span>`;
      link.addEventListener("click", (evento) => {
        evento.preventDefault();
        bloco.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      indicePublishers.appendChild(link);
      continue;
    }

    const expandida = semDropdown || categoriasIndiceExpandidas.has(categoria);

    if (semDropdown) {
      const rotuloFixo = document.createElement("div");
      rotuloFixo.className = "indice-categoria indice-categoria--fixa";
      rotuloFixo.textContent = t(CHAVE_TRADUCAO_CATEGORIA[categoria]);
      indicePublishers.appendChild(rotuloFixo);
    } else {
      const titulo = document.createElement("button");
      titulo.type = "button";
      titulo.className = `indice-categoria${expandida ? " expandida" : ""}`;
      titulo.setAttribute("aria-expanded", String(expandida));
      titulo.innerHTML = `<span class="indice-categoria-seta" aria-hidden="true">▸</span><span>${t(CHAVE_TRADUCAO_CATEGORIA[categoria])}</span>`;
      titulo.addEventListener("click", () => {
        if (categoriasIndiceExpandidas.has(categoria)) {
          categoriasIndiceExpandidas.delete(categoria);
        } else {
          categoriasIndiceExpandidas.add(categoria);
        }
        atualizarIndicePublishers();
      });
      indicePublishers.appendChild(titulo);
    }

    const listaLinks = document.createElement("div");
    listaLinks.className = `indice-categoria-links${expandida ? "" : " recolhida"}`;

    blocosDaCategoria.forEach((bloco) => {
      const link = document.createElement("a");
      link.href = `#${bloco.id}`;
      link.textContent = bloco.dataset.publisher;
      link.addEventListener("click", (evento) => {
        evento.preventDefault();
        bloco.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      listaLinks.appendChild(link);
    });
    indicePublishers.appendChild(listaLinks);
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
  const categoriasVisiveis = new Set();

  blocos.forEach((bloco) => {
    const categoriaCombina = categoriaFiltroAtiva === "todas" || bloco.dataset.categoria === categoriaFiltroAtiva;
    // Pesquisar pelo nome do publisher tem de mostrar TODOS os formatos
    // desse publisher — o texto da própria linha (Formato + Grupo Digital2020)
    // nunca inclui o nome do publisher, que só existe no título da secção.
    const publisherCombina = !texto || bloco.dataset.publisher.toLowerCase().includes(texto);

    let linhasVisiveisNoBloco = 0;
    bloco.querySelectorAll("tbody tr").forEach((linha) => {
      const combinaTexto = publisherCombina || linha.textContent.toLowerCase().includes(texto);
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
      categoriasVisiveis.add(bloco.dataset.categoria);
    }
  });

  // Os cabeçalhos de categoria e de Online/Offline não têm linhas próprias
  // para filtrar — escondem-se consoante os blocos de publisher que lhes
  // seguem tenham ficado visíveis ou não, para nunca sobrar um cabeçalho
  // "órfão" sem nada por baixo.
  painelAtivo.querySelectorAll(".cabecalho-categoria").forEach((cabecalho) => {
    cabecalho.style.display = categoriasVisiveis.has(cabecalho.dataset.categoria) ? "" : "none";
  });
  painelAtivo.querySelectorAll(".cabecalho-online-offline").forEach((cabecalho) => {
    const categoriasDoGrupo = ORDEM_CATEGORIAS.filter(
      (categoria) => (CATEGORIAS_ONLINE.has(categoria) ? "online" : "offline") === cabecalho.dataset.grupo
    );
    cabecalho.style.display = categoriasDoGrupo.some((categoria) => categoriasVisiveis.has(categoria)) ? "" : "none";
  });

  mensagensSemResultados[tabAtiva].hidden = algumVisivel;
  atualizarIndicePublishers();
}

// Repõe a pesquisa e a categoria em "Todas", sem mexer na seleção.
function limparFiltros() {
  campoPesquisa.value = "";
  categoriaFiltroAtiva = "todas";
  botoesFiltroCategoria.forEach((botao) => botao.classList.toggle("ativo", botao.dataset.categoria === "todas"));
  aplicarFiltros();
}

botaoLimparFiltros.addEventListener("click", limparFiltros);

// O mesmo botão "Limpar filtros" aparece embutido na própria mensagem de
// "sem resultados" (uma em cada tab) — para a recuperação do erro estar
// mesmo ao lado do erro, em vez de só lá em cima na barra de filtros.
document.querySelectorAll(".botao-limpar-inline").forEach((botao) => {
  botao.addEventListener("click", limparFiltros);
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
// Clicar em qualquer parte da linha (não só na checkbox de 18x18px) marca/
// desmarca o formato — a checkbox sozinha é um alvo pequeno para tocar num
// telemóvel. Não interfere com os controlos da coluna de Duração (que têm
// as suas próprias checkboxes/labels) nem com o link "Ver specs".
listaFormatos.addEventListener("click", (evento) => {
  // Os botões +/- de Temas ficam dentro de uma célula, mas não devem
  // marcar/desmarcar a linha (tal como os controlos de Duração, que usam
  // os seus próprios elementos em vez de passar por aqui).
  const botaoTema = evento.target.closest(".botao-tema-mais, .botao-tema-menos");
  if (botaoTema) {
    mudarContagemTemas(botaoTema);
    return;
  }
  if (evento.target.closest("input, a, label, select, button")) {
    return;
  }
  const celula = evento.target.closest("td");
  if (!celula || celula.classList.contains("coluna-checkbox") || celula.querySelector(".grupo-duracao") || celula.querySelector(".grupo-entrega-mupi") || celula.querySelector(".grupo-temas")) {
    return;
  }
  const linha = celula.closest("tr");
  const checkbox = linha ? linha.querySelector(".checkbox-formato") : null;
  if (!checkbox) {
    return;
  }
  checkbox.checked = !checkbox.checked;
  checkbox.dispatchEvent(new Event("change", { bubbles: true }));
});

// Aumenta/diminui o número de temas deste formato (1..LIMITE_MAXIMO_TEMAS)
// — não mexe na seleção, só na quantidade de linhas que este formato vai
// gerar no Excel se/quando for selecionado (ver escreverSeccaoObjetivo).
function mudarContagemTemas(botao) {
  const id = Number(botao.dataset.id);
  const formato = todosFormatos.find((f) => f.id === id);
  const atual = contagemTemasDoFormato(formato, objetivoAtivo);
  const delta = botao.classList.contains("botao-tema-mais") ? 1 : -1;
  const novo = Math.min(LIMITE_MAXIMO_TEMAS, Math.max(1, atual + delta));
  if (novo === atual) {
    return;
  }
  temasPorObjetivo[objetivoAtivo].set(id, novo);
  const grupo = botao.closest(".grupo-temas");
  grupo.querySelector(".valor-temas").textContent = novo;
  grupo.querySelector(".botao-tema-menos").disabled = novo <= 1;
  grupo.querySelector(".botao-tema-mais").disabled = novo >= LIMITE_MAXIMO_TEMAS;
  atualizarResumoSelecao();
}

listaFormatos.addEventListener("change", (evento) => {
  const alvo = evento.target;

  if (alvo.classList.contains("checkbox-formato")) {
    const id = Number(alvo.dataset.id);
    if (alvo.checked) {
      const formato = todosFormatos.find((f) => f.id === id);
      // Um Mupi em papel só pode ficar marcado depois de escolhida a
      // entrega (AF ou morada) — sem isso, a linha não sabe o que exportar
      // nessas duas colunas. Reverte a marcação e avisa em vez de deixar
      // seguir em frente sem essa escolha.
      if (formato && formatoEhMupiPapel(formato) && !entregaEfetivaDoFormato(formato, objetivoAtivo)) {
        alvo.checked = false;
        mostrarNotificacao(t("avisoEscolherEntregaMupi"));
        return;
      }
      selecoesPorObjetivo[objetivoAtivo].add(id);
    } else {
      selecoesPorObjetivo[objetivoAtivo].delete(id);
    }
    atualizarResumoSelecao();
    return;
  }

  if (alvo.classList.contains("checkbox-duracao")) {
    mudarCheckboxDuracao(alvo);
    return;
  }

  if (alvo.classList.contains("checkbox-duracao-outro")) {
    mudarCheckboxDuracaoOutro(alvo);
    return;
  }

  if (alvo.classList.contains("radio-entrega-mupi")) {
    mudarEntregaMupi(alvo);
  }
});

// Guarda a escolha de entrega (AF/morada) deste Mupi papel e, se o
// formato ainda não estava marcado na seleção, marca-o agora — escolher a
// entrega é o que "confirma" este formato no pedido (ver o guard no
// listener de "checkbox-formato").
function mudarEntregaMupi(radio) {
  const id = Number(radio.dataset.id);
  entregaMupiPorObjetivo[objetivoAtivo].set(id, radio.value);
  const checkbox = listaFormatos.querySelector(`.checkbox-formato[data-id="${id}"]`);
  // Assim que há uma entrega escolhida, a checkbox deixa de estar
  // "condicionada" — tira a pista visual, quer o formato fique marcado
  // agora quer já estivesse.
  if (checkbox) {
    checkbox.classList.remove("checkbox-formato--pendente");
  }
  if (!selecoesPorObjetivo[objetivoAtivo].has(id)) {
    selecoesPorObjetivo[objetivoAtivo].add(id);
    if (checkbox) {
      checkbox.checked = true;
    }
  }
  atualizarResumoSelecao();
}

// A caixa "Outro" da duração usa o evento "input" (não "change") para
// guardar enquanto se escreve, sem esperar que o campo perca o foco.
listaFormatos.addEventListener("input", (evento) => {
  const alvo = evento.target;
  if (!alvo.classList.contains("input-duracao-outro")) {
    return;
  }
  const id = Number(alvo.dataset.id);
  const formato = todosFormatos.find((f) => f.id === id);
  const estado = garantirEstadoDuracao(formato, objetivoAtivo);
  estado.outroValor = alvo.value.trim();
  atualizarResumoSelecao();
});

// Marca/desmarca uma das durações padrão (15"/20"/30") — não é exclusiva,
// o formato pode ter várias marcadas ao mesmo tempo (vários spots pedidos).
function mudarCheckboxDuracao(checkbox) {
  const id = Number(checkbox.dataset.id);
  const formato = todosFormatos.find((f) => f.id === id);
  const estado = garantirEstadoDuracao(formato, objetivoAtivo);
  if (checkbox.checked) {
    estado.padrao.add(checkbox.value);
  } else {
    estado.padrao.delete(checkbox.value);
  }
  atualizarResumoSelecao();
}

// Marca/desmarca a duração "Outro" — mostra/esconde a caixa de texto e
// limpa-a ao desmarcar (o valor só volta a ficar visível se o utilizador
// voltar a escrever depois de marcar outra vez).
function mudarCheckboxDuracaoOutro(checkbox) {
  const id = Number(checkbox.dataset.id);
  const formato = todosFormatos.find((f) => f.id === id);
  const estado = garantirEstadoDuracao(formato, objetivoAtivo);
  estado.outroAtivo = checkbox.checked;
  const inputOutro = checkbox.closest(".grupo-duracao").querySelector(".input-duracao-outro");
  if (checkbox.checked) {
    inputOutro.hidden = false;
    inputOutro.focus();
  } else {
    inputOutro.hidden = true;
    inputOutro.value = "";
    estado.outroValor = "";
  }
  atualizarResumoSelecao();
}

// Troca o objetivo ativo: a lista de formatos mantém-se (não se re-filtra
// nem se re-desenha), só o estado das checkboxes e das durações de
// TV/Rádio mudam, para refletir a seleção já feita nesse objetivo (a mesma
// seleção pode ter uma duração diferente consoante o objetivo).
// Marca visualmente e para tecnologia de apoio qual botão de Objetivo está
// ativo (aria-current, pela mesma razão do aria-current nos separadores de
// tab — não há aqui um padrão ARIA completo de tabs).
function atualizarBotoesObjetivo() {
  botoesObjetivo.forEach((botao) => {
    const ativo = botao.dataset.objetivo === objetivoAtivo;
    botao.classList.toggle("ativo", ativo);
    if (ativo) {
      botao.setAttribute("aria-current", "true");
    } else {
      botao.removeAttribute("aria-current");
    }
  });
}

botoesObjetivo.forEach((botao) => {
  botao.addEventListener("click", () => {
    objetivoAtivo = botao.dataset.objetivo;
    atualizarBotoesObjetivo();
    sincronizarCheckboxesComObjetivoAtivo();
    atualizarResumoSelecao();
  });
});

function sincronizarCheckboxesComObjetivoAtivo() {
  const selecaoAtiva = selecoesPorObjetivo[objetivoAtivo];
  listaFormatos.querySelectorAll(".checkbox-formato").forEach((checkbox) => {
    const id = Number(checkbox.dataset.id);
    checkbox.checked = selecaoAtiva.has(id);
    // A escolha de entrega dos Mupis papel é por objetivo (tal como a
    // duração) — a pista visual de "condicionada" tem de ser recalculada
    // ao trocar de objetivo, não só na criação da linha.
    const formato = todosFormatos.find((f) => f.id === id);
    const pendente = formato && formatoEhMupiPapel(formato) && !entregaEfetivaDoFormato(formato, objetivoAtivo);
    checkbox.classList.toggle("checkbox-formato--pendente", pendente);
  });

  listaFormatos.querySelectorAll(".grupo-duracao").forEach((grupo) => {
    const id = Number(grupo.dataset.id);
    const formato = todosFormatos.find((f) => f.id === id);
    const estado = estadoDuracaoOuOmissao(formato, objetivoAtivo);
    grupo.querySelectorAll(".checkbox-duracao").forEach((checkbox) => {
      checkbox.checked = estado.padrao.has(checkbox.value);
    });
    const checkboxOutro = grupo.querySelector(".checkbox-duracao-outro");
    checkboxOutro.checked = estado.outroAtivo;
    const inputOutro = grupo.querySelector(".input-duracao-outro");
    inputOutro.hidden = !estado.outroAtivo;
    inputOutro.value = estado.outroAtivo ? (estado.outroValor || "") : "";
  });

  listaFormatos.querySelectorAll(".grupo-entrega-mupi").forEach((grupo) => {
    const id = Number(grupo.dataset.id);
    const formato = todosFormatos.find((f) => f.id === id);
    const escolha = entregaEfetivaDoFormato(formato, objetivoAtivo);
    grupo.querySelectorAll(".radio-entrega-mupi").forEach((radio) => {
      radio.checked = radio.value === escolha;
    });
  });

  listaFormatos.querySelectorAll(".grupo-temas").forEach((grupo) => {
    const id = Number(grupo.dataset.id);
    const formato = todosFormatos.find((f) => f.id === id);
    const contagem = contagemTemasDoFormato(formato, objetivoAtivo);
    grupo.querySelector(".valor-temas").textContent = contagem;
    grupo.querySelector(".botao-tema-menos").disabled = contagem <= 1;
    grupo.querySelector(".botao-tema-mais").disabled = contagem >= LIMITE_MAXIMO_TEMAS;
  });
}

// Marca todas as checkboxes atualmente visíveis (respeita os filtros ativos
// de pesquisa/categoria) — só afeta o objetivo ativo no momento, tal como
// o clique individual numa checkbox. Um Mupi em papel sem entrega ainda
// escolhida fica de fora (tal como no clique individual — ver o listener
// de "checkbox-formato"), para não ficar selecionado sem essa informação.
botaoSelecionarTodos.addEventListener("click", () => {
  const selecaoAtiva = selecoesPorObjetivo[objetivoAtivo];
  let mupisPorEscolher = 0;
  listaFormatos.querySelectorAll(".checkbox-formato").forEach((checkbox) => {
    const linha = checkbox.closest("tr");
    if (linha.style.display === "none") {
      return;
    }
    const id = Number(checkbox.dataset.id);
    const formato = todosFormatos.find((f) => f.id === id);
    if (formato && formatoEhMupiPapel(formato) && !entregaEfetivaDoFormato(formato, objetivoAtivo)) {
      mupisPorEscolher += 1;
      return;
    }
    checkbox.checked = true;
    selecaoAtiva.add(id);
  });
  if (mupisPorEscolher > 0) {
    mostrarNotificacao(formatar("avisoMupisSaltadosSelecionarTodos", { n: mupisPorEscolher }));
  }
  atualizarResumoSelecao();
});

// Janela de confirmação própria (em vez de window.confirm()) — devolve uma
// Promise<boolean>, resolvida a true/false consoante o botão premido, Escape
// ou clique fora da caixa. Necessária porque esta página também corre
// dentro do visualizador de Artifacts da Claude, que bloqueia diálogos
// nativos do browser (window.confirm() aí devolve sempre "cancelado" sem
// sequer aparecer nada — foi por isto que "Limpar seleção" parecia
// avariado nessa pré-visualização).
function confirmarAcao(mensagem) {
  return new Promise((resolve) => {
    modalConfirmacaoTexto.textContent = mensagem;
    modalConfirmacao.hidden = false;
    const elementoComFocoAntes = document.activeElement;
    // Foca o "Cancelar", não o "Confirmar" — para premir Enter sem pensar
    // nunca confirmar sozinho uma ação destrutiva.
    modalBotaoCancelar.focus();

    function concluir(resultado) {
      modalConfirmacao.hidden = true;
      modalBotaoConfirmar.removeEventListener("click", aoConfirmar);
      modalBotaoCancelar.removeEventListener("click", aoCancelar);
      modalConfirmacao.removeEventListener("keydown", aoTeclado);
      modalConfirmacao.removeEventListener("click", aoCliqueFundo);
      if (elementoComFocoAntes && typeof elementoComFocoAntes.focus === "function") {
        elementoComFocoAntes.focus();
      }
      resolve(resultado);
    }
    function aoConfirmar() {
      concluir(true);
    }
    function aoCancelar() {
      concluir(false);
    }
    function aoTeclado(evento) {
      if (evento.key === "Escape") {
        concluir(false);
      }
    }
    function aoCliqueFundo(evento) {
      if (evento.target === modalConfirmacao) {
        concluir(false);
      }
    }
    modalBotaoConfirmar.addEventListener("click", aoConfirmar);
    modalBotaoCancelar.addEventListener("click", aoCancelar);
    modalConfirmacao.addEventListener("keydown", aoTeclado);
    modalConfirmacao.addEventListener("click", aoCliqueFundo);
  });
}

// Esvazia a seleção dos TRÊS objetivos (é um "recomeçar o pedido do zero"),
// não só a do objetivo ativo no momento — por isso pede confirmação: sem
// isto, um clique por engano ao lado de "Selecionar todos"/"Exportar"
// apagava um pedido inteiro sem hipótese de recuperação.
botaoLimparSelecao.addEventListener("click", async () => {
  const total = totalFormatosSelecionados();
  if (total === 0) {
    return;
  }
  const confirmado = await confirmarAcao(formatarContagem("confirmarLimparSelecaoUm", "confirmarLimparSelecao", { n: total }));
  if (!confirmado) {
    return;
  }
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
  guardarEstadoLocal();

  if (total === 0) {
    resumoSelecao.innerHTML = "";
    return;
  }

  const grupos = OBJETIVOS
    .filter((objetivo) => selecoesPorObjetivo[objetivo].size > 0)
    .map((objetivo) => {
      const formatosDoObjetivo = todosFormatos.filter((f) => selecoesPorObjetivo[objetivo].has(f.id));
      const itensObjetivo = formatosDoObjetivo
        .flatMap((f) => {
          // Tal como nas tabelas, o Grupo Digital2020 só existe para meios
          // digitais — um formato offline (OOH, ...) não mostra a etiqueta.
          const etiqueta = grupoMeioDoFormato(f) === "Digital"
            ? ` <span class="etiqueta-dg2020">${f.grupoDigital2020 ?? "—"}</span>`
            : "";
          // Quando o Veículo é diferente do Fornecedor (ex.: "Correio da
          // Manhã" → "Boa Onda"), mostra-o também — senão duas seleções
          // diferentes podiam aparecer com o mesmo texto no resumo.
          const veiculo = f.veiculo && f.veiculo !== f.fornecedor ? ` (${f.veiculo})` : "";
          const nomeFormato = textoTraduzido(f, "formato") ?? "";
          // Nº de temas (TV/Rádio/OOH) e escolha de entrega (Mupi papel) —
          // mostrados aqui para o resumo refletir sempre o que vai sair no
          // Excel (ver escreverSeccaoObjetivo/COLUNAS_EXCEL_DISPONIVEIS).
          const numeroTemas = MEIOS_COM_TEMA.has(grupoMeioDoFormato(f)) ? contagemTemasDoFormato(f, objetivo) : 1;
          const etiquetaTemas = numeroTemas > 1 ? ` — ${formatar("resumoNumeroTemas", { n: numeroTemas })}` : "";
          const escolhaEntrega = formatoEhMupiPapel(f) ? entregaEfetivaDoFormato(f, objetivo) : null;
          const etiquetaEntrega = escolhaEntrega ? ` — ${t(escolhaEntrega === "af" ? "colEntregaAF" : "colEntregaMorada")}` : "";
          // TV/Rádio pode ter mais que uma duração escolhida — cada uma é
          // um spot pedido à parte, por isso ganha a sua própria linha no
          // resumo (mesma lógica da exportação para Excel, ver
          // escreverSeccaoObjetivo).
          if (formatoTemDuracao(f)) {
            return duracoesEfetivasDoFormato(f, objetivo).map((duracao) =>
              `<li>${f.fornecedor}${veiculo} — ${nomeFormato} — ${duracao}″${etiqueta}${etiquetaTemas}${etiquetaEntrega}</li>`
            );
          }
          return [`<li>${f.fornecedor}${veiculo} — ${nomeFormato}${etiqueta}${etiquetaTemas}${etiquetaEntrega}</li>`];
        })
        .join("");
      return `<li class="resumo-grupo-objetivo"><strong>${t(CHAVE_TRADUCAO_OBJETIVO[objetivo])}</strong><ul>${itensObjetivo}</ul></li>`;
    })
    .join("");

  resumoSelecao.innerHTML = `
    <h2>${formatar("resumoSelecaoTitulo", { n: total })} <span class="aviso-objetivo-mini" tabindex="0" title="${t("avisoPersistencia")}" aria-label="${t("avisoPersistencia")}">ⓘ</span></h2>
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
// Social Media / Google / Programático), não o publisher em si — o Google
// fica à parte (é comprado de forma diferente dos publishers
// "tradicionais"), tal como no índice lateral (ver categoriaDoPublisher).
function canalExibicaoFormato(formato) {
  if (formato.fornecedor.startsWith("Google")) {
    return t("canalGoogle");
  }
  if (formato.canal === "Paid Social") {
    return t("canalSocialMedia");
  }
  if (formato.canal === "Programático") {
    return t("canalProgramatico");
  }
  if (formato.canal === "Internet") {
    return t("canalInternet");
  }
  // Outros meios (OOH, TV, Rádio, Cinema, Imprensa, ...) ainda não têm
  // tradução própria de Canal — mostra o valor tal como vem da base, em
  // vez de assumir "Internet" para tudo o que não for digital.
  return formato.canal || t("canalInternet");
}

// Cada meio de compra (Digital, OOH, TV, Rádio, Cinema, Imprensa) tem
// sempre a sua própria folha no Excel exportado (ver exportarSelecaoParaExcel)
// — mesmo que o pedido junte formatos de vários meios, cada equipa/
// fornecedor só vê a folha que lhe interessa. O valor "Meio" que vem da
// base (Internet, Programático, OOH, ...) mapeia para um destes grupos;
// vários valores da base podem cair no mesmo grupo — Internet e
// Programático são ambos "Digital", por exemplo.
const ORDEM_MEIOS_EXCEL = ["Digital", "OOH", "TV", "Rádio", "Cinema", "Imprensa"];
const VALOR_BASE_PARA_GRUPO_MEIO = {
  "INTERNET": "Digital",
  "PROGRAMÁTICO": "Digital",
  "OOH": "OOH",
  "TV": "TV",
  "RÁDIO": "Rádio",
  "RADIO": "Rádio",
  "CINEMA": "Cinema",
  "IMPRENSA": "Imprensa",
};
const CHAVE_TRADUCAO_MEIO = {
  "Digital": "excelValorMeioDigital",
  "OOH": "meioOOH",
  "TV": "meioTV",
  "Rádio": "meioRadio",
  "Cinema": "meioCinema",
  "Imprensa": "meioImprensa",
};

// Um meio da base que ainda não esteja mapeado acima (ex.: valor novo,
// escrito de forma diferente) cai no seu próprio valor em vez de
// desaparecer silenciosamente — fica visível para corrigir o mapeamento.
function grupoMeioDoFormato(formato) {
  const valorBase = (formato.meio || "").toUpperCase();
  return VALOR_BASE_PARA_GRUPO_MEIO[valorBase] || formato.meio || "Digital";
}

// A coluna "Plataforma/Publisher" chama-se de forma diferente consoante o
// meio, porque é isso que a equipa desse meio reconhece (a estação de
// rádio, o canal de TV, o concessionário de OOH, o título de imprensa).
// Um meio sem entrada aqui mantém o rótulo genérico "Plataforma/Publisher".
const CHAVE_TRADUCAO_COL_PLATAFORMA_POR_MEIO = {
  "Rádio": "colEstacao",
  "TV": "colCanal",
  "OOH": "colConcessionario",
  "Imprensa": "colTitulo",
};

// Cada coluna possível numa folha Excel exportada: a largura, como obter
// o título (pode depender do grupoMeio, só para a Plataforma) e como
// obter o valor da célula a partir do formato.
const COLUNAS_EXCEL_DISPONIVEIS = {
  canal: {
    largura: 14,
    titulo: () => t("colCanal"),
    valor: (formato) => canalExibicaoFormato(formato),
  },
  plataforma: {
    largura: 20,
    titulo: (grupoMeio) => t(CHAVE_TRADUCAO_COL_PLATAFORMA_POR_MEIO[grupoMeio] || "colPlataforma"),
    valor: (formato) => formato.veiculo,
  },
  formato: {
    largura: 28,
    titulo: () => t("colFormato"),
    valor: (formato) => textoTraduzido(formato, "formato") ?? "",
  },
  secundagem: {
    largura: 14,
    titulo: () => t("colSecundagem"),
    // duracao vem de escreverSeccaoObjetivo, que gera uma linha por cada
    // duração escolhida (só para formatos de TV/Rádio) — ver
    // duracoesEfetivasDoFormato.
    valor: (formato, objetivo, duracao) => (duracao ? `${duracao}″` : ""),
  },
  tema: {
    largura: 16,
    titulo: () => t("colTema"),
    valor: (formato) => formato.grupoDigital2020 || "",
  },
  // Diferente da coluna "tema" acima (essa é o Grupo Digital2020, só do
  // Digital) — esta é o tema/criatividade escolhido no construtor para
  // TV/Rádio/OOH (ver MEIOS_COM_TEMA/contagemTemasDoFormato), com o mesmo
  // rótulo de coluna "Tema" porque cada uma só existe numa folha diferente.
  temaCriativo: {
    largura: 16,
    titulo: () => t("colTema"),
    valor: (formato, objetivo, duracao, temaIndice) => (temaIndice ? formatar("temaNumero", { n: temaIndice }) : ""),
  },
  entregaAF: {
    largura: 14,
    titulo: () => t("colEntregaAF"),
    valor: (formato, objetivo) => (formatoEhMupiPapel(formato) && entregaEfetivaDoFormato(formato, objetivo) === "af" ? "X" : ""),
  },
  entregaMorada: {
    largura: 16,
    titulo: () => t("colEntregaMorada"),
    valor: (formato, objetivo) => (formatoEhMupiPapel(formato) && entregaEfetivaDoFormato(formato, objetivo) === "morada" ? "X" : ""),
  },
  // Só preenchida quando a entrega escolhida foi "morada" — mostra o
  // endereço real do concessionário (o mesmo texto do ícone de info no
  // construtor, ver MORADA_ENTREGA_MUPI_PAPEL), para quem for entregar os
  // cartazes não ter de voltar à app para encontrar a morada.
  moradaEntregaMupi: {
    largura: 45,
    titulo: () => t("colMoradaEntrega"),
    valor: (formato, objetivo) => (formatoEhMupiPapel(formato) && entregaEfetivaDoFormato(formato, objetivo) === "morada" ? (MORADA_ENTREGA_MUPI_PAPEL[formato.fornecedor] || "") : ""),
  },
  // Os formatos de TV são sempre enviados via GoFastWay — valor fixo,
  // igual em todas as linhas (ver também colEntrega na Biblioteca de
  // Formatos, para TV, e o CABECALHOS_BASE_EXCEL — isto não vem da base,
  // é sempre o mesmo texto).
  entregaTV: {
    largura: 16,
    titulo: () => t("colEntrega"),
    valor: () => "GoFastWay",
  },
  dimensao: {
    largura: 45,
    titulo: () => t("colDimensao"),
    valor: (formato) => textoTraduzido(formato, "dimensao") || "",
  },
  aspectRatio: {
    largura: 14,
    titulo: () => t("colAspectRatio"),
    valor: (formato) => textoTraduzido(formato, "aspectRatio") || "",
  },
  peso: {
    largura: 16,
    titulo: () => t("colPeso"),
    valor: (formato) => textoTraduzido(formato, "peso") || "",
  },
  tipoFicheiro: {
    largura: 22,
    titulo: () => t("colTipoFicheiro"),
    valor: (formato) => textoTraduzido(formato, "tipoFicheiro") || "",
  },
  copies: {
    largura: 40,
    titulo: () => t("colCopies"),
    valor: (formato) => textoTraduzido(formato, "copies") || "",
  },
  observacoes: {
    largura: 40,
    titulo: () => t("colObservacoes"),
    valor: (formato) => textoTraduzido(formato, "observacoes") || "",
  },
  link: {
    largura: 40,
    titulo: () => t("colLink"),
    valor: (formato) => (formato.link ? { text: formato.link, hyperlink: formato.link } : ""),
  },
  dataEntrega: {
    largura: 20,
    titulo: () => t("colDataEntrega"),
    valor: () => "",
  },
};

// Cada meio só leva as colunas que lhe fazem sentido — Rádio não tem
// Dimensão/Aspect Ratio, Imprensa e OOH não têm Canal nem Tema (esse é
// um conceito só de Digital), etc. Um meio sem entrada aqui usa o
// conjunto completo do Digital.
const COLUNAS_POR_MEIO_EXCEL = {
  "Digital": ["canal", "plataforma", "formato", "tema", "dimensao", "aspectRatio", "peso", "tipoFicheiro", "copies", "observacoes", "link", "dataEntrega"],
  "OOH": ["plataforma", "formato", "temaCriativo", "dimensao", "aspectRatio", "tipoFicheiro", "entregaAF", "entregaMorada", "moradaEntregaMupi", "observacoes", "dataEntrega"],
  "TV": ["plataforma", "formato", "secundagem", "temaCriativo", "dimensao", "aspectRatio", "tipoFicheiro", "entregaTV", "observacoes", "dataEntrega"],
  "Rádio": ["plataforma", "formato", "secundagem", "temaCriativo", "tipoFicheiro", "observacoes", "dataEntrega"],
  "Cinema": ["plataforma", "formato", "dimensao", "aspectRatio", "tipoFicheiro", "observacoes", "dataEntrega"],
  "Imprensa": ["plataforma", "formato", "dimensao", "tipoFicheiro", "observacoes", "dataEntrega"],
};

// Escreve uma secção completa (título do objetivo + cabeçalho da tabela +
// uma linha por formato — ou uma linha por duração escolhida, no caso de
// TV/Rádio, ver mais abaixo) a partir da linha indicada, e devolve a
// próxima linha livre (já com uma linha em branco a separar da secção
// seguinte). colunasChaves é a lista de colunas desta folha (ver
// COLUNAS_POR_MEIO_EXCEL), sempre precedida pela coluna fixa "#".
function escreverSeccaoObjetivo(folha, linhaInicio, tituloSeccao, formatosDaSeccao, config, objetivo, colunasChaves, grupoMeio) {
  let linha = linhaInicio;
  const numColunas = colunasChaves.length + 1;

  folha.mergeCells(linha, 1, linha, numColunas);
  const celulaTitulo = folha.getCell(linha, 1);
  celulaTitulo.value = tituloSeccao;
  celulaTitulo.font = { name: "Arial Nova", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  celulaTitulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A1A" } };
  celulaTitulo.alignment = { vertical: "middle", horizontal: "center" };
  linha += 1;

  const colunas = ["#", ...colunasChaves.map((chave) => COLUNAS_EXCEL_DISPONIVEIS[chave].titulo(grupoMeio))];
  colunas.forEach((titulo, indice) => {
    const celula = folha.getCell(linha, indice + 1);
    celula.value = titulo;
    celula.font = { name: "Arial Nova", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: config.corCabecalho } };
    celula.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    celula.border = ESTILO_BORDA_COMPLETA;
  });
  linha += 1;

  const indiceColunaLink = colunasChaves.indexOf("link");
  const indiceColunaTema = colunasChaves.indexOf("temaCriativo");

  // Um formato de TV/Rádio com mais que uma duração escolhida é, na
  // prática, mais que um spot pedido — cada duração ganha a sua própria
  // linha (com a mesma Plataforma/Formato, mas Secundagem diferente), em
  // vez de juntar tudo numa linha só. Os restantes formatos geram sempre
  // uma única linha (duracao = null). Do mesmo modo, um formato de TV/
  // Rádio/OOH com mais que um Tema escolhido ganha uma linha por tema — e
  // se tiver AMBOS (duração e temas), é uma linha por cada combinação das
  // duas (ex.: 2 durações × 3 temas = 6 linhas).
  const gruposLinha = [];
  formatosDaSeccao.forEach((formato) => {
    const duracoes = formatoTemDuracao(formato) ? duracoesEfetivasDoFormato(formato, objetivo) : [null];
    const contagemTemas = MEIOS_COM_TEMA.has(grupoMeio) ? contagemTemasDoFormato(formato, objetivo) : 1;
    const temas = contagemTemas > 1 ? Array.from({ length: contagemTemas }, (_, indice) => indice + 1) : [null];
    duracoes.forEach((duracao) => {
      gruposLinha.push({ formato, duracao, temas });
    });
  });

  let linhaAtual = linha;
  gruposLinha.forEach((grupo, indiceGrupo) => {
    const linhaInicioGrupo = linhaAtual;
    grupo.temas.forEach((temaIndice, indiceDentroGrupo) => {
      const linhaFormato = folha.getRow(linhaAtual);
      // Quando este item se espalha por várias linhas (vários temas), só a
      // primeira linha do grupo leva valor nas colunas partilhadas (tudo
      // exceto o Tema) — as restantes ficam em branco, para o merge logo a
      // seguir não ter de sobrepor conteúdo já escrito nelas.
      const valoresColunas = colunasChaves.map((chave, indiceColuna) => {
        if (indiceDentroGrupo > 0 && indiceColuna !== indiceColunaTema) {
          return "";
        }
        return COLUNAS_EXCEL_DISPONIVEIS[chave].valor(grupo.formato, objetivo, grupo.duracao, temaIndice);
      });
      linhaFormato.values = [indiceDentroGrupo === 0 ? indiceGrupo + 1 : "", ...valoresColunas];
      linhaFormato.eachCell({ includeEmpty: true }, (celula) => {
        celula.font = { name: "Arial Nova", size: 10, color: { argb: "FF0F1724" } };
        celula.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        celula.border = ESTILO_BORDA_COMPLETA;
      });
      // O texto do link fica na cor de destaque, sublinhado, para
      // parecer clicável mesmo antes de o utilizador lhe tocar.
      if (indiceColunaLink !== -1 && indiceDentroGrupo === 0 && grupo.formato.link) {
        linhaFormato.getCell(indiceColunaLink + 2).font = { name: "Arial Nova", size: 10, color: { argb: "FF1155CC" }, underline: true };
      }
      linhaAtual += 1;
    });

    // Com mais que um tema, as colunas partilhadas (incluindo o "#") ficam
    // visualmente unidas ao longo das linhas do grupo — só o Tema muda
    // linha a linha.
    if (grupo.temas.length > 1) {
      for (let coluna = 1; coluna <= numColunas; coluna += 1) {
        if (coluna - 2 === indiceColunaTema) {
          continue;
        }
        folha.mergeCells(linhaInicioGrupo, coluna, linhaAtual - 1, coluna);
        folha.getCell(linhaInicioGrupo, coluna).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      }
    }
  });
  linha = linhaAtual;

  return linha + 1; // uma linha em branco antes da secção seguinte
}

botaoExportar.addEventListener("click", exportarSelecaoParaExcel);

// Escreve a folha de um meio (Digital / OOH / TV / Rádio / Cinema /
// Imprensa): logótipo, bloco Companhia/Cliente/Campanha/Meio, e uma
// secção por objetivo com os formatos desse meio (objetivos sem formatos
// desse meio não geram secção nessa folha).
async function escreverFolhaMeio(workbook, config, companhia, cliente, campanha, grupoMeio) {
  const nomeMeio = t(CHAVE_TRADUCAO_MEIO[grupoMeio]) || grupoMeio;
  const folha = workbook.addWorksheet(nomeMeio);

  // Sem gridlines — só a tabela em si vai ter linhas (mais abaixo),
  // para o Excel ficar limpo e não parecer uma grelha genérica.
  folha.views = [{ showGridLines: false }];

  // --- Larguras de coluna, de acordo com o template deste meio (só as
  // colunas relevantes para ele — ver COLUNAS_POR_MEIO_EXCEL). Têm de ser
  // definidas ANTES de escrever valores nas células, senão o ExcelJS
  // troca-nos as voltas e perde o conteúdo já escrito (foi um bug que
  // apanhámos a testar). ---
  const colunasChaves = COLUNAS_POR_MEIO_EXCEL[grupoMeio] || COLUNAS_POR_MEIO_EXCEL.Digital;
  folha.columns = [
    { width: 5 },
    ...colunasChaves.map((chave) => ({ width: COLUNAS_EXCEL_DISPONIVEIS[chave].largura })),
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
  const estiloRotulo = { font: { name: "Arial Nova", size: 10, bold: true, color: { argb: "FF5B6678" } } };
  const estiloValor = { font: { name: "Arial Nova", size: 10, color: { argb: "FF0F1724" } } };
  folha.getCell("E3").value = t("excelLabelCompanhia");
  folha.getCell("E3").style = estiloRotulo;
  folha.getCell("F3").value = companhia;
  folha.getCell("F3").style = estiloValor;
  folha.getCell("E4").value = t("excelLabelCliente");
  folha.getCell("E4").style = estiloRotulo;
  folha.getCell("F4").value = cliente;
  folha.getCell("F4").style = estiloValor;
  folha.getCell("E5").value = t("excelLabelCampanha");
  folha.getCell("E5").style = estiloRotulo;
  folha.getCell("F5").value = campanha;
  folha.getCell("F5").style = estiloValor;
  folha.getCell("E6").value = t("excelLabelMeio");
  folha.getCell("E6").style = estiloRotulo;
  folha.getCell("F6").value = nomeMeio;
  folha.getCell("F6").style = estiloValor;

  // --- Uma secção por objetivo (Awareness / Consideration / Conversion),
  // cada uma com o seu próprio cabeçalho de tabela — o mesmo formato pode
  // aparecer em mais que uma secção, porque foi pedido para objetivos
  // diferentes. Objetivos sem nenhum formato deste meio não geram secção. ---
  let linhaAtual = 10;
  OBJETIVOS.forEach((objetivo) => {
    // Dentro de cada objetivo, as linhas ficam por ordem alfabética do
    // Canal — em Digital, a coluna "Canal" propriamente dita (Social
    // Media/Google/Programático/Internet, ver canalExibicaoFormato), que é
    // diferente da coluna "Plataforma/Publisher" (Facebook/DV360/...); nos
    // restantes meios, que não têm essa distinção, usa-se a única coluna de
    // plataforma que têm (Concessionário/Canal/Estação/Título). O Veículo e
    // depois o Formato servem de desempate. Nomes próprios e o texto do
    // Canal exibido são comparados sempre em português — este último
    // porque é o mesmo texto que sai impresso nessa coluna, e queremos que
    // a ordem visual bata certo com o texto, seja qual for o idioma ativo.
    const formatosDoObjetivo = todosFormatos
      .filter((f) => selecoesPorObjetivo[objetivo].has(f.id) && grupoMeioDoFormato(f) === grupoMeio)
      .sort((a, b) => {
        const canalComparado = grupoMeio === "Digital"
          ? canalExibicaoFormato(a).localeCompare(canalExibicaoFormato(b), "pt")
          : 0;
        return (
          canalComparado ||
          (a.veiculo || "").localeCompare(b.veiculo || "", "pt") ||
          (a.formato || "").localeCompare(b.formato || "", "pt")
        );
      });
    if (formatosDoObjetivo.length === 0) {
      return;
    }
    linhaAtual = escreverSeccaoObjetivo(folha, linhaAtual, t(CHAVE_TRADUCAO_OBJETIVO[objetivo]), formatosDoObjetivo, config, objetivo, colunasChaves, grupoMeio);
  });
}

async function exportarSelecaoParaExcel() {
  const companhia = campoCompanhia.value;
  if (totalFormatosSelecionados() === 0 || !companhia) {
    return;
  }

  const config = CONFIGURACAO_COMPANHIA[companhia];
  const cliente = campoCliente.value.trim() || t("valorPreencher");
  const campanha = campoCampanha.value.trim() || t("valorPreencher");

  const workbook = new ExcelJS.Workbook();

  // Descobre que meios têm pelo menos um formato selecionado (nalgum
  // objetivo) — só esses ganham folha; a ordem segue ORDEM_MEIOS_EXCEL,
  // com qualquer meio ainda não previsto a aparecer no fim.
  const gruposComSelecao = new Set();
  OBJETIVOS.forEach((objetivo) => {
    selecoesPorObjetivo[objetivo].forEach((id) => {
      const formato = todosFormatos.find((f) => f.id === id);
      if (formato) {
        gruposComSelecao.add(grupoMeioDoFormato(formato));
      }
    });
  });
  const gruposOrdenados = ORDEM_MEIOS_EXCEL.filter((grupo) => gruposComSelecao.has(grupo));
  gruposComSelecao.forEach((grupo) => {
    if (!gruposOrdenados.includes(grupo)) {
      gruposOrdenados.push(grupo);
    }
  });

  for (const grupoMeio of gruposOrdenados) {
    await escreverFolhaMeio(workbook, config, companhia, cliente, campanha, grupoMeio);
  }

  // --- Gerar o ficheiro e fazer o download no browser ---
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const nomeFicheiro = `${t("excelNomeFicheiroPrefixo")}_${cliente}_${campanha}.xlsx`.replace(/[\\/:*?"<>|]/g, "-");

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nomeFicheiro;
  link.click();
  URL.revokeObjectURL(link.href);

  // O download em si não dá nenhum feedback visível na página — sem esta
  // notificação, num computador mais lento pode parecer que não aconteceu nada.
  mostrarNotificacao(t("notificacaoExportado"));
}

/*
============================================
12. NOTIFICAÇÃO FLUTUANTE (toast)
Mensagem discreta que aparece uns segundos e desaparece
sozinha — usada para confirmar ações sem interromper o
utilizador com um alert().
============================================
*/
let temporizadorNotificacao = null;

function mostrarNotificacao(mensagem) {
  notificacaoToast.textContent = mensagem;
  notificacaoToast.hidden = false;
  clearTimeout(temporizadorNotificacao);
  temporizadorNotificacao = setTimeout(() => {
    notificacaoToast.hidden = true;
  }, 3500);
}

/*
============================================
13. BOTÃO "VOLTAR AO TOPO"
Só aparece depois de algum scroll para baixo, para não
ocupar espaço no ecrã enquanto não faz falta.
============================================
*/
const LIMIAR_SCROLL_VOLTAR_TOPO = 400;

window.addEventListener("scroll", () => {
  botaoVoltarTopo.hidden = window.scrollY < LIMIAR_SCROLL_VOLTAR_TOPO;
});

botaoVoltarTopo.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/*
============================================
14. PERSISTÊNCIA LOCAL (localStorage)
Guarda o estado do pedido em curso (Companhia/Cliente/
Campanha + seleção por objetivo) para não se perder se a
página for atualizada ou fechada sem querer. Guarda-se pela
chave "Fornecedor|Veículo|Formato" (estável, ver chaveTraducao),
não pelo "id" (que é só a posição na base e pode mudar entre
carregamentos) — um formato que já não existir na base é
simplesmente ignorado ao restaurar, em vez de dar erro.

localStorage pode estar bloqueado (modo privado, políticas do
browser, sandbox do Artifact) — nesse caso a app continua a
funcionar normalmente, só sem persistência.
============================================
*/
const CHAVE_LOCALSTORAGE_PEDIDO = "csbuilder-pedido-em-curso";

function guardarEstadoLocal() {
  if (todosFormatos.length === 0) {
    return; // ainda não há formatos carregados — não sobrescrever o que já estava guardado
  }
  try {
    const idParaChave = new Map(todosFormatos.map((f) => [f.id, chaveTraducao(f)]));
    const selecoes = {};
    const duracoes = {};
    const entregasMupi = {};
    const temas = {};
    OBJETIVOS.forEach((objetivo) => {
      selecoes[objetivo] = [...selecoesPorObjetivo[objetivo]]
        .map((id) => idParaChave.get(id))
        .filter(Boolean);
      // Só guarda durações/entregas/temas de formatos que continuam
      // selecionados nesse objetivo — um valor "órfão" (de um formato
      // entretanto desmarcado) não tem interesse em manter.
      duracoes[objetivo] = {};
      duracoesPorObjetivo[objetivo].forEach((estado, id) => {
        if (selecoesPorObjetivo[objetivo].has(id)) {
          const chave = idParaChave.get(id);
          if (chave) {
            duracoes[objetivo][chave] = {
              padrao: [...estado.padrao],
              outroAtivo: estado.outroAtivo,
              outroValor: estado.outroValor,
            };
          }
        }
      });
      entregasMupi[objetivo] = {};
      entregaMupiPorObjetivo[objetivo].forEach((valor, id) => {
        if (selecoesPorObjetivo[objetivo].has(id)) {
          const chave = idParaChave.get(id);
          if (chave) {
            entregasMupi[objetivo][chave] = valor;
          }
        }
      });
      temas[objetivo] = {};
      temasPorObjetivo[objetivo].forEach((contagem, id) => {
        if (selecoesPorObjetivo[objetivo].has(id)) {
          const chave = idParaChave.get(id);
          if (chave) {
            temas[objetivo][chave] = contagem;
          }
        }
      });
    });
    localStorage.setItem(CHAVE_LOCALSTORAGE_PEDIDO, JSON.stringify({
      companhia: campoCompanhia.value,
      cliente: campoCliente.value,
      campanha: campoCampanha.value,
      objetivoAtivo,
      selecoes,
      duracoes,
      entregasMupi,
      temas,
    }));
  } catch (erro) {
    // localStorage indisponível — nada a fazer, a app continua sem persistência.
  }
}

function restaurarEstadoLocal() {
  let estadoGuardado;
  try {
    const bruto = localStorage.getItem(CHAVE_LOCALSTORAGE_PEDIDO);
    if (!bruto) {
      return;
    }
    estadoGuardado = JSON.parse(bruto);
  } catch (erro) {
    return;
  }

  const chaveParaId = new Map(todosFormatos.map((f) => [chaveTraducao(f), f.id]));
  OBJETIVOS.forEach((objetivo) => {
    const chaves = (estadoGuardado.selecoes && estadoGuardado.selecoes[objetivo]) || [];
    chaves.forEach((chave) => {
      const id = chaveParaId.get(chave);
      if (id !== undefined) {
        selecoesPorObjetivo[objetivo].add(id);
      }
    });

    const duracoesGuardadas = (estadoGuardado.duracoes && estadoGuardado.duracoes[objetivo]) || {};
    Object.entries(duracoesGuardadas).forEach(([chave, guardado]) => {
      const id = chaveParaId.get(chave);
      if (id !== undefined && guardado && Array.isArray(guardado.padrao)) {
        duracoesPorObjetivo[objetivo].set(id, {
          padrao: new Set(guardado.padrao),
          outroAtivo: !!guardado.outroAtivo,
          outroValor: guardado.outroValor || "",
        });
      }
    });

    const entregasGuardadas = (estadoGuardado.entregasMupi && estadoGuardado.entregasMupi[objetivo]) || {};
    Object.entries(entregasGuardadas).forEach(([chave, valor]) => {
      const id = chaveParaId.get(chave);
      if (id !== undefined && (valor === "af" || valor === "morada")) {
        entregaMupiPorObjetivo[objetivo].set(id, valor);
      }
    });

    const temasGuardados = (estadoGuardado.temas && estadoGuardado.temas[objetivo]) || {};
    Object.entries(temasGuardados).forEach(([chave, contagem]) => {
      const id = chaveParaId.get(chave);
      if (id !== undefined && Number.isInteger(contagem) && contagem >= 1) {
        temasPorObjetivo[objetivo].set(id, contagem);
      }
    });
  });

  if (estadoGuardado.companhia) {
    campoCompanhia.value = estadoGuardado.companhia;
  }
  if (estadoGuardado.cliente) {
    campoCliente.value = estadoGuardado.cliente;
  }
  if (estadoGuardado.campanha) {
    campoCampanha.value = estadoGuardado.campanha;
  }
  if (estadoGuardado.objetivoAtivo && OBJETIVOS.includes(estadoGuardado.objetivoAtivo)) {
    objetivoAtivo = estadoGuardado.objetivoAtivo;
    atualizarBotoesObjetivo();
  }
}

/*
============================================
15. ARRANQUE DA APLICAÇÃO
============================================
*/
aplicarTraducoesEstaticas();
carregarFormatos();
atualizarResumoSelecao();
