# -*- coding: utf-8 -*-
"""Genera docs/manual-de-uso.pdf (Manual de uso del Panel de auditorías · JLB Systems).
Requiere: pip install reportlab   ·   Uso: python docs/generar-manual.py docs/manual-de-uso.pdf
Nota: usa solo caracteres de la fuente Helvetica estándar (sin flechas ni casillas Unicode).
"""
import sys
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.graphics.shapes import Drawing, Rect, String, Line
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak,
                                Table, TableStyle, KeepTogether, NextPageTemplate, Flowable)
from reportlab.platypus.tableofcontents import TableOfContents


# ── Fuentes: se incrustan TrueType para que negrita/cursiva se vean igual en cualquier visor.
import os
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping
_D = "/System/Library/Fonts/Supplemental/"
if os.path.exists(_D + "Arial.ttf"):
    for _n, _f in (("Body", "Arial.ttf"), ("Body-Bold", "Arial Bold.ttf"), ("Body-Italic", "Arial Italic.ttf"),
                   ("Body-BoldItalic", "Arial Bold Italic.ttf"), ("Mono", "Courier New.ttf")):
        pdfmetrics.registerFont(TTFont(_n, _D + _f))
    addMapping("Body", 0, 0, "Body"); addMapping("Body", 1, 0, "Body-Bold")
    addMapping("Body", 0, 1, "Body-Italic"); addMapping("Body", 1, 1, "Body-BoldItalic")
    FONT, FONT_B, FONT_I, MONO = "Body", "Body-Bold", "Body-Italic", "Mono"
else:  # respaldo: fuentes estándar de PDF
    FONT, FONT_B, FONT_I, MONO = "Helvetica", FONT_B, FONT_I, MONO

OUT = sys.argv[1] if len(sys.argv) > 1 else "manual-de-uso.pdf"

# ── Paleta (impresión: fondo blanco; acento del panel #0070F3)
BLUE = colors.HexColor("#0070F3")
INK = colors.HexColor("#111111")
GRAY = colors.HexColor("#555555")
LIGHT = colors.HexColor("#F3F5F8")
LINE = colors.HexColor("#D9DEE5")
TIP_BG, TIP_BAR = colors.HexColor("#EAF3FF"), BLUE
WARN_BG, WARN_BAR = colors.HexColor("#FFF4E5"), colors.HexColor("#E08A00")
STOP_BG, STOP_BAR = colors.HexColor("#FDECEC"), colors.HexColor("#D93025")
OK_BG, OK_BAR = colors.HexColor("#E8F6EE"), colors.HexColor("#1E8E5A")

# ── Estilos
base = ParagraphStyle("base", fontName=FONT, fontSize=10.2, leading=14.6, textColor=INK, alignment=TA_LEFT)
S = {
    "p": base,
    "small": ParagraphStyle("small", parent=base, fontSize=8.6, leading=12, textColor=GRAY),
    "h1": ParagraphStyle("h1", parent=base, fontName=FONT_B, fontSize=20, leading=25, spaceBefore=4, spaceAfter=10, textColor=INK),
    "h2": ParagraphStyle("h2", parent=base, keepWithNext=1, fontName=FONT_B, fontSize=13.2, leading=17, spaceBefore=12, spaceAfter=5, textColor=BLUE),
    "h3": ParagraphStyle("h3", parent=base, keepWithNext=1, fontName=FONT_B, fontSize=10.8, leading=14, spaceBefore=8, spaceAfter=3),
    "bul": ParagraphStyle("bul", parent=base, leftIndent=14, bulletIndent=3, spaceAfter=2),
    "num": ParagraphStyle("num", parent=base, leftIndent=18, bulletIndent=0, spaceAfter=2.5),
    "cell": ParagraphStyle("cell", parent=base, fontSize=8.8, leading=11.8),
    "cellb": ParagraphStyle("cellb", parent=base, fontSize=8.8, leading=11.8, fontName=FONT_B),
    "cellh": ParagraphStyle("cellh", parent=base, fontSize=8.8, leading=11.8, fontName=FONT_B, textColor=colors.white),
    "code": ParagraphStyle("code", parent=base, fontName=MONO, fontSize=8.6, leading=12, backColor=LIGHT,
                           borderPadding=(5, 6, 5, 6), leftIndent=6, rightIndent=6, spaceBefore=4, spaceAfter=8),
    "cover_t": ParagraphStyle("cover_t", parent=base, fontName=FONT_B, fontSize=34, leading=40),
    "cover_s": ParagraphStyle("cover_s", parent=base, fontSize=14, leading=20, textColor=GRAY),
}


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def P(t, st="p"):
    return Paragraph(t, S[st])


def B(items, st="bul"):
    return [Paragraph(i, S[st], bulletText="•") for i in items]


def N(items):
    return [Paragraph(t, S["num"], bulletText=f"{i}.") for i, t in enumerate(items, 1)]


def CODE(t):
    return Paragraph(esc(t).replace("\n", "<br/>").replace(" ", "&nbsp;"), S["code"])


class H(Paragraph):
    """Encabezado que alimenta el índice."""
    def __init__(self, text, level):
        super().__init__(text, S[f"h{level}"])
        self.level = level
        self.toc_text = text


def callout(kind, title, text, width=170 * mm):
    bg, bar = {"tip": (TIP_BG, TIP_BAR), "warn": (WARN_BG, WARN_BAR), "stop": (STOP_BG, STOP_BAR), "ok": (OK_BG, OK_BAR)}[kind]
    inner = [Paragraph(f"<b>{title}</b>", ParagraphStyle("ct", parent=base, fontSize=9.6, leading=13, textColor=bar)),
             Paragraph(text, ParagraphStyle("cx", parent=base, fontSize=9.4, leading=13.2))]
    t = Table([[inner]], colWidths=[width])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), bg), ("LINEBEFORE", (0, 0), (0, -1), 3, bar),
                           ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                           ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
    t.spaceAfter = 7
    t.keepWithNext = 0
    return t


def table(rows, widths, header=True, zebra=True):
    data = []
    for r, row in enumerate(rows):
        st = "cellh" if (header and r == 0) else "cell"
        data.append([Paragraph(c, S[st]) if isinstance(c, str) else c for c in row])
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    style = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("GRID", (0, 0), (-1, -1), 0.4, LINE),
             ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
             ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]
    if header:
        style += [("BACKGROUND", (0, 0), (-1, 0), BLUE)]
    if zebra:
        for i in range(1 if header else 0, len(data)):
            if i % 2 == 0:
                style.append(("BACKGROUND", (0, i), (-1, i), LIGHT))
    t.setStyle(TableStyle(style))
    return t


