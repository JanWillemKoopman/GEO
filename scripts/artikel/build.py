"""Bouwt het website-artikel over ORBIT ENGINE als PDF, voor de copywriter.

Bron:    docs/print/artikel-orbit-engine.md
Uitvoer: docs/print/artikel-orbit-engine.pdf
Gebruik: pip install markdown playwright, daarna python3 scripts/artikel/build.py

De schema's gebruiken dezelfde vormtaal als het boek 'Zo werkt ORBIT ENGINE'
(scripts/boek/diagrams.py), zodat beide documenten er als één familie uitzien.
Een schema staat in de tekst als [[FIG:naam]].
"""
import re
import sys
from pathlib import Path

import markdown
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "boek"))
from diagrams import Diagram, straight, fig_vergelijking  # noqa: E402

SRC = ROOT / "docs" / "print" / "artikel-orbit-engine.md"
NOTEN = ROOT / "docs" / "print" / "artikel-orbit-engine-noten.md"  # laatste pagina, alleen voor de copywriter
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "docs" / "print" / "artikel-orbit-engine.pdf"
FONTS = ROOT / "scripts" / "boek" / ".bouw"  # lettertypen die het boekscript al ophaalt
CHROMIUM = "/opt/pw-browsers/chromium"


# ── de schema's ────────────────────────────────────────────────────────────

def fig_lus():
    d = Diagram(340)
    d.node("o", 170, 42, "Kansen ontdekken", "site, aanbod, markt, kennistest", w=200, tag="AI + web")
    d.node("m", 430, 42, "Meten", "30 koopvragen per cluster", w=200, tag="AI + web")
    d.node("k", 505, 170, "Kansen kiezen", "welke pagina ontbreekt?", w=170)
    d.node("v", 430, 298, "Vragen aan jou", "wat alleen jij weet", kind="mens", w=200, h=40)
    d.node("s", 170, 298, "Schrijven en controleren", "feiten in code nagerekend", w=200, tag="AI")
    d.node("e", 95, 170, "Effect meten", "met controlegroep", w=170)
    straight(d, "o", "m")
    straight(d, "m", "k")
    straight(d, "k", "v")
    straight(d, "v", "s")
    straight(d, "s", "e", label="publiceren", lpos=(110, 245))
    straight(d, "e", "o", label="volgende ronde", lpos=(110, 95))
    d.label(300, 160, "De gesloten lus", bg=False, italic=False, size=14, weight=700)
    d.label(300, 185, "elke ronde maakt\nde volgende scherper", bg=False, size=9)
    return d.svg()


def fig_cluster():
    d = Diagram(400)
    d.node("a", 300, 28, "Jouw aanbod", "elke dienst bewezen met een citaat van je site", w=330)
    d.node("c", 300, 100, "Cluster", "een onderwerp zoals een koper het zoekt", w=330, tag="AI")
    d.node("f1", 110, 185, "Oriëntatie", "10 vragen\nnog geen aanbieder in beeld", w=170, h=58)
    d.node("f2", 300, 185, "Overweging", "10 vragen\nopties vergelijken", w=170, h=58)
    d.node("f3", 490, 185, "Beslissing", "10 vragen\neen aanbieder kiezen", w=170, h=58)
    d.node("g", 300, 262, "Vragen goedkeuren", "pas daarna wordt er gemeten", kind="poort", w=260, h=40)
    d.node("m", 300, 340, "Meting in ChatGPT en Google AI", "wie wordt genoemd, waarom, met welke bron", kind="eind", w=330, h=46)
    d.edge("a", "b", "c", "t")
    d.edge("c", "b", "f1", "t")
    d.edge("c", "b", "f2", "t")
    d.edge("c", "b", "f3", "t")
    d.edge("f1", "b", "g", "t", ob=-60)
    d.edge("f2", "b", "g", "t")
    d.edge("f3", "b", "g", "t", ob=60)
    d.edge("g", "b", "m", "t")
    d.label(300, 386, "nooit je eigen merknaam of die van een concurrent in een vraag", bg=False, size=8.8)
    return d.svg()


