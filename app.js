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
// momento da campanha), cada uma um pedido de spot distinto. E, porque cada
// canal/estação pode ter a sua própria grelha de durações (ex.: TVI a
// 30"+20", SIC só a 30"+10", no mesmo pedido), a duração é guardada por
// canal, não só por formato — indexada pela chave composta
// `${formato.id}||${canal}` (ver chaveDuracaoCanal), também por objetivo.
// Só relevante para formatos de TV/Rádio (ver formatoTemDuracao), que são
// sempre formatos com canal (ver formatoTemCanal) — por isso a duração
// nunca precisa de existir sem um canal associado. Cada entrada é
// { padrao: Set<string> (subconjunto de DURACOES_PADRAO escolhido),
// outroAtivo: boolean, outroValor: string }. Quando não há entrada,
// assume-se só DURACAO_OMISSAO (30", a duração mais comum), nunca fica por
// preencher.
const DURACOES_PADRAO = ["5", "10", "15", "20", "25", "30"];
const DURACAO_OMISSAO = "30";
const duracoesPorObjetivo = {
  awareness: new Map(),
  consideration: new Map(),
  conversion: new Map(),
};
function chaveDuracaoCanal(idFormato, canal) {
  return `${idFormato}||${canal}`;
}
// Separa uma chave composta "<parteId>||<canal>" nas duas partes — usada
// tanto para o estado em memória (chaveDuracaoCanal(id, canal), com
// <parteId> numérico) como para a versão persistida no localStorage
// (chaveDuracaoCanal(chaveEstável, canal), com <parteId> uma chave de
// texto estável — ver guardarEstadoLocal/restaurarEstadoLocal, que fazem
// a conversão id↔chaveEstável consoante o sentido).
function separarChaveDuracaoCanal(chaveComposta) {
  const indice = chaveComposta.indexOf("||");
  return { parteId: chaveComposta.slice(0, indice), canal: chaveComposta.slice(indice + 2) };
}

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

// Alguns formatos têm mais que uma "variante técnica" na base que é, na
// prática, a mesma decisão de pedido — só muda a codificação/dimensão
// entregue — por isso, no construtor, aparecem como uma única linha com
// um nome genérico (ver agruparVariantesSeConstrutor): marcar/desmarcar
// essa linha, ou mudar a Duração ou o número de Temas, aplica-se a todas
// as variantes do grupo ao mesmo tempo (ver garantirEstadoDuracao,
// mudarContagemTemas e o listener de checkbox-formato), e cada variante
// continua a gerar a sua própria linha no Excel exportado — com as
// colunas que partilham o mesmo valor (ex.: Plataforma, ou o próprio
// Formato quando o nome genérico é igual) fundidas verticalmente em vez
// de repetidas, só as que realmente diferem entre variantes (ex.:
// Dimensão, Peso) é que saem em linhas separadas (ver
// mesclarColunasComValorRepetido). A Biblioteca de Formatos continua a
// mostrar cada variante técnica separadamente, com as suas specs
// próprias — só o construtor (opcoes.simplificado) é que agrupa. Hoje
// cobre três casos: "Spot TV" (SD/HD, ver README), "Publicidade Cinema"
// (2D/3D, NOS Publicidade) e "Ecrã Digital - Canal Executivo" da
// LiftMedia (Horizontal/Vertical, duas dimensões do mesmo ecrã).
// Construído uma vez, quando a base carrega; representante = o id mais
// baixo do grupo (mantém a ordem de leitura previsível).
let GRUPOS_FORMATO_VARIANTES = new Map(); // id -> { representante, ids: [...] }