def stepbox(num, title):
    """Barra de título de un paso."""
    d = Drawing(170 * mm, 9 * mm)
    d.add(Rect(0, 0, 170 * mm, 9 * mm, fillColor=LIGHT, strokeColor=LINE, strokeWidth=0.5))
    d.add(Rect(0, 0, 10 * mm, 9 * mm, fillColor=BLUE, strokeColor=BLUE))
    d.add(String(5 * mm, 2.9 * mm, str(num), fontName=FONT_B, fontSize=11, fillColor=colors.white, textAnchor="middle"))
    d.add(String(13 * mm, 2.9 * mm, title, fontName=FONT_B, fontSize=11, fillColor=INK))
    return d


def where(text):
    return Paragraph(f"<font color='#0070F3'><b>Dónde:</b></font> {text}", S["p"])


# ── Diagramas
def flow_diagram():
    W, Hh = 170 * mm, 62 * mm
    d = Drawing(W, Hh)
    boxes = [("1", "Cliente, áreas", "y personas"), ("2", "Entrevistas", "(guion)"), ("3", "Procesos", "(inventario y ficha)"),
             ("4", "Mediciones", "(tiempos)"), ("5", "Puntuación", "y priorización"), ("6", "Hoja de ruta", "y riesgos"), ("7", "Reporte", "para el cliente")]
    bw, bh = 38 * mm, 15 * mm
    pos = [(0, 40 * mm), (44 * mm, 40 * mm), (88 * mm, 40 * mm), (132 * mm, 40 * mm),
           (22 * mm, 14 * mm), (66 * mm, 14 * mm), (110 * mm, 14 * mm)]
    for (n, a, b), (x, y) in zip(boxes, pos):
        d.add(Rect(x, y, bw, bh, rx=3, ry=3, fillColor=colors.white, strokeColor=BLUE, strokeWidth=1.2))
        d.add(Rect(x, y, 7 * mm, bh, fillColor=BLUE, strokeColor=BLUE))
        d.add(String(x + 3.5 * mm, y + bh / 2 - 1.5 * mm, n, fontName=FONT_B, fontSize=10, fillColor=colors.white, textAnchor="middle"))
        d.add(String(x + 9 * mm, y + 8.2 * mm, a, fontName=FONT_B, fontSize=8.6, fillColor=INK))
        d.add(String(x + 9 * mm, y + 3.6 * mm, b, fontName=FONT, fontSize=8, fillColor=GRAY))
    for i in range(3):  # flechas fila 1
        x = pos[i][0] + bw
        d.add(Line(x, 47.5 * mm, x + 6 * mm, 47.5 * mm, strokeColor=BLUE, strokeWidth=1.2))
    d.add(Line(pos[3][0] + bw / 2, 40 * mm, pos[3][0] + bw / 2, 36 * mm, strokeColor=BLUE, strokeWidth=1.2))
    d.add(Line(pos[3][0] + bw / 2, 36 * mm, pos[4][0] + bw / 2, 36 * mm, strokeColor=BLUE, strokeWidth=1.2))
    d.add(Line(pos[4][0] + bw / 2, 36 * mm, pos[4][0] + bw / 2, 29 * mm, strokeColor=BLUE, strokeWidth=1.2))
    for i in (4, 5):
        x = pos[i][0] + bw
        d.add(Line(x, 21.5 * mm, x + 6 * mm, 21.5 * mm, strokeColor=BLUE, strokeWidth=1.2))
    d.add(String(0, 5 * mm, "En paralelo durante toda la auditoría:  Horas (tiempo que dedicas)  y  Documentos (archivos del cliente).",
                 fontName=FONT_I, fontSize=8.4, fillColor=GRAY))
    d.add(Line(0, 2 * mm, W, 2 * mm, strokeColor=LINE, strokeWidth=0.5))
    return d


def tabs_mockup():
    W, Hh = 170 * mm, 38 * mm
    d = Drawing(W, Hh)
    d.add(Rect(0, 0, W, Hh, fillColor=colors.white, strokeColor=LINE))
    d.add(Rect(0, 0, 28 * mm, Hh, fillColor=LIGHT, strokeColor=LINE))
    d.add(String(3 * mm, Hh - 7 * mm, "JLB Systems", fontName=MONO, fontSize=6.5, fillColor=GRAY))
    d.add(String(3 * mm, Hh - 11.5 * mm, "Auditorías", fontName=FONT_B, fontSize=8.5, fillColor=INK))
    d.add(String(3 * mm, Hh - 19 * mm, "Clientes", fontName=FONT, fontSize=8, fillColor=INK))
    d.add(String(3 * mm, Hh - 24 * mm, "Horas", fontName=FONT, fontSize=8, fillColor=INK))
    d.add(String(3 * mm, 3 * mm, "[ Salir ]", fontName=FONT, fontSize=7.5, fillColor=GRAY))
    d.add(String(32 * mm, Hh - 7 * mm, "Nombre del cliente", fontName=FONT_B, fontSize=11, fillColor=INK))
    d.add(Rect(133 * mm, Hh - 11 * mm, 34 * mm, 6 * mm, rx=2, ry=2, fillColor=colors.white, strokeColor=BLUE))
    d.add(String(150 * mm, Hh - 9.2 * mm, "Ver reporte del cliente", fontName=FONT, fontSize=6.6, fillColor=BLUE, textAnchor="middle"))
    tabs = ["Resumen", "Guion", "Entrevistas", "Procesos", "Mediciones", "Priorización", "Hoja de ruta", "Riesgos", "Documentos", "Horas"]
    x = 32 * mm
    widths = [12, 9, 14, 11, 14, 15, 16, 10, 16, 9]
    for i, (t, w) in enumerate(zip(tabs, widths)):
        d.add(String(x, Hh - 22 * mm, t, fontName=FONT_B if i == 0 else "Helvetica", fontSize=6.1, fillColor=BLUE if i == 0 else GRAY))
        if i == 0:
            d.add(Line(x - 1 * mm, Hh - 24 * mm, x + w * mm - 2 * mm, Hh - 24 * mm, strokeColor=BLUE, strokeWidth=1.6))
        x += w * mm + 1.0 * mm
    d.add(Line(30 * mm, Hh - 24 * mm, W - 2 * mm, Hh - 24 * mm, strokeColor=LINE, strokeWidth=0.5))
    d.add(String(32 * mm, Hh - 31 * mm, "Aquí aparece el contenido de la pestaña elegida.", fontName=FONT_I, fontSize=7.6, fillColor=GRAY))
    return d


