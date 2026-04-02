from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent
MD_PATH = ROOT / 'roar_current_state_scenario_map_2026-03-31.md'
PDF_PATH = ROOT / 'roar_current_state_scenario_map_2026-03-31.pdf'

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name='DocTitle',
    parent=styles['Title'],
    fontName='Helvetica-Bold',
    fontSize=20,
    leading=24,
    textColor=colors.HexColor('#1f2937'),
    alignment=TA_LEFT,
    spaceAfter=10,
))
styles.add(ParagraphStyle(
    name='H1',
    parent=styles['Heading1'],
    fontName='Helvetica-Bold',
    fontSize=14,
    leading=18,
    textColor=colors.HexColor('#111827'),
    spaceBefore=8,
    spaceAfter=6,
))
styles.add(ParagraphStyle(
    name='H2',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=11,
    leading=14,
    textColor=colors.HexColor('#1f2937'),
    spaceBefore=6,
    spaceAfter=4,
))
styles.add(ParagraphStyle(
    name='Body2',
    parent=styles['BodyText'],
    fontName='Helvetica',
    fontSize=9.2,
    leading=12.5,
    textColor=colors.HexColor('#222222'),
    spaceAfter=3,
))
styles.add(ParagraphStyle(
    name='Bullet2',
    parent=styles['BodyText'],
    fontName='Helvetica',
    fontSize=9.2,
    leading=12.5,
    leftIndent=14,
    firstLineIndent=-8,
    spaceAfter=2,
))
styles.add(ParagraphStyle(
    name='Codeish',
    parent=styles['BodyText'],
    fontName='Courier',
    fontSize=8.3,
    leading=10.8,
    textColor=colors.HexColor('#1f2937'),
    leftIndent=10,
    backColor=colors.HexColor('#f3f4f6'),
    borderPadding=4,
    spaceAfter=4,
))


def add_page_number(canvas, doc):
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor('#6b7280'))
    canvas.drawRightString(doc.pagesize[0] - 18 * mm, 10 * mm, f'Page {doc.page}')


def para(text, style='Body2'):
    return Paragraph(escape(text), styles[style])


def build():
    lines = MD_PATH.read_text(encoding='utf-8').splitlines()
    story = []
    first_title = True
    in_code = False
    for raw in lines:
        stripped = raw.strip()
        if stripped.startswith('```'):
            in_code = not in_code
            continue
        if in_code:
            if stripped:
                story.append(Paragraph(escape(stripped), styles['Codeish']))
            continue
        if not stripped:
            story.append(Spacer(1, 2.5))
            continue
        if stripped.startswith('# '):
            style = 'DocTitle' if first_title else 'H1'
            first_title = False
            story.append(Paragraph(escape(stripped[2:]), styles[style]))
            continue
        if stripped.startswith('## '):
            story.append(Paragraph(escape(stripped[3:]), styles['H1']))
            continue
        if stripped.startswith('### '):
            story.append(Paragraph(escape(stripped[4:]), styles['H2']))
            continue
        if stripped.startswith('- '):
            story.append(Paragraph(escape('- ' + stripped[2:]), styles['Bullet2']))
            continue
        if len(stripped) > 2 and stripped[0].isdigit() and '. ' in stripped[:4]:
            story.append(Paragraph(escape(stripped), styles['Bullet2']))
            continue
        story.append(para(stripped))

    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title='ROAR Current-State Scenario Map',
        author='OpenAI Codex',
    )
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(PDF_PATH)


if __name__ == '__main__':
    build()
