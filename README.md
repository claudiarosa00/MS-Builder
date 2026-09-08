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
  seleção, organizada por publisher e por canal (Social Media / Compra Direta
  / Google / Programático).
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

Os 353 formatos em `data/base-formatos.xlsx` (folha "Base Formatos") foram
mapeados a partir da base real de specs da agência (269 formatos de
publisher → 40 categorias "Digital2020" canónicas, mais os formatos
Programmatic/DV360 adicionados depois). Colunas: **Meio**, **Canal**,
**Fornecedor**, **Veículo**, **Grupo Digital2020**, **Formato**,
**Dimensão**, **Aspect Ratio**, **Peso**, **Tipo de Ficheiro**, **Copies**,
**Link**.

A coluna **Dimensão** deve conter só as dimensões/proporções/durações que
é preciso entregar — não informação de texto. Os limites de copy (texto
principal, título, descrição, CTA, hashtags, etc.) ficam na coluna
**Copies**, separada, sobretudo relevante em Social Media e Google.

A coluna **Aspect Ratio** é calculada a partir da Dimensão, não escrita à
mão: usa o rácio já indicado explicitamente no texto (ex.: "(1:1)") quando
existe, ou calcula-o a partir dos pixels quando bate certo com um rácio
"redondo" reconhecível (1:1, 4:5, 9:16, 16:9, 1.91:1, 4:3, etc., com margem
de ~1,5% para arredondamentos); fica em branco quando a dimensão não
corresponde a nenhum rácio reconhecível, em vez de forçar um valor.

Os formatos Programmatic (`Fornecedor = "DV360"`, `Canal = "Programático"`)
têm o Veículo específico quando o próprio nome do formato o indica (ex.:
"Prog - YouTube Masthead" → Veículo "YouTube"; "Prog - Uber Journey Ad" →
"Uber"); nos restantes, fica genérico "DV360".

Alguns formatos Programmatic (ex.: "Prog - Billboard") representam inventário
que pode ser comprado em qualquer publisher de compra direta que tenha esse
mesmo formato — nesses casos, a linha genérica foi substituída por uma linha
por publisher (ex.: "Prog - Billboard (Impresa)", "Prog - Billboard (Sapo)"),
cada uma com as specs reais copiadas diretamente da linha desse publisher
(nunca inventadas). Quando um publisher tinha várias variantes do mesmo
formato, só a variante mais standard entrou.

**Para atualizar a base** (ex.: uma empresa contratada entrega specs novas
periodicamente): basta substituir `data/base-formatos.xlsx` por um ficheiro
novo com a mesma folha e as mesmas colunas (a ordem das colunas pode mudar —
a app lê pelo nome do cabeçalho, não pela posição). Não é preciso nenhuma
conversão nem ferramenta extra: a app lê o Excel diretamente no browser.

**Princípio importante**: os dados nunca são inventados — tudo o que está na
base vem da informação real fornecida pela agência. Onde não havia
informação disponível, o campo fica em branco em vez de ser preenchido com
um palpite.

Atualmente cobre apenas o meio **Internet** (Social Media, Compra Direta e
Google/Search). Outros meios (TV, OOH, Cinema, Imprensa) ficam para uma fase
futura, quando houver dados reais para os mapear da mesma forma.

## Traduções das specs (EN/ES/FR)

Além da interface, a app também traduz o conteúdo de cada formato —
Dimensão, Aspect Ratio, Peso, Tipo de Ficheiro e Copies (e, nalguns casos
raros, o próprio nome do formato, quando tinha uma palavra em português,
ex.: "Vídeo" → "Video"). Estas traduções vivem num ficheiro à parte,
`data/traducoes-specs.json`, e não no Excel, por decisão explícita: a
empresa contratada que atualiza `data/base-formatos.xlsx` continua a
trabalhar só em português, sem se preocupar com idiomas.

Estrutura do ficheiro: um objeto indexado por `"Fornecedor|Formato"` (o
texto exato como está na base), com uma chave por língua (`en`, `es`,
`fr`), cada uma com os campos traduzidos que se aplicam.

```json
{
  "Facebook|Single Image": {
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

O botão "Exportar para Excel" gera um `.xlsx` com o logótipo e cor da
Companhia escolhida, os dados da Campanha, e uma secção por objetivo
selecionado (Awareness / Consideration / Conversion), cada uma com o seu
próprio cabeçalho de tabela — incluindo Canal, Plataforma/Publisher,
Dimensão, Peso, Tipo de Ficheiro e um link direto para a spec oficial de
cada formato.
