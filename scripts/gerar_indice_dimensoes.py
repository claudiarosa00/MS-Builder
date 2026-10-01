"""
Índice de specs pesquisável (protótipo): uma linha por cada valor
encontrado no texto das colunas Dimensão e Peso dos formatos Digital
(Internet + Programático) — um tamanho em pixels ("NNNxNNN") ou um
peso ("NNN KB/MB/GB") — com o contexto de onde veio (ex.: "Mobile",
"Vídeo") e o Fornecedor/Veículo/Formato de origem. Resolve o problema
de não conseguir pesquisar/filtrar por um valor concreto (ex.:
"300x600" ou "150 KB") quando está enterrado em texto corrido com
vários valores por célula.

Duas folhas: "Dimensões" e "Pesos", mesma estrutura nas duas.

Extração mecânica (regex), nunca reinterpretação do conteúdo: cada
linha do índice é um excerto literal do texto já existente na base.

Correr a partir de qualquer diretoria:
    python3 scripts/gerar_indice_dimensoes.py
"""
import os
import re
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

RAIZ_PROJETO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEM = os.path.join(RAIZ_PROJETO, "data", "base-formatos.xlsx")
DESTINO = os.path.join(RAIZ_PROJETO, "data", "CSBuilder_Indice_Specs.xlsx")

PADRAO_DIMENSAO = re.compile(r"\b\d{2,5}\s*[x×]\s*\d{2,5}\b")
PADRAO_PESO = re.compile(r"\b\d+(?:[.,]\d+)?\s*(?:KB|MB|GB)\b", re.IGNORECASE)


def dividir_em_clausulas(texto):
    """Divide o texto em cláusulas por '.' e ';' de topo (fora de
    parênteses), para cada cláusula poder ser lida como "um facto"."""
    partes = []
    atual = []
    profundidade = 0
    for caractere in texto:
        if caractere == "(":
            profundidade += 1
        elif caractere == ")":
            profundidade -= 1
        if caractere in ".;" and profundidade == 0:
            partes.append("".join(atual))
            atual = []
        else:
            atual.append(caractere)
    partes.append("".join(atual))
    return [p.strip() for p in partes if p.strip()]


def extrair_contexto_e_valores(texto, padrao):
    """Devolve uma lista [(contexto, valor), ...] — uma entrada por
    cada ocorrência do padrão encontrada no texto, com o rótulo da
    cláusula onde apareceu (ex.: "Vídeo: 30 MB; Imagem: 4 GB" dá duas
    entradas, cada uma com o seu contexto). Sem rótulo reconhecível,
    usa-se a própria cláusula (truncada) como contexto."""
    if not texto:
        return []
    resultados = []
    for clausula in dividir_em_clausulas(texto):
        ocorrencias = list(padrao.finditer(clausula))
        if not ocorrencias:
            continue
        correspondencia_rotulo = re.match(r"^([^:]{2,50}):\s*(.*)$", clausula)
        if correspondencia_rotulo:
            contexto = correspondencia_rotulo.group(1).strip()
        else:
            contexto = clausula[:60].strip() + ("…" if len(clausula) > 60 else "")
        for ocorrencia in ocorrencias:
            valor = ocorrencia.group(0).strip()
            resultados.append((contexto, valor))
    return resultados


def normalizar_dimensao(valor):
    return valor.replace(" ", "").replace("×", "x")


def normalizar_peso(valor):
    # "5120KB" -> "5120 KB" (garante sempre um espaço antes da unidade,
    # mesmo quando a base não o tinha).
    return re.sub(r"(\d)([.,]?\d*)\s*(KB|MB|GB)", lambda m: f"{m.group(1)}{m.group(2)} {m.group(3).upper()}", valor)


wb_origem = openpyxl.load_workbook(ORIGEM, data_only=True)
ws_origem = wb_origem.active
cabecalhos = [c.value for c in ws_origem[1]]
idx = {h: i for i, h in enumerate(cabecalhos)}

linhas_dimensao = []
linhas_peso = []
for row in ws_origem.iter_rows(min_row=2, values_only=True):
    meio = (row[idx["Meio"]] or "").upper()
    if meio not in ("INTERNET", "PROGRAMÁTICO"):
        continue
    fornecedor = row[idx["Fornecedor"]]
    veiculo = row[idx["Veículo"]]
    formato = row[idx["Formato"]]

    for contexto, dimensao in extrair_contexto_e_valores(row[idx["Dimensão"]], PADRAO_DIMENSAO):
        linhas_dimensao.append((normalizar_dimensao(dimensao), fornecedor, veiculo, formato, contexto))

    for contexto, peso in extrair_contexto_e_valores(row[idx["Peso"]], PADRAO_PESO):
        linhas_peso.append((normalizar_peso(peso), fornecedor, veiculo, formato, contexto))

# Ordenado pelo próprio valor primeiro — abres a folha e já vês tudo
# agrupado por tamanho/peso; o AutoFilter permite reordenar por
# Fornecedor/Formato se for mais útil num dado momento.
linhas_dimensao.sort(key=lambda linha: (linha[0], linha[1] or "", linha[3] or ""))
linhas_peso.sort(key=lambda linha: (linha[0], linha[1] or "", linha[3] or ""))

wb = openpyxl.Workbook()
wb.remove(wb.active)

FONTE_CABECALHO = Font(bold=True, color="FFFFFF")
FUNDO_CABECALHO = PatternFill("solid", fgColor="1A1A1A")
FONTE_CELULA = Font(size=10)
ALINHAMENTO = Alignment(vertical="center", wrap_text=True)
BORDA_CLARA = Side(style="thin", color="DCDCDC")
BORDA_COMPLETA = Border(top=BORDA_CLARA, left=BORDA_CLARA, bottom=BORDA_CLARA, right=BORDA_CLARA)


def escrever_folha(nome_folha, titulo_coluna_valor, linhas):
    folha = wb.create_sheet(nome_folha)
    folha.freeze_panes = "A2"
    folha.views.sheetView[0].showGridLines = False

    colunas = [titulo_coluna_valor, "Fornecedor", "Veículo", "Formato", "Contexto"]
    larguras = {titulo_coluna_valor: 16, "Fornecedor": 22, "Veículo": 22, "Formato": 28, "Contexto": 55}

    for i, nome_coluna in enumerate(colunas, start=1):
        celula = folha.cell(row=1, column=i, value=nome_coluna)
        celula.font = FONTE_CABECALHO
        celula.fill = FUNDO_CABECALHO
        celula.alignment = Alignment(vertical="center")
        celula.border = BORDA_COMPLETA
        folha.column_dimensions[get_column_letter(i)].width = larguras[nome_coluna]

    for linha_num, linha in enumerate(linhas, start=2):
        for i, valor in enumerate(linha, start=1):
            celula = folha.cell(row=linha_num, column=i, value=valor)
            celula.font = FONTE_CELULA
            celula.alignment = ALINHAMENTO
            celula.border = BORDA_COMPLETA

    folha.auto_filter.ref = f"A1:{get_column_letter(len(colunas))}{len(linhas) + 1}"
    return len(linhas)


total_dimensao = escrever_folha("Dimensões", "Dimensão", linhas_dimensao)
total_peso = escrever_folha("Pesos", "Peso", linhas_peso)

wb.save(DESTINO)
print("Gerado:", DESTINO)
print("Total de linhas — Dimensões:", total_dimensao)
print("Total de linhas — Pesos:", total_peso)
