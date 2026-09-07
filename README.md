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
  / Google).
- Suporta 4 idiomas (Português, Inglês, Espanhol, Francês) — só a interface e
  os cabeçalhos do Excel são traduzidos; os dados reais dos formatos nunca
  são alterados.

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
lib/exceljs.min.js          Biblioteca ExcelJS (versão 4.4.0), usada tanto
                            para ler esta base como para gerar o .xlsx
                            exportado, ambos diretamente no browser
assets/                     Logótipos (cabeçalho da app + os usados no Excel
                            exportado, consoante a Companhia escolhida)
templates/                  Reservado para uso futuro (atualmente vazio)
```

## Base de dados de formatos

Os 269 formatos em `data/base-formatos.xlsx` (folha "Base Formatos") foram
mapeados a partir da base real de specs da agência (269 formatos de
publisher → 40 categorias "Digital2020" canónicas). Colunas: **Meio**,
**Canal**, **Fornecedor**, **Veículo**, **Grupo Digital2020**, **Formato**,
**Dimensão**, **Peso**, **Tipo de Ficheiro**, **Link**.

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

## Exportação para Excel

O botão "Exportar para Excel" gera um `.xlsx` com o logótipo e cor da
Companhia escolhida, os dados da Campanha, e uma secção por objetivo
selecionado (Awareness / Consideration / Conversion), cada uma com o seu
próprio cabeçalho de tabela — incluindo Canal, Plataforma/Publisher,
Dimensão, Peso, Tipo de Ficheiro e um link direto para a spec oficial de
cada formato.
