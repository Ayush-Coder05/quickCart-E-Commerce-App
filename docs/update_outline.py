from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
import copy

PPTX_IN = 'Intership persentation.pptx'
SLIDE_INDEX = 1  # Slide 2 (0-based)

# Shapes to KEEP (slide template / header)
KEEP_SHAPE_NAMES = {
    'TextBox 1',   # AMITY UNIVERSITY
    'TextBox 2',   # PATNA
    'Rectangle 3', # logo box
    'TextBox 4',   # 'A'
    'Rectangle 5', # top bar left
    'Rectangle 6', # top bar right
    'Rectangle 7', # bottom bar
    'TextBox 8',   # 'Outline' heading
}

prs   = Presentation(PPTX_IN)
slide = prs.slides[SLIDE_INDEX]
sp_tree = slide.shapes._spTree

# Remove all non-template shapes
to_remove = []
for shape in slide.shapes:
    if shape.name not in KEEP_SHAPE_NAMES:
        to_remove.append(shape._element)
        print(f'  Removing: {shape.name}')
for elem in to_remove:
    sp_tree.remove(elem)
print(f'Removed {len(to_remove)} shapes.')

# ── NTCC Content ─────────────────────────────────────────────────────────────
# Main items (numbered)
main_items = [
    ("1.", "Title of the project, group information", False),
    ("2.", "Name of the supervisor (external supervisor (company) and internal supervisor (supervisor from the Department))", False),
    ("3.", "Organization/ company details with profile of supervisor (if project is carried out outside the department) and Include that internship are paid or unpaid", False),
    ("4.", "Certificate", False),
    ("5.", "Weekly Report/ Work Plan / Gantt Chart \u2013 Timeline of project phases.", True),   # red
    ("6.", "Introduction and objectives of the project", False),
    ("7.", "Scope of the Project \u2013 Define boundaries and limitations.", True),              # red
    ("8.", "System Analysis (Level 0 DFD (Context Diagram), Level 1 DFD Process Decomposition Diagram, ER diagrams, class diagrams, time line etc. As per the project requirements).", True),  # red
    ("9.", "A complete structure which includes:", False),
    ("10.", "Tools / platform, hardware, and software requirement specifications", False),
    ("11.", "Expected Outcomes \u2013 Deliverables and benefits of the project.", True),         # red
    ("12.", "References / Bibliography \u2013 Resources, books, and websites referred.", False),
]

# Sub-bullets for item 9
sub_items = [
    "Name of modules and their description",
    "Database / data structures description",
    "Process logic of each module (flow chart)",
    "Reports generation. (repot format)",
]

# Note at bottom
note_text = "NOTE: NTCC Progress Report should not more than 10 pages."

# ── Add intro paragraph text box ─────────────────────────────────────────────
# Slide dimensions: 12 in x 7.5 in
# Content area starts below the heading bar (~1.3 in from top)
# Left margin: ~0.7 in, right margin: ~0.7 in

LEFT   = Inches(0.7)
TOP    = Inches(1.45)
WIDTH  = Inches(10.6)
HEIGHT = Inches(0.55)

# Intro text
intro_box = slide.shapes.add_textbox(LEFT, TOP, WIDTH, HEIGHT)
tf = intro_box.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.alignment = PP_ALIGN.JUSTIFY

def add_run(para, text, bold=False, color=None, size=11):
    run = para.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    if color:
        run.font.color.rgb = RGBColor(*color)
    else:
        run.font.color.rgb = RGBColor(0, 0, 0)
    return run

add_run(p, "The NTCC Progress Report proposal must be prepared in consultation with the assigned project guide and approved prior to commencement. The NTCC Progress Report proposal should clearly define the ", size=10.5)
add_run(p, "problem statement", bold=True, size=10.5)
add_run(p, ", ", size=10.5)
add_run(p, "scope", bold=True, size=10.5)
add_run(p, ", and ", size=10.5)
add_run(p, "Proposed Methodology/ Environment", bold=True, size=10.5)
add_run(p, " of the proposed project to be undertaken. The NTCC Progress Report must present complete details in the following structured format:", size=10.5)

# ── Add numbered list text box ────────────────────────────────────────────────
LIST_TOP = Inches(2.1)
LIST_HEIGHT = Inches(4.7)
list_box = slide.shapes.add_textbox(LEFT, LIST_TOP, WIDTH, LIST_HEIGHT)
tf2 = list_box.text_frame
tf2.word_wrap = True

RED = (192, 0, 0)
BLACK = (0, 0, 0)

first = True
for num, text, is_red in main_items:
    if first:
        para = tf2.paragraphs[0]
        first = False
    else:
        para = tf2.add_paragraph()

    para.space_before = Pt(2)
    para.space_after = Pt(1)

    # Number run
    r_num = para.add_run()
    r_num.text = f"{num}  "
    r_num.font.size = Pt(10.5)
    r_num.font.bold = False
    r_num.font.color.rgb = RGBColor(*(RED if is_red else BLACK))

    # Text run
    r_txt = para.add_run()
    r_txt.text = text
    r_txt.font.size = Pt(10.5)
    r_txt.font.color.rgb = RGBColor(*(RED if is_red else BLACK))

    # Add sub-bullets after item 9
    if num == "9.":
        for sub in sub_items:
            sp = tf2.add_paragraph()
            sp.space_before = Pt(1)
            sp.space_after = Pt(1)
            from pptx.oxml.ns import qn
            from lxml import etree
            # indent
            pPr = sp._p.get_or_add_pPr()
            ind = etree.SubElement(pPr, qn('a:buChar'))
            ind.set('char', '\u2022')
            r_sub = sp.add_run()
            r_sub.text = f"        \u2022  {sub}"
            r_sub.font.size = Pt(10.5)
            r_sub.font.color.rgb = RGBColor(0, 0, 0)

# ── NOTE ──────────────────────────────────────────────────────────────────────
NOTE_TOP = Inches(6.85)
NOTE_HEIGHT = Inches(0.35)
note_box = slide.shapes.add_textbox(LEFT, NOTE_TOP, WIDTH, NOTE_HEIGHT)
tf3 = note_box.text_frame
tf3.word_wrap = True
np = tf3.paragraphs[0]
r1 = np.add_run()
r1.text = "NOTE: NTCC Progress Report "
r1.font.size = Pt(10.5)
r1.font.bold = True
r1.font.color.rgb = RGBColor(0, 0, 0)
r2 = np.add_run()
r2.text = "should not more than 10 pages."
r2.font.size = Pt(10.5)
r2.font.bold = False
r2.font.color.rgb = RGBColor(192, 0, 0)

# Update heading from "Outline" to proper title
for shape in slide.shapes:
    if shape.name == 'TextBox 8' and shape.has_text_frame:
        tf_h = shape.text_frame
        for para in tf_h.paragraphs:
            for run in para.runs:
                if 'Outline' in run.text:
                    run.text = run.text.replace('Outline', 'Outline')  # keep heading as-is

prs.save(PPTX_IN)
print('Saved successfully!')
print('Done!')
