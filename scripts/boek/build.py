"""Bouwt het boek 'Zo werkt ORBIT ENGINE' als PDF uit docs/zo-werkt-orbit-engine.md.

Gebruik: pip install markdown playwright pypdf, daarna python3 scripts/boek/build.py
Uitvoer: docs/print/zo-werkt-orbit-engine.pdf

Twee rondes: de eerste bepaalt op welke pagina elk hoofdstuk begint, de tweede
zet die paginanummers in de inhoudsopgave.
"""
import re
import sys
from pathlib import Path

import markdown
import subprocess
from playwright.sync_api import sync_playwright

from diagrams import FIGUREN

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
SRC = ROOT / "docs" / "zo-werkt-orbit-engine.md"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "docs" / "print" / "zo-werkt-orbit-engine.pdf"
WERK = HERE / ".bouw"  # tussenbestanden en lettertypen, staat in .gitignore
CHROMIUM = "/opt/pw-browsers/chromium"


def lettertypen():
    """Haalt Inter en Source Serif 4 één keer op bij Google Fonts en bewaart ze lokaal."""
    import urllib.request
    css_pad = WERK / "fonts.css"
    if css_pad.exists():
        return
    (WERK / "fonts").mkdir(parents=True, exist_ok=True)
    url = ("https://fonts.googleapis.com/css2?family=Inter:wght@300..700"
           "&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&display=swap")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"})
    css = urllib.request.urlopen(req).read().decode()
    uit = []
    for sub, blok in re.findall(r"/\* ([\w-]+) \*/\s*(@font-face \{.*?\})", css, re.S):
        if sub not in ("latin", "latin-ext"):
            continue
        bron = re.search(r"url\((.*?)\)", blok).group(1)
        naam = f"fonts/f{len(uit) + 1}.woff2"
        urllib.request.urlretrieve(bron, WERK / naam)
        uit.append(blok.replace(bron, naam))
    if not uit:
        raise SystemExit("Geen lettertypen gevonden bij Google Fonts; het boek zou in een verkeerd lettertype komen.")
    css_pad.write_text("\n".join(uit), encoding="utf-8")

ROMEIN = {"I": 1, "II": 2, "III": 3, "IV": 4}

# Waar elk schema komt: 'intro' (na de inleiding), 'end', of 'before:<begin van een regel>'
PLAATSING = {
    1: [("intro", "lus")],
    2: [("end", "rollen")],
    3: [("code", "reis")],
    4: [("intro", "legenda"), ("before:**De AI die", "remmen"), ("end", "wachtrij"), ("end", "kennislaag")],
    5: [("end", "fases")],
    6: [("before:- **Onderwerpen voorstellen", "citaat"), ("end", "onderzoek")],
    7: [("end", "gesprek")],
    8: [("intro", "overdracht")],
    9: [("end", "cluster")],
    10: [("end", "meting")],
    11: [("end", "rapport")],
    12: [("end", "plan")],
    13: [("end", "voorbereiding")],
    14: [("end", "antwoorden")],
    15: [("end", "schrijfpoort")],
    16: [("end", "controle")],
    17: [("end", "goedkeuren")],
    18: [("end", "publiceren")],
    19: [("intro", "tijdlijn"), ("end", "vergelijking"), ("end", "ladder")],
    20: [("end", "maand")],
    23: [("end", "sales")],
}

# Alleen voor het boek: een inleiding waar het hoofdstuk er geen heeft
EXTRA_INTRO = {
    26: "Deze lijst zet de begrippen uit dit boek op een rij, met in één zin wat elk begrip betekent. Kom je in een hoofdstuk een woord tegen dat je niet kent, dan vind je het hier.",
    3: """Soms helpt het om de hele reis eerst in één oogopslag te zien, voordat je de stappen een voor een doorloopt. Het schema hierna laat zien wie wat doet, en in welke volgorde. De hoofdstukken van deel II werken elke stap uit.

### Zo lees je het schema

- De drie kolommen zijn de drie partijen: de consultant, de app zelf, en de klant.
- Je leest van boven naar beneden. Een pijl die naar een andere kolom gaat, betekent dat de beurt naar een andere partij gaat.
- Een blok met een dubbele rand is een poort: daar gaat het pas verder na een bewuste klik. Er zijn er drie: de meetvragen goedkeuren, een maand vrijgeven, en een pagina goedkeuren.
- Het zwarte blok onderaan is wat blijft doorlopen: elke maand meet de app opnieuw. De gestippelde lijn laat zien dat de reis dan weer bij het meten begint.
- Figuur 4.1 in het volgende hoofdstuk legt alle vormen uit die in de schema's van dit boek terugkomen.""",
}


