"""
Versão "mais detalhada" de CSBuilder_Base_Formatos.xlsx: exatamente a
mesma base, mas os formatos do Meta (Facebook/Instagram: Single Image,
Single Video, Carousel, Collection) saem com uma linha por placement
(Feed/Stories/Reels/Explorar) em vez de uma única linha com tudo
condensado — cada placement tem a sua própria Dimensão/Aspect
Ratio/Copies, lidos diretamente do texto já existente na base (nunca
inventados).

Ficheiro só de referência/consulta — não é lido pela app, e os restantes
formatos (fora dos 8 do Meta) continuam exatamente como na base: uma
linha só, sem coluna Placement preenchida.

Correr a partir da raiz do projeto ou de qualquer diretoria:
    python3 scripts/gerar_base_detalhada_placements.py
"""
import os
import re
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

RAIZ_PROJETO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEM = os.path.join(RAIZ_PROJETO, "data", "base-formatos.xlsx")
DESTINO = os.path.join(RAIZ_PROJETO, "data", "CSBuilder_Base_Formatos_Detalhado.xlsx")

MAPA_MEIO = {
    "INTERNET": "Digital",
    "PROGRAMÁTICO": "Digital",
    "OOH": "OOH",
    "TV": "TV",
    "RÁDIO": "Rádio",
    "RADIO": "Rádio",
    "CINEMA": "Cinema",
    "IMPRENSA": "Imprensa",
}
ORDEM_MEIOS = ["Digital", "OOH", "TV", "Rádio", "Cinema", "Imprensa"]

# Os únicos formatos onde o padrão "Feed: ...; Stories: ...; Reels: ...;
# Explorar: ..." em Dimensão/Aspect Ratio/Copies representa mesmo
# placements distintos (sítios diferentes da mesma rede, cada um com a
# sua dimensão) — confirmado um a um com a Cláudia. Todos os outros
# formatos com texto parecido (variantes de ecrã, peças de um único
# anúncio, opções de rácio à escolha, parâmetros técnicos) ficaram de
# fora de propósito, para não separar em linhas o que não é mesmo um
# placement à parte.
FORMATOS_COM_PLACEMENT = {("Facebook", "Single Image"), ("Facebook", "Single Video"),
                           ("Facebook", "Carousel"), ("Facebook", "Collection"),
                           ("Instagram", "Single Image"), ("Instagram", "Single Video"),
                           ("Instagram", "Carousel"), ("Instagram", "Collection")}
PLACEMENTS_CONHECIDOS = ["Feed", "Stories", "Reels", "Explorar"]


def dividir_respeitando_parenteses(texto, separador=";"):
    """Divide o texto pelo separador, mas ignora ocorrências dentro de
    parênteses (ex.: "Feed: 1440x1800 (mín. 500px; prop. 4:5)" não deve
    partir-se a meio do parêntese)."""
    partes = []
    atual = []
    profundidade = 0
    for caractere in texto:
        if caractere == "(":
            profundidade += 1
        elif caractere == ")":
            profundidade -= 1
        if caractere == separador and profundidade == 0:
            partes.append("".join(atual))
            atual = []
        else:
            atual.append(caractere)
    partes.append("".join(atual))
    return partes


def repartir_por_placement(texto):
    """'Feed: a; Stories: b; Reels: c.' -> {'Feed': 'a', 'Stories': 'b', 'Reels': 'c'}.
    Devolve {} se o texto não existir ou não seguir este padrão."""
    if not texto:
        return {}
    texto = texto.strip()
    if texto.endswith("."):
        texto = texto[:-1]
    resultado = {}
    for segmento in dividir_respeitando_parenteses(texto):
        segmento = segmento.strip()
        correspondencia = re.match(r"^(Feed|Stories|Reels|Explorar)\s*:\s*(.*)$", segmento)
        if correspondencia:
            resultado[correspondencia.group(1)] = correspondencia.group(2).strip()
    return resultado


wb_origem = openpyxl.load_workbook(ORIGEM, data_only=True)
ws_origem = wb_origem.active
cabecalhos = [c.value for c in ws_origem[1]]
idx = {h: i for i, h in enumerate(cabecalhos)}

linhas_por_meio = {m: [] for m in ORDEM_MEIOS}
for row in ws_origem.iter_rows(min_row=2, values_only=True):
    meio_bruto = (row[idx["Meio"]] or "").upper()
    grupo = MAPA_MEIO.get(meio_bruto)
    if grupo:
        linhas_por_meio[grupo].append(row)

COLUNAS_BASE = ["Fornecedor", "Veículo", "Formato", "Dimensão", "Aspect Ratio", "Peso", "Tipo de Ficheiro", "Observações", "Link"]
LARGURAS = {
    "Fornecedor": 22, "Veículo": 22, "Grupo Digital2020": 18, "Formato": 24, "Placement": 14,
    "Dimensão": 45, "Aspect Ratio": 20, "Peso": 18, "Tipo de Ficheiro": 24,
    "Copies": 40, "Entrega": 22, "Observações": 45, "Link": 40,
}

