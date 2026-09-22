# CSBuilder — Creative Specs Builder

Ferramenta interna da Havas Media Network Portugal para construir pedidos de
materiais/creative specs para campanhas de media digital, substituindo o
processo manual que antes era feito diretamente em Excel.

## O que faz

- **Construir Pedido**: escolhe a Companhia (Havas Media / Arena Media),
  Cliente e Campanha, seleciona os formatos pretendidos — por objetivo
  (Awareness / Consideration / Conversion, cada um com a sua própria seleção,
  para o mesmo formato poder ser pedido mais que uma vez) — e exporta tudo
  para um ficheiro Excel já formatado no estilo do template real da agência.
- **Biblioteca de Formatos**: consulta livre de todos os formatos disponíveis
  (specs completas — dimensões, peso, tipo de ficheiro, link oficial), sem
  seleção, organizada por publisher e por categoria — separadas visualmente
  em **Online** (Social Media / Compra Direta / Google ou Search /
  Programático) e **Offline** (OOH, e no futuro TV / Rádio / Cinema /
  Imprensa), tanto no índice lateral como na própria lista e nos filtros de
  categoria. Esta separação existe porque um publisher offline (ex.: um
  fornecedor de OOH) não é "Compra Direta" nem nenhuma das outras categorias
  digitais — é um meio à parte (ver `categoriaDoPublisher` em `app.js`, que
  usa o mesmo mapeamento de meio → grupo já usado na exportação para Excel).
  No índice lateral, cada categoria (Social Media, Compra Direta, ..., OOH)
  é recolhível — começa fechada, só a mostrar o nome, e um clique nela (ou
  na setinha) é que revela os publishers lá dentro; o estado aberto/fechado
  mantém-se ao mudar de filtro, de idioma ou de tab. TV e Rádio são a
  exceção: nunca têm essa seta/dropdown, os publishers aparecem sempre
  visíveis logo abaixo do nome da categoria (ver
  `CATEGORIAS_SEM_DROPDOWN_INDICE` em `app.js`) — são categorias com poucos
  fornecedores, e o que varia de pedido para pedido (a secundagem do spot)
  já vive dentro da própria tabela, não haveria nada que uma dropdown
  fechada por defeito ajudasse a esconder.
- Suporta 4 idiomas (Português, Inglês, Espanhol, Francês) — interface,
  cabeçalhos do Excel, e também as specs de cada formato (Dimensão, Aspect
  Ratio, Peso, Tipo de Ficheiro, Copies) mudam de língua, através de um
  ficheiro de traduções à parte (ver secção seguinte). Nomes de publisher e
  de veículo nunca são traduzidos (são nomes próprios).

## Como correr localmente

Esta aplicação não usa nenhum framework nem precisa de instalação — é HTML,
CSS e JavaScript "puros". Mas **não chega abrir o `index.html` com
duplo-clique**: o browser bloqueia por segurança que a página vá buscar
sozinha o `data/base-formatos.xlsx` quando aberta assim (`file://`). É
preciso um mini-servidor local:

```bash
# a partir da pasta do projeto
python3 -m http.server 8000
```

Depois abre `http://localhost:8000` no browser.

## Estrutura do projeto

```
index.html                Estrutura da página (as duas tabs, campos, etc.)
styles.css                 Estilos (tema visual da Havas)
app.js                      Toda a lógica: traduções, filtros, seleção por
                            objetivo, desenho das listas e exportação/leitura
                            de Excel
data/base-formatos.xlsx     Base de formatos — fonte única de verdade da
                            app, lida diretamente pelo browser. Para
                            atualizar a base, basta substituir este ficheiro
                            (mantendo o nome e as colunas)
data/traducoes-specs.json   Traduções EN/ES/FR das specs (ver secção
                            "Traduções das specs" abaixo) — ficheiro à
                            parte do Excel, opcional (a app funciona sem
                            ele, só mostra tudo em português)
lib/exceljs.min.js          Biblioteca ExcelJS (versão 4.4.0), usada tanto
                            para ler esta base como para gerar o .xlsx
                            exportado, ambos diretamente no browser
assets/                     Logótipos (cabeçalho da app + os usados no Excel
                            exportado, consoante a Companhia escolhida)
templates/                  Reservado para uso futuro (atualmente vazio)
```