def parse():
    text = SRC.read_text(encoding="utf-8")
    lines = text.split("\n")
    # voorwoord: het citaatblok bovenaan
    pre = []
    for l in lines[1:]:
        if l.startswith(">"):
            pre.append(l[1:].strip())
        elif pre and not l.strip():
            if pre and pre[-1] != "":
                pre.append("")
        elif l.startswith("---"):
            break
    voorwoord = [p for p in "\n".join(pre).split("\n\n") if p.strip() and not p.startswith("**Wil je dieper?**")]

    parts, cur_part, cur_ch = [], None, None
    for l in lines:
        m = re.match(r"^# Deel (\w+)\. (.+)$", l)
        if m:
            cur_part = {"roman": m.group(1), "title": m.group(2), "chapters": []}
            parts.append(cur_part)
            cur_ch = None
            continue
        m = re.match(r"^## (\d+)\. (.+)$", l)
        if m and cur_part is not None:
            cur_ch = {"num": int(m.group(1)), "title": m.group(2), "body": []}
            cur_part["chapters"].append(cur_ch)
            continue
        if cur_ch is not None:
            if l.strip() == "---":
                continue
            cur_ch["body"].append(l)
    return voorwoord, parts


def md_to_html(md_text):
    # twee spaties inspringen wordt vier, zodat geneste lijsten kloppen
    md_text = re.sub(r"(?m)^( +)", lambda m: " " * (len(m.group(1)) * 2), md_text)
    # een lijstitem dat minder diep inspringt dan de regel ervoor, begint na een witregel
    out = []
    for line in md_text.split("\n"):
        if re.match(r"^\s*(- |\d+\. )", line) and out and out[-1].strip():
            prev = out[-1]
            pi = len(prev) - len(prev.lstrip())
            ci = len(line) - len(line.lstrip())
            prev_is_item = re.match(r"^\s*(- |\d+\. )", prev)
            if ci < pi or (not prev_is_item and ci <= pi):
                out.append("")
        out.append(line)
    md_text = "\n".join(out)
    # losse vette regel wordt een tussenkop
    md_text = re.sub(r"(?m)^\*\*([^*\n]+)\*\*\s*$", r"### \1", md_text)
    return markdown.markdown(md_text, extensions=["tables", "sane_lists"])


def figuur_html(key, ch, idx):
    fn, caption = FIGUREN[key]
    return (
        f'<figure class="fig"><div class="svgwrap">{fn()}</div>'
        f'<figcaption><span class="fn">Figuur {ch}.{idx}</span>{caption}</figcaption></figure>'
    )


def hoofdstuk_html(ch, part_idx):
    body = "\n".join(ch["body"]).strip("\n")
    plaats = PLAATSING.get(ch["num"], [])
    if ch["num"] in EXTRA_INTRO:
        body = EXTRA_INTRO[ch["num"]] + "\n\n" + body
    ends = []
    for i, (pos, key) in enumerate(plaats, 1):
        ph = f"\n\nFIGUUR{i}\n\n"
        if pos == "code":
            body = re.sub(r"```.*?```", ph, body, flags=re.S)
        elif pos.startswith("before:"):
            needle = pos[len("before:"):]
            idx = body.find("\n" + needle)
            assert idx >= 0, (ch["num"], needle)
            body = body[:idx] + ph + body[idx:]
        elif pos == "end":
            ends.append(ph)
        elif pos == "intro":
            pass
    body += "".join(ends)
    # inleiding = eerste alinea
    paras = body.split("\n\n", 1)
    lead = paras[0].strip()
    rest = paras[1] if len(paras) > 1 else ""
    intro_figs = "".join(f"\n\nFIGUUR{i}\n\n" for i, (pos, _) in enumerate(plaats, 1) if pos == "intro")
    rest_html = md_to_html(intro_figs + rest)
    teller = [0]

    def vervang(m):
        teller[0] += 1
        key = plaats[int(m.group(1)) - 1][1]
        return figuur_html(key, ch["num"], teller[0])

    rest_html = re.sub(r"<p>FIGUUR(\d+)</p>", vervang, rest_html)
    lead_html = markdown.markdown(lead)
    return (
        f'<section class="chapter p{part_idx}" id="h{ch["num"]}">'
        f'<header class="ch-head"><div class="ch-num">{ch["num"]}</div>'
        f'<div class="ch-label">Hoofdstuk {ch["num"]}</div><h2>{ch["title"]}</h2></header>'
        f'<div class="lead">{lead_html}</div>{rest_html}</section>'
    )