wb = openpyxl.Workbook()
wb.remove(wb.active)

FONTE_CABECALHO = Font(bold=True, color="FFFFFF")
FUNDO_CABECALHO = PatternFill("solid", fgColor="1A1A1A")
FONTE_CELULA = Font(size=10)
ALINHAMENTO = Alignment(vertical="center", wrap_text=True)
BORDA_CLARA = Side(style="thin", color="DCDCDC")
BORDA_COMPLETA = Border(top=BORDA_CLARA, left=BORDA_CLARA, bottom=BORDA_CLARA, right=BORDA_CLARA)
# Linhas de placement (variantes dentro do mesmo formato) ganham um
# fundo ligeiramente diferente, para se perceber à primeira vista que
# pertencem ao mesmo formato "pai" sem ter de ler a coluna Formato.
FUNDO_PLACEMENT = PatternFill("solid", fgColor="F4F7FC")

contagem_placement_gerados = 0

for meio in ORDEM_MEIOS:
    linhas = linhas_por_meio[meio]
    if not linhas:
        continue

    colunas = list(COLUNAS_BASE)
    if meio == "Digital":
        colunas.insert(2, "Grupo Digital2020")
        colunas.insert(colunas.index("Formato") + 1, "Placement")
        colunas.insert(colunas.index("Observações"), "Copies")
    if meio == "TV":
        colunas.insert(colunas.index("Observações"), "Entrega")

    folha = wb.create_sheet(meio)
    folha.freeze_panes = "A2"
    folha.views.sheetView[0].showGridLines = False

    for i, nome_coluna in enumerate(colunas, start=1):
        celula = folha.cell(row=1, column=i, value=nome_coluna)
        celula.font = FONTE_CABECALHO
        celula.fill = FUNDO_CABECALHO
        celula.alignment = Alignment(vertical="center")
        celula.border = BORDA_COMPLETA
        folha.column_dimensions[get_column_letter(i)].width = LARGURAS.get(nome_coluna, 20)

    linha_atual = 2
    for row in linhas:
        fornecedor = row[idx["Fornecedor"]]
        formato_nome = row[idx["Formato"]]
        chave = (fornecedor, formato_nome)

        if chave in FORMATOS_COM_PLACEMENT:
            dim_por_placement = repartir_por_placement(row[idx["Dimensão"]])
            ar_por_placement = repartir_por_placement(row[idx["Aspect Ratio"]])
            copies_por_placement = repartir_por_placement(row[idx["Copies"]]) if "Copies" in idx else {}
            placements_desta_linha = [p for p in PLACEMENTS_CONHECIDOS if p in dim_por_placement]
        else:
            placements_desta_linha = [None]  # uma única linha, sem placement

        for placement in placements_desta_linha:
            for i, nome_coluna in enumerate(colunas, start=1):
                if nome_coluna == "Placement":
                    valor = placement or ""
                elif nome_coluna == "Entrega":
                    celula = folha.cell(row=linha_atual, column=i, value="GoFastWay\nwww.gofastway.tv")
                    celula.hyperlink = "http://www.gofastway.tv"
                    celula.font = Font(size=10, color="1155CC", underline="single")
                    celula.alignment = ALINHAMENTO
                    celula.border = BORDA_COMPLETA
                    if placement:
                        celula.fill = FUNDO_PLACEMENT
                    continue
                elif nome_coluna == "Link":
                    link = row[idx["Link"]]
                    if link:
                        celula = folha.cell(row=linha_atual, column=i, value=link)
                        celula.hyperlink = link
                        celula.font = Font(size=10, color="1155CC", underline="single")
                        celula.alignment = ALINHAMENTO
                        celula.border = BORDA_COMPLETA
                        if placement:
                            celula.fill = FUNDO_PLACEMENT
                        continue
                    valor = None
                elif placement and nome_coluna == "Dimensão":
                    valor = dim_por_placement.get(placement, "")
                elif placement and nome_coluna == "Aspect Ratio":
                    valor = ar_por_placement.get(placement, "")
                elif placement and nome_coluna == "Copies":
                    valor = copies_por_placement.get(placement, "")
                else:
                    valor = row[idx[nome_coluna]] if nome_coluna in idx else None
                celula = folha.cell(row=linha_atual, column=i, value=valor)
                celula.font = FONTE_CELULA
                celula.alignment = ALINHAMENTO
                celula.border = BORDA_COMPLETA
                if placement:
                    celula.fill = FUNDO_PLACEMENT
            linha_atual += 1
            if placement:
                contagem_placement_gerados += 1

    folha.auto_filter.ref = f"A1:{get_column_letter(len(colunas))}{linha_atual - 1}"

wb.save(DESTINO)
print("Gerado:", DESTINO)
for meio in ORDEM_MEIOS:
    if linhas_por_meio[meio]:
        print(f"  {meio}: {len(linhas_por_meio[meio])} formatos na base")
print(f"Linhas de placement geradas (Meta): {contagem_placement_gerados} (a partir de 8 formatos)")