def fig_soorten():
    d = Diagram(250)
    d.node("k", 300, 30, "Kans uit de meting", "gemiste vragen, lezer, kernvraag", w=280, tag="AI")
    soorten = [
        ("Dienstpagina", "verkoopt een\ndienst of product"),
        ("Artikel", "legt een\nonderwerp uit"),
        ("Gids", "helpt stap\nvoor stap"),
        ("Veelgestelde\nvragen", "kort antwoord\nper vraag"),
        ("Vergelijking", "helpt kiezen\ntussen opties"),
    ]
    for i, (t, sub) in enumerate(soorten):
        x = 64 + i * 118
        d.node(f"s{i}", x, 125, t, sub, w=110, h=72)
        d.edge("k", "b", f"s{i}", "t")
    d.node("o", 300, 215, "Eén schrijfketen voor alle soorten", "elke soort met een eigen beeld van wat de lezer wil", kind="eind", w=360, h=46)
    for i in range(5):
        x = 64 + i * 118
        d.path([(x, 161), (x, 176), (300, 176)] if x != 300 else [(x, 161), (x, 176)], arrow=False)
    d.path([(300, 176), (300, 192)])
    return d.svg()


def fig_kennislaag():
    d = Diagram(330)
    d.node("w", 85, 40, "Je website", "waargenomen: citaat\nteruggevonden", w=150, h=50)
    d.node("a", 85, 120, "Jouw antwoorden\nen verhalen", "verklaard", w=150, h=50, kind="mens")
    d.node("u", 85, 200, "Jouw documenten", "brochure, tarieven:\nverklaard", w=150, h=50)
    d.node("v", 85, 285, "Vermoeden\nvan de AI", "afgeleid", w=150, h=50, kind="zacht")
    d.node("k", 300, 160, "De kennislaag", "aanbod, feiten, verhalen,\nstem, wat niet mag\n\nelk stukje met herkomst", w=170, h=150)
    d.node("q", 470, 160, "Bewezen, en\ngeen botsing?", kind="keuze", w=120, h=84)
    d.node("s", 470, 40, "De schrijver", kind="eind", w=120, h=40)
    d.node("x", 470, 285, "Blijft buiten\nde tekst", "tot het zeker is", w=120, h=50)
    d.edge("w", "r", "k", "l", ob=-60)
    d.edge("a", "r", "k", "l", ob=-20)
    d.edge("u", "r", "k", "l", ob=20)
    d.edge("v", "r", "k", "l", ob=60, dashed=True)
    d.edge("k", "r", "q", "l")
    d.edge("q", "t", "s", "b", label="ja", lpos=(482, 92), lanchor="start")
    d.edge("q", "b", "x", "t", label="nee", lpos=(482, 228), lanchor="start")
    d.node("n", 300, 290, "Twee waarden voor hetzelfde\ngegeven? Eerst kiezen\nwelke klopt.", kind="noot", w=170, h=48)
    return d.svg()


def fig_pagina():
    d = Diagram(540)
    X = 250
    d.node("b", X, 30, "Content brief", "onderzoek met bronnen + hooguit 8 vragen", w=300, tag="AI + web")
    d.node("j", X, 100, "Jij beantwoordt de vragen", "het laatste antwoord is de startknop", kind="mens", w=300, h=42)
    d.node("s", X, 172, "Schrijven", "met je kennis, je antwoorden en je stem", w=300, tag="AI")
    d.node("c", X, 245, "Controle", "harde feiten in code, eindredacteur leest mee", w=300, tag="code + AI")
    d.node("q", X, 330, "Goed en\nklopt het?", kind="keuze", w=130, h=80)
    d.node("h", 495, 330, "Eén keer\nherschrijven", "met concrete\nverbeterpunten", w=130, h=62, tag="AI")
    d.node("g", X, 420, "Jij leest en keurt goed", "twijfelzinnen staan geel", kind="poort", w=300, h=44)
    d.node("p", X, 500, "Publicatiepakket", "HTML, Markdown, FAQ, gegevens voor zoekmachines", kind="eind", w=300, h=46)
    d.edge("b", "b", "j", "t")
    d.edge("j", "b", "s", "t")
    d.edge("s", "b", "c", "t")
    d.edge("c", "b", "q", "t")
    d.edge("q", "r", "h", "l", label="nee")
    d.edge("q", "b", "g", "t", label="ja", lpos=(262, 385), lanchor="start")
    a = d.nodes["h"].anchor("b")
    b = d.nodes["g"].anchor("r")
    d.path([a, (a[0], b[1]), b], label="gele zinnen\nvoor jou", lpos=(495, 395))
    d.edge("g", "b", "p", "t")
    return d.svg()