def build_html(voorwoord, parts, pages):
    toc = []
    for pi, p in enumerate(parts, 1):
        pg = pages.get(f"deel{pi}", "")
        toc.append(f'<div class="toc-part"><span>Deel {p["roman"]}</span> {p["title"]}<span class="pg">{pg}</span></div>')
        for ch in p["chapters"]:
            pg = pages.get(ch["num"], "000")
            toc.append(
                f'<div class="toc-row"><span class="n">{ch["num"]}</span>'
                f'<span class="t">{ch["title"]}</span><span class="dots"></span><span class="pg">{pg}</span></div>'
            )
    body = []
    for pi, p in enumerate(parts, 1):
        lijst = "".join(f'<li><span>{c["num"]}</span>{c["title"]}</li>' for c in p["chapters"])
        body.append(
            f'<section class="partpage"><div class="part-label">Deel {p["roman"]}</div>'
            f'<h1>{p["title"]}</h1><ol class="part-list">{lijst}</ol></section>'
        )
        for ch in p["chapters"]:
            body.append(hoofdstuk_html(ch, pi))

    vw = "".join(markdown.markdown(p) for p in voorwoord)
    part_css = "\n".join(
        f'@page p{i}:right {{ @top-right {{ content: "Deel {p["roman"]}  ·  {p["title"]}"; }} }}\n'
        f'section.p{i} {{ page: p{i}; }}'
        for i, p in enumerate(parts, 1)
    )
    css = (HERE / "book.css").read_text(encoding="utf-8").replace("/*PARTS*/", part_css)
    return f"""<!doctype html>
<html lang="nl"><head><meta charset="utf-8">
<title>Zo werkt ORBIT ENGINE</title>
<link rel="stylesheet" href="fonts.css">
<style>{css}</style></head>
<body>
<section class="cover">
  <div class="cover-top">OUTER ORBIT</div>
  <div class="cover-art">{cover_art()}</div>
  <div class="cover-title">
    <div class="kicker">Handboek</div>
    <h1>Zo werkt<br>ORBIT ENGINE</h1>
    <p>Van begin tot eind: hoe de app meet, adviseert, schrijft en bewijst of het werkt</p>
  </div>
  <div class="cover-foot"><span>Editie september 2026</span><span>Zichtbaar in AI-antwoorden. Gemeten, niet gegokt.</span></div>
</section>
<section class="front">
  <h2 class="front-h">Over dit boek</h2>
  <div class="voorwoord">{vw}
  <p><strong>Hoe het boek is opgebouwd.</strong> Deel I geeft het grote plaatje. Deel II volgt de reis van een klant
  stap voor stap, van het aanmaken van een merk tot het bewijs dat een pagina iets opleverde. Deel III beschrijft
  wat er verder in de app zit, en deel IV de grenzen, de kosten en de begrippen. Elk hoofdstuk begint met een korte
  inleiding, gevolgd door de flow in punten. Waar het helpt, maakt een schema de flow zichtbaar; figuur 4.1 legt uit
  hoe je die schema's leest.</p></div>
</section>
<section class="front toc">
  <h2 class="front-h">Inhoud</h2>
  {''.join(toc)}
</section>
{''.join(body)}
</body></html>"""


def cover_art():
    # banen rond een kern, in zwart op wit
    return """<svg viewBox="0 0 400 400" width="100%" xmlns="http://www.w3.org/2000/svg">
<g fill="none" stroke="#000">
<ellipse cx="200" cy="200" rx="190" ry="70" stroke-width="0.8" transform="rotate(-18 200 200)"/>
<ellipse cx="200" cy="200" rx="150" ry="150" stroke-width="0.6" stroke-dasharray="2 4"/>
<ellipse cx="200" cy="200" rx="185" ry="48" stroke-width="0.8" transform="rotate(32 200 200)"/>
<ellipse cx="200" cy="200" rx="100" ry="100" stroke-width="0.8"/>
</g>
<circle cx="200" cy="200" r="34" fill="#000"/>
<circle cx="366" cy="143" r="7" fill="#000"/>
<circle cx="93" cy="276" r="5" fill="#fff" stroke="#000" stroke-width="1.5"/>
<circle cx="300" cy="200" r="4.5" fill="#000"/>
<circle cx="120" cy="96" r="4" fill="#000"/>
</svg>"""


def render(html, pdf_path):
    tmp = WERK / "boek.html"
    tmp.write_text(html, encoding="utf-8")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROMIUM if Path(CHROMIUM).exists() else None)
        pg = b.new_page()
        pg.goto(tmp.as_uri(), wait_until="networkidle")
        pg.evaluate("document.fonts.ready")
        pg.wait_for_timeout(500)
        pg.pdf(path=str(pdf_path), prefer_css_page_size=True, print_background=True)
        b.close()


def find_pages(pdf_path, parts):
    pages = {}
    from pypdf import PdfReader
    paginas = [p.extract_text() or "" for p in PdfReader(str(pdf_path)).pages]
    if True:
        for i, txt in enumerate(paginas, 1):
            for line in txt.split("\n"):
                line = line.replace(" ", "")
                m = re.match(r"^HOOFDSTUK(\d+)$", line)
                if m and int(m.group(1)) not in pages:
                    pages[int(m.group(1))] = i
                m = re.match(r"^DEEL(I|II|III|IV)$", line)
                if m and f"deel{ROMEIN[m.group(1)]}" not in pages:
                    pages[f"deel{ROMEIN[m.group(1)]}"] = i
        n = len(paginas)
    return pages, n


if __name__ == "__main__":
    voorwoord, parts = parse()
    WERK.mkdir(exist_ok=True)
    lettertypen()
    first = WERK / "ronde1.pdf"
    render(build_html(voorwoord, parts, {}), first)
    pages, n = find_pages(first, parts)
    render(build_html(voorwoord, parts, pages), OUT)
    pages2, n2 = find_pages(OUT, parts)
    assert pages == pages2, (pages, pages2)
    print("pagina's:", n2, "| hoofdstukken gevonden:", sum(1 for k in pages if isinstance(k, int)))