def matrix_mockup():
    W, Hh = 120 * mm, 46 * mm
    d = Drawing(W, Hh)
    cells = [("Quick win", "alto impacto, bajo esfuerzo", 0, 1, OK_BG), ("Proyecto estratégico", "alto impacto, alto esfuerzo", 1, 1, TIP_BG),
             ("Relleno", "bajo impacto, bajo esfuerzo", 0, 0, LIGHT), ("Evitar", "bajo impacto, alto esfuerzo", 1, 0, STOP_BG)]
    for t, s, cx, cy, bg in cells:
        x, y = cx * 58 * mm, cy * 22 * mm
        d.add(Rect(x, y, 56 * mm, 20 * mm, fillColor=bg, strokeColor=LINE))
        d.add(String(x + 3 * mm, y + 12 * mm, t, fontName=FONT_B, fontSize=8.6, fillColor=INK))
        d.add(String(x + 3 * mm, y + 6.5 * mm, s, fontName=FONT, fontSize=7.4, fillColor=GRAY))
    return d


# ── Documento con índice
class Doc(BaseDocTemplate):
    def __init__(self, fn, **kw):
        super().__init__(fn, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=20 * mm, bottomMargin=20 * mm,
                         title="Manual de uso · Panel de auditorías", author="JLB Systems SpA",
                         subject="Guía paso a paso para empezar desde cero", **kw)
        fr = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="f", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([PageTemplate("cover", [fr], onPage=lambda c, d: None),
                               PageTemplate("body", [fr], onPage=self.deco)])

    def deco(self, c, d):
        c.saveState()
        c.setStrokeColor(LINE)
        c.setLineWidth(0.5)
        c.line(20 * mm, 14 * mm, A4[0] - 20 * mm, 14 * mm)
        c.setFont(FONT, 8)
        c.setFillColor(GRAY)
        c.drawString(20 * mm, 9.5 * mm, "Manual de uso · Panel de auditorías · JLB Systems")
        c.drawRightString(A4[0] - 20 * mm, 9.5 * mm, f"Página {d.page}")
        c.restoreState()

    def afterFlowable(self, f):
        items = getattr(f, "_content", None) if isinstance(f, KeepTogether) else None
        for g in ([f] if items is None else [f] + list(items)):
            if isinstance(g, H) and g.level in (1, 2):
                key = f"h{g.level}-{self.seq.nextf('toc')}"
                self.canv.bookmarkPage(key)
                self.notify("TOCEntry", (g.level - 1, g.toc_text, self.page, key))