FIGUREN = {
    "lus": (fig_lus, "ORBIT ENGINE doorloopt de hele cyclus, en begint na de laatste stap opnieuw."),
    "cluster": (fig_cluster, "Van aanbod naar dertig koopvragen, verdeeld over de klantreis."),
    "soorten": (fig_soorten, "Elke kans krijgt de soort pagina die past bij wat de lezer zoekt."),
    "kennislaag": (fig_kennislaag, "De kennislaag: alleen wat bewezen of door jou verteld is, bereikt de schrijver."),
    "pagina": (fig_pagina, "Van kans tot publicatieklare pagina, met jouw kennis en jouw akkoord als vaste stappen."),
    "effect": (fig_vergelijking, "Het effect van een pagina, gemeten naast een controlegroep na 14 en 28 dagen."),
}


# ── opmaak ─────────────────────────────────────────────────────────────────

CSS = """
@page { size: A4; margin: 22mm 22mm 22mm 22mm;
  @bottom-right { content: counter(page); font: 500 8.5pt Inter, sans-serif; }
  @top-left { content: "ORBIT ENGINE  ·  artikel voor de website  ·  concept voor de copywriter"; font: 400 7.5pt Inter, sans-serif; letter-spacing: 0.04em; } }
@page cover { margin: 0; @bottom-right { content: none; } @top-left { content: none; } }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; color: #000; background: #fff; font-family: "Source Serif 4", Georgia, serif;
  font-size: 10.6pt; line-height: 1.6; hyphens: auto; orphans: 3; widows: 3; }
strong { font-weight: 600; }
.cover { page: cover; height: 297mm; width: 210mm; padding: 22mm; display: flex; flex-direction: column;
  font-family: Inter, sans-serif; break-after: page; }
.cover-top { font-size: 8.5pt; letter-spacing: 0.35em; font-weight: 600; border-top: 2.5pt solid #000; padding-top: 4mm; }
.cover .kicker { margin-top: 55mm; font-size: 9pt; letter-spacing: 0.3em; text-transform: uppercase; }
.cover h1 { font-size: 34pt; line-height: 1.08; font-weight: 700; letter-spacing: -0.02em; margin: 5mm 0 8mm; }
.cover .sub { font-family: "Source Serif 4", serif; font-style: italic; font-size: 13pt; line-height: 1.45; max-width: 140mm; }
.cover-foot { margin-top: auto; display: flex; justify-content: space-between; font-size: 8pt;
  border-top: 0.6pt solid #000; padding-top: 3mm; }
h2 { font-family: Inter, sans-serif; font-size: 15pt; font-weight: 700; letter-spacing: -0.01em;
  margin: 9mm 0 3mm; padding-bottom: 2mm; border-bottom: 1.2pt solid #000; break-after: avoid; }
h3 { font-family: Inter, sans-serif; font-size: 11pt; font-weight: 700; margin: 6mm 0 2mm; break-after: avoid; }
p { margin: 0 0 3.2mm; }
.intro p { font-size: 11.6pt; line-height: 1.55; }
ul { margin: 0 0 4mm; padding-left: 5.5mm; }
li { margin: 0 0 1.8mm; }
ul > li::marker { content: "\\25A0  "; font-size: 6.5pt; }
table { width: 100%; border-collapse: collapse; margin: 4mm 0 6mm; font-family: Inter, sans-serif;
  font-size: 8.4pt; line-height: 1.4; break-inside: avoid; }
thead th { text-align: left; font-weight: 700; border-top: 1.5pt solid #000; border-bottom: 0.9pt solid #000; padding: 2mm 2mm 2mm 0; }
tbody td { border-bottom: 0.4pt solid #000; padding: 1.8mm 2mm 1.8mm 0; vertical-align: top; }
tbody td:first-child { font-weight: 600; }
tbody td:last-child { font-weight: 600; }
tbody tr:last-child td { border-bottom: 1.5pt solid #000; }
figure.fig { margin: 5mm 0 7mm; break-inside: avoid; }
figure.fig .svgwrap { border-top: 0.6pt solid #000; border-bottom: 0.6pt solid #000; padding: 5mm 0 4mm;
  display: flex; justify-content: center; }
figure.fig svg { display: block; height: auto; }
figcaption { font-family: Inter, sans-serif; font-size: 8.2pt; line-height: 1.45; margin-top: 2.2mm; }
figcaption .fn { font-weight: 700; margin-right: 2mm; }
.noten { break-before: page; font-family: Inter, sans-serif; font-size: 9pt; line-height: 1.5; }
.noten h2 { font-size: 13pt; }
.noten li { margin-bottom: 2.2mm; }
"""


