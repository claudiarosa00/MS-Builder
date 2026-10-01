"""
Índice de specs pesquisável — versão completa: uma linha por cada valor
encontrado no texto das colunas Dimensão, Peso, Aspect Ratio, Tipo de
Ficheiro e Copies, em TODOS os meios (Digital, OOH, TV, Rádio, Cinema,
Imprensa) — com o contexto de onde veio (ex.: "Mobile", "Vídeo") e o
Fornecedor/Veículo/Formato de origem. Resolve o problema de não
conseguir pesquisar/filtrar por um valor concreto (ex.: "300x600",
"150 KB", "16:9", "MP4") quando está enterrado em texto corrido com
vários valores por célula.

Cinco folhas, mesma estrutura em todas: Dimensões, Pesos, Aspect
Ratios, Tipos de Ficheiro, Copies.

Extração mecânica (regex / lista de termos conhecidos), nunca
reinterpretação do conteúdo: cada linha do índice é um excerto literal
do texto já existente na base. A folha "Tipos de Ficheiro" só reconhece
os formatos de ficheiro da lista TIPOS_FICHEIRO_CONHECIDOS abaixo — um
tipo de ficheiro muito invulgar que não esteja nessa lista fica de fora
do índice (mas continua, tal como sempre esteve, na coluna Tipo de
Ficheiro da base e do Excel exportado — o índice é só uma camada de
pesquisa por cima, nunca substitui os dados reais).

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

PADRAO_DIMENSAO = re.compile(r"\b\d{2,5}\s*[x×]\s*\d{2,5}\s*(?:px|mm|cm)?\b", re.IGNORECASE)
PADRAO_PESO = re.compile(r"\b\d+(?:[.,]\d+)?\s*(?:KB|MB|GB)\b", re.IGNORECASE)
PADRAO_ASPECT_RATIO = re.compile(r"\b\d+(?:[.,]\d+)?\s*:\s*\d+(?:[.,]\d+)?\b")
PADRAO_COPIES = re.compile(r"\b\d+(?:[.,]\d+)?\s*c\b", re.IGNORECASE)

# Só reconhece tipos de ficheiro desta lista (ver nota no topo do
# ficheiro) — ordenados dos nomes mais longos para os mais curtos, para
# o regex casar "HTML5" antes de "HTML" quando os dois aparecem juntos.
TIPOS_FICHEIRO_CONHECIDOS = sorted([
    "JPEG", "JPG", "PNG", "GIF", "PDF", "TIFF", "TGA", "PSD", "EPS", "BMP", "SVG", "WEBP",
    "MP4", "MOV", "MXF", "WEBM", "AVI", "WMV", "MPEG4", "MPEG2", "MPEG", "MPG", "M4V", "3GP",
    "WAV", "MP3", "AAC", "FLAC", "ZIP", "HTML5", "HTML", "DOC", "DOCX", "XLS", "XLSX",
    "PPT", "PPTX", "C4D", "FBX", "OBJ", "DPX", "CSV", "TXT", "XML", "JSON", "AI", "EPS",
], key=len, reverse=True)
PADRAO_TIPO_FICHEIRO = re.compile(r"\b(?:" + "|".join(TIPOS_FICHEIRO_CONHECIDOS) + r")\b", re.IGNORECASE)

MAPA_MEIO = {
    "INTERNET": "Digital", "PROGRAMÁTICO": "Digital", "OOH": "OOH", "TV": "TV",
    "RÁDIO": "Rádio", "RADIO": "Rádio", "CINEMA": "Cinema", "IMPRENSA": "Imprensa",
}


def dividir_em_clausulas(texto):
    """Divide o texto em cláusulas por '.' e ';' de topo (fora de
    parênteses), para cada cláusula poder ser lida como "um facto". Um
    '.' entre dois dígitos (ex.: "1.5 MB", "40.000c" — a base mistura
    "." como separador decimal e como separador de milhares) nunca é
    tratado como fim de frase, para não partir o número ao meio."""
    partes = []
    atual = []
    profundidade = 0
    for i, caractere in enumerate(texto):
        if caractere == "(":
            profundidade += 1
        elif caractere == ")":
            profundidade -= 1
        ponto_dentro_de_numero = (
            caractere == "."
            and i > 0 and i + 1 < len(texto)
            and texto[i - 1].isdigit() and texto[i + 1].isdigit()
        )
        if caractere in ".;" and profundidade == 0 and not ponto_dentro_de_numero:
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
        rotulo = correspondencia_rotulo.group(1).strip() if correspondencia_rotulo else None
        # Um "rótulo" sem nenhuma letra (ex.: "16" antes de "16:9") não é
        # um rótulo real — é o próprio valor a ser cortado ao meio pelo
        # ":" (um rácio tipo Aspect Ratio tem ":" lá dentro). Nesses
        # casos usa-se a cláusula completa como contexto.
        if rotulo and re.search(r"[A-Za-zÀ-ú]", rotulo):
            contexto = rotulo
        else:
            contexto = clausula[:60].strip() + ("…" if len(clausula) > 60 else "")
        for ocorrencia in ocorrencias:
            resultados.append((contexto, ocorrencia.group(0).strip()))
    return resultados


def normalizar_dimensao(valor):
    valor = valor.replace(" ", "").replace("×", "x")
    return re.sub(r"(px|mm|cm)$", lambda m: m.group(1).lower(), valor, flags=re.IGNORECASE)


def normalizar_peso(valor):
    return re.sub(r"(\d)([.,]?\d*)\s*(KB|MB|GB)", lambda m: f"{m.group(1)}{m.group(2)} {m.group(3).upper()}", valor, flags=re.IGNORECASE)


def normalizar_aspect_ratio(valor):
    return valor.replace(" ", "")


def normalizar_tipo_ficheiro(valor):
    return valor.upper()


wb_origem = openpyxl.load_workbook(ORIGEM, data_only=True)
ws_origem = wb_origem.active
cabecalhos = [c.value for c in ws_origem[1]]
idx = {h: i for i, h in enumerate(cabecalhos)}

FOLHAS = {
    "Dimensões": {"coluna_origem": "Dimensão", "padrao": PADRAO_DIMENSAO, "normalizar": normalizar_dimensao, "linhas": []},
    "Pesos": {"coluna_origem": "Peso", "padrao": PADRAO_PESO, "normalizar": normalizar_peso, "linhas": []},
    "Aspect Ratios": {"coluna_origem": "Aspect Ratio", "padrao": PADRAO_ASPECT_RATIO, "normalizar": normalizar_aspect_ratio, "linhas": []},
    "Tipos de Ficheiro": {"coluna_origem": "Tipo de Ficheiro", "padrao": PADRAO_TIPO_FICHEIRO, "normalizar": normalizar_tipo_ficheiro, "linhas": []},
    "Copies": {"coluna_origem": "Copies", "padrao": PADRAO_COPIES, "normalizar": lambda v: v.replace(" ", "").lower(), "linhas": []},
}

for row in ws_origem.iter_rows(min_row=2, values_only=True):
    meio_bruto = (row[idx["Meio"]] or "").upper()
    meio = MAPA_MEIO.get(meio_bruto, meio_bruto.title() or "—")
    fornecedor = row[idx["Fornecedor"]]
    veiculo = row[idx["Veículo"]]
    formato = row[idx["Formato"]]

    for config in FOLHAS.values():
        texto_origem = row[idx[config["coluna_origem"]]] if config["coluna_origem"] in idx else None
        for contexto, valor_bruto in extrair_contexto_e_valores(texto_origem, config["padrao"]):
            valor = config["normalizar"](valor_bruto)
            config["linhas"].append((valor, meio, fornecedor, veiculo, formato, contexto))

wb = openpyxl.Workbook()
wb.remove(wb.active)

FONTE_CABECALHO = Font(bold=True, color="FFFFFF")
FUNDO_CABECALHO = PatternFill("solid", fgColor="1A1A1A")
FONTE_CELULA = Font(size=10)
ALINHAMENTO = Alignment(vertical="center", wrap_text=True)
BORDA_CLARA = Side(style="thin", color="DCDCDC")
BORDA_COMPLETA = Border(top=BORDA_CLARA, left=BORDA_CLARA, bottom=BORDA_CLARA, right=BORDA_CLARA)


def escrever_folha(nome_folha, titulo_coluna_valor, linhas):
    linhas = sorted(linhas, key=lambda linha: (linha[0], linha[2] or "", linha[4] or ""))
    folha = wb.create_sheet(nome_folha)
    folha.freeze_panes = "A2"
    folha.views.sheetView[0].showGridLines = False

    colunas = [titulo_coluna_valor, "Meio", "Fornecedor", "Veículo", "Formato", "Contexto"]
    larguras = {titulo_coluna_valor: 16, "Meio": 12, "Fornecedor": 22, "Veículo": 22, "Formato": 28, "Contexto": 55}

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


print("Gerado:", DESTINO)
for nome_folha, config in FOLHAS.items():
    total = escrever_folha(nome_folha, config["coluna_origem"], config["linhas"])
    print(f"  {nome_folha}: {total} linhas")

wb.save(DESTINO)