## Base de dados de formatos

Os 528 formatos em `data/base-formatos.xlsx` (folha "Base Formatos") foram
mapeados a partir da base real de specs da agência (269 formatos de
publisher → 40 categorias "Digital2020" canónicas, mais os formatos
Programmatic/DV360 adicionados depois, os 36 formatos de compra direta do
publisher "Notícias Ilimitadas", os formatos WeTransfer via Azerion,
Roblox e OLX, o publisher "Bauer" — Reino Unido, os 44 formatos de OOH —
`Meio = "OOH"` — de MOP (23 formatos: Mupi/4Plus/Outdoor 8x3/Flashes em
papel, Backlights 4x3/8x3/10x5/12x5, Autocarro em 4 variantes, Multibanco
Imagem/Vídeo, Mupi Digital/16x9/3 Ecrãs/4x3 Digital/Tomi PhotoFun/Tomi
Sport TV/LED Galp em digital, e High Impact/Decorações Integrais e
Grande Formato como formatos genéricos "à escala"), DreamMedia, BIG
Outdoors, JCDecaux e Táxi Advertising, mais Clearspot e CS Outdoors (só
registadas como concessionárias existentes, sem formatos, enquanto não
houver especificações), os 124 formatos de Imprensa —
`Meio = "Imprensa"` — de
Correio da Manhã (jornal diário + suplemento Mais Sport + revistas
semanais Boa Onda/VIDAS/Domingo), Destak, Jornal de Negócios, Record,
Sábado (+ Sábado Viajante), TV Guia, Expresso (1º Caderno + Economia +
Revista E) e Attitude, e os 5 formatos de TV (`Meio = "TV"`): Spot normal
em SD/IMX50 e HD/XDCAM HD422 (`Fornecedor = "GoFastWay"`), e Ecrã
Fracionado/Split Screen (TVI e CNN Portugal) e Telepromoção
(`Fornecedor = "TVI"`) — mais o primeiro de Rádio (`Meio = "Rádio"`, Spot
normal em MP4). Colunas:
**Meio**, **Canal**, **Fornecedor**, **Veículo**, **Grupo Digital2020**,
**Formato**, **Dimensão**, **Aspect Ratio**, **Peso**, **Tipo de
Ficheiro**, **Copies**, **Observações**, **Link**.

A coluna **Grupo Digital2020** é uma taxonomia exclusiva dos meios digitais
(Internet/Programático) — fica sempre em branco nas linhas offline (OOH, e
no futuro TV/Rádio/Cinema/Imprensa), porque essa categorização não existe
nem se aplica a esses meios. A app também não mostra essa coluna/etiqueta
em lado nenhum do HTML (Construir Pedido, Biblioteca de Formatos, resumo da
seleção) para publishers offline — só aparece para os que são digitais (ver
`opcoes.comGrupoDigital2020` em `app.js`, decidido por publisher a partir
do Meio, com `grupoMeioDoFormato`).

A coluna **Dimensão** deve conter só as dimensões/proporções/durações que
é preciso entregar — não informação de texto. Os limites de copy (texto
principal, título, descrição, CTA, hashtags, etc.) ficam na coluna
**Copies**, separada, sobretudo relevante em Social Media e Google. Tudo o
resto que não seja dimensão, peso, tipo de ficheiro ou copy — notas de
suporte, opções de layout, requisitos de moderação, referências a ficheiros
técnicos à parte, etc. — fica na coluna **Observações**, para o Copies não
se tornar um "cesto" com informação de tipos diferentes.

A coluna **Aspect Ratio** é calculada a partir da Dimensão, não escrita à
mão: usa o rácio já indicado explicitamente no texto (ex.: "(1:1)") quando
existe, ou calcula-o a partir dos pixels quando bate certo com um rácio
"redondo" reconhecível (1:1, 4:5, 9:16, 16:9, 1.91:1, 4:3, etc., com margem
de ~1,5% para arredondamentos); fica em branco quando a dimensão não
corresponde a nenhum rácio reconhecível, em vez de forçar um valor.

Os formatos Programmatic (`Fornecedor = "DV360"`, `Canal = "Programático"`)
têm o Veículo específico quando o próprio nome do formato o indica (ex.:
"Prog - YouTube Masthead" → Veículo "YouTube"); nos restantes, fica
genérico "DV360".

Por decisão explícita, a base de Programático mantém-se deliberadamente
curta: só os formatos "core" comprados via Havas Programmatic Hub (Audio
Ad, Standard Banners, Companion Banner, Pre-Roll, Connected TV) e os
formatos de vídeo do YouTube — formatos específicos de um publisher direto
(ex.: Billboard, Half-Page) não entram aqui, porque quem precisar deles
consulta diretamente as specs desse publisher.

**Para atualizar a base** (ex.: uma empresa contratada entrega specs novas
periodicamente): basta substituir `data/base-formatos.xlsx` por um ficheiro
novo com a mesma folha e as mesmas colunas (a ordem das colunas pode mudar —
a app lê pelo nome do cabeçalho, não pela posição). Não é preciso nenhuma
conversão nem ferramenta extra: a app lê o Excel diretamente no browser.

**Princípio importante**: os dados nunca são inventados — tudo o que está na
base vem da informação real fornecida pela agência. Onde não havia
informação disponível, o campo fica em branco em vez de ser preenchido com
um palpite.

Atualmente cobre os meios **Internet** e **Programático** (Social Media,
Compra Direta, Google/Search e Programático) — ambos aparecem juntos na
folha "Digital" da exportação —, o meio **OOH** (Publicidade Exterior),
com 42 formatos reais de MOP, DreamMedia, BIG Outdoors, JCDecaux e Táxi
Advertising: Outdoors/Monopostes/Painéis em papel e vinil, Mupis (papel e
digital), Backlights (4x3 a 12x5), publicidade em autocarros (4 posições),
Flashes, 4Plus, ecrãs digitais (16x9, 3 ecrãs, 4x3, Tomi PhotoFun/Sport
TV, LED Galp), Multibanco (ATM) e decoração de táxi — mais Clearspot e CS
Outdoors, registadas na base e no filtro só como concessionárias
existentes ("Especificações por confirmar" no Formato), sem nenhuma
dimensão/tipo de ficheiro inventado, à espera das specs reais —, e o meio
**Imprensa**, com 124 formatos reais de jornais e revistas (Correio
da Manhã, Destak, Jornal de Negócios, Record, Sábado, Sábado Viajante,
TV Guia, Expresso e Attitude) — Página, Página Dupla, meias e quartos de
página, rodapés, orelhas de capa e outros formatos especiais próprios de
cada publicação, e os meios **TV** e **Rádio**. TV tem hoje 5 formatos:
"Spot normal" entregue via Portal GoFastWay (`Fornecedor = "GoFastWay"`),
em SD (IMX50, 720x576px) ou HD (XDCAM HD422, 1920x1080px), conforme as
especificações técnicas oficiais da GoFastWay para entrega de ficheiros
de spots de publicidade; e "Ecrã Fracionado/Split Screen" e
"Telepromoção" (`Fornecedor = "TVI"`), a partir da informação técnica
oficial da TVI/CNN Portugal (INF-COM-090/23) — o Ecrã Fracionado tem uma
linha por Veículo (TVI e CNN Portugal) porque só isso muda entre os dois
canais (o lado por onde entra no ecrã), e a Telepromoção é partilhada
pelos dois (`Veículo = "TVI/CNN Portugal"`). Outros formatos de TV que a
agência pediu — Colocação de Produto, Cartão de Patrocínio, Countdown —
**não** entraram na base: o documento fornecido não tem specs para eles,
e as páginas oficiais da SIC (`solutions.impresa.pt/formatos`) e da
TVI/CNN Portugal (`mediacapitalcomercial.pt/formats/tv`) partilhadas pela
Cláudia não puderam ser consultadas a partir deste ambiente (bloqueadas
pela política de rede) — a atualizar assim que houver specs reais, nunca
por palpite. Rádio continua só com "Spot normal" em MP4/AAC — como não
foi fornecida nenhuma tabela de specs de uma rádio ou plataforma de
distribuição concreta, este formato usa valores genéricos de entrega (o
mesmo padrão de loudness broadcast já usado para TV), sinalizados no
campo Observações como "a confirmar sempre junto da rádio ou da central
de meios antes de entregar" (ver secção "Exportação para Excel" abaixo).
O meio offline restante (Cinema) já tem a estrutura de exportação pronta
(a sua própria folha), mas entra na base só quando houver dados reais
para o mapear — nunca é inventado.

Alguns publishers têm mais que um **Veículo** distinto — em Imprensa,
"Correio da Manhã" cobre o jornal diário, o suplemento "Mais Sport" e as
3 revistas semanais "Boa Onda"/"VIDAS"/"Domingo"; em TV, "TVI" cobre os
canais "TVI" e "CNN Portugal" — cada um com as suas próprias
dimensões/observações mesmo quando o nome do Formato se repete (ex.:
"Página" existe em 5 veículos diferentes do Correio da Manhã, "Ecrã
Fracionado/Split Screen" existe em 2 veículos da TVI). Por isso a coluna
**Veículo** ganha uma coluna própria na Biblioteca de Formatos e no
Construir Pedido sempre que, dentro de um publisher, há mais que um
veículo distinto do próprio nome do publisher — nos restantes casos
(a maioria, onde Veículo = Fornecedor) a coluna nem aparece, para não
ficar redundante (ver `opcoes.comVeiculo` em `app.js`). Dentro de cada
publisher, as linhas ficam sempre por ordem alfabética — primeiro pelo
Veículo, depois pelo Formato — para blocos como o Correio da Manhã ou a
TVI não dependerem da ordem em que as linhas foram acrescentadas à base.

## Traduções das specs (EN/ES/FR)

Além da interface, a app também traduz o conteúdo de cada formato —
Dimensão, Aspect Ratio, Peso, Tipo de Ficheiro e Copies (e, nalguns casos
raros, o próprio nome do formato, quando tinha uma palavra em português,
ex.: "Vídeo" → "Video"). Estas traduções vivem num ficheiro à parte,
`data/traducoes-specs.json`, e não no Excel, por decisão explícita: a
empresa contratada que atualiza `data/base-formatos.xlsx` continua a
trabalhar só em português, sem se preocupar com idiomas.

Estrutura do ficheiro: um objeto indexado por `"Fornecedor|Veículo|Formato"`
(o texto exato como está na base, ver `chaveTraducao` em `app.js`), com uma
chave por língua (`en`, `es`, `fr`), cada uma com os campos traduzidos que
se aplicam. A chave inclui o Veículo (não só Fornecedor+Formato) porque um
mesmo Fornecedor pode ter vários Veículos com o mesmo nome de Formato —
ex.: "Correio da Manhã" tem "Página" no jornal diário, no suplemento Mais
Sport e em cada uma das 3 revistas semanais, cada um com uma tradução
diferente porque a Dimensão também é diferente.

```json
{
  "Facebook|Facebook|Single Image": {
    "en": { "dimensao": "Feed: 1440x1800 (min. 600px width...)", "copies": "..." },
    "es": { "dimensao": "Feed: 1440x1800 (mín. 600px ancho...)", "copies": "..." },
    "fr": { "dimensao": "Feed : 1440x1800 (min. 600px largeur...)", "copies": "..." }
  }
}
```

**Comportamento de fallback**: se uma linha (ou um campo específico) não
tiver tradução — porque é nova e ainda não foi traduzida, ou porque o
ficheiro nem existe — a app mostra sempre o texto original em português,
em vez de deixar o campo vazio. Nunca inventa uma tradução em runtime.

**Como manter atualizado**: sempre que a base ganha formatos novos ou specs
alteradas, as traduções desses formatos ficam em falta até serem geradas
(por mim, ou por outra sessão) e adicionadas a este ficheiro — não é um
processo automático nem faz parte da atualização normal do Excel pela
empresa contratada.

## Exportação para Excel

O botão "Exportar para Excel" gera um `.xlsx` com **uma folha por meio de
compra** (Digital, OOH, TV, Rádio, Cinema, Imprensa) — só entram as folhas
dos meios que têm pelo menos um formato selecionado, para cada
equipa/fornecedor poder trabalhar só com a folha que lhe interessa. Cada
folha tem o logótipo e cor da Companhia escolhida, os dados da Campanha, e
uma secção por objetivo selecionado (Awareness / Consideration /
Conversion), cada uma com o seu próprio cabeçalho de tabela. Esta estrutura
é igual nas duas Companhias (Havas Media / Arena Media) — só o logótipo e
a cor de cabeçalho mudam.

Cada meio tem o seu **próprio template de colunas**, só com as colunas que
lhe fazem sentido (ver `COLUNAS_POR_MEIO_EXCEL` em `app.js`), em vez de uma
tabela única cheia de colunas vazias para a maioria dos meios:

- **Digital**: Canal, Plataforma/Publisher, Formato, Tema (Grupo
  Digital2020), Dimensão, Aspect Ratio, Peso, Tipo de Ficheiro, Copies,
  Observações e Link (a estrutura completa original).
- **OOH**: Concessionário, Formato, Dimensão, Aspect Ratio, Tipo de
  Ficheiro e Observações.
- **TV**: Canal, Formato, Dimensão, Aspect Ratio, Tipo de Ficheiro e
  Observações.
- **Rádio**: Estação, Formato, Tipo de Ficheiro e Observações.
- **Imprensa**: Título, Formato, Dimensão, Tipo de Ficheiro e Observações.
- **Cinema**: mesmo template do TV (ainda sem formatos próprios na base).

A coluna "Plataforma/Publisher" muda de nome consoante o meio — é o
Concessionário em OOH, o Canal em TV, a Estação em Rádio e o Título em
Imprensa — porque é assim que cada equipa reconhece esse dado (ver
`CHAVE_TRADUCAO_COL_PLATAFORMA_POR_MEIO` em `app.js`); um meio sem entrada
aí mantém o rótulo genérico "Plataforma/Publisher". A coluna Link (para a
spec oficial de cada formato) só existe na folha Digital — nos restantes
meios a base ainda não tem esse dado preenchido, por isso a coluna nem
aparece no template.

O "meio" de cada formato vem do campo **Meio** da base (`Internet` e
`Programático` mapeiam ambos para a folha "Digital"; `OOH`, `TV`, `Rádio`,
`Cinema` e `Imprensa` mapeiam cada um para a sua própria folha — ver
`ORDEM_MEIOS_EXCEL` e `VALOR_BASE_PARA_GRUPO_MEIO` em `app.js`). Um valor
de Meio novo que ainda não esteja nesse mapeamento ganha na mesma a sua
própria folha (com esse nome tal como vem da base), em vez de desaparecer.

### Duração do Spot (TV/Rádio)

Só os formatos de **spot** de TV e Rádio (o nome do Formato contém "spot",
ver `formatoTemDuracao` em `app.js`) têm esta característica que nenhum
outro meio tem: o mesmo formato pode ser pedido em mais que uma duração ao
mesmo tempo (ex.:
o spot principal de 30″ + um recorte de 15″ para outro momento da
campanha) — cada duração é um spot pedido à parte. Por isso, na tab
"Construir Pedido", qualquer formato de TV ou Rádio ganha uma coluna extra
com checkboxes de duração (15″/20″/30″, mais que uma pode estar marcada) e
"Outro" (mostra logo a seguir uma caixa de texto editável, também
combinável com as outras). As durações escolhidas são guardadas por
objetivo, tal como a própria seleção (o mesmo "Spot TV" pode ter 30″ em
Awareness e 15″+20″ em Consideration), persistem ao trocar de
idioma/filtro/objetivo e ao recarregar a página (localStorage). Sem
nenhuma escolha explícita, assume só 30″ (`DURACAO_OMISSAO` em `app.js`)
— a duração mais comum — para nunca ficar por preencher.

No resumo da seleção e na exportação para Excel, um formato com várias
durações escolhidas aparece uma vez por duração (são pedidos de spots
distintos). No Excel, a duração tem a sua própria coluna **Secundagem**
(nas folhas TV e Rádio — ver `COLUNAS_POR_MEIO_EXCEL` em `app.js`),
separada da coluna Formato: por exemplo, Formato "Spot TV (HD — XDCAM
HD422)" com Secundagem "20″" numa linha e "30″" noutra, em vez de tudo
junto no nome do formato.

Os outros formatos de TV (Ecrã Fracionado/Split Screen, Telepromoção) não
têm este seletor nem a coluna Secundagem — a sua duração, quando é fixa
(ex.: Ecrã Fracionado são sempre 10″) ou não é bem o mesmo conceito de
"secundagem" de um spot (ex.: o guião de uma Telepromoção), já vem descrita
nas Observações desse formato.