def figuur(key, n):
    fn, cap = FIGUREN[key]
    return (f'<figure class="fig"><div class="svgwrap">{fn()}</div>'
            f'<figcaption><span class="fn">Figuur {n}</span>{cap}</figcaption></figure>')


def build_html():
    text = SRC.read_text(encoding="utf-8")
    titel = re.search(r"^# (.+)$", text, re.M).group(1)
    sub = " ".join(l[1:].strip() for l in text.split("\n") if l.startswith(">"))
    body = text.split("\n", 1)[1]
    body = "\n".join(l for l in body.split("\n") if not l.startswith(">"))
    intro, rest = body.split("\n## ", 1)
    teller = [0]

    def vervang(m):
        teller[0] += 1
        return figuur(m.group(1), teller[0])

    rest_html = markdown.markdown("## " + rest, extensions=["tables", "sane_lists"])
    rest_html = re.sub(r"<p>\[\[FIG:(\w+)\]\]</p>", vervang, rest_html)
    intro_html = markdown.markdown(intro.strip())
    noten = markdown.markdown(NOTEN.read_text(encoding="utf-8"))
    return f"""<!doctype html><html lang="nl"><head><meta charset="utf-8">
<title>{titel}</title><link rel="stylesheet" href="{(FONTS / 'fonts.css').as_uri()}"><style>{CSS}</style></head><body>
<section class="cover"><div class="cover-top">OUTER ORBIT</div>
<div class="kicker">Artikel voor de website · concept</div><h1>{titel}</h1>
<div class="sub">{sub}</div>
<div class="cover-foot"><span>Concept 30 september 2026, voor de laatste redactie</span><span>ORBIT ENGINE</span></div></section>
<div class="intro">{intro_html}</div>
{rest_html}
<section class="noten">{noten}</section>
</body></html>"""


def render(html, pdf):
    tmp = FONTS / "artikel.html"  # naast fonts.css, zodat de relatieve lettertypepaden kloppen
    tmp.write_text(html, encoding="utf-8")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROMIUM if Path(CHROMIUM).exists() else None)
        pg = b.new_page()
        pg.goto(tmp.as_uri(), wait_until="networkidle")
        pg.evaluate("document.fonts.ready")
        pg.wait_for_timeout(500)
        pg.pdf(path=str(pdf), prefer_css_page_size=True, print_background=True)
        b.close()


if __name__ == "__main__":
    # het boekscript haalt de lettertypen één keer op; hergebruik die functie
    import importlib.util
    spec = importlib.util.spec_from_file_location("boek_build", ROOT / "scripts" / "boek" / "build.py")
    boek = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(boek)
    FONTS.mkdir(exist_ok=True)
    boek.lettertypen()
    render(build_html(), OUT)
    print("klaar:", OUT)