// Um formato é uma "variante técnica" agrupável quando o nome bate com um
// destes padrões, dentro do meio certo — ver o comentário acima.
const PADROES_VARIANTE_FORMATO = [
  { grupoMeio: "TV", regex: /^Spot TV \(/, nomeGenerico: "Spot TV" },
  { grupoMeio: "Cinema", regex: /^Publicidade Cinema /, nomeGenerico: "Spot" },
  { grupoMeio: "OOH", regex: /^Ecrã Digital - Canal Executivo \(/, nomeGenerico: "Ecrã Digital - Canal Executivo" },
];

function construirGruposFormatoVariantes(formatos) {
  const porVariante = new Map(); // "grupoMeio|fornecedor|veiculo" -> { nomeGenerico, ids: [...] }
  formatos.forEach((formato) => {
    const grupoMeio = grupoMeioDoFormato(formato);
    const padrao = PADROES_VARIANTE_FORMATO.find((p) => p.grupoMeio === grupoMeio && p.regex.test(formato.formato || ""));
    if (!padrao) {
      return;
    }
    const chave = `${grupoMeio}|${formato.fornecedor}|${formato.veiculo}`;
    if (!porVariante.has(chave)) {
      porVariante.set(chave, { nomeGenerico: padrao.nomeGenerico, ids: [] });
    }
    porVariante.get(chave).ids.push(formato.id);
  });
  const grupos = new Map();
  porVariante.forEach(({ nomeGenerico, ids }) => {
    if (ids.length < 2) {
      return;
    }
    const representante = Math.min(...ids);
    ids.forEach((id) => grupos.set(id, { representante, ids: [...ids], nomeGenerico }));
  });
  return grupos;
}

// Todos os ids "irmãos" deste formato (incluindo ele próprio) — só mais
// que um quando faz parte de um grupo de variantes técnicas (ver
// GRUPOS_FORMATO_VARIANTES); nos restantes casos é sempre só [formato.id].
function idsDoGrupoFormato(id) {
  const grupo = GRUPOS_FORMATO_VARIANTES.get(id);
  return grupo ? grupo.ids : [id];
}

// Estado de duração para leitura (renderização) — nunca cria/guarda nada,
// devolve o valor por omissão (só 30") quando ainda não há escolha explícita
// para este canal.
function estadoDuracaoOuOmissao(formato, objetivo, canal) {
  return duracoesPorObjetivo[objetivo].get(chaveDuracaoCanal(formato.id, canal)) || { padrao: new Set([DURACAO_OMISSAO]), outroAtivo: false, outroValor: "" };
}

// Garante uma entrada real no mapa (criando-a com o valor por omissão se
// for a primeira interação) para poder ser alterada — só chamar a partir
// de um evento do utilizador, nunca da renderização.
function garantirEstadoDuracao(formato, objetivo, canal) {
  const mapa = duracoesPorObjetivo[objetivo];
  const chave = chaveDuracaoCanal(formato.id, canal);
  const estado = mapa.get(chave) || { padrao: new Set([DURACAO_OMISSAO]), outroAtivo: false, outroValor: "" };
  // Todos os ids do grupo (ver GRUPOS_FORMATO_VARIANTES) passam a apontar para o
  // MESMO objeto, para o MESMO canal — mutar um propaga automaticamente aos
  // outros. Reaplicado sempre (não só na primeira vez) para também corrigir
  // o caso de o estado ter sido restaurado do localStorage com um objeto
  // por chave (ver restaurarEstadoLocal), que ainda não estão "ligados"
  // entre si.
  idsDoGrupoFormato(formato.id).forEach((id) => mapa.set(chaveDuracaoCanal(id, canal), estado));
  return estado;
}

// A caixa "Outro" aceita mais que uma duração livre ao mesmo tempo (ex.:
// "21, 25" para um filme de 21" e outro de 25" no mesmo pedido) — basta
// separar por vírgula; cada uma conta como a sua própria duração (e, por
// isso, o seu próprio spot/linha — ver duracoesEfetivasDoFormato).
function duracoesLivresDoEstado(estado) {
  if (!estado.outroAtivo || !estado.outroValor.trim()) {
    return [];
  }
  return estado.outroValor
    .split(",")
    .map((valor) => valor.trim())
    .filter((valor) => valor.length > 0);
}

// As durações efetivamente escolhidas para este formato+objetivo+canal, na
// ordem 15/20/30 seguidas das durações livres de "Outro" (se ativo e
// preenchido — ver duracoesLivresDoEstado) — nunca uma lista vazia quando
// o formato tem duração (cai sempre em [DURACAO_OMISSAO]). Cada canal tem a
// sua própria grelha de durações (ex.: TVI a 30"+20", SIC só a 30"+10").
function duracoesEfetivasDoFormato(formato, objetivo, canal) {
  if (!formatoTemDuracao(formato)) {
    return [];
  }
  const estado = estadoDuracaoOuOmissao(formato, objetivo, canal);
  const valores = DURACOES_PADRAO.filter((valor) => estado.padrao.has(valor));
  valores.push(...duracoesLivresDoEstado(estado));
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
// Restrito aos concessionários com morada conhecida (ver
// MORADA_ENTREGA_MUPI_PAPEL, mais abaixo) — sem isso, o nome de um formato
// de outro fornecedor que apenas contenha "mupi" (ex.: "Mupis Digitais" ou
// "Mupis Tradicionais" da Tequilha, sem esta escolha de entrega) ficava
// bloqueado sem motivo, exigindo uma escolha AF/morada que nem chega a
// fazer sentido para esse fornecedor.
function formatoEhMupiPapel(formato) {
  if (grupoMeioDoFormato(formato) !== "OOH" || !(formato.fornecedor in MORADA_ENTREGA_MUPI_PAPEL)) {
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
  "JCDecaux": "Os cartazes deverão ser acompanhados de uma impressão da campanha a afixar. A entrega dos cartazes deve ser efetuada das 07h00 às 12h00 e das 13h30 às 16h00 nas instalações da JCDecaux – Portão 1. Morada: Beco da Aviação, nº 1, Granja do Alpriate, 2625-607 Vialonga – Portugal.",
  "MOP": "Morada de entrega: R. Mário Castelhano, 42 - Armazém 7, Lux Parque - Queluz de Baixo, 2734-502 Barcarena. Horário: 8h-12h e 13h-17h. Tel: +351 214 355 485.",
  "DreamMedia": "Morada de entrega: Rua Manuel da Maia, nº 4, 2680-186 Loures. Horário: 8h-12h e 13h-17h.",
};

// Link do Portal GoFastWay (ver especificações técnicas oficiais da
// GoFastWay, secção 1 "Introdução") — tal como a própria palavra
// "GoFastWay", é um valor fixo que aparece sempre a seguir a ela, tanto
// na Biblioteca de Formatos como no Excel exportado (ver entregaTV em
// COLUNAS_EXCEL_DISPONIVEIS).
const LINK_GOFASTWAY = "http://www.gofastway.tv";
const TEXTO_LINK_GOFASTWAY = "www.gofastway.tv";

// Pedir o mesmo formato para vários temas/criatividades diferentes é, tal
// como a duração, mais que um pedido de facto — cada tema ganha a sua
// própria linha no Excel (ver escreverSeccaoObjetivo). Aqui só se escolhe
// a QUANTIDADE (o nome de cada tema fica por preencher à mão depois no
// Excel, na coluna Tema, que sai sempre em branco — ver
// COLUNAS_EXCEL_DISPONIVEIS.tema). Sem entrada no mapa assume-se 1 (um
// único pedido, sem divisão por tema). Aplica-se a todos os meios (pedido
// explícito da Cláudia).
const MEIOS_COM_TEMA = new Set(["TV", "Rádio", "OOH", "Digital", "Cinema", "Imprensa"]);
// Sem limite máximo de temas (pedido explícito da Cláudia) — só o mínimo
// de 1 é imposto (ver mudarContagemTemas/mudarContagemTemaGrid).
const temasPorObjetivo = {
  awareness: new Map(),
  consideration: new Map(),
  conversion: new Map(),
};
function contagemTemasDoFormato(formato, objetivo) {
  return temasPorObjetivo[objetivo].get(formato.id) || 1;
}

// Nº de Faces e Nº de cartazes a entregar — só existem no OOH (algumas
// estruturas, ex. totens/mupis multi-face, têm mais que uma face a
// publicitar, e cada face pode levar mais que um cartaz físico a
// entregar). Não vêm da base (são uma característica da compra em
// concreto, não do formato em si) — ficam em branco por omissão, tal como
// a Data de Início/Entrega, para o utilizador preencher o que fizer
// sentido para esta campanha.
const numFacesOohPorObjetivo = {
  awareness: new Map(),
  consideration: new Map(),
  conversion: new Map(),
};
const numCartazesOohPorObjetivo = {
  awareness: new Map(),
  consideration: new Map(),
  conversion: new Map(),
};
function valorNumFacesOoh(formato, objetivo) {
  return numFacesOohPorObjetivo[objetivo].get(formato.id) || "";
}
function valorNumCartazesOoh(formato, objetivo) {
  return numCartazesOohPorObjetivo[objetivo].get(formato.id) || "";
}

// TV e Rádio são um caso à parte do restante meio com tema (OOH): as specs
// técnicas são sempre as mesmas, seja qual for o canal/estação — o que
// varia é só para onde o spot tem de ser enviado, e o número de temas pode
// ser diferente por canal/estação E por secundagem (ex.: RTP 30″ = 2
// temas, SIC 30″ = 1 tema, RTP 15″ = 1 tema). Por isso TV/Rádio têm o seu
// próprio par de mapas (canal escolhido + grelha de temas por
// canal×secundagem), em vez de reaproveitar temasPorObjetivo — misturar os
// dois exigiria o mesmo formato "saber" se está a usar uma contagem simples
// ou uma grelha, o que tornava tudo mais frágil. OOH continua a usar a
// contagem simples (ver MEIOS_COM_TEMA/contagemTemasDoFormato).
const CANAIS_TV = ["RTP", "SIC", "TVI", "STAR", "NOS", "Media Livre"];
// Lista de estações de rádio indicada pela Cláudia, por ordem alfabética
// — ajustar esta lista chega para mudar as opções em toda a app.
const ESTACOES_RADIO = ["Batida FM", "Best Rock FM", "Cidade FM", "CMR", "M80", "Mega Hits", "Rádio Comercial", "Rádio Observador", "Renascença", "RFM", "Smooth FM", "Star FM", "TSF"];
const CANAIS_POR_MEIO = { "TV": CANAIS_TV, "Rádio": ESTACOES_RADIO };
const MEIOS_COM_CANAL = new Set(Object.keys(CANAIS_POR_MEIO));
function formatoTemCanal(formato) {
  return MEIOS_COM_CANAL.has(grupoMeioDoFormato(formato));
}
// As opções de canal/estação disponíveis para este formato, consoante o
// meio — RTP/SIC/.../Media Livre em TV, as estações de rádio em Rádio.
function canaisDisponiveisDoFormato(formato) {
  return CANAIS_POR_MEIO[grupoMeioDoFormato(formato)] || [];
}
// "Canais" (TV) vs. "Estações" (Rádio) — o mesmo conceito, rótulos
// diferentes consoante o meio (ver criarCelulaCanaisTv/criarCabecalhoTabela).
function chaveRotuloCanal(grupoMeio) {
  return grupoMeio === "Rádio" ? "labelEstacoesRadio" : "labelCanaisTV";
}
function chaveSemCanalEscolhido(grupoMeio) {
  return grupoMeio === "Rádio" ? "semEstacoesEscolhidas" : "semCanaisEscolhidos";
}
function chaveAvisoEscolherCanal(grupoMeio) {
  return grupoMeio === "Rádio" ? "avisoEscolherEstacaoRadio" : "avisoEscolherCanalTV";
}
function chaveAvisoSaltadosSelecionarTodos(grupoMeio) {
  return grupoMeio === "Rádio" ? "avisoRadioSaltadosSelecionarTodos" : "avisoTvSaltadosSelecionarTodos";
}

// Canais escolhidos para este formato de TV, por objetivo — Set vazio
// quando ainda não há escolha (estado de leitura, nunca cria nada).
const canaisTvPorObjetivo = {
  awareness: new Map(),
  consideration: new Map(),
  conversion: new Map(),
};
function canaisDoFormato(formato, objetivo) {
  return canaisTvPorObjetivo[objetivo].get(formato.id) || new Set();
}
// Garante uma entrada real (criando-a vazia se for a primeira interação) —
// só chamar a partir de um evento do utilizador, nunca da renderização.
// Tal como a duração, propaga-se a todos os ids do mesmo grupo de
// variantes técnicas (ver GRUPOS_FORMATO_VARIANTES — hoje só "Spot TV").
function garantirCanaisFormato(formato, objetivo) {
  const mapa = canaisTvPorObjetivo[objetivo];
  const estado = mapa.get(formato.id) || new Set();
  idsDoGrupoFormato(formato.id).forEach((id) => mapa.set(id, estado));
  return estado;
}

// Grelha de temas por TV: cada célula é a combinação canal×secundagem (a
// secundagem fica "" para formatos sem duração, ex.: Ecrã Fracionado) —
// ver chaveCelulaTemaTv. Sem entrada assume-se 1, tal como
// contagemTemasDoFormato.
const temasGridTvPorObjetivo = {
  awareness: new Map(),
  consideration: new Map(),
  conversion: new Map(),
};
function chaveCelulaTemaTv(canal, duracao) {
  return `${canal}||${duracao || ""}`;
}
function contagemTemaTv(formato, objetivo, canal, duracao) {
  const grelha = temasGridTvPorObjetivo[objetivo].get(formato.id);
  return (grelha && grelha.get(chaveCelulaTemaTv(canal, duracao))) || 1;
}
function definirContagemTemaTv(formato, objetivo, canal, duracao, novaContagem) {
  const mapa = temasGridTvPorObjetivo[objetivo];
  let grelha = mapa.get(formato.id);
  if (!grelha) {
    grelha = new Map();
    idsDoGrupoFormato(formato.id).forEach((id) => mapa.set(id, grelha));
  }
  grelha.set(chaveCelulaTemaTv(canal, duracao), novaContagem);
}

// "Vaga" repetível (TV/Rádio) — pedido explícito da Cláudia, para um
// único pedido poder cobrir várias vagas do mesmo cliente ao mesmo
// tempo (ex.: Pedido de Material mensal com a Vaga A, B, C, cada uma
// com o seu próprio plano de canais/secundagem/temas), em vez de um
// ficheiro à parte por vaga. Por omissão um formato não tem nenhuma
// vaga (o fluxo de sempre, sem mudança nenhuma); ligar o "pisco" cria
// já as duas primeiras (ver alternarMaisVagasTv) e o formato passa a
// mostrar um bloco repetível por vaga em vez do único bloco de
// sempre. Por formato (não partilhada entre formatos — pedido explícito
// da Cláudia), e por objetivo, tal como o resto do estado de TV/Rádio.
//
// Cada vaga reaproveita por inteiro os Maps já existentes
// (canaisTvPorObjetivo, duracoesPorObjetivo, temasGridTvPorObjetivo), só
// trocando o "formato.id" por um id composto "<idFormato>::camp::
// <idVaga>" (ver chaveFormatoVaga/resolverFormatoDoId) — a opção
// que menos mexe no resto do ficheiro: toda a lógica de Canal/Secundagem/
// Temas já indexada por formato.id passa a funcionar sem alterações,
// tanto para o bloco único (id simples) como para um bloco de vaga
// (id composto).
const vagasTvPorObjetivo = {
  awareness: new Map(),
  consideration: new Map(),
  conversion: new Map(),
};
const SEPARADOR_ID_VAGA = "::camp::";
function chaveFormatoVaga(idFormatoReal, idVaga) {
  return `${idFormatoReal}${SEPARADOR_ID_VAGA}${idVaga}`;
}
// Extrai a parte do id real (numérica) de um data-id que pode ser simples
// (formato sem vagas) ou composto (dentro de um bloco de vaga).
function idFormatoRealDoId(idDataset) {
  const idTexto = String(idDataset);
  const indice = idTexto.indexOf(SEPARADOR_ID_VAGA);
  return Number(indice === -1 ? idTexto : idTexto.slice(0, indice));
}
// Extrai o id da vaga de um data-id composto, ou null se for um id
// simples (bloco único, sem vagas).
function idVagaDoId(idDataset) {
  const idTexto = String(idDataset);
  const indice = idTexto.indexOf(SEPARADOR_ID_VAGA);
  return indice === -1 ? null : idTexto.slice(indice + SEPARADOR_ID_VAGA.length);
}
// Devolve o "formato" a usar nos Maps de estado por id (Canal/Secundagem/
// Temas) a partir de um data-id do DOM — mantém todos os campos reais
// (fornecedor, veículo, canais disponíveis, ...) do formato real, só troca
// o id quando o data-id pertence a um bloco de vaga. Devolve
// undefined se o formato real já não existir (ex.: base recarregada).
function resolverFormatoDoId(idDataset) {
  const idTexto = String(idDataset);
  const idReal = idFormatoRealDoId(idTexto);
  const real = todosFormatos.find((f) => f.id === idReal);
  if (!real) {
    return undefined;
  }
  return idTexto === String(idReal) ? real : { ...real, id: idTexto };
}
function vagasDoFormato(formato, objetivo) {
  return vagasTvPorObjetivo[objetivo].get(formato.id) || [];
}
function formatoUsaVagas(formato, objetivo) {
  return vagasDoFormato(formato, objetivo).length > 0;
}
function proximoIdVaga(lista) {
  const maior = lista.reduce((acc, vaga) => Math.max(acc, Number(vaga.id) || 0), 0);
  return String(maior + 1);
}
function criarVaga(formato, objetivo, nome) {
  const lista = vagasTvPorObjetivo[objetivo].get(formato.id) || [];
  const idNovo = proximoIdVaga(lista);
  const nova = { id: idNovo, nome: nome || `${t("vagaRotuloOmissao")} ${idNovo}` };
  vagasTvPorObjetivo[objetivo].set(formato.id, [...lista, nova]);
  return nova;
}
function removerVaga(formato, objetivo, idVaga) {
  const lista = vagasTvPorObjetivo[objetivo].get(formato.id) || [];
  vagasTvPorObjetivo[objetivo].set(formato.id, lista.filter((vaga) => vaga.id !== idVaga));
}
function renomearVaga(formato, objetivo, idVaga, novoNome) {
  const lista = vagasTvPorObjetivo[objetivo].get(formato.id) || [];
  const vaga = lista.find((v) => v.id === idVaga);
  if (vaga) {
    vaga.nome = novoNome;
  }
}
// Verdadeiro quando este formato de TV/Rádio já tem pelo menos um canal/
// estação escolhido — no bloco único de sempre, OU nalguma das vagas
// (quando o "pisco" de várias vagas está ativo). Substitui
// "canaisDoFormato(formato, objetivo).size === 0" em todos os sítios que
// decidem se o formato já pode ser marcado/exportado — com vagas
// ativas, o bloco único de base fica sempre vazio (todos os canais ficam
// guardados sob ids compostos), por isso olhar só a ele dava sempre
// "nenhum canal escolhido" mesmo com dados preenchidos nas vagas.
function formatoTemAlgumCanalEscolhido(formato, objetivo) {
  if (canaisDoFormato(formato, objetivo).size > 0) {
    return true;
  }
  return vagasDoFormato(formato, objetivo).some((vaga) => {
    const idComposto = chaveFormatoVaga(formato.id, vaga.id);
    return (canaisTvPorObjetivo[objetivo].get(idComposto) || new Set()).size > 0;
  });
}

// Todas as combinações canal×secundagem atualmente relevantes para este
// formato (uma célula de temas por combinação) — usada tanto para desenhar
// a grelha no construtor como para gerar as linhas no Excel exportado.
// Sem duração (ex.: Ecrã Fracionado), a secundagem é sempre "" (uma só
// coluna por canal).
function celulasTemaTvAtivas(formato, objetivo) {
  const canais = [...canaisDoFormato(formato, objetivo)];
  const temDuracao = formatoTemDuracao(formato);
  const celulas = [];
  canais.forEach((canal) => {
    // Cada canal tem a sua própria grelha de durações (ver
    // duracoesEfetivasDoFormato) — não é a mesma lista para todos.
    const duracoes = temDuracao ? duracoesEfetivasDoFormato(formato, objetivo, canal) : [""];
    duracoes.forEach((duracao) => {
      celulas.push({ canal, duracao });
    });
  });
  return celulas;
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
  placeholderDuracaoOutro: { pt: "segundos, ex.: 21, 25", en: "seconds, e.g. 21, 25", es: "segundos, ej.: 21, 25", fr: "secondes, ex. : 21, 25" },
  colGrupoDigital2020: { pt: "Grupo Digital2020", en: "Digital2020 Group", es: "Grupo Digital2020", fr: "Groupe Digital2020" },
  colDimensao: { pt: "Dimensão", en: "Dimensions", es: "Dimensión", fr: "Dimensions" },
  colAspectRatio: { pt: "Aspect Ratio", en: "Aspect Ratio", es: "Aspect Ratio", fr: "Aspect Ratio" },
  colPeso: { pt: "Peso / Duração", en: "File Size / Duration", es: "Peso / Duración", fr: "Poids / Durée" },
  colTipoFicheiro: { pt: "Tipo de ficheiro", en: "File Type", es: "Tipo de archivo", fr: "Type de fichier" },
  colCopies: { pt: "Copies", en: "Copy", es: "Copies", fr: "Copies" },
  colObservacoes: { pt: "Observações", en: "Notes", es: "Observaciones", fr: "Remarques" },
  colTema: { pt: "Tema", en: "Theme", es: "Tema", fr: "Thème" },
  colFonte: { pt: "Fonte", en: "Source", es: "Fuente", fr: "Source" },
  colCanal: { pt: "Canal", en: "Channel", es: "Canal", fr: "Canal" },
  // Com espaços à volta da "/" (em vez de "Plataforma/Publisher" colado) —
  // sem espaço, o Excel não tem onde quebrar a linha e parte a própria
  // palavra "Publisher" ao meio (ex.: "Publishe" / "r").
  colPlataforma: { pt: "Plataforma / Publisher", en: "Platform / Publisher", es: "Plataforma / Publisher", fr: "Plateforme / Éditeur" },
  colEstacao: { pt: "Estação", en: "Station", es: "Estación", fr: "Station" },
  colConcessionario: { pt: "Concessionário", en: "Concessionaire", es: "Concesionario", fr: "Concessionnaire" },
  colTitulo: { pt: "Título", en: "Title", es: "Título", fr: "Titre" },
  colLink: { pt: "Link", en: "Link", es: "Enlace", fr: "Lien" },
  canalInternet: { pt: "Internet", en: "Internet", es: "Internet", fr: "Internet" },
  canalSocialMedia: { pt: "Social Media", en: "Social Media", es: "Social Media", fr: "Social Media" },
  canalGoogle: { pt: "Google", en: "Google", es: "Google", fr: "Google" },
  canalProgramatico: { pt: "Programático", en: "Programmatic", es: "Programática", fr: "Programmatique" },
  colDataInicioCampanha: { pt: "Data de Início da Campanha", en: "Campaign Start Date", es: "Fecha de Inicio de la Campaña", fr: "Date de Début de la Campagne" },
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
  labelCanaisTV: { pt: "Canais", en: "Channels", es: "Canales", fr: "Chaînes" },
  semCanaisEscolhidos: { pt: "— escolhe pelo menos um canal —", en: "— choose at least one channel —", es: "— elige al menos un canal —", fr: "— choisis au moins une chaîne —" },
  avisoEscolherCanalTV: { pt: "Escolhe primeiro pelo menos um canal para este spot de TV.", en: "Choose at least one channel for this TV spot first.", es: "Elige primero al menos un canal para este spot de TV.", fr: "Choisis d'abord au moins une chaîne pour ce spot TV." },
  colCanalTV: { pt: "Canal", en: "Channel", es: "Canal", fr: "Chaîne" },
  temaGridDiminuir: { pt: "Diminuir número de temas de {formato}", en: "Decrease number of themes for {formato}", es: "Disminuir número de temas de {formato}", fr: "Diminuer le nombre de thèmes de {formato}" },
  temaGridAumentar: { pt: "Aumentar número de temas de {formato}", en: "Increase number of themes for {formato}", es: "Aumentar número de temas de {formato}", fr: "Augmenter le nombre de thèmes de {formato}" },
  rodapeSpecsTituloTV: { pt: "Especificações técnicas (iguais em todos os canais)", en: "Technical specifications (same for every channel)", es: "Especificaciones técnicas (iguales en todos los canales)", fr: "Spécifications techniques (identiques sur toutes les chaînes)" },
  avisoTvSaltadosSelecionarTodos: { pt: "{n} spot(s) de TV ficaram por selecionar — falta escolher pelo menos um canal.", en: "{n} TV spot(s) were left unselected — at least one channel is still missing.", es: "{n} spot(s) de TV quedaron sin seleccionar — falta elegir al menos un canal.", fr: "{n} spot(s) TV n'ont pas été sélectionnés — il manque au moins une chaîne." },
  labelEstacoesRadio: { pt: "Estações", en: "Stations", es: "Estaciones", fr: "Stations" },
  semEstacoesEscolhidas: { pt: "— escolhe pelo menos uma estação —", en: "— choose at least one station —", es: "— elige al menos una estación —", fr: "— choisis au moins une station —" },
  avisoEscolherEstacaoRadio: { pt: "Escolhe primeiro pelo menos uma estação para este spot de rádio.", en: "Choose at least one station for this radio spot first.", es: "Elige primero al menos una estación para este spot de radio.", fr: "Choisis d'abord au moins une station pour ce spot radio." },
  colVaga: { pt: "Vaga", en: "Flight", es: "Oleada", fr: "Vague" },
  maisQueUmaVaga: { pt: "Mais do que uma vaga", en: "More than one flight", es: "Más de una oleada", fr: "Plus d'une vague" },
  vagaRotuloOmissao: { pt: "Vaga", en: "Flight", es: "Oleada", fr: "Vague" },
  nomeDaVaga: { pt: "Nome da vaga de {formato}", en: "Flight name for {formato}", es: "Nombre de la oleada de {formato}", fr: "Nom de la vague de {formato}" },
  adicionarVagaBotao: { pt: "+ Nova vaga", en: "+ New flight", es: "+ Nueva oleada", fr: "+ Nouvelle vague" },
  adicionarVaga: { pt: "Acrescentar nova vaga a {formato}", en: "Add a new flight to {formato}", es: "Añadir nueva oleada a {formato}", fr: "Ajouter une nouvelle vague à {formato}" },
  removerVaga: { pt: "Remover a vaga {vaga} de {formato}", en: "Remove the {vaga} flight from {formato}", es: "Eliminar la oleada {vaga} de {formato}", fr: "Supprimer la vague {vaga} de {formato}" },
  avisoDesligarVagas: { pt: "Já há canais escolhidos nalgumas vagas. Desligar \"mais do que uma vaga\" esconde essa informação (sem apagar o resto do pedido). Continuar?", en: "Some flights already have channels chosen. Turning off \"more than one flight\" hides that information (the rest of the request is unaffected). Continue?", es: "Ya hay canales elegidos en algunas oleadas. Desactivar \"más de una oleada\" oculta esa información (sin borrar el resto de la solicitud). ¿Continuar?", fr: "Des chaînes sont déjà choisies dans certaines vagues. Désactiver « plus d'une vague » masque ces informations (sans effacer le reste de la demande). Continuer ?" },
  avisoRemoverVaga: { pt: "Esta vaga já tem canais escolhidos. Remover esconde essa informação (sem apagar o resto do pedido). Continuar?", en: "This flight already has channels chosen. Removing it hides that information (the rest of the request is unaffected). Continue?", es: "Esta oleada ya tiene canales elegidos. Eliminarla oculta esa información (sin borrar el resto de la solicitud). ¿Continuar?", fr: "Cette vague a déjà des chaînes choisies. La supprimer masque ces informations (sans effacer le reste de la demande). Continuer ?" },
  rodapeSpecsTituloRadio: { pt: "Especificações técnicas (iguais em todas as estações)", en: "Technical specifications (same for every station)", es: "Especificaciones técnicas (iguales en todas las estaciones)", fr: "Spécifications techniques (identiques sur toutes les stations)" },
  avisoRadioSaltadosSelecionarTodos: { pt: "{n} spot(s) de rádio ficaram por selecionar — falta escolher pelo menos uma estação.", en: "{n} radio spot(s) were left unselected — at least one station is still missing.", es: "{n} spot(s) de radio quedaron sin seleccionar — falta elegir al menos una estación.", fr: "{n} spot(s) radio n'ont pas été sélectionnés — il manque au moins une station." },
  colCaderno: { pt: "Caderno", en: "Section", es: "Suplemento", fr: "Cahier" },
  colNumFaces: { pt: "Nº de Faces", en: "No. of Faces", es: "Nº de Caras", fr: "Nb de Faces" },
  colNumCartazes: { pt: "Nº de cartazes a entregar", en: "No. of posters to deliver", es: "Nº de carteles a entregar", fr: "Nb d'affiches à livrer" },
  notaEntregaMateriaisGenerica: { pt: "Nota: os materiais devem ser enviados por email para os endereços abaixo:", en: "Note: materials must be emailed to the addresses below:", es: "Nota: los materiales deben enviarse por email a las direcciones siguientes:", fr: "Note : les matériaux doivent être envoyés par email aux adresses ci-dessous :" },
  notaEntregaMateriaisTV: { pt: "Nota: os materiais que não sejam entregues através do Portal GoFastWay (TV) têm de ser enviados por email para os endereços abaixo:", en: "Note: materials not delivered through the GoFastWay Portal (TV) must be emailed to the addresses below:", es: "Nota: los materiales que no se entreguen a través del Portal GoFastWay (TV) deben enviarse por email a las direcciones siguientes:", fr: "Note : les matériaux non livrés via le Portail GoFastWay (TV) doivent être envoyés par email aux adresses ci-dessous :" },
  notaEntregaMateriaisOOH: { pt: "Nota: os Mupis Papel podem ser entregues na morada do concessionário — os que não sigam por essa via, e os restantes materiais, devem ser enviados por email para os endereços abaixo:", en: "Note: Paper Mupis can be delivered to the concessionaire's address — any that aren't, and all other materials, must be emailed to the addresses below:", es: "Nota: los Mupis de Papel pueden entregarse en la dirección del concesionario — los que no sigan por esa vía, y el resto de los materiales, deben enviarse por email a las direcciones siguientes:", fr: "Note : les Mupis Papier peuvent être livrés à l'adresse du concessionnaire — ceux qui ne le sont pas, ainsi que tous les autres matériaux, doivent être envoyés par email aux adresses ci-dessous :" },
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
  // Caminho para um PNG com o desenho técnico/medidas do formato (ex.:
  // assets/especificacoes-ooh/girodmedias-mupi.png) — opcional, só usado
  // em OOH, para gerar uma sheet extra por formato no Excel exportado
  // (ver escreverFolhaImagemFormato). Formatos sem esta coluna preenchida
  // não geram sheet nenhuma.
  "Imagem": "imagemFicheiro",
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
    // cache: "no-store" — sem isto, o browser podia continuar a servir uma
    // cópia antiga deste ficheiro mesmo depois de a base ser atualizada no
    // GitHub, obrigando a um refresh forçado para ver as alterações.
    const resposta = await fetch(FICHEIRO_BASE_FORMATOS, { cache: "no-store" });
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
    GRUPOS_FORMATO_VARIANTES = construirGruposFormatoVariantes(todosFormatos);

    // Traduções das specs (EN/ES/FR): se o ficheiro não existir ou vier
    // inválido, a app continua a funcionar normalmente — só mostra o texto
    // original em português nas outras línguas (ver textoTraduzido).
    try {
      const respostaTraducoes = await fetch(FICHEIRO_TRADUCOES_SPECS, { cache: "no-store" });
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
// Normalmente um fornecedor pertence por inteiro a uma só categoria, mas
// alguns (ex.: a Endless, que tem ecrãs físicos em loja e também formatos
// digitais no site/app) têm suporte em mais que um meio — nesse caso
// aparecem como dois blocos distintos (um por categoria), cada um só com
// os formatos respetivos, em vez de ficarem misturados num bloco só.
function agruparPorPublisher(formatos) {
  const grupos = {};
  for (const formato of formatos) {
    const categoria = categoriaDoFormato(formato);
    const chave = `${formato.fornecedor}\u0000${categoria}`;
    if (!grupos[chave]) {
      grupos[chave] = { nome: formato.fornecedor, categoria, formatos: [] };
    }
    grupos[chave].formatos.push(formato);
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

// Escapa texto vindo da base (nome do formato, veículo, dimensão, peso,
// observações, ...) antes de o colocar dentro de HTML construído por
// template literal (innerHTML/outerHTML) — tanto como texto como dentro
// de um atributo (ex.: aria-label="..."). Sem isto, um valor malicioso na
// base-formatos.xlsx (ex.: um Formato chamado `<img src=x onerror=...>`)
// executava como HTML/JS no browser de quem o visse — ver auditoria de
// segurança. A Excel exportado NUNCA passa por aqui: cell.value do
// ExcelJS não interpreta HTML, por isso escapar ali corromperia o texto
// (apareceria "&amp;" em vez de "&").
function escapeHTML(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

// Só deixa passar um link http(s) — qualquer outro esquema (ex.:
// "javascript:alert(1)", "data:text/html,...") fica bloqueado, devolvendo
// null. formato.link vem da base-formatos.xlsx e é colocado diretamente
// num atributo href; sem esta validação, um valor malicioso na base
// corria JavaScript ao clicar no link "Ver specs" — ver auditoria de
// segurança. O texto que passa é sempre escapado antes de entrar no HTML.
function hrefSeguro(url) {
  if (!url) {
    return null;
  }
  try {
    const analisado = new URL(String(url), window.location.href);
    if (analisado.protocol !== "http:" && analisado.protocol !== "https:") {
      return null;
    }
    return escapeHTML(analisado.href);
  } catch {
    return null;
  }
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

// A que categoria pertence UM formato (usado para agrupar — ver
// agruparPorPublisher — e por categoriaDoPublisher, que aplica isto ao
// primeiro formato de um bloco já agrupado, por isso homogéneo).
function categoriaDoFormato(formato) {
  const grupoMeio = grupoMeioDoFormato(formato);
  if (grupoMeio !== "Digital") {
    return grupoMeio;
  }
  // Os vários tipos de campanha do Google (Display Network, Demand Gen, App
  // Campaigns, Performance Max, Search, Vídeo) ficam cada um no seu próprio
  // bloco de publisher, mas todos pertencem à mesma categoria "Google ou Search".
  if (formato.fornecedor.startsWith("Google")) {
    return "Google ou Search";
  }
  if (formato.canal === "Paid Social") {
    return "Social Media";
  }
  if (formato.canal === "Programático") {
    return "Programático";
  }
  return "Compra Direta";
}
function categoriaDoPublisher(nomePublisher, formatosDoPublisher) {
  return categoriaDoFormato(formatosDoPublisher[0]);
}

// No construtor (opcoes.simplificado), substitui cada grupo de variantes
// técnicas (ver GRUPOS_FORMATO_VARIANTES — hoje Spot TV SD/HD e
// Publicidade Cinema 2D/3D) pela sua linha representante, com o nome
// genérico do grupo (ex.: "Spot TV", "Spot") em vez da variante técnica
// — marcar essa linha seleciona todas as variantes do grupo (ver o
// listener de checkbox-formato). Não se aplica à Biblioteca de Formatos,
// que continua a mostrar cada variante separadamente.
function agruparVariantesSeConstrutor(formatosOrdenados, opcoes) {
  if (!opcoes.simplificado) {
    return formatosOrdenados;
  }
  return formatosOrdenados
    .filter((formato) => {
      const grupo = GRUPOS_FORMATO_VARIANTES.get(formato.id);
      return !grupo || grupo.representante === formato.id;
    })
    .map((formato) => {
      const grupo = GRUPOS_FORMATO_VARIANTES.get(formato.id);
      return grupo ? { ...formato, formato: grupo.nomeGenerico } : formato;
    });
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

  // Quando o mesmo fornecedor dá dois blocos (ex.: Endless em OOH e em
  // Compra Direta), o id de cada bloco tem de ficar distinto — ver
  // criarBlocoPublisher.
  const contagemPorNome = {};
  Object.values(grupos).forEach((grupo) => {
    contagemPorNome[grupo.nome] = (contagemPorNome[grupo.nome] || 0) + 1;
  });

  // Ordem de aparecimento: primeiro por canal, pela ordem fixa definida em
  // ORDEM_CATEGORIAS (Social Media, Compra Direta, Google ou Search,
  // Programático, e depois os meios offline — OOH, TV, Rádio, Cinema,
  // Imprensa); dentro de cada categoria, os publishers ficam por ordem
  // alfabética.
  const chavesGrupos = Object.keys(grupos).sort((a, b) => {
    const posicaoA = ORDEM_CATEGORIAS.indexOf(grupos[a].categoria);
    const posicaoB = ORDEM_CATEGORIAS.indexOf(grupos[b].categoria);
    if (posicaoA !== posicaoB) {
      return posicaoA - posicaoB;
    }
    return grupos[a].nome.localeCompare(grupos[b].nome, "pt");
  });

  contentor.innerHTML = "";

  // Ao mudar de categoria, insere um cabeçalho a identificá-la — e, sempre
  // que se muda de Online para Offline (ou vice-versa), um cabeçalho maior
  // a marcar essa fronteira, para ficar claro visualmente que OOH (e no
  // futuro TV/Rádio/Cinema/Imprensa) não é "Compra Direta" nem nenhuma
  // outra categoria online.
  let categoriaAnterior = null;
  let grupoOnlineOfflineAnterior = null;
  for (const chave of chavesGrupos) {
    const { nome: nomePublisher, categoria } = grupos[chave];
    // Dentro do publisher, as linhas ficam por ordem alfabética — primeiro
    // pelo Veículo (relevante nos publishers com vários, ex.: "Correio da
    // Manhã" ou "TVI"/"CNN Portugal"; nos restantes, onde Veículo = Fornecedor
    // em todas as linhas, este critério não muda nada), depois pelo Formato.
    const formatosDoPublisher = agruparVariantesSeConstrutor(
      [...grupos[chave].formatos].sort((a, b) => {
        const veiculoA = a.veiculo || "";
        const veiculoB = b.veiculo || "";
        if (veiculoA !== veiculoB) {
          return veiculoA.localeCompare(veiculoB, "pt");
        }
        return (a.formato || "").localeCompare(b.formato || "", "pt");
      }),
      opcoes
    );
    if (categoria !== categoriaAnterior) {
      const grupoOnlineOffline = CATEGORIAS_ONLINE.has(categoria) ? "online" : "offline";
      if (grupoOnlineOffline !== grupoOnlineOfflineAnterior) {
        contentor.appendChild(criarCabecalhoOnlineOffline(grupoOnlineOffline));
        grupoOnlineOfflineAnterior = grupoOnlineOffline;
      }
      contentor.appendChild(criarCabecalhoCategoria(categoria));
      categoriaAnterior = categoria;
    }
    const idPrecisaDeSufixo = contagemPorNome[nomePublisher] > 1;
    contentor.appendChild(criarBlocoPublisher(nomePublisher, formatosDoPublisher, opcoes, idPrecisaDeSufixo));
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

function criarBlocoPublisher(nomePublisher, formatosDoPublisher, opcoes, idPrecisaDeSufixo) {
  const bloco = document.createElement("section");
  bloco.className = "grupo-publisher";
  const categoria = categoriaDoPublisher(nomePublisher, formatosDoPublisher);
  // Normalmente o nome do publisher já é único na página — mas um
  // fornecedor com suporte em mais que uma categoria (ver
  // agruparPorPublisher) dá vários blocos com o mesmo nome, por isso o id
  // de cada um precisa da categoria a seguir para não colidir.
  const sufixoId = idPrecisaDeSufixo ? `-${paraIdHtml(categoria)}` : "";
  bloco.id = `${opcoes.prefixoId}-pub-${paraIdHtml(nomePublisher)}${sufixoId}`;
  bloco.dataset.publisher = nomePublisher;
  bloco.dataset.categoria = categoria;

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
  // Cada BLOCO (já agrupado por categoria — ver agruparPorPublisher) é
  // sempre homogéneo num único meio, mesmo que o mesmo fornecedor dê
  // origem a mais que um bloco (ex.: Endless, em OOH e em Compra Direta) —
  // daí bastar olhar para o primeiro formato do bloco para decidir.
  //
  // O Veículo só ganha coluna própria quando, dentro deste publisher, há
  // mais que um veículo distinto do próprio nome do publisher — ex.:
  // "Correio da Manhã" tem o jornal diário, o suplemento Mais Sport e 3
  // revistas semanais, todos com formatos de nome igual ("Página",
  // "Rodapé", ...) mas dimensões diferentes; sem a coluna não daria para
  // os distinguir. Para a maioria dos publishers (onde Veículo = Fornecedor)
  // a coluna nem aparece, para não ficar redundante.
  // A Duração do Spot só faz sentido para formatos de "spot" (ver
  // formatoTemDuracao) — já não tem coluna própria: vive dentro da grelha
  // de Temas de TV/Rádio, um seletor por canal/estação escolhido (ver
  // criarGridTemasTv/criarSeletorDuracaoTv), porque cada canal pode ter a
  // sua própria grelha de durações (ex.: TVI a 30"+20", SIC só a 30"+10").
  // O Copies também só existe para meios digitais (é uma noção de
  // criatividades/versões de anúncio online) — os meios offline (OOH, TV,
  // Rádio, Cinema, Imprensa) não têm essa coluna na Biblioteca de Formatos.
  //
  // A Entrega (AF vs. morada) só faz sentido para o Mupi em papel de
  // alguns concessionários de OOH (ver formatoEhMupiPapel), e só no
  // construtor — liga-se por publisher (basta UM formato do bloco
  // precisar dela), mas cada LINHA decide por si própria se mostra o
  // seletor ou só um traço (ver criarLinhaFormato) — nunca basta olhar só
  // para o primeiro formato do bloco, porque um publisher pode misturar
  // formatos com e sem esse conceito.
  //
  // Os Temas aplicam-se a qualquer formato, em todos os meios, no
  // construtor — ver MEIOS_COM_TEMA.
  //
  // A Entrega de TV (sempre "GoFastWay") é fixa e não depende de nenhuma
  // escolha do utilizador — por isso aparece também na Biblioteca de
  // Formatos (não só no construtor, ao contrário da Entrega dos Mupis).
  const grupoMeioDoBloco = grupoMeioDoFormato(formatosDoPublisher[0]);
  const opcoesComMeio = {
    ...opcoes,
    // Tirada de vez, tanto do construtor como da Biblioteca de Formatos
    // — pedido explícito da Cláudia.
    comGrupoDigital2020: false,
    comCopies: grupoMeioDoBloco === "Digital",
    comVeiculo: formatosDoPublisher.some((f) => f.veiculo && f.veiculo !== nomePublisher),
    comEntregaMupi: opcoes.simplificado && formatosDoPublisher.some(formatoEhMupiPapel),
    comTemas: opcoes.simplificado && MEIOS_COM_TEMA.has(grupoMeioDoBloco),
    comEntregaTV: grupoMeioDoBloco === "TV",
    // Canais (TV) / Estações (Rádio) só existem no construtor (tal como
    // Duração/Entrega) — na Biblioteca de Formatos não há pedido nenhum a
    // que aplicar canais/estações.
    comCanaisTv: opcoes.simplificado && MEIOS_COM_CANAL.has(grupoMeioDoBloco),
    rotuloCanais: t(chaveRotuloCanal(grupoMeioDoBloco)),
    // Secundagem (TV/Rádio) ganhou a sua própria coluna, separada de
    // Temas — pedido explícito da Cláudia, para ficar claro que se
    // escolhe primeiro o canal, depois a secundagem desse canal, e só
    // depois o número de temas por secundagem (ver criarGridSecundagemTv/
    // criarGridTemasTv). Mesma condição que comCanaisTv: só existe onde
    // há canal para associar a secundagem.
    comSecundagemTv: opcoes.simplificado && MEIOS_COM_CANAL.has(grupoMeioDoBloco),
    // Nº de Faces / Nº de cartazes a entregar só existem no OOH, e só no
    // construtor (são uma característica da compra em concreto, não da
    // base de formatos).
    comNumOOH: opcoes.simplificado && grupoMeioDoBloco === "OOH",
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
  const colunaEntregaMupi = opcoes.comEntregaMupi ? `<th scope="col">${t("colEntrega")}</th>` : "";
  const colunaTemas = opcoes.comTemas ? `<th scope="col">${t("colTemasBuilder")}</th>` : "";
  const colunaCopies = opcoes.comCopies ? `<th scope="col">${t("colCopies")}</th>` : "";
  const colunaEntregaTV = opcoes.comEntregaTV ? `<th scope="col">${t("colEntrega")}</th>` : "";
  const colunaCanaisTv = opcoes.comCanaisTv ? `<th scope="col">${opcoes.rotuloCanais || t("labelCanaisTV")}</th>` : "";
  const colunaSecundagemTv = opcoes.comSecundagemTv ? `<th scope="col">${t("colSecundagem")}</th>` : "";
  const colunaNumFacesOoh = opcoes.comNumOOH ? `<th scope="col">${t("colNumFaces")}</th>` : "";
  const colunaNumCartazesOoh = opcoes.comNumOOH ? `<th scope="col">${t("colNumCartazes")}</th>` : "";

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
        ${colunaEntregaMupi}
        ${colunaCanaisTv}
        ${colunaSecundagemTv}
        ${colunaNumFacesOoh}
        ${colunaNumCartazesOoh}
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
// uma pode estar marcada ao mesmo tempo, porque o mesmo canal/estação pode
// pedir mais que uma duração (cada uma um spot distinto). Quando "Outro"
// está marcado, aparece a seguir uma caixa de texto editável (ver o
// listener de "checkbox-duracao"/"checkbox-duracao-outro"/
// "input-duracao-outro" mais abaixo). Cada canal/estação tem a sua própria
// grelha de durações — por isso este seletor vive dentro da grelha de
// temas de TV (ver criarGridTemasTv), um por linha de canal, em vez de
// numa coluna "Duração" só por formato: a TVI pode ir a 30"+20" e a SIC só
// a 30"+10" no mesmo pedido, por exemplo (pedido explícito da Cláudia). O
// estado mostrado vem sempre do objetivo ativo no momento.
function criarSeletorDuracaoTv(formato, canal) {
  const estado = estadoDuracaoOuOmissao(formato, objetivoAtivo, canal);
  const opcoesPadrao = DURACOES_PADRAO
    .map((valor) => `
      <label class="opcao-duracao">
        <input type="checkbox" class="checkbox-duracao" data-id="${formato.id}" data-canal="${canal}" value="${valor}" ${estado.padrao.has(valor) ? "checked" : ""}>
        ${valor}″
      </label>
    `)
    .join("");
  return `
    <div class="grupo-duracao" data-id="${formato.id}" data-canal="${canal}">
      ${opcoesPadrao}
      <label class="opcao-duracao opcao-duracao-outro">
        <input type="checkbox" class="checkbox-duracao-outro" data-id="${formato.id}" data-canal="${canal}" ${estado.outroAtivo ? "checked" : ""}>
        ${t("duracaoOutro")}
      </label>
      <input type="text" class="input-duracao-outro" data-id="${formato.id}" data-canal="${canal}"
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
      <button type="button" class="botao-tema-mais" data-id="${formato.id}" aria-label="${formatar("temasAumentar", { formato: nomeFormatoTexto })}">+</button>
    </div>
  `;
}

// Checkboxes com os canais de TV (RTP/SIC/TVI/STAR/NOS/Media Livre) ou as
// estações de Rádio, consoante o meio deste formato (ver
// canaisDisponiveisDoFormato) — mais que um pode estar marcado (o mesmo
// spot costuma ir para vários canais/estações). Marcar/desmarcar aqui
// também recalcula as grelhas de Secundagem e Temas (ver
// atualizarGridsTv), porque cada canal/estação ganha a sua própria
// linha em cada uma.
function criarCelulaCanaisTv(formato) {
  const canais = canaisDoFormato(formato, objetivoAtivo);
  const opcoes = canaisDisponiveisDoFormato(formato)
    .map((canal) => `
      <label class="opcao-canal-tv">
        <input type="checkbox" class="checkbox-canal-tv" data-id="${formato.id}" value="${canal}" ${canais.has(canal) ? "checked" : ""}>
        ${canal}
      </label>
    `)
    .join("");
  return `<div class="grupo-canais-tv" data-id="${formato.id}">${opcoes}</div>`;
}

// Inputs numéricos livres (Nº de Faces / Nº de cartazes a entregar) — só
// para OOH, ver numFacesOohPorObjetivo/numCartazesOohPorObjetivo. Ficam em
// branco por omissão, sem nenhuma validação de obrigatoriedade (ao
// contrário de Entrega do Mupi/Canal de TV, estes dois não bloqueiam a
// seleção do formato).
function criarCelulaNumOOH(formato, valorAtual, classeInput) {
  return `<input type="number" min="0" inputmode="numeric" class="${classeInput}" data-id="${formato.id}" value="${valorAtual}">`;
}

// Só as células de temas (contadores +/-) de UM canal — a parte da grelha
// que depende das durações ativas nesse canal. Separada de
// criarGridTemasTv para poder ser recriada sozinha (ver
// atualizarCelulasTemasCanal) sem mexer no seletor de duração desse
// canal: se a atualização ao mudar a duração reconstruísse a grelha
// inteira, o campo de texto "Outro" — que vive dentro dela — perdia o
// foco a cada letra escrita, tornando impossível escrever lá mais que um
// caráter de cada vez.
function criarCelulasTemasCanal(formato, canal, nomeFormatoTexto) {
  const temDuracao = formatoTemDuracao(formato);
  const duracoes = temDuracao ? duracoesEfetivasDoFormato(formato, objetivoAtivo, canal) : [""];
  return duracoes
    .map((duracao) => {
      const contagem = contagemTemaTv(formato, objetivoAtivo, canal, duracao);
      const rotuloDuracao = duracao ? `<span class="celula-tema-tv-duracao">${duracao}″</span>` : "";
      const nomeContexto = duracao ? `${nomeFormatoTexto} — ${canal} — ${duracao}″` : `${nomeFormatoTexto} — ${canal}`;
      return `
        <span class="celula-tema-tv" data-id="${formato.id}" data-canal="${canal}" data-duracao="${duracao}">
          ${rotuloDuracao}
          <button type="button" class="botao-temagrid-menos" data-id="${formato.id}" data-canal="${canal}" data-duracao="${duracao}" aria-label="${formatar("temaGridDiminuir", { formato: nomeContexto })}" ${contagem <= 1 ? "disabled" : ""}>−</button>
          <span class="valor-temagrid" aria-live="polite">${contagem}</span>
          <button type="button" class="botao-temagrid-mais" data-id="${formato.id}" data-canal="${canal}" data-duracao="${duracao}" aria-label="${formatar("temaGridAumentar", { formato: nomeContexto })}">+</button>
        </span>
      `;
    })
    .join("");
}

// Grelha da coluna Secundagem: uma linha por canal escolhido, com o nome
// do canal e o seu próprio seletor de duração (ver criarSeletorDuracaoTv
// — cada canal pode ter uma grelha de durações diferente, ex.: TVI a
// 30″+20″, SIC só a 10″). Fica vazia (com uma nota) enquanto não houver
// nenhum canal escolhido, e também para formatos sem duração (ex.: Ecrã
// Fracionado) — esses não têm nada para mostrar aqui, só na coluna Temas.
function criarGridSecundagemTv(formato) {
  const canais = [...canaisDoFormato(formato, objetivoAtivo)];
  if (canais.length === 0) {
    return `<div class="grid-secundagem-tv grid-secundagem-tv--vazia" data-id="${formato.id}">${t(chaveSemCanalEscolhido(grupoMeioDoFormato(formato)))}</div>`;
  }
  if (!formatoTemDuracao(formato)) {
    return `<div class="grid-secundagem-tv" data-id="${formato.id}"></div>`;
  }
  const linhas = canais
    .map((canal) => `
      <div class="linha-secundagem-tv">
        <span class="linha-temas-tv-canal">${canal}</span>
        ${criarSeletorDuracaoTv(formato, canal)}
      </div>
    `)
    .join("");
  return `<div class="grid-secundagem-tv" data-id="${formato.id}">${linhas}</div>`;
}

// Grelha de temas de TV: uma linha por canal escolhido, com um contador
// +/- por cada secundagem ativa NESSE canal (ver criarCelulasTemasCanal;
// ou um único contador, sem rótulo de secundagem, para formatos sem
// duração). O seletor de duração vive na coluna Secundagem, ao lado (ver
// criarGridSecundagemTv) — não aqui, para o campo "Outro" nunca ser
// reconstruído por mudanças na coluna Temas. Fica vazia (com uma nota)
// enquanto não houver nenhum canal escolhido — é por isso que marcar/
// desmarcar um canal tem de voltar a chamar esta função (ver
// atualizarGridsTv); mudar a duração de um canal já escolhido só recria
// as células desse canal (ver atualizarCelulasTemasCanal), não a grelha
// inteira.
function criarGridTemasTv(formato, nomeFormatoTexto) {
  const canais = [...canaisDoFormato(formato, objetivoAtivo)];
  if (canais.length === 0) {
    return `<div class="grid-temas-tv grid-temas-tv--vazia" data-id="${formato.id}">${t(chaveSemCanalEscolhido(grupoMeioDoFormato(formato)))}</div>`;
  }
  const linhas = canais
    .map((canal) => `
      <div class="linha-temas-tv">
        <span class="linha-temas-tv-canal">${canal}</span>
        <div class="celulas-temas-tv" data-id="${formato.id}" data-canal="${canal}">${criarCelulasTemasCanal(formato, canal, nomeFormatoTexto)}</div>
      </div>
    `)
    .join("");
  return `<div class="grid-temas-tv" data-id="${formato.id}">${linhas}</div>`;
}

// Atualização cirúrgica depois de mudar a duração de UM canal: troca só
// as células de temas desse canal — nunca o seletor de duração (que nem
// vive na mesma coluna) nem as restantes linhas — ver a nota em
// criarCelulasTemasCanal sobre o porquê (preservar o foco do campo
// "Outro" enquanto se escreve nele).
function atualizarCelulasTemasCanal(formato, canal) {
  const nomeFormatoTexto = escapeHTML(textoTraduzido(formato, "formato") ?? "");
  listaFormatos.querySelectorAll(`.celulas-temas-tv[data-id="${formato.id}"][data-canal="${canal}"]`).forEach((div) => {
    div.innerHTML = criarCelulasTemasCanal(formato, canal, nomeFormatoTexto);
  });
}

// Reconstrói as duas grelhas (Secundagem e Temas) de um formato de TV —
// chamado quando o conjunto de canais muda (marcar/desmarcar um canal),
// já que isso acrescenta ou remove uma linha inteira em cada uma.
// Envolve a célula de Canal/Estação (criarCelulaCanaisTv) com o "pisco" de
// várias vagas e, quando ativo, os blocos repetíveis por vaga —
// ver vagasTvPorObjetivo. O nome de cada vaga só é editável aqui
// (coluna Canal); as colunas Secundagem/Temas ao lado só repetem o nome
// como rótulo (ver rotuloVagaTv/criarColunaSecundagemTv/
// criarColunaTemasTv), para não haver 3 cópias do mesmo campo de texto a
// mexer ao mesmo tempo.
function criarColunaCanaisTv(formato, nomeFormatoTexto) {
  const vagas = vagasDoFormato(formato, objetivoAtivo);
  if (vagas.length === 0) {
    return `
      <div class="coluna-canais-tv-raiz" data-id="${formato.id}">
        <label class="opcao-mais-vagas-tv">
          <input type="checkbox" class="checkbox-mais-vagas-tv" data-id="${formato.id}">
          ${t("maisQueUmaVaga")}
        </label>
        ${criarCelulaCanaisTv(formato)}
      </div>
    `;
  }
  const blocos = vagas
    .map((vaga) => {
      const formatoVaga = { ...formato, id: chaveFormatoVaga(formato.id, vaga.id) };
      return `
        <div class="bloco-vaga-tv" data-id="${formato.id}" data-id-vaga="${vaga.id}">
          <div class="cabecalho-vaga-tv">
            <input type="text" class="input-nome-vaga-tv" data-id="${formato.id}" data-id-vaga="${vaga.id}"
              value="${escapeHTML(vaga.nome)}" aria-label="${formatar("nomeDaVaga", { formato: nomeFormatoTexto })}">
            <button type="button" class="botao-remover-vaga-tv" data-id="${formato.id}" data-id-vaga="${vaga.id}"
              aria-label="${formatar("removerVaga", { vaga: escapeHTML(vaga.nome), formato: nomeFormatoTexto })}">×</button>
          </div>
          ${criarCelulaCanaisTv(formatoVaga)}
        </div>
      `;
    })
    .join("");
  return `
    <div class="coluna-canais-tv-raiz coluna-canais-tv-raiz--vagas" data-id="${formato.id}">
      <label class="opcao-mais-vagas-tv">
        <input type="checkbox" class="checkbox-mais-vagas-tv" data-id="${formato.id}" checked>
        ${t("maisQueUmaVaga")}
      </label>
      ${blocos}
      <button type="button" class="botao-adicionar-vaga-tv" data-id="${formato.id}" aria-label="${formatar("adicionarVaga", { formato: nomeFormatoTexto })}">${t("adicionarVagaBotao")}</button>
    </div>
  `;
}

function rotuloVagaTv(vaga) {
  return `<div class="rotulo-vaga-tv">${escapeHTML(vaga.nome)}</div>`;
}

function criarColunaSecundagemTv(formato) {
  const vagas = vagasDoFormato(formato, objetivoAtivo);
  if (vagas.length === 0) {
    return `<div class="coluna-secundagem-tv-raiz" data-id="${formato.id}">${criarGridSecundagemTv(formato)}</div>`;
  }
  const blocos = vagas
    .map((vaga) => {
      const formatoVaga = { ...formato, id: chaveFormatoVaga(formato.id, vaga.id) };
      return `<div class="bloco-vaga-tv">${rotuloVagaTv(vaga)}${criarGridSecundagemTv(formatoVaga)}</div>`;
    })
    .join("");
  return `<div class="coluna-secundagem-tv-raiz coluna-secundagem-tv-raiz--vagas" data-id="${formato.id}">${blocos}</div>`;
}

function criarColunaTemasTv(formato, nomeFormatoTexto) {
  const vagas = vagasDoFormato(formato, objetivoAtivo);
  if (vagas.length === 0) {
    return `<div class="coluna-temas-tv-raiz" data-id="${formato.id}">${criarGridTemasTv(formato, nomeFormatoTexto)}</div>`;
  }
  const blocos = vagas
    .map((vaga) => {
      const formatoVaga = { ...formato, id: chaveFormatoVaga(formato.id, vaga.id) };
      return `<div class="bloco-vaga-tv">${rotuloVagaTv(vaga)}${criarGridTemasTv(formatoVaga, nomeFormatoTexto)}</div>`;
    })
    .join("");
  return `<div class="coluna-temas-tv-raiz coluna-temas-tv-raiz--vagas" data-id="${formato.id}">${blocos}</div>`;
}

// Reconstrói as 3 colunas (Canal/Secundagem/Temas) por inteiro — usada
// sempre que a PRÓPRIA LISTA de vagas muda (ligar/desligar o "pisco",
// adicionar/remover uma vaga), ao contrário de atualizarGridsTv (só
// Secundagem/Temas, sem mexer na lista) que já chega para uma simples
// mudança de canal/duração dentro de uma vaga já existente.
function atualizarColunasVagaTv(formato) {
  const nomeFormatoTexto = escapeHTML(textoTraduzido(formato, "formato") ?? "");
  listaFormatos.querySelectorAll(`.coluna-canais-tv-raiz[data-id="${formato.id}"]`).forEach((raiz) => {
    raiz.outerHTML = criarColunaCanaisTv(formato, nomeFormatoTexto);
  });
  listaFormatos.querySelectorAll(`.coluna-secundagem-tv-raiz[data-id="${formato.id}"]`).forEach((raiz) => {
    raiz.outerHTML = criarColunaSecundagemTv(formato);
  });
  listaFormatos.querySelectorAll(`.coluna-temas-tv-raiz[data-id="${formato.id}"]`).forEach((raiz) => {
    raiz.outerHTML = criarColunaTemasTv(formato, nomeFormatoTexto);
  });
}

function atualizarGridsTv(formato) {
  const nomeFormatoTexto = escapeHTML(textoTraduzido(formato, "formato") ?? "");
  listaFormatos.querySelectorAll(`.grid-secundagem-tv[data-id="${formato.id}"]`).forEach((grid) => {
    grid.outerHTML = criarGridSecundagemTv(formato);
  });
  listaFormatos.querySelectorAll(`.grid-temas-tv[data-id="${formato.id}"]`).forEach((grid) => {
    grid.outerHTML = criarGridTemasTv(formato, nomeFormatoTexto);
  });
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
  const nomeFormatoTexto = escapeHTML(textoTraduzido(formato, "formato") ?? "");
  // Marca a checkbox logo na criação se este formato já estiver selecionado
  // (importante para a lista continuar correta depois de trocar de idioma
  // ou de filtro, que voltam a desenhar as linhas do zero).
  // Um Mupi de papel sem entrega ainda escolhida ganha uma pista visual
  // discreta (cursor "help" + opacidade reduzida) em vez de texto extra —
  // sem isto, a única forma de descobrir a regra era tentar marcar e ver
  // o toast (ver auditoria de acessibilidade, ronda 2).
  const entregaPendente = formatoEhMupiPapel(formato) && !entregaEfetivaDoFormato(formato, objetivoAtivo);
  // Tal como o Mupi de papel só pode ser marcado depois de escolhida a
  // entrega, um formato de TV só pode ser marcado depois de escolhido pelo
  // menos um canal — sem isso não há para onde dizer que o spot vai (ver o
  // guard equivalente no listener de "checkbox-formato").
  const canalPendente = formatoTemCanal(formato) && !formatoTemAlgumCanalEscolhido(formato, objetivoAtivo);
  const pendente = entregaPendente || canalPendente;
  const colunaCheckbox = opcoes.comCheckbox
    ? `<td class="coluna-checkbox"><input type="checkbox" class="checkbox-formato${pendente ? " checkbox-formato--pendente" : ""}" data-id="${formato.id}" aria-labelledby="${idNomeFormato}" ${selecoesPorObjetivo[objetivoAtivo].has(formato.id) ? "checked" : ""}></td>`
    : "";
  const colunaGrupoDigital2020 = opcoes.comGrupoDigital2020
    ? `<td><span class="etiqueta-dg2020">${escapeHTML(formato.grupoDigital2020) || "—"}</span></td>`
    : "";
  const colunaVeiculo = opcoes.comVeiculo ? `<td>${escapeHTML(formato.veiculo) || "—"}</td>` : "";
  // A Entrega liga-se por publisher (comEntregaMupi), mas cada linha
  // decide por si própria se mostra o seletor — um bloco de OOH pode
  // misturar Mupi papel com outros formatos sem essa noção.
  const colunaEntregaMupi = opcoes.comEntregaMupi
    ? `<td>${formatoEhMupiPapel(formato) ? criarCelulaEntregaMupi(formato, idNomeFormato) : "—"}</td>`
    : "";
  // Os Temas aplicam-se a qualquer formato do meio (não há exceção por
  // linha, ao contrário da Entrega) — em TV/Rádio usam a grelha por
  // canal×secundagem (ver criarGridTemasTv) em vez do contador simples
  // dos restantes meios; o seletor de duração de cada canal fica na
  // coluna Secundagem, ao lado (ver colunaSecundagemTv).
  const colunaTemas = opcoes.comTemas
    ? `<td>${formatoTemCanal(formato) ? criarColunaTemasTv(formato, nomeFormatoTexto) : criarCelulaTemas(formato, nomeFormatoTexto)}</td>`
    : "";
  const colunaCanaisTv = opcoes.comCanaisTv ? `<td>${criarColunaCanaisTv(formato, nomeFormatoTexto)}</td>` : "";
  // Todo o bloco é TV/Rádio quando esta coluna existe (mesma condição de
  // comCanaisTv, ver criarBlocoPublisher) — por isso não precisa de
  // verificar formatoTemCanal linha a linha, ao contrário da Duração/
  // Entrega, que podiam misturar-se com formatos sem esse conceito.
  const colunaSecundagemTv = opcoes.comSecundagemTv ? `<td>${criarColunaSecundagemTv(formato)}</td>` : "";
  const colunaNumFacesOoh = opcoes.comNumOOH
    ? `<td>${criarCelulaNumOOH(formato, valorNumFacesOoh(formato, objetivoAtivo), "input-num-faces-ooh")}</td>`
    : "";
  const colunaNumCartazesOoh = opcoes.comNumOOH
    ? `<td>${criarCelulaNumOOH(formato, valorNumCartazesOoh(formato, objetivoAtivo), "input-num-cartazes-ooh")}</td>`
    : "";

  if (opcoes.simplificado) {
    linha.innerHTML = `
      ${colunaCheckbox}
      <td id="${idNomeFormato}">${nomeFormatoTexto}</td>
      ${colunaVeiculo}
      ${colunaGrupoDigital2020}
      ${colunaEntregaMupi}
      ${colunaCanaisTv}
      ${colunaSecundagemTv}
      ${colunaNumFacesOoh}
      ${colunaNumCartazesOoh}
      ${colunaTemas}
    `;
    return linha;
  }

  // aria-label com o nome do formato: sem isto, uma pessoa a navegar pela
  // lista de links do leitor de ecrã só ouviria "Ver specs" repetido,
  // dezenas de vezes, sem saber a que formato cada link pertence.
  const linkSeguro = hrefSeguro(formato.link);
  const colunaLink = opcoes.comLink
    ? `<td>${linkSeguro ? `<a href="${linkSeguro}" target="_blank" rel="noopener" aria-label="${formatar("verSpecsLinkComNome", { formato: nomeFormatoTexto })}">${t("verSpecsLink")}</a>` : "—"}</td>`
    : "";
  // O Copies só existe para meios digitais (ver comCopies em
  // criarBlocoPublisher) — um publisher offline não desenha esta coluna.
  const colunaCopies = opcoes.comCopies ? `<td>${escapeHTML(textoTraduzido(formato, "copies")) || "—"}</td>` : "";
  // A Entrega de TV é sempre "GoFastWay" — não vem da base, é um valor
  // fixo (ver entregaTV em COLUNAS_EXCEL_DISPONIVEIS, a mesma ideia usada
  // aqui na Biblioteca de Formatos), com o link do Portal GoFastWay
  // (ver LINK_GOFASTWAY) por baixo.
  const colunaEntregaTV = opcoes.comEntregaTV
    ? `<td>GoFastWay<br><a href="${LINK_GOFASTWAY}" target="_blank" rel="noopener">${TEXTO_LINK_GOFASTWAY}</a></td>`
    : "";
  linha.innerHTML = `
    ${colunaCheckbox}
    <td id="${idNomeFormato}">${nomeFormatoTexto}</td>
    ${colunaVeiculo}
    ${colunaGrupoDigital2020}
    <td>${escapeHTML(textoTraduzido(formato, "dimensao")) || t("naoEspecificado")}</td>
    <td>${escapeHTML(textoTraduzido(formato, "aspectRatio")) || "—"}</td>
    <td>${escapeHTML(textoTraduzido(formato, "peso")) || t("naoEspecificado")}</td>
    <td>${escapeHTML(textoTraduzido(formato, "tipoFicheiro")) || t("naoEspecificado")}</td>
    ${colunaCopies}
    ${colunaEntregaTV}
    <td class="coluna-observacoes">${escapeHTML(textoTraduzido(formato, "observacoes")) || "—"}</td>
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

// TV, Rádio e Cinema não têm o botão recolhível ▸ — nenhum formato destes
// meios fica associado a um canal, estação ou exibidor em concreto (ver
// README), por isso há sempre um único publisher lá dentro ("TV"/"Rádio"/
// "VS2.0"), e nesse caso o próprio nome da categoria já é o link direto
// para essa secção (ver mais abaixo). Se um dia passar a haver mais que um
// publisher nestas categorias, cai-se de volta na lista de links sempre
// visível (sem dropdown, mas sem um único link direto).
const CATEGORIAS_SEM_DROPDOWN_INDICE = new Set(["TV", "Rádio", "Cinema"]);

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
  const botaoTemaGrid = evento.target.closest(".botao-temagrid-mais, .botao-temagrid-menos");
  if (botaoTemaGrid) {
    mudarContagemTemaGrid(botaoTemaGrid);
    return;
  }
  const botaoAdicionarVaga = evento.target.closest(".botao-adicionar-vaga-tv");
  if (botaoAdicionarVaga) {
    adicionarVagaTv(botaoAdicionarVaga);
    return;
  }
  const botaoRemoverVaga = evento.target.closest(".botao-remover-vaga-tv");
  if (botaoRemoverVaga) {
    removerVagaTv(botaoRemoverVaga);
    return;
  }
  if (evento.target.closest("input, a, label, select, button")) {
    return;
  }
  const celula = evento.target.closest("td");
  if (!celula || celula.classList.contains("coluna-checkbox") || celula.querySelector(".grupo-duracao") || celula.querySelector(".grupo-entrega-mupi") || celula.querySelector(".grupo-temas") || celula.querySelector(".grupo-canais-tv") || celula.querySelector(".grid-secundagem-tv") || celula.querySelector(".grid-temas-tv") || celula.querySelector(".input-num-faces-ooh") || celula.querySelector(".input-num-cartazes-ooh")) {
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

// Aumenta/diminui o número de temas deste formato (mínimo 1, sem máximo —
// pedido explícito da Cláudia) — não mexe na seleção, só na quantidade de
// linhas que este formato vai gerar no Excel se/quando for selecionado
// (ver escreverSeccaoObjetivo).
function mudarContagemTemas(botao) {
  const id = Number(botao.dataset.id);
  const formato = todosFormatos.find((f) => f.id === id);
  const atual = contagemTemasDoFormato(formato, objetivoAtivo);
  const delta = botao.classList.contains("botao-tema-mais") ? 1 : -1;
  const novo = Math.max(1, atual + delta);
  if (novo === atual) {
    return;
  }
  idsDoGrupoFormato(id).forEach((idGrupo) => temasPorObjetivo[objetivoAtivo].set(idGrupo, novo));
  const grupo = botao.closest(".grupo-temas");
  grupo.querySelector(".valor-temas").textContent = novo;
  grupo.querySelector(".botao-tema-menos").disabled = novo <= 1;
  atualizarResumoSelecao();
}

// Equivalente a mudarContagemTemas, mas para uma única célula canal×
// secundagem da grelha de TV — só mexe nessa célula, as restantes do
// mesmo formato ficam como estavam.
function mudarContagemTemaGrid(botao) {
  const canal = botao.dataset.canal;
  const duracao = botao.dataset.duracao;
  const formato = resolverFormatoDoId(botao.dataset.id);
  if (!formato) {
    return;
  }
  const atual = contagemTemaTv(formato, objetivoAtivo, canal, duracao);
  const delta = botao.classList.contains("botao-temagrid-mais") ? 1 : -1;
  const novo = Math.max(1, atual + delta);
  if (novo === atual) {
    return;
  }
  definirContagemTemaTv(formato, objetivoAtivo, canal, duracao, novo);
  const celula = botao.closest(".celula-tema-tv");
  celula.querySelector(".valor-temagrid").textContent = novo;
  celula.querySelector(".botao-temagrid-menos").disabled = novo <= 1;
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
      // Tal como o Mupi de papel, um formato de TV/Rádio sem nenhum canal/
      // estação escolhido não pode ficar marcado — não há para onde
      // exportar o pedido de spot.
      if (formato && formatoTemCanal(formato) && !formatoTemAlgumCanalEscolhido(formato, objetivoAtivo)) {
        alvo.checked = false;
        mostrarNotificacao(t(chaveAvisoEscolherCanal(grupoMeioDoFormato(formato))));
        return;
      }
      idsDoGrupoFormato(id).forEach((idGrupo) => selecoesPorObjetivo[objetivoAtivo].add(idGrupo));
    } else {
      idsDoGrupoFormato(id).forEach((idGrupo) => selecoesPorObjetivo[objetivoAtivo].delete(idGrupo));
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
    return;
  }

  if (alvo.classList.contains("checkbox-canal-tv")) {
    mudarCanalTv(alvo);
    return;
  }

  if (alvo.classList.contains("checkbox-mais-vagas-tv")) {
    alternarMaisVagasTv(alvo);
  }
});

// Guarda a escolha de canais deste formato de TV e, assim que há pelo
// menos um, tira a pista visual de "condicionado" (tal como
// mudarEntregaMupi) — mas, ao contrário do Mupi, NÃO marca o formato
// sozinho: escolher canais é um pré-requisito, não uma confirmação (o
// utilizador ainda tem de marcar a checkbox à parte).
function mudarCanalTv(checkbox) {
  const formato = resolverFormatoDoId(checkbox.dataset.id);
  if (!formato) {
    return;
  }
  const canais = garantirCanaisFormato(formato, objetivoAtivo);
  if (checkbox.checked) {
    canais.add(checkbox.value);
  } else {
    canais.delete(checkbox.value);
  }
  // A pista visual de "condicionado" olha ao formato REAL (nunca ao bloco
  // de vaga), porque tem de refletir se há algum canal escolhido em
  // qualquer vaga — ver formatoTemAlgumCanalEscolhido.
  const idReal = idFormatoRealDoId(checkbox.dataset.id);
  const checkboxFormato = listaFormatos.querySelector(`.checkbox-formato[data-id="${idReal}"]`);
  if (checkboxFormato) {
    const formatoReal = resolverFormatoDoId(idReal);
    checkboxFormato.classList.toggle("checkbox-formato--pendente", formatoReal && !formatoTemAlgumCanalEscolhido(formatoReal, objetivoAtivo));
  }
  atualizarGridsTv(formato);
  atualizarResumoSelecao();
}

// Liga/desliga o modo de várias vagas para este formato de TV/Rádio —
// ligar cria já as duas primeiras vagas (o próprio nome "mais que uma"
// implica pelo menos 2); desligar pede confirmação se já havia algum canal
// escolhido nalguma vaga, para não apagar dados sem avisar primeiro
// (ver confirmarAcao).
async function alternarMaisVagasTv(checkbox) {
  const formato = resolverFormatoDoId(checkbox.dataset.id);
  if (!formato) {
    return;
  }
  if (checkbox.checked) {
    criarVaga(formato, objetivoAtivo);
    criarVaga(formato, objetivoAtivo);
    atualizarColunasVagaTv(formato);
    atualizarResumoSelecao();
    return;
  }
  if (formatoTemAlgumCanalEscolhido(formato, objetivoAtivo) && !(await confirmarAcao(t("avisoDesligarVagas")))) {
    checkbox.checked = true;
    return;
  }
  vagasTvPorObjetivo[objetivoAtivo].set(formato.id, []);
  atualizarColunasVagaTv(formato);
  atualizarResumoSelecao();
}

// Acrescenta mais uma vaga a este formato (já tem de estar no modo de
// várias vagas — o botão só existe nesse estado, ver
// criarColunaCanaisTv).
function adicionarVagaTv(botao) {
  const formato = resolverFormatoDoId(botao.dataset.id);
  if (!formato) {
    return;
  }
  criarVaga(formato, objetivoAtivo);
  atualizarColunasVagaTv(formato);
  atualizarResumoSelecao();
}

// Remove uma vaga — pede confirmação se já tinha algum canal escolhido
// (ver confirmarAcao). Sem nenhuma vaga a sobrar, o formato volta
// sozinho ao bloco único de sempre (vagasDoFormato passa a devolver
// uma lista vazia, ver criarColunaCanaisTv).
async function removerVagaTv(botao) {
  const formato = resolverFormatoDoId(botao.dataset.id);
  if (!formato) {
    return;
  }
  const idVaga = botao.dataset.idVaga;
  const idComposto = chaveFormatoVaga(formato.id, idVaga);
  const temCanalEscolhido = (canaisTvPorObjetivo[objetivoAtivo].get(idComposto) || new Set()).size > 0;
  if (temCanalEscolhido && !(await confirmarAcao(t("avisoRemoverVaga")))) {
    return;
  }
  removerVaga(formato, objetivoAtivo, idVaga);
  atualizarColunasVagaTv(formato);
  atualizarResumoSelecao();
}

// Só guarda o nome enquanto se escreve (evento "input", não "change") —
// tal como o campo "Outro" da duração, para não esperar que o campo perca
// o foco.
function mudarNomeVagaTv(input) {
  const formato = resolverFormatoDoId(input.dataset.id);
  if (!formato) {
    return;
  }
  renomearVaga(formato, objetivoAtivo, input.dataset.idVaga, input.value);
}

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

// A caixa "Outro" da duração, e os campos de Nº de Faces/Nº de cartazes do
// OOH, usam o evento "input" (não "change") para guardar enquanto se
// escreve, sem esperar que o campo perca o foco.
listaFormatos.addEventListener("input", (evento) => {
  const alvo = evento.target;

  if (alvo.classList.contains("input-num-faces-ooh") || alvo.classList.contains("input-num-cartazes-ooh")) {
    mudarNumOoh(alvo);
    return;
  }

  if (alvo.classList.contains("input-nome-vaga-tv")) {
    mudarNomeVagaTv(alvo);
    return;
  }

  if (!alvo.classList.contains("input-duracao-outro")) {
    return;
  }
  const canal = alvo.dataset.canal;
  const formato = resolverFormatoDoId(alvo.dataset.id);
  if (!formato) {
    return;
  }
  const estado = garantirEstadoDuracao(formato, objetivoAtivo, canal);
  estado.outroValor = alvo.value.trim();
  // Só as células de temas deste canal — nunca a grelha toda, senão o
  // próprio campo onde se está a escrever seria destruído e recriado a
  // cada letra, perdendo o foco (ver atualizarCelulasTemasCanal).
  atualizarCelulasTemasCanal(formato, canal);
  atualizarResumoSelecao();
});

// Guarda o valor digitado em Nº de Faces/Nº de cartazes a entregar (OOH) —
// campo livre, sem validação de obrigatoriedade; em branco remove a
// entrada do mapa (sai como "" no Excel, igual a nunca ter sido preenchido).
function mudarNumOoh(input) {
  const id = Number(input.dataset.id);
  const mapa = input.classList.contains("input-num-faces-ooh") ? numFacesOohPorObjetivo : numCartazesOohPorObjetivo;
  const valor = input.value.trim();
  idsDoGrupoFormato(id).forEach((idGrupo) => {
    if (valor === "") {
      mapa[objetivoAtivo].delete(idGrupo);
    } else {
      mapa[objetivoAtivo].set(idGrupo, valor);
    }
  });
  atualizarResumoSelecao();
}

// Marca/desmarca uma das durações padrão (15"/20"/30") deste canal/estação
// — não é exclusiva, o mesmo canal pode ter várias marcadas ao mesmo tempo
// (vários spots pedidos), e cada canal tem a sua própria grelha (ver
// chaveDuracaoCanal).
function mudarCheckboxDuracao(checkbox) {
  const canal = checkbox.dataset.canal;
  const formato = resolverFormatoDoId(checkbox.dataset.id);
  if (!formato) {
    return;
  }
  const estado = garantirEstadoDuracao(formato, objetivoAtivo, canal);
  if (checkbox.checked) {
    estado.padrao.add(checkbox.value);
  } else {
    estado.padrao.delete(checkbox.value);
  }
  // A secundagem é uma das dimensões das células de temas — mudar as
  // durações ativas deste canal muda quantas células a linha dele tem.
  // Só recria as células deste canal (não o seletor de duração), senão o
  // resto das checkboxes/campo "Outro" perdiam o estado a meio do clique.
  atualizarCelulasTemasCanal(formato, canal);
  atualizarResumoSelecao();
}

// Marca/desmarca a duração "Outro" deste canal/estação — mostra/esconde a
// caixa de texto e limpa-a ao desmarcar (o valor só volta a ficar visível
// se o utilizador voltar a escrever depois de marcar outra vez).
function mudarCheckboxDuracaoOutro(checkbox) {
  const canal = checkbox.dataset.canal;
  const formato = resolverFormatoDoId(checkbox.dataset.id);
  if (!formato) {
    return;
  }
  const estado = garantirEstadoDuracao(formato, objetivoAtivo, canal);
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
  // Só as células de temas deste canal — nunca o seletor de duração,
  // senão o foco que acabou de ser dado ao campo "Outro" (duas linhas
  // acima) perdia-se de imediato.
  atualizarCelulasTemasCanal(formato, canal);
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
    const pendente = formato && (
      (formatoEhMupiPapel(formato) && !entregaEfetivaDoFormato(formato, objetivoAtivo)) ||
      (formatoTemCanal(formato) && !formatoTemAlgumCanalEscolhido(formato, objetivoAtivo))
    );
    checkbox.classList.toggle("checkbox-formato--pendente", pendente);
  });

  // A duração já não tem sincronização própria aqui — vive na grelha de
  // Secundagem de TV/Rádio (um seletor por canal), que é sempre
  // reconstruída do zero mais abaixo (ver o forEach de ".grid-temas-tv",
  // que também reconstrói a grelha de Secundagem — ver atualizarGridsTv),
  // e essa reconstrução já lê o estado certo por canal.

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
  });

  // Canais e grelha de temas de TV são por objetivo, tal como a duração —
  // a grelha é sempre reconstruída do zero (não só os números), porque o
  // próprio conjunto de canais/secundagens pode ser diferente de objetivo
  // para objetivo.
  // Reconstrói as 3 colunas (Canal/Secundagem/Temas) por inteiro, incluindo
  // a lista de vagas — vagasTvPorObjetivo é por objetivo, tal como
  // o resto do estado de TV/Rádio, por isso o nº de blocos pode mudar ao
  // trocar de objetivo.
  listaFormatos.querySelectorAll(".coluna-canais-tv-raiz").forEach((raiz) => {
    const id = Number(raiz.dataset.id);
    const formato = todosFormatos.find((f) => f.id === id);
    if (formato) {
      atualizarColunasVagaTv(formato);
    }
  });

  // Nº de Faces / Nº de cartazes a entregar (OOH) são por objetivo, tal
  // como os restantes campos acima.
  listaFormatos.querySelectorAll(".input-num-faces-ooh").forEach((input) => {
    const id = Number(input.dataset.id);
    input.value = numFacesOohPorObjetivo[objetivoAtivo].get(id) || "";
  });
  listaFormatos.querySelectorAll(".input-num-cartazes-ooh").forEach((input) => {
    const id = Number(input.dataset.id);
    input.value = numCartazesOohPorObjetivo[objetivoAtivo].get(id) || "";
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
  // Por grupoMeio (TV/Rádio), porque cada um tem a sua própria mensagem de
  // aviso (ver chaveAvisoSaltadosSelecionarTodos).
  const canalPorEscolherPorMeio = new Map();
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
    if (formato && formatoTemCanal(formato) && !formatoTemAlgumCanalEscolhido(formato, objetivoAtivo)) {
      const grupoMeio = grupoMeioDoFormato(formato);
      canalPorEscolherPorMeio.set(grupoMeio, (canalPorEscolherPorMeio.get(grupoMeio) || 0) + 1);
      return;
    }
    checkbox.checked = true;
    idsDoGrupoFormato(id).forEach((idGrupo) => selecaoAtiva.add(idGrupo));
  });
  if (mupisPorEscolher > 0) {
    mostrarNotificacao(formatar("avisoMupisSaltadosSelecionarTodos", { n: mupisPorEscolher }));
  }
  canalPorEscolherPorMeio.forEach((n, grupoMeio) => {
    mostrarNotificacao(formatar(chaveAvisoSaltadosSelecionarTodos(grupoMeio), { n }));
  });
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
            ? ` <span class="etiqueta-dg2020">${escapeHTML(f.grupoDigital2020) || "—"}</span>`
            : "";
          // Quando o Veículo é diferente do Fornecedor (ex.: "Correio da
          // Manhã" → "Boa Onda"), mostra-o também — senão duas seleções
          // diferentes podiam aparecer com o mesmo texto no resumo.
          const veiculo = f.veiculo && f.veiculo !== f.fornecedor ? ` (${escapeHTML(f.veiculo)})` : "";
          const nomeFormato = escapeHTML(textoTraduzido(f, "formato") ?? "");
          // Nº de temas (TV/Rádio/OOH) e escolha de entrega (Mupi papel) —
          // mostrados aqui para o resumo refletir sempre o que vai sair no
          // Excel (ver escreverSeccaoObjetivo/COLUNAS_EXCEL_DISPONIVEIS).
          const numeroTemas = MEIOS_COM_TEMA.has(grupoMeioDoFormato(f)) ? contagemTemasDoFormato(f, objetivo) : 1;
          const etiquetaTemas = numeroTemas > 1 ? ` — ${formatar("resumoNumeroTemas", { n: numeroTemas })}` : "";
          const escolhaEntrega = formatoEhMupiPapel(f) ? entregaEfetivaDoFormato(f, objetivo) : null;
          const etiquetaEntrega = escolhaEntrega ? ` — ${t(escolhaEntrega === "af" ? "colEntregaAF" : "colEntregaMorada")}` : "";
          // TV tem canal × secundagem, cada combinação com o seu próprio
          // número de temas — uma linha de resumo por combinação (mesma
          // lógica da exportação para Excel, ver escreverSeccaoObjetivo).
          // Com vagas ativas (ver vagasTvPorObjetivo), cada vaga
          // é percorrida à parte, com o seu nome à frente — senão o resumo
          // ficava sempre vazio nesses formatos (o bloco único de base fica
          // sem nenhum canal escolhido enquanto há vagas).
          if (formatoTemCanal(f)) {
            const vagas = vagasDoFormato(f, objetivo);
            const contextos = vagas.length > 0
              ? vagas.map((vaga) => ({ formatoEfetivo: { ...f, id: chaveFormatoVaga(f.id, vaga.id) }, prefixoVaga: `${escapeHTML(vaga.nome)} — ` }))
              : [{ formatoEfetivo: f, prefixoVaga: "" }];
            return contextos.flatMap(({ formatoEfetivo, prefixoVaga }) => (
              celulasTemaTvAtivas(formatoEfetivo, objetivo).map(({ canal, duracao }) => {
                const contagem = contagemTemaTv(formatoEfetivo, objetivo, canal, duracao);
                const etiquetaTemasTv = contagem > 1 ? ` — ${formatar("resumoNumeroTemas", { n: contagem })}` : "";
                const rotuloDuracao = duracao ? ` — ${duracao}″` : "";
                return `<li>${prefixoVaga}${nomeFormato} — ${canal}${rotuloDuracao}${etiquetaTemasTv}</li>`;
              })
            ));
          }
          // Os restantes meios nunca têm duração (só TV/Rádio têm — e já
          // voltaram acima, no ramo de formatoTemCanal).
          return [`<li>${escapeHTML(f.fornecedor)}${veiculo} — ${nomeFormato}${etiqueta}${etiquetaTemas}${etiquetaEntrega}</li>`];
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
Companhia escolhida (Havas Media, Arena Media ou Forward Media).
Usa a biblioteca ExcelJS (lib/exceljs.min.js).
============================================
*/
// corDataEntrega: um destaque bem leve na coluna "Data de entrega" (só as
// células de dados, não o cabeçalho) — pedido explícito da Cláudia, para
// essa data saltar à vista sem gritar. Tom clarinho da cor de cada
// companhia (vermelho/rosa para a Havas Media, azul para a Arena Media,
// dourado/caqui para a Forward Media).
const CONFIGURACAO_COMPANHIA = {
  "Havas Media": {
    corCabecalho: "FFE60000",
    corDataEntrega: "FFFCE8E8",
    ficheiroLogo: "assets/logo-havas-media.png",
    proporcaoLogo: 372 / 160,
    alturaLogo: 50,
  },
  "Arena Media": {
    corCabecalho: "FF328CF5",
    corDataEntrega: "FFE8F1FC",
    ficheiroLogo: "assets/logo-arena-media.png",
    proporcaoLogo: 1557 / 368,
    alturaLogo: 50,
  },
  // Logótipo completo (símbolo "FWD" + "Part of the Havas Media Network"
  // por baixo, tal como foi enviado) — pedido explícito da Cláudia para
  // aparecer tudo, não só o símbolo. alturaLogo maior que as outras duas
  // companhias para essa segunda linha não ficar ilegível de tão pequena.
  "Forward Media": {
    corCabecalho: "FFC4BD97",
    corDataEntrega: "FFF8F7F3",
    ficheiroLogo: "assets/logo-forward.png",
    proporcaoLogo: 1615 / 841,
    alturaLogo: 78,
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
  // Canal de TV (RTP/SIC/TVI/STAR/NOS/Media Livre) — conceito diferente do
  // "canal" do Digital acima (Social Media/Google/Programático/Internet):
  // aqui é para onde o spot tem de ser enviado, vem de
  // escreverSeccaoObjetivo (grupo.canal), não da base de formatos.
  // Nome da vaga (ver vagasTvPorObjetivo) — só preenchida quando o
  // formato usa o modo de várias vagas; nos restantes fica sempre em
  // branco, e a coluna nem chega a aparecer na folha (ver colunasChaves em
  // escreverFolhaMeio — pedido explícito da Cláudia, para não poluir
  // pedidos que não usam vagas).
  vaga: {
    largura: 16,
    titulo: () => t("colVaga"),
    valor: (formato, objetivo, duracao, temaIndice, canal, vaga) => vaga || "",
  },
  canalTv: {
    largura: 14,
    titulo: () => t("colCanalTV"),
    valor: (formato, objetivo, duracao, temaIndice, canalTv) => canalTv || "",
  },
  // Estação de Rádio — mesmo conceito e mesma origem do canalTv acima
  // (vem de escreverSeccaoObjetivo, grupo.canal), só muda o rótulo.
  estacaoRadio: {
    largura: 14,
    titulo: () => t("colEstacao"),
    valor: (formato, objetivo, duracao, temaIndice, canalTv) => canalTv || "",
  },
  // Nº de Faces / Nº de cartazes a entregar (OOH) — ver
  // numFacesOohPorObjetivo/numCartazesOohPorObjetivo; preenchidos no
  // construtor, não vêm da base.
  numFacesOoh: {
    largura: 14,
    titulo: () => t("colNumFaces"),
    valor: (formato, objetivo) => valorNumFacesOoh(formato, objetivo),
  },
  numCartazesOoh: {
    largura: 18,
    titulo: () => t("colNumCartazes"),
    valor: (formato, objetivo) => valorNumCartazesOoh(formato, objetivo),
  },
  // Imprensa: Veículo (o título em si, ex. "Correio da Manhã") e Caderno
  // (o suplemento/secção, ex. "Boa Onda") — antes saíam juntos na única
  // coluna "plataforma" (rotulada "Título"), que só mostrava o Veículo.
  veiculoImprensa: {
    largura: 22,
    titulo: () => t("colVeiculo"),
    valor: (formato) => formato.fornecedor,
  },
  cadernoImprensa: {
    largura: 22,
    titulo: () => t("colCaderno"),
    valor: (formato) => formato.veiculo,
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
  // A coluna Tema fica sempre em branco no Excel exportado, em todos os
  // meios — quer no Digital (onde antes vinha preenchida com o Grupo
  // Digital2020) quer no OOH/TV/Rádio (onde antes vinha "Tema 1"/"Tema 2"
  // por cada linha gerada, ver MEIOS_COM_TEMA/contagemTemasDoFormato) —
  // para o utilizador escrever o tema/criatividade real à mão. As linhas
  // continuam a ser geradas uma por cada tema escolhido no construtor
  // (ver escreverSeccaoObjetivo); só o texto automático deixou de sair.
  tema: {
    largura: 16,
    titulo: () => t("colTema"),
    valor: () => "",
  },
  temaCriativo: {
    largura: 16,
    titulo: () => t("colTema"),
    valor: () => "",
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
  // é sempre o mesmo texto), com o link do Portal GoFastWay por baixo
  // (ver LINK_GOFASTWAY).
  entregaTV: {
    largura: 22,
    titulo: () => t("colEntrega"),
    valor: () => ({ text: `GoFastWay\n${TEXTO_LINK_GOFASTWAY}`, hyperlink: LINK_GOFASTWAY }),
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
  // Tal como a Data de Entrega, não vem da base nem é escolhida no
  // construtor — fica sempre em branco, para o utilizador preencher à mão
  // no Excel exportado.
  dataInicioCampanha: {
    largura: 20,
    titulo: () => t("colDataInicioCampanha"),
    valor: () => "",
  },
  dataEntrega: {
    largura: 20,
    titulo: () => t("colDataEntrega"),
    valor: () => "",
  },
};

// Cada meio só leva as colunas que lhe fazem sentido — Rádio não tem
// Dimensão/Aspect Ratio, Imprensa e OOH não têm Canal, etc. Um meio sem
// entrada aqui usa o conjunto completo do Digital.
//
// Ordem pedida pela Cláudia: Canal/Estação > Formato > Secundagem (TV/
// Rádio), e em todos os meios a Data de Início da Campanha/Data de
// Entrega vêm logo a seguir ao Tema — e só depois todas as especificações
// técnicas. Todos os meios têm coluna de Tema (ver MEIOS_COM_TEMA).
const COLUNAS_POR_MEIO_EXCEL = {
  "Digital": ["canal", "plataforma", "formato", "tema", "dataInicioCampanha", "dataEntrega", "dimensao", "aspectRatio", "peso", "tipoFicheiro", "copies", "observacoes", "link"],
  "OOH": ["plataforma", "formato", "temaCriativo", "dataInicioCampanha", "dataEntrega", "dimensao", "aspectRatio", "numFacesOoh", "numCartazesOoh", "tipoFicheiro", "entregaAF", "entregaMorada", "moradaEntregaMupi", "observacoes"],
  // Sem "plataforma" (é sempre "TV", já não diz nada de novo agora que há
  // Canal) nem as colunas de specs técnicas (dimensao/aspectRatio/
  // tipoFicheiro/entregaTV/observacoes) — essas são iguais em todos os
  // canais e formatos de TV deste pedido, por isso saem só uma vez, em
  // nota de rodapé no fim da folha (ver escreverFolhaMeio/
  // escreverRodapeEspecificacoes — pedido explícito da Cláudia). Rádio
  // segue agora a mesma lógica (ver ESTACOES_RADIO/MEIOS_COM_CANAL).
  "TV": ["vaga", "canalTv", "formato", "secundagem", "temaCriativo", "dataInicioCampanha", "dataEntrega"],
  "Rádio": ["vaga", "estacaoRadio", "formato", "secundagem", "temaCriativo", "dataInicioCampanha", "dataEntrega"],
  "Cinema": ["plataforma", "formato", "temaCriativo", "dataInicioCampanha", "dataEntrega", "dimensao", "aspectRatio", "tipoFicheiro", "observacoes"],
  // Veículo (ex. "Correio da Manhã") e Caderno (ex. "Boa Onda") substituem
  // a antiga coluna única "plataforma"/"Título" — pedido explícito da
  // Cláudia, para o caderno/suplemento não ficar escondido dentro do nome
  // do veículo.
  "Imprensa": ["veiculoImprensa", "cadernoImprensa", "formato", "temaCriativo", "dataInicioCampanha", "dataEntrega", "dimensao", "tipoFicheiro", "observacoes"],
};

// Mescla verticalmente, coluna a coluna, qualquer sequência de linhas
// consecutivas desta secção que partilhem o mesmo valor não vazio — tanto
// um único formato espalhado por várias linhas (vários temas, ou um
// formato com mais que uma dimensão/peso/variante técnica, ver
// GRUPOS_FORMATO_VARIANTES) como formatos diferentes que repitam a mesma
// Plataforma/Canal (ex.: vários formatos do mesmo Facebook, ou vários
// spots no mesmo canal de TV) — pedido explícito da Cláudia, para os
// campos com informação comum saírem fundidos em vez de repetidos linha
// a linha. Nunca mescla células vazias (ex.: a coluna Tema, sempre em
// branco para o utilizador preencher à mão, ou Data de Início/Entrega) —
// só values genuinamente iguais e preenchidos.
function mesclarColunasComValorRepetido(folha, numColunas, linhaInicio, linhaFim, colunasCentradas, colunasChaves) {
  if (linhaFim < linhaInicio) {
    return;
  }
  for (let coluna = 1; coluna <= numColunas; coluna += 1) {
    let inicioBloco = linhaInicio;
    let valorBloco = folha.getCell(linhaInicio, coluna).value;
    for (let linha = linhaInicio + 1; linha <= linhaFim + 1; linha += 1) {
      const dentroDoIntervalo = linha <= linhaFim;
      const valorAtual = dentroDoIntervalo ? folha.getCell(linha, coluna).value : undefined;
      if (dentroDoIntervalo && valorAtual === valorBloco && valorBloco !== null && valorBloco !== undefined && valorBloco !== "") {
        continue;
      }
      if (linha - 1 > inicioBloco && valorBloco !== null && valorBloco !== undefined && valorBloco !== "") {
        folha.mergeCells(inicioBloco, coluna, linha - 1, coluna);
        const centrada = coluna === 1 || colunasCentradas.has(colunasChaves[coluna - 2]);
        folha.getCell(inicioBloco, coluna).alignment = { vertical: "middle", horizontal: centrada ? "center" : "left", wrapText: true };
      }
      inicioBloco = linha;
      valorBloco = valorAtual;
    }
  }
}

// Comprimento (da linha mais comprida, se o texto tiver quebras) de um
// valor de célula — usado para ajustar a largura das colunas ao conteúdo
// real (ver registarLarguraColuna/ajustarLargurasAoConteudo). Um valor
// pode ser texto simples ou um objeto {text, hyperlink} (ex.: a coluna
// Link ou a Entrega de TV, ver COLUNAS_EXCEL_DISPONIVEIS) — neste caso
// olha para o texto lá dentro, não para o objeto todo.
function comprimentoValorCelula(valor) {
  const bruto = valor && typeof valor === "object" ? (valor.text ?? "") : valor;
  return String(bruto ?? "").split("\n").reduce((maior, linha) => Math.max(maior, linha.length), 0);
}

// Maior largura (em nº de colunas) que deixamos uma coluna crescer para
// caber o texto — acima disto o texto só quebra linha (wrapText já está
// ligado em todas as células de dados) em vez de alargar a coluna sem
// limite por causa de uma Observação com um parágrafo inteiro.
const LARGURA_MAXIMA_COLUNA_EXCEL = 70;

// Ajusta a largura de cada coluna da folha ao texto mais comprido
// encontrado nela (cabeçalho, bloco Companhia/Cliente/Campanha/Meio no
// topo, e os dados da tabela — tudo registado durante a escrita, ver
// registarLarguraColuna) — pedido explícito da Cláudia, para as colunas
// saírem sempre à medida do que lá está, em vez de uma largura fixa por
// meio que tanto podia sobrar como ficar curta. COLUNAS_EXCEL_DISPONIVEIS
// continua a valer como largura mínima, para uma coluna quase vazia (ex.:
// Aspect Ratio) não ficar demasiado estreita.
function ajustarLargurasAoConteudo(folha, colunasChaves, largurasConteudo) {
  const totalColunas = Math.max(colunasChaves.length + 1, largurasConteudo.length - 1);
  for (let coluna = 2; coluna <= totalColunas; coluna += 1) {
    const chave = colunasChaves[coluna - 2];
    const larguraMinima = chave ? COLUNAS_EXCEL_DISPONIVEIS[chave].largura : 8;
    const larguraConteudo = (largurasConteudo[coluna] || 0) + 2;
    folha.getColumn(coluna).width = Math.min(LARGURA_MAXIMA_COLUNA_EXCEL, Math.max(larguraMinima, larguraConteudo));
  }
}

// Escreve uma secção completa (título do objetivo + cabeçalho da tabela +
// uma linha por formato — ou uma linha por duração escolhida, no caso de
// TV/Rádio, ver mais abaixo) a partir da linha indicada, e devolve a
// próxima linha livre (já com uma linha em branco a separar da secção
// seguinte). colunasChaves é a lista de colunas desta folha (ver
// COLUNAS_POR_MEIO_EXCEL), sempre precedida pela coluna fixa "#".
function escreverSeccaoObjetivo(folha, linhaInicio, tituloSeccao, formatosDaSeccao, config, objetivo, colunasChaves, grupoMeio, registarLarguraColuna) {
  let linha = linhaInicio;
  const numColunas = colunasChaves.length + 1;

  folha.mergeCells(linha, 1, linha, numColunas);
  const celulaTitulo = folha.getCell(linha, 1);
  celulaTitulo.value = tituloSeccao;
  celulaTitulo.font = { name: "Arial Nova", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  celulaTitulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A1A" } };
  celulaTitulo.alignment = { vertical: "middle", horizontal: "left" };
  linha += 1;

  const colunas = ["#", ...colunasChaves.map((chave) => COLUNAS_EXCEL_DISPONIVEIS[chave].titulo(grupoMeio))];
  colunas.forEach((titulo, indice) => {
    const celula = folha.getCell(linha, indice + 1);
    celula.value = titulo;
    celula.font = { name: "Arial Nova", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: config.corCabecalho } };
    celula.alignment = { vertical: "middle", wrapText: true };
    celula.border = ESTILO_BORDA_COMPLETA;
    registarLarguraColuna(indice + 1, titulo);
  });
  linha += 1;

  const indiceColunaLink = colunasChaves.indexOf("link");
  const indiceColunaDataEntrega = colunasChaves.indexOf("dataEntrega");
  // Só a coluna "#", as colunas de data e as de Entrega do OOH (Entrega
  // AF/Entrega Morada, que só levam um "X" ou ficam em branco) ficam
  // centradas na horizontal — as restantes ficam alinhadas à esquerda
  // (pedido explícito da Cláudia). Um texto centrado lê-se pior em
  // colunas de texto corrido (Observações, Dimensão, ...), mas um "#",
  // uma data ou um "X" soltos ficam melhor centrados do que encostados
  // ao canto da célula.
  const COLUNAS_CENTRADAS = new Set(["dataInicioCampanha", "dataEntrega", "entregaAF", "entregaMorada"]);

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
    // TV/Rádio são um caso à parte: cada canal/estação escolhido ganha o
    // seu próprio grupo de linhas (com a sua própria secundagem e o seu
    // próprio número de temas por secundagem — ver
    // celulasTemaTvAtivas/contagemTemaTv), em vez de uma contagem de temas
    // só, partilhada por todas as durações (como acontece em OOH).
    if (MEIOS_COM_CANAL.has(grupoMeioDoFormato(formato))) {
      // Com vagas ativas (ver vagasTvPorObjetivo), cada vaga
      // gera o seu próprio conjunto de linhas, com o nome da vaga na
      // coluna própria (ver coluna "vaga") — sem nenhuma vaga, só
      // um "contexto" implícito, igual ao comportamento de sempre.
      //
      // Cada canal fica sempre na SUA PRÓPRIA linha — nunca se juntam vários
      // canais numa só (mesmo com a mesma secundagem e nº de temas), porque
      // o nº de temas igual não garante que os temas em si sejam os mesmos
      // (pedido explícito da Cláudia: dois canais podem ter o mesmo nº de
      // temas mas temas diferentes entre si).
      const vagas = vagasDoFormato(formato, objetivo);
      const contextos = vagas.length > 0
        ? vagas.map((vaga) => ({ nomeVaga: vaga.nome, formatoEfetivo: { ...formato, id: chaveFormatoVaga(formato.id, vaga.id) } }))
        : [{ nomeVaga: "", formatoEfetivo: formato }];
      contextos.forEach(({ nomeVaga, formatoEfetivo }) => {
        celulasTemaTvAtivas(formatoEfetivo, objetivo)
          .sort((a, b) => Number(b.duracao || 0) - Number(a.duracao || 0))
          .forEach(({ canal, duracao }) => {
            const contagemTemas = contagemTemaTv(formatoEfetivo, objetivo, canal, duracao || null);
            const temas = contagemTemas > 1 ? Array.from({ length: contagemTemas }, (_, indice) => indice + 1) : [null];
            gruposLinha.push({ formato, duracao: duracao || null, temas, canal, vaga: nomeVaga });
          });
      });
      return;
    }
    // Os restantes meios nunca têm duração (só TV/Rádio têm — e esses já
    // voltaram acima, no ramo de MEIOS_COM_CANAL), por isso é sempre uma
    // única "duração" nula aqui.
    const duracoes = [null];
    const contagemTemas = MEIOS_COM_TEMA.has(grupoMeio) ? contagemTemasDoFormato(formato, objetivo) : 1;
    const temas = contagemTemas > 1 ? Array.from({ length: contagemTemas }, (_, indice) => indice + 1) : [null];
    duracoes.forEach((duracao) => {
      gruposLinha.push({ formato, duracao, temas });
    });
  });

  // Em TV/Rádio a ordem pedida é Canal/Estação > Formato > Secundagem —
  // diferente da ordem em que gruposLinha foi construído acima (por
  // formato, com os canais desse formato agrupados lá dentro). Como esta
  // função só escreve formatos de um único grupoMeio de cada vez (ver
  // formatosDoObjetivo em escreverFolhaMeio), e todo o gruposLinha de uma
  // folha de TV/Rádio tem sempre .canal definido, dá para reordenar tudo
  // aqui no fim sem misturar com os restantes meios.
  if (MEIOS_COM_CANAL.has(grupoMeio)) {
    // Com vagas ativas, as linhas de cada vaga ficam sempre juntas
    // (pela ordem em que as vagas foram criadas, não alfabética — ver
    // ordemVaga), para a coluna Vaga fundir num bloco contínuo em
    // vez de intercalar com as de outra vaga. Sem vagas, todo
    // .vaga é "" e este novo critério não muda nada (continua só
    // Canal > Formato > Secundagem, como sempre).
    const ordemVaga = new Map();
    gruposLinha.forEach((grupo) => {
      const nomeVaga = grupo.vaga || "";
      if (!ordemVaga.has(nomeVaga)) {
        ordemVaga.set(nomeVaga, ordemVaga.size);
      }
    });
    gruposLinha.sort((a, b) => (
      (ordemVaga.get(a.vaga || "") - ordemVaga.get(b.vaga || "")) ||
      (a.canal || "").localeCompare(b.canal || "", "pt") ||
      (a.formato.formato || "").localeCompare(b.formato.formato || "", "pt") ||
      Number(b.duracao || 0) - Number(a.duracao || 0)
    ));
  }

  const linhaPrimeiraLinhaDados = linha;
  let linhaAtual = linha;
  gruposLinha.forEach((grupo, indiceGrupo) => {
    grupo.temas.forEach((temaIndice) => {
      const linhaFormato = folha.getRow(linhaAtual);
      // Cada linha leva sempre o valor real em todas as colunas (nunca
      // em branco "a sinalizar continuação") — é a mesclagem genérica a
      // seguir (ver mesclarColunasComValorRepetido) que funde as
      // sequências de linhas com o mesmo valor, seja dentro do mesmo
      // grupo (vários temas, ou um formato com mais que uma dimensão —
      // ver GRUPOS_FORMATO_VARIANTES) seja entre grupos diferentes que
      // partilhem Plataforma/Canal.
      const valoresColunas = colunasChaves.map((chave) => (
        COLUNAS_EXCEL_DISPONIVEIS[chave].valor(grupo.formato, objetivo, grupo.duracao, temaIndice, grupo.canal, grupo.vaga)
      ));
      linhaFormato.values = [indiceGrupo + 1, ...valoresColunas];
      valoresColunas.forEach((valor, indiceValor) => registarLarguraColuna(indiceValor + 2, valor));
      linhaFormato.eachCell({ includeEmpty: true }, (celula, indiceColunaExcel) => {
        const centrada = indiceColunaExcel === 1 || COLUNAS_CENTRADAS.has(colunasChaves[indiceColunaExcel - 2]);
        celula.font = { name: "Arial Nova", size: 10, color: { argb: "FF0F1724" } };
        celula.alignment = { vertical: "middle", horizontal: centrada ? "center" : "left", wrapText: true };
        celula.border = ESTILO_BORDA_COMPLETA;
        // Destaque leve na coluna "Data de entrega" (ver corDataEntrega em
        // CONFIGURACAO_COMPANHIA) — só as células de dados, não o cabeçalho.
        if (indiceColunaExcel - 2 === indiceColunaDataEntrega) {
          celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: config.corDataEntrega } };
        }
      });
      // O texto do link fica na cor de destaque, sublinhado, para
      // parecer clicável mesmo antes de o utilizador lhe tocar.
      if (indiceColunaLink !== -1 && grupo.formato.link) {
        linhaFormato.getCell(indiceColunaLink + 2).font = { name: "Arial Nova", size: 10, color: { argb: "FF1155CC" }, underline: true };
      }
      linhaAtual += 1;
    });
  });
  linha = linhaAtual;

  mesclarColunasComValorRepetido(folha, numColunas, linhaPrimeiraLinhaDados, linhaAtual - 1, COLUNAS_CENTRADAS, colunasChaves);

  return linha + 1; // uma linha em branco antes da secção seguinte
}

botaoExportar.addEventListener("click", exportarSelecaoParaExcel);

// Todos os formatos selecionados (nalgum objetivo) de um dado meio, sem
// repetições — usado sempre que é preciso a lista de formatos realmente
// pedidos, não a base toda (ver escreverRodapeEspecificacoes e
// escreverFolhasImagensOOH).
function formatosSelecionadosDoMeio(grupoMeio) {
  const formatosDoMeio = new Map();
  OBJETIVOS.forEach((objetivo) => {
    selecoesPorObjetivo[objetivo].forEach((id) => {
      const formato = todosFormatos.find((f) => f.id === id);
      if (formato && grupoMeioDoFormato(formato) === grupoMeio) {
        formatosDoMeio.set(formato.id, formato);
      }
    });
  });
  return [...formatosDoMeio.values()];
}

// Escreve a folha de um meio (Digital / OOH / TV / Rádio / Cinema /
// Imprensa): logótipo, bloco Companhia/Cliente/Campanha/Meio, e uma
// secção por objetivo com os formatos desse meio (objetivos sem formatos
// desse meio não geram secção nessa folha).
// Nota de rodapé da folha de TV/Rádio: specs técnicas (Dimensão/Aspect
// Ratio/Tipo de Ficheiro/Observações, + Entrega GoFastWay em TV) de cada
// formato usado neste pedido — uma vez por formato, nunca repetidas por
// canal/estação/secundagem/tema (são sempre as mesmas, seja qual for o
// canal/estação — pedido explícito da Cláudia). Só os formatos realmente
// selecionados (nalgum objetivo) aparecem aqui, não a base toda.
function escreverRodapeEspecificacoes(folha, linhaInicio, numColunas, grupoMeio) {
  const formatosDoMeio = formatosSelecionadosDoMeio(grupoMeio);
  if (formatosDoMeio.length === 0) {
    return linhaInicio;
  }

  let linha = linhaInicio;
  folha.mergeCells(linha, 1, linha, numColunas);
  const celulaTitulo = folha.getCell(linha, 1);
  celulaTitulo.value = t(grupoMeio === "Rádio" ? "rodapeSpecsTituloRadio" : "rodapeSpecsTituloTV");
  celulaTitulo.font = { name: "Arial Nova", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  celulaTitulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A1A" } };
  celulaTitulo.alignment = { vertical: "middle", horizontal: "left" };
  linha += 1;

  // Rótulo + valor na MESMA célula (fundida ao longo de toda a largura da
  // tabela), em vez de rótulo na coluna 1 e valor fundido a partir da
  // coluna 2 — a coluna 1 tem a largura da coluna "#" (só 5), estreita
  // demais para o texto do rótulo, que ficava cortado/a quebrar linha sem
  // necessidade (ver auditoria da Cláudia). Fundir desde a coluna 1 dá ao
  // texto toda a largura da tabela para respirar.
  const estiloRotulo = { name: "Arial Nova", size: 10, bold: true, color: { argb: "FF5B6678" } };
  const estiloValor = { name: "Arial Nova", size: 10, color: { argb: "FF0F1724" } };

  formatosDoMeio
    .slice()
    .sort((a, b) => (a.formato || "").localeCompare(b.formato || "", "pt"))
    .forEach((formato) => {
      folha.mergeCells(linha, 1, linha, numColunas);
      const celulaNome = folha.getCell(linha, 1);
      celulaNome.value = textoTraduzido(formato, "formato") ?? "";
      celulaNome.font = { name: "Arial Nova", size: 11, bold: true, color: { argb: "FF0F1724" } };
      celulaNome.alignment = { vertical: "top", horizontal: "left", wrapText: true };
      linha += 1;

      const campos = [
        [t("colDimensao"), textoTraduzido(formato, "dimensao")],
        [t("colAspectRatio"), textoTraduzido(formato, "aspectRatio")],
        [t("colTipoFicheiro"), textoTraduzido(formato, "tipoFicheiro")],
        [t("colObservacoes"), textoTraduzido(formato, "observacoes")],
      ];
      campos.forEach(([rotulo, valor]) => {
        if (!valor) {
          return;
        }
        folha.mergeCells(linha, 1, linha, numColunas);
        const celula = folha.getCell(linha, 1);
        celula.value = { richText: [{ font: estiloRotulo, text: `${rotulo}: ` }, { font: estiloValor, text: valor }] };
        celula.alignment = { vertical: "top", horizontal: "left", wrapText: true };
        linha += 1;
      });

      // Entrega (GoFastWay) — valor fixo, igual em todos os formatos de TV.
      // Rádio não tem este conceito (sem portal de entrega fixo), por isso
      // não ganha esta linha.
      if (grupoMeio === "TV") {
        folha.mergeCells(linha, 1, linha, numColunas);
        const celulaEntrega = folha.getCell(linha, 1);
        celulaEntrega.value = { text: `${t("colEntrega")}: GoFastWay — ${TEXTO_LINK_GOFASTWAY}`, hyperlink: LINK_GOFASTWAY };
        celulaEntrega.font = { name: "Arial Nova", size: 10, color: { argb: "FF1155CC" }, underline: true };
        celulaEntrega.alignment = { vertical: "top", horizontal: "left", wrapText: true };
        linha += 1;
      }

      linha += 1; // linha em branco antes do próximo formato
    });

  return linha;
}

// Endereços de email a usar na nota de entrega (ver
// escreverNotaEntregaMateriais), por cliente — para materiais que não
// sigam pelo GoFastWay (TV) nem para a morada do mupi em papel (ver
// MORADA_ENTREGA_MUPI_PAPEL). A comparação com o campo Cliente ignora
// maiúsculas/minúsculas e espaços a mais (ver contactosDoCliente), mas o
// nome em si tem de bater certo com o que está aqui.
// *** A preencher: a Cláudia ainda não indicou os endereços de cada
// cliente — fica vazio por omissão (mostra "sem endereços definidos"). ***
const CONTACTOS_POR_CLIENTE = {
  // "Nome do Cliente": ["pessoa1@agencia.pt", "pessoa2@agencia.pt"],
};
function contactosDoCliente(nomeCliente) {
  const chaveNormalizada = (nomeCliente || "").trim().toLowerCase();
  const chaveEncontrada = Object.keys(CONTACTOS_POR_CLIENTE).find(
    (chave) => chave.trim().toLowerCase() === chaveNormalizada
  );
  return chaveEncontrada ? CONTACTOS_POR_CLIENTE[chaveEncontrada] : [];
}

// O texto da nota varia por meio: TV tem o GoFastWay como via principal,
// OOH tem os Mupis Papel (ver MORADA_ENTREGA_MUPI_PAPEL) entregues na
// morada do concessionário, e os restantes meios (Digital/Imprensa/
// Cinema/Rádio) não têm nenhuma via alternativa — só o email. Os
// endereços em si vêm de CONTACTOS_POR_CLIENTE, um por linha a seguir à
// nota — pedido explícito da Cláudia.
const CHAVE_NOTA_ENTREGA_POR_MEIO = {
  "TV": "notaEntregaMateriaisTV",
  "OOH": "notaEntregaMateriaisOOH",
};
function chaveNotaEntregaMateriais(grupoMeio) {
  return CHAVE_NOTA_ENTREGA_POR_MEIO[grupoMeio] || "notaEntregaMateriaisGenerica";
}

function escreverNotaEntregaMateriais(folha, linha, numColunas, cliente, grupoMeio) {
  let linhaAtual = linha;
  folha.mergeCells(linhaAtual, 1, linhaAtual, numColunas);
  const celulaNota = folha.getCell(linhaAtual, 1);
  celulaNota.value = t(chaveNotaEntregaMateriais(grupoMeio));
  celulaNota.font = { name: "Arial Nova", size: 9, italic: true, color: { argb: "FF5B6678" } };
  celulaNota.alignment = { vertical: "top", horizontal: "left", wrapText: true };
  folha.getRow(linhaAtual).height = 30;
  linhaAtual += 1;

  const emails = contactosDoCliente(cliente);
  if (emails.length === 0) {
    return linhaAtual;
  }

  const estiloEmail = { font: { name: "Arial Nova", size: 9, color: { argb: "FF0F1724" } } };
  emails.forEach((email) => {
    folha.mergeCells(linhaAtual, 1, linhaAtual, numColunas);
    const celulaEmail = folha.getCell(linhaAtual, 1);
    celulaEmail.value = `• ${email}`;
    celulaEmail.style = estiloEmail;
    linhaAtual += 1;
  });
  return linhaAtual;
}

async function escreverFolhaMeio(workbook, config, companhia, cliente, campanha, grupoMeio) {
  const nomeMeio = t(CHAVE_TRADUCAO_MEIO[grupoMeio]) || grupoMeio;
  const folha = workbook.addWorksheet(nomeMeio);

  // Sem gridlines — só a tabela em si vai ter linhas (mais abaixo),
  // para o Excel ficar limpo e não parecer uma grelha genérica. Colunas
  // A-D congeladas por omissão (#, Plataforma/Publisher, Formato e a
  // 4ª coluna do template deste meio), para ficarem visíveis ao fazer
  // scroll horizontal pelas colunas de specs mais à direita.
  folha.views = [{ state: "frozen", xSplit: 4, ySplit: 0, showGridLines: false }];

  // --- Larguras de coluna, de acordo com o template deste meio (só as
  // colunas relevantes para ele — ver COLUNAS_POR_MEIO_EXCEL). Têm de ser
  // definidas ANTES de escrever valores nas células, senão o ExcelJS
  // troca-nos as voltas e perde o conteúdo já escrito (foi um bug que
  // apanhámos a testar). ---
  const colunasChavesDoMeio = COLUNAS_POR_MEIO_EXCEL[grupoMeio] || COLUNAS_POR_MEIO_EXCEL.Digital;
  // A coluna "Vaga" só aparece quando pelo menos um formato selecionado
  // deste meio (nalgum objetivo) usa mesmo o modo de várias vagas — pedido
  // explícito da Cláudia, para um pedido normal (sem vagas) não ganhar uma
  // coluna extra sempre em branco.
  const usaVagaNestaFolha = MEIOS_COM_CANAL.has(grupoMeio) && formatosSelecionadosDoMeio(grupoMeio)
    .some((f) => OBJETIVOS.some((objetivo) => vagasDoFormato(f, objetivo).length > 0));
  const colunasChaves = usaVagaNestaFolha ? colunasChavesDoMeio : colunasChavesDoMeio.filter((chave) => chave !== "vaga");
  folha.columns = [
    { width: 5 },
    ...colunasChaves.map((chave) => ({ width: COLUNAS_EXCEL_DISPONIVEIS[chave].largura })),
  ];

  // --- Logótipo da companhia escolhida, no canto superior esquerdo ---
  const respostaLogo = await fetch(config.ficheiroLogo);
  const bufferLogo = await respostaLogo.arrayBuffer();
  const idImagemLogo = workbook.addImage({ buffer: bufferLogo, extension: "png" });
  const alturaLogo = config.alturaLogo ?? 50;
  const larguraLogo = Math.round(alturaLogo * config.proporcaoLogo);
  // Âncora em B3 (col:1, row:2) em vez de A1 (col:0, row:0): as colunas/
  // linhas antes ficam livres e funcionam como margem real à esquerda e
  // por cima do logótipo — mais espaço do que só uma linha (B2), que
  // ainda ficava demasiado colado ao topo da folha.
  folha.addImage(idImagemLogo, { tl: { col: 1, row: 2 }, ext: { width: larguraLogo, height: alturaLogo } });

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

  // --- Acompanha o texto mais comprido escrito em cada coluna (cabeçalho
  // + dados da tabela, + este bloco Companhia/Cliente/Campanha/Meio que
  // cai nas colunas E/F), para no fim ajustar a largura de cada coluna ao
  // que lá está (ver ajustarLargurasAoConteudo) — pedido explícito da
  // Cláudia. As colunas E/F entram aqui diretamente porque não fazem
  // parte de colunasChaves (são só este bloco do topo).
  const numColunasFolha = colunasChaves.length + 1;
  const largurasConteudo = new Array(Math.max(numColunasFolha, 6) + 1).fill(0);
  const registarLarguraColuna = (coluna, valor) => {
    const comprimento = comprimentoValorCelula(valor);
    if (comprimento > largurasConteudo[coluna]) {
      largurasConteudo[coluna] = comprimento;
    }
  };
  registarLarguraColuna(5, t("excelLabelCompanhia"));
  registarLarguraColuna(5, t("excelLabelCliente"));
  registarLarguraColuna(5, t("excelLabelCampanha"));
  registarLarguraColuna(5, t("excelLabelMeio"));
  registarLarguraColuna(6, companhia);
  registarLarguraColuna(6, cliente);
  registarLarguraColuna(6, campanha);
  registarLarguraColuna(6, nomeMeio);

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
    linhaAtual = escreverSeccaoObjetivo(folha, linhaAtual, t(CHAVE_TRADUCAO_OBJETIVO[objetivo]), formatosDoObjetivo, config, objetivo, colunasChaves, grupoMeio, registarLarguraColuna);
  });

  // Uma linha de intervalo extra antes da nota de especificações de TV/
  // Rádio — pedido explícito da Cláudia (a linha em branco que já havia
  // entre a tabela e o rodapé, ver escreverSeccaoObjetivo, não bastava).
  if (MEIOS_COM_CANAL.has(grupoMeio)) {
    linhaAtual += 1;
    linhaAtual = escreverRodapeEspecificacoes(folha, linhaAtual, numColunasFolha, grupoMeio);
  }

  // Nota sobre a entrega dos materiais (GoFastWay/mupis em papel vs. email
  // da equipa do cliente) — em todas as folhas, pedido explícito da
  // Cláudia.
  linhaAtual += 1;
  escreverNotaEntregaMateriais(folha, linhaAtual, numColunasFolha, cliente, grupoMeio);

  ajustarLargurasAoConteudo(folha, colunasChaves, largurasConteudo);
}

/*
============================================
11.1 SHEETS EXTRA COM A IMAGEM DE CADA FORMATO DE OOH
Além da folha normal de OOH, cada formato selecionado que
tenha uma imagem associada na base (coluna "Imagem" —
caminho para um PNG com o desenho técnico/medidas, ver
CABECALHOS_BASE_EXCEL) ganha a sua própria sheet, com essa
imagem e as medidas por baixo — pedido explícito da
Cláudia. Formatos sem imagem não geram sheet nenhuma: nunca
inventamos um desenho técnico que o fornecedor não enviou.
============================================
*/
// Lê a largura/altura de um PNG a partir dos primeiros bytes do ficheiro
// (assinatura PNG + chunk IHDR, sempre nos bytes 16-23) — para conseguir
// embutir a imagem no Excel já com as proporções certas, sem ter de pedir
// a quem acrescenta a imagem à base para também indicar as dimensões à mão.
function obterDimensoesPNG(bufferImagem) {
  const vista = new DataView(bufferImagem);
  return { largura: vista.getUint32(16), altura: vista.getUint32(20) };
}

// Nomes de sheet do Excel têm de ser únicos, no máximo 31 caracteres, e
// não podem conter \ / ? * [ ] : — esta função garante as três coisas,
// acrescentando " (2)", " (3)", etc. se duas sheets dessem o mesmo nome
// depois de cortado (ex.: dois formatos de fornecedores diferentes cujo
// nome só difere a partir do caracter 31).
function nomeUnicoParaSheet(nomeDesejado, nomesUsados) {
  const sanitizado = nomeDesejado.replace(/[\\/?*[\]:]/g, "-").slice(0, 31) || "Especificações";
  let nome = sanitizado;
  let contador = 2;
  while (nomesUsados.has(nome.toLowerCase())) {
    const sufixo = ` (${contador})`;
    nome = sanitizado.slice(0, 31 - sufixo.length) + sufixo;
    contador += 1;
  }
  nomesUsados.add(nome.toLowerCase());
  return nome;
}

async function escreverFolhaImagemFormato(workbook, formato, nomesSheetUsados) {
  const respostaImagem = await fetch(formato.imagemFicheiro, { cache: "no-store" });
  if (!respostaImagem.ok) {
    // Referenciada na base mas o ficheiro não existe/não carrega — não
    // bloqueia o resto da exportação, só esta sheet fica por fazer.
    return;
  }
  const bufferImagem = await respostaImagem.arrayBuffer();
  const { largura: larguraNatural, altura: alturaNatural } = obterDimensoesPNG(bufferImagem);

  const nomeFormatoTexto = textoTraduzido(formato, "formato") ?? formato.formato ?? "";
  const folha = workbook.addWorksheet(nomeUnicoParaSheet(`${formato.fornecedor} — ${nomeFormatoTexto}`, nomesSheetUsados));
  folha.views = [{ showGridLines: false }];
  folha.columns = [{ width: 5 }, { width: 90 }];

  const celulaTitulo = folha.getCell(2, 2);
  celulaTitulo.value = `${formato.fornecedor} — ${nomeFormatoTexto}`;
  celulaTitulo.font = { name: "Arial Nova", size: 14, bold: true, color: { argb: "FF0F1724" } };

  // A imagem nunca sai maior que isto (mas pode sair mais pequena, se já
  // vier assim) — um desenho técnico em alta resolução não tem de ocupar
  // o ecrã todo para as medidas continuarem legíveis.
  const LADO_MAXIMO_IMAGEM = 700;
  const escala = Math.min(LADO_MAXIMO_IMAGEM / larguraNatural, LADO_MAXIMO_IMAGEM / alturaNatural, 1);
  const larguraFinal = Math.round(larguraNatural * escala);
  const alturaFinal = Math.round(alturaNatural * escala);
  const idImagem = workbook.addImage({ buffer: bufferImagem, extension: "png" });
  const linhaImagem = 4;
  folha.addImage(idImagem, { tl: { col: 1, row: linhaImagem - 1 }, ext: { width: larguraFinal, height: alturaFinal } });

  // Linha das medidas começa a seguir à imagem — a altura de linha por
  // omissão do Excel ronda os 20px, por isso esta conta é só uma
  // aproximação (overshoot é inofensivo, só deixa uma margem extra).
  const linhaMedidas = linhaImagem + Math.ceil(alturaFinal / 20) + 2;
  const celulaMedidas = folha.getCell(linhaMedidas, 2);
  celulaMedidas.value = {
    richText: [
      { font: { name: "Arial Nova", size: 10, bold: true }, text: `${t("colDimensao")}: ` },
      { font: { name: "Arial Nova", size: 10 }, text: textoTraduzido(formato, "dimensao") || "" },
    ],
  };
  celulaMedidas.alignment = { wrapText: true, vertical: "top" };
}

async function escreverFolhasImagensOOH(workbook) {
  const nomesSheetUsados = new Set(workbook.worksheets.map((folha) => folha.name.toLowerCase()));
  const formatosComImagem = formatosSelecionadosDoMeio("OOH")
    .filter((formato) => formato.imagemFicheiro)
    .sort((a, b) => (textoTraduzido(a, "formato") ?? "").localeCompare(textoTraduzido(b, "formato") ?? "", "pt"));
  for (const formato of formatosComImagem) {
    await escreverFolhaImagemFormato(workbook, formato, nomesSheetUsados);
  }
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

  // Sheets extra com a imagem/medidas de cada formato de OOH selecionado
  // que tenha uma (ver escreverFolhasImagensOOH) — depois da folha normal
  // de OOH, nunca antes.
  if (gruposOrdenados.includes("OOH")) {
    await escreverFolhasImagensOOH(workbook);
  }

  // --- Gerar o ficheiro e fazer o download no browser ---
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  // Últimos 2 dígitos do ano corrente (ex.: "26" em 2026) — pedido
  // explícito da Cláudia, para o ficheiro ficar fácil de ordenar por ano.
  const anoCurto = String(new Date().getFullYear()).slice(-2);
  const nomeFicheiro = `${anoCurto}_${companhia}_${t("excelNomeFicheiroPrefixo")}_${cliente}_${campanha}.xlsx`.replace(/[\\/:*?"<>|]/g, "-");

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
    const canaisTv = {};
    const temasGridTv = {};
    const vagasTv = {};
    const numFacesOoh = {};
    const numCartazesOoh = {};
    // Troca a parte "id do formato" de uma chave composta (duração/canais/
    // temasGrid — ver chaveFormatoVaga) pela chaveTraducao estável,
    // preservando o "::camp::<idVaga>" quando existir — sem isto, os
    // dados de uma vaga (ids compostos, nunca presentes em
    // selecoesPorObjetivo) nunca passavam no filtro de "formato
    // selecionado" a seguir, e perdiam-se ao atualizar a página.
    function chavePersistidaComVaga(idOuComposto, objetivo) {
      const idReal = idFormatoRealDoId(idOuComposto);
      if (!selecoesPorObjetivo[objetivo].has(idReal)) {
        return null;
      }
      const chave = idParaChave.get(idReal);
      if (!chave) {
        return null;
      }
      const idVaga = idVagaDoId(idOuComposto);
      return idVaga === null ? chave : chaveFormatoVaga(chave, idVaga);
    }
    OBJETIVOS.forEach((objetivo) => {
      selecoes[objetivo] = [...selecoesPorObjetivo[objetivo]]
        .map((id) => idParaChave.get(id))
        .filter(Boolean);
      // Só guarda durações/entregas/temas de formatos que continuam
      // selecionados nesse objetivo — um valor "órfão" (de um formato
      // entretanto desmarcado) não tem interesse em manter.
      duracoes[objetivo] = {};
      duracoesPorObjetivo[objetivo].forEach((estado, chaveCanal) => {
        // A chave em memória é composta (id do formato + canal — ver
        // chaveDuracaoCanal); a persistida troca o id pela chaveTraducao
        // estável, tal como as restantes, mas mantém o canal junto.
        const { parteId, canal } = separarChaveDuracaoCanal(chaveCanal);
        const chave = chavePersistidaComVaga(parteId, objetivo);
        if (chave) {
          duracoes[objetivo][chaveDuracaoCanal(chave, canal)] = {
            padrao: [...estado.padrao],
            outroAtivo: estado.outroAtivo,
            outroValor: estado.outroValor,
          };
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
      canaisTv[objetivo] = {};
      canaisTvPorObjetivo[objetivo].forEach((canais, id) => {
        const chave = chavePersistidaComVaga(id, objetivo);
        if (chave) {
          canaisTv[objetivo][chave] = [...canais];
        }
      });
      temasGridTv[objetivo] = {};
      temasGridTvPorObjetivo[objetivo].forEach((grelha, id) => {
        const chave = chavePersistidaComVaga(id, objetivo);
        if (chave) {
          temasGridTv[objetivo][chave] = Object.fromEntries(grelha);
        }
      });
      // Lista de vagas (ver vagasTvPorObjetivo) — sempre indexada
      // pelo id REAL do formato (nunca composto), ao contrário dos 3 Maps
      // acima.
      vagasTv[objetivo] = {};
      vagasTvPorObjetivo[objetivo].forEach((lista, id) => {
        if (lista.length > 0 && selecoesPorObjetivo[objetivo].has(id)) {
          const chave = idParaChave.get(id);
          if (chave) {
            vagasTv[objetivo][chave] = lista;
          }
        }
      });
      numFacesOoh[objetivo] = {};
      numFacesOohPorObjetivo[objetivo].forEach((valor, id) => {
        if (selecoesPorObjetivo[objetivo].has(id)) {
          const chave = idParaChave.get(id);
          if (chave) {
            numFacesOoh[objetivo][chave] = valor;
          }
        }
      });
      numCartazesOoh[objetivo] = {};
      numCartazesOohPorObjetivo[objetivo].forEach((valor, id) => {
        if (selecoesPorObjetivo[objetivo].has(id)) {
          const chave = idParaChave.get(id);
          if (chave) {
            numCartazesOoh[objetivo][chave] = valor;
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
      canaisTv,
      temasGridTv,
      vagasTv,
      numFacesOoh,
      numCartazesOoh,
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
  // Inverso de chavePersistidaComVaga (ver guardarEstadoLocal) — separa
  // a chaveTraducao estável do "::camp::<idVaga>" quando a chave
  // persistida pertence a um bloco de vaga.
  function idRealEIdVagaDaChave(chaveOuComposta) {
    const texto = String(chaveOuComposta);
    const indice = texto.indexOf(SEPARADOR_ID_VAGA);
    return indice === -1
      ? { chaveReal: texto, idVaga: null }
      : { chaveReal: texto.slice(0, indice), idVaga: texto.slice(indice + SEPARADOR_ID_VAGA.length) };
  }
  OBJETIVOS.forEach((objetivo) => {
    const chaves = (estadoGuardado.selecoes && estadoGuardado.selecoes[objetivo]) || [];
    chaves.forEach((chave) => {
      const id = chaveParaId.get(chave);
      if (id !== undefined) {
        selecoesPorObjetivo[objetivo].add(id);
      }
    });

    const duracoesGuardadas = (estadoGuardado.duracoes && estadoGuardado.duracoes[objetivo]) || {};
    Object.entries(duracoesGuardadas).forEach(([chaveComposta, guardado]) => {
      const { parteId: chaveFormato, canal } = separarChaveDuracaoCanal(chaveComposta);
      const { chaveReal, idVaga } = idRealEIdVagaDaChave(chaveFormato);
      const id = chaveParaId.get(chaveReal);
      if (id !== undefined && guardado && Array.isArray(guardado.padrao)) {
        const idDestino = idVaga === null ? id : chaveFormatoVaga(id, idVaga);
        duracoesPorObjetivo[objetivo].set(chaveDuracaoCanal(idDestino, canal), {
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

    const canaisGuardados = (estadoGuardado.canaisTv && estadoGuardado.canaisTv[objetivo]) || {};
    Object.entries(canaisGuardados).forEach(([chaveComposta, canais]) => {
      const { chaveReal, idVaga } = idRealEIdVagaDaChave(chaveComposta);
      const id = chaveParaId.get(chaveReal);
      const formatoCanal = id !== undefined ? todosFormatos.find((f) => f.id === id) : null;
      if (formatoCanal && Array.isArray(canais)) {
        const disponiveis = canaisDisponiveisDoFormato(formatoCanal);
        const idDestino = idVaga === null ? id : chaveFormatoVaga(id, idVaga);
        canaisTvPorObjetivo[objetivo].set(idDestino, new Set(canais.filter((c) => disponiveis.includes(c))));
      }
    });

    const temasGridGuardados = (estadoGuardado.temasGridTv && estadoGuardado.temasGridTv[objetivo]) || {};
    Object.entries(temasGridGuardados).forEach(([chaveComposta, grelhaGuardada]) => {
      const { chaveReal, idVaga } = idRealEIdVagaDaChave(chaveComposta);
      const id = chaveParaId.get(chaveReal);
      if (id !== undefined && grelhaGuardada && typeof grelhaGuardada === "object") {
        const grelha = new Map();
        Object.entries(grelhaGuardada).forEach(([chaveCelula, contagem]) => {
          if (Number.isInteger(contagem) && contagem >= 1) {
            grelha.set(chaveCelula, contagem);
          }
        });
        const idDestino = idVaga === null ? id : chaveFormatoVaga(id, idVaga);
        temasGridTvPorObjetivo[objetivo].set(idDestino, grelha);
      }
    });

    // Lista de vagas (ver vagasTvPorObjetivo) — sem isto restaurado,
    // os ids compostos das 2 secções acima ficavam em memória mas sem
    // nenhum bloco de vaga para os mostrar (a 1ª renderização decide
    // bloco único vs. vagas por vagasDoFormato, ver
    // criarColunaCanaisTv).
    const vagasGuardadas = (estadoGuardado.vagasTv && estadoGuardado.vagasTv[objetivo]) || {};
    Object.entries(vagasGuardadas).forEach(([chave, lista]) => {
      const id = chaveParaId.get(chave);
      if (id !== undefined && Array.isArray(lista)) {
        const listaValida = lista
          .filter((vaga) => vaga && typeof vaga.id === "string" && typeof vaga.nome === "string")
          .map((vaga) => ({ id: vaga.id, nome: vaga.nome }));
        if (listaValida.length > 0) {
          vagasTvPorObjetivo[objetivo].set(id, listaValida);
        }
      }
    });

    const numFacesGuardados = (estadoGuardado.numFacesOoh && estadoGuardado.numFacesOoh[objetivo]) || {};
    Object.entries(numFacesGuardados).forEach(([chave, valor]) => {
      const id = chaveParaId.get(chave);
      if (id !== undefined && typeof valor === "string" && valor !== "") {
        numFacesOohPorObjetivo[objetivo].set(id, valor);
      }
    });

    const numCartazesGuardados = (estadoGuardado.numCartazesOoh && estadoGuardado.numCartazesOoh[objetivo]) || {};
    Object.entries(numCartazesGuardados).forEach(([chave, valor]) => {
      const id = chaveParaId.get(chave);
      if (id !== undefined && typeof valor === "string" && valor !== "") {
        numCartazesOohPorObjetivo[objetivo].set(id, valor);
      }
    });

    // Um pedido guardado antes de um grupo de variantes técnicas (Spot TV
    // SD/HD, Publicidade Cinema 2D/3D) passar a ser uma única linha no
    // construtor pode ter só uma das variantes selecionada — alinha com
    // o comportamento atual (ver GRUPOS_FORMATO_VARIANTES): se alguma
    // delas estava selecionada, todas passam a estar.
    GRUPOS_FORMATO_VARIANTES.forEach((grupo) => {
      if (grupo.ids.some((id) => selecoesPorObjetivo[objetivo].has(id))) {
        grupo.ids.forEach((id) => selecoesPorObjetivo[objetivo].add(id));
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
  // Objetivo ativo fica sempre em Awareness ao abrir o construtor, mesmo que
  // o pedido guardado tivesse outro objetivo selecionado no momento em que
  // foi deixado — as seleções de cada objetivo (acima) são sempre restauradas
  // na mesma, só o separador visível ao abrir é que não é.
}

/*
============================================
15. ARRANQUE DA APLICAÇÃO
============================================
*/
aplicarTraducoesEstaticas();
carregarFormatos();
atualizarResumoSelecao();