def build():
    doc = Doc(OUT)
    st = []

    # ── Portada
    st += [Spacer(1, 55 * mm)]
    bar = Drawing(40 * mm, 3 * mm); bar.add(Rect(0, 0, 40 * mm, 3 * mm, fillColor=BLUE, strokeColor=BLUE)); st += [bar, Spacer(1, 6 * mm)]
    st += [P("Manual de uso", "cover_t"), P("Panel de auditorías", "cover_t"), Spacer(1, 6 * mm),
           P("Guía paso a paso para empezar desde cero", "cover_s"), Spacer(1, 70 * mm),
           P("<b>JLB Systems SpA</b> · Chonchi, Chiloé", "p"),
           P("Versión 1.0 · noviembre 2026", "small"),
           P("Documento de uso interno. Describe el panel tal como está construido a la fecha de esta versión.", "small"),
           NextPageTemplate("body"), PageBreak()]

    # ── Índice
    st += [P("Contenido", "h1")]
    toc = TableOfContents()
    toc.levelStyles = [ParagraphStyle("t1", parent=base, fontName=FONT_B, fontSize=10.5, leading=18, leftIndent=0),
                       ParagraphStyle("t2", parent=base, fontSize=9.4, leading=14, leftIndent=14, textColor=GRAY)]
    st += [toc, PageBreak()]

    # ── Cómo leer
    st += [H("Cómo leer este manual", 1),
           P("Este manual está escrito para alguien que nunca ha usado el panel. Puedes leerlo de corrido una vez, y después usarlo como consulta: "
             "cada paso dice <b>dónde</b> hacer clic, <b>qué</b> completar y <b>qué resultado</b> esperar."),
           Spacer(1, 4),
           callout("tip", "Consejo", "Ideas para trabajar mejor o más rápido."),
           callout("warn", "Atención", "Algo que es fácil olvidar o que puede costar tiempo."),
           callout("stop", "Importante", "Algo que afecta la confidencialidad o los datos del cliente."),
           P("Los nombres de botones y pestañas aparecen <b>en negrita</b>, tal como se ven en la pantalla. Las rutas se escriben con el signo ›, "
             "por ejemplo: <b>Cliente › Procesos › Inventario rápido</b>."),
           Spacer(1, 6)]

    # ── 1. Qué es
    st += [H("1. Qué es este panel y para qué sirve", 1),
           P("Es una herramienta <b>interna</b> para ordenar la información de cada auditoría de procesos: quiénes son las personas del cliente, "
             "qué entrevistas hiciste, qué procesos levantaste, cuánto tiempo toman, qué conviene automatizar primero, qué riesgos tiene y cuánto "
             "trabajo te costó. Con eso genera un <b>reporte</b> imprimible para la gerencia del cliente."),
           Spacer(1, 4),
           P("<b>Quiénes lo usan:</b>"),
           table([["Usuario", "Qué puede hacer"],
                  ["<b>Dueño</b> (tú)", "Ve y edita todo: clientes, entrevistas, notas privadas, procesos, mediciones, hoja de ruta, riesgos, documentos y horas."],
                  ["<b>Viewer</b> (gerencia del cliente)", "Solo lee el <b>reporte</b> de su cliente (o de su área). No ve notas privadas, horas, personas ni documentos confidenciales."]],
                 [45 * mm, 125 * mm]),
           Spacer(1, 8),
           P("<b>El recorrido completo de una auditoría:</b>"), Spacer(1, 3), flow_diagram(), Spacer(1, 6),
           P("Todo lo que ocurre en el panel sigue esa línea. Cada pantalla te pide un poco más de información sobre el mismo proceso; "
             "por eso el panel muestra la <b>etapa</b> de cada uno (Identificado, Documentado, Medido, Puntuado, Validado) y siempre sabes qué falta."),
           PageBreak()]

    # ── 2. Primeros pasos
    st += [H("2. Primeros pasos", 1),
           H("2.1 Encender el panel", 2),
           P("Hoy el panel se ejecuta en tu computador. Cuando lo publiques en Vercel, entrarás con una dirección web y este paso ya no será necesario."),
           *N(["Abre la aplicación <b>Terminal</b>.",
               "Entra a la carpeta del proyecto y arranca el panel:"]),
           CODE('cd "/Users/joseluisborquezampuero/Desktop/plataforma auditoria/plataforma-auditoria"\nnpm run dev'),
           *N(["Cuando veas <b>Ready</b>, abre en el navegador: <b>http://localhost:3000</b>.",
               "Para apagarlo, vuelve a la Terminal y presiona <b>Ctrl + C</b>."]),
           callout("warn", "Atención", "Mientras la Terminal esté cerrada o apagada, el panel no abre. Es normal."),

           H("2.2 Ingresar y salir", 2),
           *N(["En la pantalla de ingreso escribe tu <b>Correo</b> y tu <b>Contraseña</b>.", "Presiona <b>Entrar</b>."]),
           P("Si te equivocas aparece «Correo o contraseña incorrectos». Para salir usa el botón <b>Salir</b>, abajo del menú lateral izquierdo."),
           callout("stop", "Importante", "Usa una contraseña larga y única, y activa la verificación en dos pasos en tu cuenta de Supabase y de GitHub. "
                   "Este panel guardará información de tus clientes."),

           H("2.3 Crear usuarios (dueño y viewer)", 2),
           P("Los usuarios se crean desde la Terminal, con una clave de administración que solo existe en tu archivo <b>.env.local</b>. "
             "Nunca la compartas ni la pegues en otro lugar."),
           P("<b>Para un dueño:</b>"),
           CODE("USER_PASSWORD='contraseña-larga' npx tsx --env-file=.env.local scripts/create-user.mts correo@ejemplo.cl owner"),
           P("<b>Para un viewer (gerencia del cliente):</b> agrega el código del cliente. Lo encuentras en la dirección del navegador cuando estás dentro del cliente: "
             "<b>.../clientes/EL-CODIGO-LARGO</b>."),
           CODE("USER_PASSWORD='contraseña-larga' npx tsx --env-file=.env.local scripts/create-user.mts esteban@cliente.cl viewer CODIGO-CLIENTE"),
           P("Si el viewer debe ver <b>solo un área</b>, agrega al final el código del área. Ese código no se muestra en el panel: "
             "está en Supabase › Table Editor › tabla <b>areas</b>, columna <b>id</b>. Sin ese código, el viewer ve todo el cliente (alcance global)."),
           P("Al terminar verás «Usuario … creado como …». Entrégale al viewer su correo y contraseña, y la dirección del panel. "
             "Al ingresar llegará directo al reporte."),

           H("2.4 El cliente «Ejemplo»", 2),
           P("El panel trae un cliente ficticio llamado <b>Ejemplo</b>, con áreas, personas, procesos, mediciones y un reporte armado. "
             "Úsalo para practicar este manual antes de la primera reunión real."),
           callout("warn", "Atención", "Antes de cargar datos reales, elimina «Ejemplo»: <b>Clientes › Ejemplo › Resumen</b>, baja hasta <b>Datos del cliente</b>, "
                   "abre <b>Eliminar cliente y todos sus datos</b> y presiona <b>Confirmar</b>. No se puede deshacer."),

           H("2.5 Reconocer la pantalla", 2),
           tabs_mockup(), Spacer(1, 6),
           *B(["<b>Menú lateral</b> (izquierda): <b>Clientes</b> (lista de clientes), <b>Horas</b> (resumen de todas tus horas) y <b>Salir</b>.",
               "<b>Nombre del cliente</b> arriba, con el botón <b>Ver reporte del cliente</b> (muestra lo que verá la gerencia).",
               "<b>Pestañas</b> del cliente: cada una es una etapa del trabajo. Las verás en el orden en que normalmente se usan."]),
           PageBreak()]

    # ── 3. Paso a paso
    st += [H("3. Una auditoría paso a paso", 1),
           P("Sigue estos pasos en orden la primera vez. Después los repetirás para cada área y cada entrevista.")]

    st += [KeepTogether([H("Fase A · Preparar", 2), stepbox(1, "Crear el cliente"),
                         Spacer(1, 3), where("<b>Clientes</b> (menú lateral), recuadro <b>Nuevo cliente</b>."),
                         *B(["Completa <b>Nombre</b> (obligatorio), <b>RUT</b>, <b>Rubro</b>, <b>Rango de empleados</b> y <b>Notas (privadas)</b>.",
                             "Presiona <b>Crear cliente</b>. El panel te lleva a la página del cliente."]),
                         P("<b>Resultado:</b> el cliente aparece en la lista y ya tienes todas sus pestañas.")]),
           Spacer(1, 8),
           KeepTogether([stepbox(2, "Cargar áreas y personas"),
                         Spacer(1, 3), where("<b>Cliente › Resumen</b>."),
                         *B(["En <b>Nueva área</b> escribe el nombre y presiona <b>Agregar</b>. Para Cono Austral: RRHH, Operaciones, Mantención, "
                             "Prevención de Riesgo, Administración y Abastecimiento, Robótica.",
                             "En <b>Personas</b> completa <b>Nombre</b> (obligatorio), <b>Cargo</b>, <b>Correo</b>, <b>Teléfono</b> y <b>Área</b>. "
                             "Marca <b>Es encargado del área</b> si corresponde y presiona <b>Agregar persona</b>.",
                             "También puedes elegir o cambiar el encargado de cada área en <b>Áreas y encargados</b>, con el botón <b>Asignar</b>."]),
                         P("<b>Resultado:</b> las áreas y personas quedan disponibles al agendar entrevistas. El resumen muestra los totales.")]),
           Spacer(1, 8),
           KeepTogether([stepbox(3, "Prepararte con el Guion"),
                         Spacer(1, 3), where("<b>Cliente › Guion</b>."),
                         *B(["Elige <b>Encargado de área</b> o <b>Trabajador</b>: cada uno tiene su propio guion de 120 minutos.",
                             "Cada pregunta indica con una etiqueta (por ejemplo «Disparador» o «Tiempo (medición)») <b>a qué campo de la ficha alimenta</b>. "
                             "Así sabes qué anotar para completar el proceso después.",
                             "Revisa las listas <b>Antes de la reunión</b> y <b>Después de la reunión</b>.",
                             "Usa <b>Imprimir / guardar PDF</b> para llevar el guion en papel."]),
                         callout("tip", "Consejo", "Imprime el guion si no estás seguro de tener buena conexión en el lugar. Pasa las notas al panel después.")]),
           Spacer(1, 8),
           KeepTogether([stepbox(4, "Agendar las entrevistas"),
                         Spacer(1, 3), where("<b>Cliente › Entrevistas</b>."),
                         *B(["Arriba verás <b>Cobertura por área</b>: para cada área, el estado de la entrevista al <b>Encargado</b> y al <b>Trabajador</b> "
                             "(<b>Falta</b>, <b>Pendiente</b>, <b>Agendada</b> o <b>Realizada</b>). Es tu lista de lo que queda por hacer.",
                             "En <b>Agendar entrevista</b> elige <b>Área</b>, <b>Persona</b>, <b>Tipo</b>, <b>Fecha y hora</b> (hora de Santiago), "
                             "<b>Duración (min)</b> y <b>Estado</b>. Presiona <b>Crear entrevista</b>.",
                             "Cambia entre <b>Lista</b> y <b>Calendario</b> para ver las entrevistas como agenda mensual."]),
                         P("<b>Resultado:</b> la entrevista aparece en la lista y la cobertura se actualiza.")]),
          ]

    st += [KeepTogether([H("Fase B · Levantar la información", 2), stepbox(5, "Durante la entrevista"),
                         Spacer(1, 3),
                         P("No necesitas el panel abierto. Lleva el guion y anota. Recuerda estas reglas:"),
                         *B(["Pide siempre el <b>último caso real</b>, no «lo que normalmente pasa».",
                             "Pide <b>rangos</b> de tiempo (mínimo y máximo), nunca un número redondo.",
                             "Pregunta «¿y después qué pasa?» hasta llegar al final del proceso.",
                             "No propongas soluciones: solo entiende.",
                             "Si la persona lo autoriza, <b>cronometra</b> un caso completo."]),
                         callout("stop", "Importante", "Deja claro al inicio que lo que diga no se atribuirá a la persona en el informe. "
                                 "Con los trabajadores, esto es lo más importante de toda la reunión.")]),
           Spacer(1, 8),
           KeepTogether([stepbox(6, "Pasar la entrevista al panel (dentro de 24 horas)"),
                         Spacer(1, 3), where("<b>Cliente › Entrevistas</b>, haz clic sobre la entrevista para abrirla."),
                         *N(["Completa <b>Resumen</b> (sin nombres de personas) y <b>Notas privadas</b> (solo tú las ves).",
                             "Ajusta <b>Fecha y hora</b> y <b>Duración</b> reales, cambia <b>Estado</b> a <b>Realizada</b> y presiona <b>Guardar</b>.",
                             "Ve a <b>Cliente › Procesos</b>. En <b>Inventario rápido</b> elige el área y escribe una tarea por línea; presiona "
                             "<b>Crear como «Identificado»</b>.",
                             "Vuelve a la entrevista y, en <b>Procesos que salieron de esta entrevista</b>, usa <b>Vincular proceso</b> para ligar cada tarea. "
                             "(También puedes hacerlo desde la ficha del proceso.)"]),
                         P("<b>Resultado:</b> las tareas quedan como procesos «Identificado» y sabes de qué entrevista salió cada uno.")]),
           Spacer(1, 6),
           callout("tip", "Consejo", "El inventario rápido sirve para capturar <b>todo</b> lo que la persona menciona, sin detenerte. "
                   "El detalle se completa después, solo con los 2 o 3 procesos más importantes de cada área."),
                      KeepTogether([stepbox(7, "Completar la ficha del proceso"),
                         Spacer(1, 3), where("<b>Cliente › Procesos</b>, clic sobre el nombre del proceso."),
                         *B(["<b>Ficha del proceso:</b> <b>Nombre</b>, <b>Área</b>, <b>Responsable (privado)</b>, <b>Disparador</b> (qué lo hace partir), "
                             "<b>Pasos</b> (uno por línea), <b>Problemas detectados</b>, <b>Herramientas</b> (separadas por coma), "
                             "<b>Estado de los datos</b>, <b>Etapa del proceso</b> y <b>Evidencia (privada)</b>.",
                             "<b>SIPOC:</b> cinco columnas, un elemento por línea. <b>S</b>: quién o qué entrega lo que el proceso necesita. "
                             "<b>I</b>: qué recibe. <b>P</b>: los pasos principales. <b>O</b>: qué entrega. <b>C</b>: quién lo recibe.",
                             "Presiona <b>Guardar ficha</b>.",
                             "Si el proceso aún no existe, créalo en <b>Procesos › Nuevo proceso › Crear y abrir ficha</b>."])]),
           Spacer(1, 4),
           table([["Etapa", "Cuándo corresponde"],
                  ["Identificado", "Solo tienes el nombre de la tarea."],
                  ["Documentado", "Ya tiene pasos y/o problemas escritos."],
                  ["Medido", "Tiene al menos una medición de tiempo. <b>Avanza sola</b> al registrar una."],
                  ["Puntuado", "Tiene puntuación. <b>Avanza sola</b> al guardar la puntuación."],
                  ["Validado", "El encargado confirmó que el proceso está bien entendido. <b>La marcas tú</b> a mano."]],
                 [38 * mm, 132 * mm]),
           Spacer(1, 6),
           callout("warn", "Atención", "<b>Guardar ficha</b> y <b>Guardar puntuación</b> son botones distintos, de formularios distintos. "
                   "Si escribes en la ficha y luego guardas solo la puntuación (o al revés), lo otro no se guarda."),
          ]

    st += [KeepTogether([H("Fase C · Medir y puntuar", 2), stepbox(8, "Registrar mediciones de tiempo"),
                         Spacer(1, 3), where("<b>Cliente › Mediciones</b>, formulario <b>Nueva medición</b>."),
                         *B(["Elige el <b>Proceso</b> y el <b>Tipo</b>: <b>Línea base</b> (cómo se hace hoy) o <b>Posterior</b> (después de mejorar).",
                             "Completa <b>Minutos por vez</b>, <b>Veces por semana</b> y <b>Personas</b> que lo hacen.",
                             "En <b>Cómo se obtuvo</b> elige <b>Declarado en entrevista</b>, <b>Cronometrado</b> o <b>Registro del sistema</b>.",
                             "Si tienes <b>Mínimo observado</b> y <b>Máximo observado</b>, anótalos: el panel muestra el rango.",
                             "Presiona <b>Registrar medición</b>."])]),
           Spacer(1, 4),
           P("<b>Cómo se calcula.</b> Minutos por semana = minutos por vez × veces por semana × personas. Ejemplo: 240 minutos, 1 vez por semana, "
             "2 personas = <b>480 minutos por semana</b>. Si después de mejorar quedan 60 minutos por semana, la diferencia es <b>420 minutos</b> "
             "(<b>87,5 %</b> menos) y el ahorro estimado es de unas <b>364 horas al año</b> (se usan 52 semanas)."),
           P("Para ver la comparación necesitas <b>una línea base y una posterior</b> del mismo proceso. El panel usa la medición más reciente de cada tipo."),
           callout("warn", "Atención", "Si algún dato es «Declarado en entrevista», el panel y el reporte avisan que es una estimación. "
                   "Cronometra al menos los procesos principales para dar más respaldo a tus cifras."),
           callout("stop", "Importante", "En el campo <b>Fuente</b> escribe cosas como «cronometraje» o «registro de planilla», <b>sin nombres de personas</b>."),
           Spacer(1, 4),
           KeepTogether([stepbox(9, "Puntuar y priorizar"),
                         Spacer(1, 3), where("<b>Cliente › Procesos › (el proceso) › Puntuación de automatizabilidad</b>, y luego <b>Cliente › Priorización</b>."),
                         *N(["Abre <b>Ver rúbrica de puntuación</b>: explica qué significa 1, 3 y 5 en cada criterio. Úsala siempre para ser consistente.",
                             "Elige de 1 a 5 en los <b>seis criterios</b> y en <b>Esfuerzo de implementar</b>. En todos, 5 es «muy favorable a automatizar»; "
                             "en esfuerzo, 5 es «más difícil».",
                             "Marca <b>Riesgo legal</b> si corresponde y elige una <b>Decisión</b>: Automatizar, Integrar IA o No tocar. El panel te muestra una sugerencia, "
                             "pero decides tú.",
                             "Presiona <b>Guardar puntuación</b>."]),
                         P("<b>Impacto</b> = suma de los seis criterios (de 6 a 30).")]),
           Spacer(1, 5),
           KeepTogether([P("En <b>Priorización</b> verás una matriz y una tabla ordenada por impacto:"), Spacer(1, 3), matrix_mockup()]), Spacer(1, 4),
           P("Impacto alto: 18 o más. Esfuerzo alto: 4 o 5. Empieza por los <b>Quick win</b>."),
          ]

    st += [KeepTogether([H("Fase D · Planificar", 2), stepbox(10, "Armar la hoja de ruta"),
                         Spacer(1, 3), where("<b>Cliente › Hoja de ruta</b>, formulario <b>Nuevo ítem</b>."),
                         *B(["Completa <b>Título</b>, <b>Proceso (opcional)</b> (déjalo en «General» si no es de un proceso específico), <b>Fase</b> "
                             "(Quick win, Mediano plazo o Largo plazo), <b>Prioridad</b>, <b>Estado</b>, <b>Esfuerzo estimado</b> y <b>Notas (privadas)</b>.",
                             "Presiona <b>Agregar a la hoja de ruta</b>. Los ítems se ordenan por fase y prioridad.",
                             "Haz clic en un ítem para editarlo o eliminarlo."])]),
           Spacer(1, 8),
           KeepTogether([stepbox(11, "Revisar riesgos y controles"),
                         Spacer(1, 3), where("<b>Cliente › Riesgos</b>."),
                         *N(["Abre cada ítem de la hoja de ruta (los sin revisar aparecen abiertos).",
                             "A la izquierda, <b>Revisión de riesgo</b>: marca «Sí» en cada pregunta que se cumpla (datos personales, decisiones sobre personas, "
                             "supervisión humana, registro, datos al extranjero, plan de reversa, responsable).",
                             "A la derecha, <b>Ficha de controles</b>: marca los controles que existirán (exactitud, autorización, excepciones, cambios, credenciales, continuidad).",
                             "Escribe el <b>Responsable en el cliente</b> y tus <b>Notas</b> (ambos privados).",
                             "Presiona <b>Guardar revisión</b>. El panel calcula el nivel <b>bajo</b>, <b>medio</b> o <b>alto</b> y sugiere acciones para bajarlo."]),
                         callout("tip", "Consejo", "Un ítem que decide sobre personas sin supervisión humana queda siempre en nivel <b>alto</b>. "
                                 "Atiende esos primero, sobre todo en RRHH."),
                         callout("stop", "Importante", "Es un tamizaje de apoyo a tu decisión. No reemplaza una evaluación legal o técnica formal. "
                                 "El cliente ve solo el nivel, nunca tus respuestas ni tus notas.")]),
           Spacer(1, 6)]

    st += [KeepTogether([H("Fase E · Cerrar y entregar", 2), stepbox(12, "Subir documentos"),
                         Spacer(1, 3), where("<b>Cliente › Documentos</b>."),
                         *B(["Elige el <b>Archivo</b> (máximo 4 MB), un <b>Nombre</b> opcional y el <b>Área</b>.",
                             "<b>Confidencial</b> viene marcado por defecto: el viewer no lo verá. Desmárcalo solo si quieres que la gerencia lo vea.",
                             "Para cambiar la visibilidad después, haz clic en la etiqueta <b>Confidencial</b> / <b>Visible al viewer</b>.",
                             "Haz clic en el nombre para abrirlo: el enlace es temporal (dura una hora)."])]),
           Spacer(1, 8),
           KeepTogether([stepbox(13, "Registrar tus horas"),
                         Spacer(1, 3), where("<b>Cliente › Horas</b>, y el resumen global en <b>Horas</b> (menú lateral)."),
                         *B(["Completa <b>Fecha</b>, <b>Actividad</b>, <b>Horas</b>, <b>Minutos</b> y <b>Detalle</b>, y presiona <b>Registrar</b>.",
                             "Hazlo cada día, apenas termines. Después se olvida.",
                             "El resumen muestra horas totales, <b>fijas</b>, <b>por entrevista</b> y el promedio por entrevista realizada."])]),
           Spacer(1, 4),
           table([["Tipo", "Actividades"],
                  ["Fijas", "Preparación, reunión de inicio, análisis, mapa de procesos, hoja de ruta, presentación."],
                  ["Por entrevista", "Traslado, entrevista, transcripción y notas."],
                  ["Variables", "Medición de tiempos, comunicación con cliente, desarrollo interno, otro."]],
                 [38 * mm, 132 * mm]),
           Spacer(1, 4),
           P("Las horas son privadas: el viewer nunca las ve. Te sirven para saber cuánto te cuesta cada auditoría y si estás cobrando lo justo."),
           Spacer(1, 8),
           KeepTogether([stepbox(14, "Validar con el encargado"),
                         Spacer(1, 3),
                         P("Antes de entregar, revisa con cada encargado los procesos de su área. Si los confirma, abre el proceso, cambia <b>Etapa del proceso</b> "
                           "a <b>Validado</b> y presiona <b>Guardar ficha</b>. Es una señal de rigor que puedes mencionar al cliente.")]),
           Spacer(1, 8),
           KeepTogether([stepbox(15, "Revisar y entregar el reporte"),
                         Spacer(1, 3), where("<b>Cliente › Ver reporte del cliente</b> (botón de arriba a la derecha)."),
                         *B(["El reporte tiene cinco secciones: <b>1. Priorización de procesos</b>, <b>2. Hallazgos por proceso</b>, <b>3. Hoja de ruta</b> "
                             "(con el nivel de riesgo), <b>4. Alcance, método y limitaciones</b> y <b>5. Documentos</b>.",
                             "Léelo como lo leerá el cliente. Si ves algo que no quieres mostrar, corrígelo en la pestaña correspondiente.",
                             "Presiona <b>Imprimir / guardar PDF</b>. En la ventana de impresión elige el destino <b>Guardar como PDF</b>, tamaño <b>A4</b>, "
                             "y desactiva «Encabezados y pies de página» si aparecen.",
                             "Para dar acceso en línea, crea un usuario viewer (ver sección 2.3). Al ingresar verá solo este reporte."]),
                         callout("warn", "Atención", "Antes de usar la sección <b>Alcance, método y limitaciones</b> con un cliente, pide que un abogado o un especialista en auditoría "
                                 "revise su texto. Incluye una declaración de independencia: tú auditas y también puedes implementar.")]),
          ]

    # ── 4. Qué ve el cliente
    st += [PageBreak(), H("4. Qué ve el cliente y qué no", 1),
           P("La seguridad no depende de que te acuerdes: la base de datos bloquea el acceso del viewer a lo privado. Aun así, conviene saber exactamente qué ve."),
           table([["El viewer SÍ ve", "El viewer NO ve (nunca)"],
                  ["Nombre, rubro y rango de empleados del cliente", "Notas privadas de las entrevistas y su resumen"],
                  ["Áreas", "Quién fue entrevistado, personas y cargos"],
                  ["Procesos: nombre, disparador, pasos, herramientas, problemas, estado de los datos y SIPOC", "Responsable y evidencia de cada proceso"],
                  ["Puntuaciones, esfuerzo, riesgo legal y decisión", "Qué entrevista originó cada proceso"],
                  ["Mediciones: tiempos, método (declarado, cronometrado…) y rango", "La «fuente» de cada medición"],
                  ["Hoja de ruta: título, fase, prioridad, estado, esfuerzo y <b>nivel</b> de riesgo", "Notas de la hoja de ruta; respuestas, responsable y notas de la revisión de riesgo"],
                  ["Documentos que marcaste como visibles", "Documentos confidenciales; RUT y notas del cliente"],
                  ["", "Tus horas y el resumen de horas"]],
                 [85 * mm, 85 * mm]),
           Spacer(1, 8),
           callout("stop", "Regla de oro",
                   "Lo que el viewer ve puede contener lo que tú escribas ahí. <b>No escribas nombres de personas</b> en campos visibles: "
                   "pasos, problemas, herramientas, títulos de la hoja de ruta ni nombres de documentos. Los nombres van solo en campos privados (notas, responsable, evidencia)."),
           Spacer(1, 4),
           H("Si el viewer es de un área", 2),
           P("Un viewer con alcance de <b>un área</b> ve solo los procesos de esa área, sus mediciones, puntuaciones, documentos y los ítems de hoja de ruta ligados a esos procesos. "
             "No ve los ítems «General» (sin proceso) ni nada de otras áreas."),
           PageBreak()]

    # ── 5. Rutinas
    st += [H("5. Rutinas recomendadas", 1),
           H("Antes de cada entrevista", 2),
           *B(["[  ] Repasar el guion del tipo de entrevista (encargado o trabajador).",
               "[  ] Tener a mano la rúbrica y un cronómetro.",
               "[  ] Revisar en la pestaña Entrevistas quién falta por entrevistar en el área.",
               "[  ] Si la conexión es dudosa, llevar el guion impreso."]),
           H("Después de cada entrevista (dentro de 24 horas)", 2),
           *B(["[  ] Resumen sin nombres y notas privadas.",
               "[  ] Estado de la entrevista en «Realizada».",
               "[  ] Inventario rápido y procesos vinculados a la entrevista.",
               "[  ] Ficha de los 2 o 3 procesos detallados.",
               "[  ] Mediciones registradas (indicando si son declaradas o cronometradas).",
               "[  ] Horas del día registradas."]),
           H("Al cerrar el levantamiento de un área", 2),
           *B(["[  ] Todos los procesos puntuados y con su decisión.",
               "[  ] Procesos principales cronometrados o con una nota de por qué no.",
               "[  ] Revisión con el encargado y procesos en «Validado»."]),
           H("Antes de entregar el reporte", 2),
           *B(["[  ] Hoja de ruta completa, con fase, prioridad y esfuerzo.",
               "[  ] Todos los ítems con su revisión de riesgo.",
               "[  ] Documentos: confirmar cuáles son visibles y cuáles confidenciales.",
               "[  ] Leer el reporte completo como lo leerá el cliente.",
               "[  ] Sección «Alcance, método y limitaciones» revisada por un profesional.",
               "[  ] Usuario viewer creado y probado."]),
           PageBreak()]

    # ── 6. Glosario
    st += [H("6. Glosario", 1),
           table([["Término", "Qué significa"],
                  ["Proceso", "Una tarea o secuencia de tareas que se repite (por ejemplo, la liquidación de sueldos)."],
                  ["SIPOC", "Mapa simple de un proceso: Proveedores, Entradas (inputs), Proceso, Salidas (outputs) y Clientes."],
                  ["Disparador", "Lo que hace que el proceso parta: un correo, una fecha, una falla, una solicitud."],
                  ["Línea base", "Cómo se hace hoy, antes de mejorar. Es el punto de comparación."],
                  ["Medición posterior", "Cómo queda después de mejorar. Se compara con la línea base."],
                  ["Declarado / cronometrado", "Declarado es lo que cuenta la persona (estimación). Cronometrado es lo que mediste con reloj. Este último respalda mejor."],
                  ["Impacto", "Suma de los seis criterios de puntuación (de 6 a 30). Mientras más alto, más conviene automatizar."],
                  ["Esfuerzo", "Qué tan difícil es implementar la mejora, de 1 (simple) a 5 (muy difícil)."],
                  ["Quick win", "Mejora de alto impacto y bajo esfuerzo. Se hace primero."],
                  ["Decisión", "Automatizar, Integrar IA o No tocar. La eliges tú."],
                  ["Etapa del proceso", "Identificado, Documentado, Medido, Puntuado o Validado."],
                  ["Encargado", "Persona responsable de un área en el cliente."],
                  ["Notas privadas", "Texto que solo ve el dueño. Nunca llega al viewer."],
                  ["Viewer", "Usuario de solo lectura (gerencia del cliente). Ve el reporte según su alcance."],
                  ["Alcance (del viewer)", "Global: ve todo el cliente. De área: ve solo una."],
                  ["Revisión de riesgo", "Tamizaje de siete preguntas que da un nivel bajo, medio o alto a cada ítem de la hoja de ruta."],
                  ["Controles", "Seguridades de una automatización: exactitud, autorización, excepciones, cambios, credenciales y continuidad."]],
                 [42 * mm, 128 * mm]),
           PageBreak()]

    # ── 7. Problemas frecuentes
    st += [H("7. Problemas frecuentes", 1),
           table([["Qué pasa", "Qué hacer"],
                  ["La página no abre (http://localhost:3000)", "El panel no está encendido. Abre la Terminal y ejecuta <b>npm run dev</b> (sección 2.1)."],
                  ["«Correo o contraseña incorrectos»", "Revisa mayúsculas y espacios. Si olvidaste la contraseña, cámbiala en Supabase › Authentication › Users."],
                  ["Un viewer entra y no ve nada", "Su usuario no tiene alcance asignado. Créalo de nuevo indicando el código del cliente (sección 2.3)."],
                  ["Un viewer ve el reporte vacío", "Faltan datos: procesos, puntuaciones, ítems de hoja de ruta, o documentos marcados como visibles."],
                  ["El comando de crear usuario falla", "Revisa que <b>.env.local</b> tenga <b>SUPABASE_SERVICE_ROLE_KEY</b> y que la contraseña tenga al menos 6 caracteres."],
                  ["No aparece la comparación en Mediciones", "Necesitas una medición de línea base y otra posterior del mismo proceso."],
                  ["Guardé y no veo mi cambio", "Si editaste la ficha y la puntuación, recuerda que se guardan con botones distintos. Recarga la página."],
                  ["La hora de una entrevista se ve corrida", "Las fechas se muestran en hora de Santiago. Revisa la hora al crearla."],
                  ["No puedo subir un archivo", "El máximo es 4 MB. Comprime el archivo o divídelo."],
                  ["Un enlace de documento dejó de funcionar", "Los enlaces duran una hora. Recarga la pestaña Documentos para generar uno nuevo."],
                  ["Aparece un mensaje de error en pantalla", "Lee el texto: suele indicar el campo que falta. Presiona <b>Reintentar</b> y completa el dato."],
                  ["Borré algo por error", "Las eliminaciones no se pueden deshacer desde el panel. Por eso piden confirmación antes de borrar."]],
                 [62 * mm, 108 * mm]),
           Spacer(1, 8),
           callout("tip", "Consejo", "Si algo no funciona como esperas, anota qué hiciste y qué viste, y consúltalo. Así se corrige más rápido."),
           PageBreak()]

    # ── Anexos
    st += [H("Anexo A · Rúbrica de puntuación", 1),
           P("En todos los criterios, <b>5 es «muy favorable a automatizar»</b>. Usa los valores 2 y 4 cuando estés entre dos descripciones."),
           table([["Criterio", "1", "3", "5"],
                  ["<b>Frecuencia / volumen</b>", "Menos de una vez al mes, o un caso por vez.", "Semanal, o decenas de casos al mes.", "Diario o varias veces por semana, con alto volumen."],
                  ["<b>Tiempo que consume</b>", "Menos de 1 hora por semana.", "Entre 4 y 8 horas por semana.", "Más de 16 horas por semana."],
                  ["<b>Repetitivo y con reglas</b>", "Depende del criterio de la persona; sin reglas claras.", "Reglas claras, pero con excepciones frecuentes.", "Siempre los mismos pasos; excepciones raras."],
                  ["<b>Entradas digitales</b>", "Papel, llamadas o conversación verbal.", "Digitales pero dispersas (correo, WhatsApp, PDF).", "Digitales y estructuradas (planillas ordenadas, sistemas)."],
                  ["<b>Errores / retrabajo</b>", "Casi nunca hay errores.", "Errores ocasionales que se corrigen sin gran costo.", "Errores frecuentes con costo, retrabajo o reclamos."],
                  ["<b>Quién lo asume</b>", "Un cargo dedicado cuyo trabajo es justamente esto.", "Personal de apoyo que lo combina con otras funciones.", "Personal calificado o jefatura que pierde tiempo de su trabajo principal."],
                  ["<b>Esfuerzo de implementar</b> (5 = más difícil)", "Configuración simple con herramientas existentes; hasta 1 semana.", "Integrar 2 sistemas o crear un flujo nuevo; 2 a 4 semanas.", "Desarrollo a medida, varios sistemas o cambio organizacional grande."]],
                 [38 * mm, 44 * mm, 44 * mm, 44 * mm]),
           Spacer(1, 6),
           P("Estos criterios y sus umbrales son una propuesta inicial. Después de las primeras entrevistas, ajústalos si hace falta (están en el archivo <b>lib/rubric.ts</b> del proyecto)."),
           Spacer(1, 10),
           H("Anexo B · El guion en una página", 1),
           table([["Entrevista a encargado (120 min)", "Entrevista a trabajador (120 min)"],
                  ["1. Apertura y acuerdos (10)<br/>2. Contexto del área (15)<br/>3. Inventario de tareas recurrentes (25)<br/>4. Detalle de 2 o 3 procesos (40)<br/>"
                   "5. Problemas y riesgos (15)<br/>6. Prioridades y condiciones (10)<br/>7. Cierre (5)",
                   "1. Apertura y confidencialidad (10)<br/>2. Un día típico (20)<br/>3. Recorrido de una tarea real (45)<br/>4. Atajos y trabajos paralelos (15)<br/>"
                   "5. Fricciones y errores (15)<br/>6. Ideas y cierre (15)"]],
                 [85 * mm, 85 * mm], zebra=False),
           PageBreak(),
           H("Anexo C · Marcos de referencia y límites", 1),
           P("La revisión de riesgo y los controles del panel se <b>alinean con</b> marcos reconocidos como referencia. Eso no equivale a una certificación."),
           table([["Marco", "Para qué se usa aquí"],
                  ["NIST AI RMF 1.0", "Estructura (gobernar, mapear, medir, gestionar) para pensar los riesgos de la IA en cada ítem. Es voluntario y no se certifica."],
                  ["ISO/IEC 23894", "Guía de gestión de riesgos de IA; apoya el vocabulario de la revisión de riesgo."],
                  ["ISO/IEC 42001", "Sistema de gestión de IA, certificable. Es una meta de madurez para el cliente, no un requisito de tu diagnóstico."],
                  ["ISO/IEC 27001", "Inspira los controles de seguridad de la información de las automatizaciones."]],
                 [45 * mm, 125 * mm]),
           Spacer(1, 6),
           callout("warn", "Atención", "Ley 21.719 de protección de datos personales: su vigencia está fijada para el 1 de diciembre de 2026, pero existe un proyecto que la posterga. "
                   "El proyecto de ley de IA sigue en tramitación. Valida ambos temas con asesoría legal antes de dar recomendaciones al cliente."),
           Spacer(1, 6),
           H("Anexo D · Buenas prácticas de seguridad", 1),
           *B(["Cambia la contraseña inicial por una larga y única, y actívale la verificación en dos pasos a Supabase y GitHub.",
               "El archivo <b>.env.local</b> contiene claves: no lo envíes por correo ni lo subas a ningún lado.",
               "La clave <b>SUPABASE_SERVICE_ROLE_KEY</b> es solo para crear usuarios desde tu computador. No va en Vercel ni en el código de la aplicación.",
               "No uses datos reales mientras practiques: usa el cliente «Ejemplo».",
               "No compartas tu usuario de dueño. Cada persona que necesite ver el reporte debe tener su propio usuario viewer.",
               "Los nombres de personas van solo en campos privados."]),
           Spacer(1, 12),
           P("<i>Fin del manual. Versión 1.0.</i>", "small")]

    doc.multiBuild(st)


if __name__ == "__main__":
    build()
    print("OK ->", OUT)
