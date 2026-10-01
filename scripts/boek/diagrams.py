"""Zwart-wit flowschema's als inline SVG, voor het boek 'Zo werkt ORBIT ENGINE'.

Vormtaal (ook uitgelegd in figuur 4.1):
  app   rechthoek, dunne lijn        de app doet dit
  mens  pil, dikke lijn              een mens doet dit
  poort dubbele rand                 pas verder na akkoord
  keuze ruit                         een ja of nee
  eind  zwart vlak, witte tekst      uitkomst
  noot  gestippelde rand             toelichting
"""
from html import escape

W = 600
FONT = "Inter, 'Liberation Sans', Arial, sans-serif"


def _lines(t):
    if t is None:
        return []
    return t.split("\n")


class Node:
    def __init__(self, id, cx, cy, title, sub=None, kind="app", w=200, h=None, tag=None):
        self.id, self.cx, self.cy = id, cx, cy
        self.title, self.sub, self.kind, self.w, self.tag = title, sub, kind, w, tag
        nt, ns = len(_lines(title)), len(_lines(sub))
        if h is None:
            if kind == "keuze":
                h = 34 + 13 * nt
            else:
                h = 16 + 13 * nt + (11.5 * ns + 3 if ns else 0)
                h = max(h, 32)
        self.h = h

    def anchor(self, side, off=0):
        x, y, w, h = self.cx, self.cy, self.w, self.h
        return {
            "t": (x + off, y - h / 2),
            "b": (x + off, y + h / 2),
            "l": (x - w / 2, y + off),
            "r": (x + w / 2, y + off),
        }[side]


class Diagram:
    _count = 0

    def __init__(self, height, width=W):
        Diagram._count += 1
        self.pid = f"d{Diagram._count}"
        self.w, self.h = width, height
        self.nodes = {}
        self.parts_back = []
        self.parts_edges = []
        self.parts_nodes = []
        self.parts_front = []

    # ── knopen ──────────────────────────────────────────────────────────
    def node(self, id, cx, cy, title, sub=None, kind="app", w=200, h=None, tag=None):
        n = Node(id, cx, cy, title, sub, kind, w, h, tag)
        self.nodes[id] = n
        self.parts_nodes.append(self._draw_node(n))
        return n

    def _text_block(self, n, color_t="#000", color_s="#333"):
        tl, sl = _lines(n.title), _lines(n.sub)
        th, sh = 13, 11.5
        total = len(tl) * th + (len(sl) * sh + 3 if sl else 0)
        y = n.cy - total / 2 + 10
        out = []
        fs = 10.5 if n.kind == "keuze" else 11
        for line in tl:
            out.append(
                f'<text x="{n.cx}" y="{y:.1f}" text-anchor="middle" font-size="{fs}" '
                f'font-weight="600" fill="{color_t}">{escape(line)}</text>'
            )
            y += th
        if sl:
            y += 1
            for line in sl:
                out.append(
                    f'<text x="{n.cx}" y="{y:.1f}" text-anchor="middle" font-size="9" '
                    f'fill="{color_s}">{escape(line)}</text>'
                )
                y += sh
        return "".join(out)

    def _draw_node(self, n):
        x0, y0 = n.cx - n.w / 2, n.cy - n.h / 2
        o = []
        if n.kind == "app":
            o.append(f'<rect x="{x0}" y="{y0}" width="{n.w}" height="{n.h}" rx="3" fill="#fff" stroke="#000" stroke-width="1.1"/>')
            o.append(self._text_block(n))
        elif n.kind == "mens":
            o.append(f'<rect x="{x0}" y="{y0}" width="{n.w}" height="{n.h}" rx="{n.h/2}" fill="#fff" stroke="#000" stroke-width="2.2"/>')
            o.append(self._text_block(n))
        elif n.kind == "poort":
            o.append(f'<rect x="{x0}" y="{y0}" width="{n.w}" height="{n.h}" fill="#fff" stroke="#000" stroke-width="1.1"/>')
            o.append(f'<rect x="{x0+3.5}" y="{y0+3.5}" width="{n.w-7}" height="{n.h-7}" fill="none" stroke="#000" stroke-width="1.1"/>')
            o.append(self._text_block(n))
        elif n.kind == "keuze":
            pts = f"{n.cx},{y0} {n.cx+n.w/2},{n.cy} {n.cx},{y0+n.h} {n.cx-n.w/2},{n.cy}"
            o.append(f'<polygon points="{pts}" fill="#fff" stroke="#000" stroke-width="1.1"/>')
            o.append(self._text_block(n))
        elif n.kind == "eind":
            o.append(f'<rect x="{x0}" y="{y0}" width="{n.w}" height="{n.h}" rx="3" fill="#000"/>')
            o.append(self._text_block(n, "#fff", "#d6d6d6"))
        elif n.kind == "noot":
            o.append(f'<rect x="{x0}" y="{y0}" width="{n.w}" height="{n.h}" rx="3" fill="#fff" stroke="#000" stroke-width="0.8" stroke-dasharray="3 2.5"/>')
            tl = _lines(n.title)
            y = n.cy - len(tl) * 12 / 2 + 9
            for line in tl:
                o.append(f'<text x="{n.cx}" y="{y:.1f}" text-anchor="middle" font-size="9.2" font-style="italic" fill="#222">{escape(line)}</text>')
                y += 12
        elif n.kind == "zacht":
            o.append(f'<rect x="{x0}" y="{y0}" width="{n.w}" height="{n.h}" rx="3" fill="#efefef" stroke="#000" stroke-width="0.8" stroke-dasharray="3 2.5"/>')
            o.append(self._text_block(n, "#444", "#555"))
        if n.tag:
            t = n.tag.upper()
            tw = len(t) * 5.1 + 10
            tx = x0 + n.w - tw - 8 if n.kind != "keuze" else n.cx + n.w / 4
            ty = y0 - 6.5
            o.append(f'<rect x="{tx:.1f}" y="{ty:.1f}" width="{tw:.1f}" height="13" rx="6.5" fill="#000"/>')
            o.append(f'<text x="{tx+tw/2:.1f}" y="{ty+9.3:.1f}" text-anchor="middle" font-size="7.2" font-weight="700" letter-spacing="0.6" fill="#fff">{escape(t)}</text>')
        return "".join(o)

    # ── lijnen ──────────────────────────────────────────────────────────
    def edge(self, a, sa, b, sb, label=None, dashed=False, via=None, oa=0, ob=0,
             lpos=None, arrow=True, both=False, lanchor="middle"):
        p1 = self.nodes[a].anchor(sa, oa)
        p2 = self.nodes[b].anchor(sb, ob)
        self.path([p1] + (via or self._route(p1, sa, p2, sb)) + [p2] if via else self._route_full(p1, sa, p2, sb),
                  label=label, dashed=dashed, lpos=lpos, arrow=arrow, both=both, lanchor=lanchor)

    def _route(self, p1, sa, p2, sb):
        return []

    def _route_full(self, p1, sa, p2, sb):
        (x1, y1), (x2, y2) = p1, p2
        if sa in "bt" and sb in "bt":
            if abs(x1 - x2) < 0.5:
                return [p1, p2]
            my = (y1 + y2) / 2
            return [p1, (x1, my), (x2, my), p2]
        if sa in "lr" and sb in "lr":
            if abs(y1 - y2) < 0.5:
                return [p1, p2]
            mx = (x1 + x2) / 2
            return [p1, (mx, y1), (mx, y2), p2]
        if sa in "lr" and sb in "tb":
            return [p1, (x2, y1), p2]
        if sa in "tb" and sb in "lr":
            return [p1, (x1, y2), p2]
        return [p1, p2]

    def path(self, pts, label=None, dashed=False, lpos=None, arrow=True, both=False, lanchor="middle"):
        d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        dash = ' stroke-dasharray="4 3"' if dashed else ""
        m_end = f' marker-end="url(#{self.pid}a)"' if arrow else ""
        m_start = f' marker-start="url(#{self.pid}s)"' if both else ""
        self.parts_edges.append(
            f'<path d="{d}" fill="none" stroke="#000" stroke-width="1.1"{dash}{m_end}{m_start} stroke-linejoin="round"/>'
        )
        if label:
            if lpos is None:
                # midden van het langste segment
                best, bi = -1, 0
                for i in range(len(pts) - 1):
                    (ax, ay), (bx, by) = pts[i], pts[i + 1]
                    ln = abs(ax - bx) + abs(ay - by)
                    if ln > best:
                        best, bi = ln, i
                (ax, ay), (bx, by) = pts[bi], pts[bi + 1]
                lpos = ((ax + bx) / 2, (ay + by) / 2)
            self.label(lpos[0], lpos[1], label, anchor=lanchor)

    def label(self, x, y, text, anchor="middle", size=8.8, bg=True, italic=True, weight=400):
        lines = _lines(text)
        lh = size + 2.5
        top = y - len(lines) * lh / 2
        out = []
        if bg:
            wmax = max(len(l) * (0.72 if l.isupper() else 0.53) for l in lines) * size + 8
            bx = {"middle": x - wmax / 2, "start": x - 4, "end": x - wmax + 4}[anchor]
            out.append(f'<rect x="{bx:.1f}" y="{top-1:.1f}" width="{wmax:.1f}" height="{len(lines)*lh+2:.1f}" fill="#fff"/>')
        yy = top + size
        for l in lines:
            st = ' font-style="italic"' if italic else ""
            out.append(f'<text x="{x:.1f}" y="{yy:.1f}" text-anchor="{anchor}" font-size="{size}"{st} font-weight="{weight}" fill="#111">{escape(l)}</text>')
            yy += lh
        self.parts_front.append("".join(out))

    def raw_back(self, s):
        self.parts_back.append(s)

    def raw_front(self, s):
        self.parts_front.append(s)

    def svg(self):
        defs = (
            f'<defs><marker id="{self.pid}a" viewBox="0 0 10 10" refX="9.2" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
            f'<path d="M0,0.8 L10,5 L0,9.2 z" fill="#000"/></marker>'
            f'<marker id="{self.pid}s" viewBox="0 0 10 10" refX="9.2" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
            f'<path d="M0,0.8 L10,5 L0,9.2 z" fill="#000"/></marker></defs>'
        )
        body = "".join(self.parts_back + self.parts_edges + self.parts_nodes + self.parts_front)
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" '
            f'width="100%" style="max-width:{self.w}px" font-family="{FONT}" role="img">{defs}{body}</svg>'
        )


def straight(d, a, b, label=None, dashed=False, lpos=None):
    """Rechte lijn tussen twee knopen, afgekapt op de randen."""
    na, nb = d.nodes[a], d.nodes[b]

    def clip(n, tx, ty):
        dx, dy = tx - n.cx, ty - n.cy
        if dx == 0 and dy == 0:
            return n.cx, n.cy
        sx = (n.w / 2) / abs(dx) if dx else 1e9
        sy = (n.h / 2) / abs(dy) if dy else 1e9
        s = min(sx, sy)
        return n.cx + dx * s, n.cy + dy * s

    p1 = clip(na, nb.cx, nb.cy)
    p2 = clip(nb, na.cx, na.cy)
    d.path([p1, p2], label=label, dashed=dashed, lpos=lpos)


# ════════════════════════════════════════════════════════════════════════
# De figuren
# ════════════════════════════════════════════════════════════════════════

def fig_lus():
    d = Diagram(290)
    d.node("m", 150, 60, "Meten", "Word je genoemd, en door wie?", w=200)
    d.node("a", 450, 60, "Adviseren", "Welke pagina's ontbreken?", w=200)
    d.node("s", 450, 225, "Schrijven", "Samen met de ondernemer", w=200)
    d.node("e", 150, 225, "Effect bewijzen", "Opnieuw meten, met controlegroep", w=200)
    d.edge("m", "r", "a", "l")
    d.edge("a", "b", "s", "t")
    d.edge("s", "l", "e", "r", label="publiceren")
    d.edge("e", "t", "m", "b", label="volgende ronde")
    d.label(300, 143, "De gesloten lus", bg=False, italic=False, size=13, weight=600)
    d.label(300, 162, "pas een uitspraak over effect\nna de laatste stap", bg=False, size=9)
    return d.svg()


def fig_rollen():
    d = Diagram(220)
    d.raw_back('<rect x="10" y="22" width="580" height="180" rx="4" fill="none" stroke="#000" stroke-width="0.9"/>')
    d.label(300, 22, "TWEE ROLLEN", italic=False, weight=700, size=8.5)
    d.node("c", 140, 95, "Beheerder (consultant)", "ziet alles\nstart betaald werk", kind="mens", w=190, h=62)
    d.node("k", 460, 95, "Klant", "ziet alleen het eigen account\nleest, beantwoordt, keurt goed", kind="mens", w=210, h=62)
    d.edge("c", "r", "k", "l")
    d.label(300, 80, "geeft toegang", bg=False, size=8.5)
    d.node("n", 300, 168, "Elke klant kan collega's uitnodigen, met dezelfde rechten.\nMet de schakelaar Admin | Klant ziet de beheerder wat de klant ziet.", kind="noot", w=440, h=40)
    return d.svg()


def fig_reis():
    lanes = {"C": 100, "A": 300, "K": 500}
    rows = [
        [("C", "Merk aanmaken", "mens")],
        [("A", "Onderzoek naar het bedrijf", "app")],
        [("C", "Gesprek met de klant", "mens"), ("K", "Meepraten en aanvullen", "mens")],
        [("C", "Toegang geven, pakket", "mens"), ("K", "Kan inloggen", "mens")],
        [("C", "Cluster starten", "mens")],
        [("A", "30 meetvragen opstellen", "app")],
        [("C", "Vragen goedkeuren", "poort")],
        [("A", "Meten", "app")],
        [("A", "Rapport en kansen", "app")],
        [("C", "Maand starten", "poort")],
        [("A", "Pagina voorbereiden", "app")],
        [("K", "Vragen beantwoorden", "mens")],
        [("A", "Schrijven en controleren", "app")],
        [("K", "Lezen en goedkeuren", "poort")],
        [("K", "Op eigen site zetten", "mens")],
        [("A", "Live-controle, effect meten", "app")],
        [("A", "Elke maand opnieuw meten", "eind")],
    ]
    top, step, nh = 58, 47, 31
    d = Diagram(top + step * len(rows) - 6)
    for name, x in lanes.items():
        pass
    for sep in (200, 400):
        d.raw_back(f'<line x1="{sep}" y1="8" x2="{sep}" y2="{d.h-4}" stroke="#000" stroke-width="0.6" stroke-dasharray="2 3"/>')
    for name, label in (("C", "CONSULTANT"), ("A", "DE APP, VANZELF"), ("K", "KLANT")):
        x = lanes[name]
        d.raw_back(f'<rect x="{x-92}" y="8" width="184" height="24" fill="#000"/>')
        d.raw_back(f'<text x="{x}" y="24" text-anchor="middle" font-size="9" font-weight="700" letter-spacing="0.8" fill="#fff">{label}</text>')
    chain = []
    for i, row in enumerate(rows):
        y = top + i * step + nh / 2
        for j, (lane, title, kind) in enumerate(row):
            nid = f"r{i}{lane}"
            d.node(nid, lanes[lane], y, title, kind=kind, w=172, h=nh)
            if j == 0:
                chain.append((nid, lane))
    for (a, la), (b, lb) in zip(chain, chain[1:]):
        if la == lb:
            d.edge(a, "b", b, "t")
        else:
            side = "r" if lanes[lb] > lanes[la] else "l"
            d.edge(a, side, b, "t")
    d.edge("r2C", "r", "r2K", "l", both=True)
    d.edge("r3C", "r", "r3K", "l")
    # lus terug naar meten
    a = d.nodes["r16A"].anchor("l")
    b = d.nodes["r7A"].anchor("l")
    d.path([a, (212, a[1]), (212, b[1]), b], dashed=True)
    d.label(212, (a[1] + b[1]) / 2, "elke\nmaand", size=8.3)
    return d.svg()


def fig_legenda():
    d = Diagram(118)
    items = [
        ("app", "Stap", "De app doet dit"),
        ("mens", "Stap", "Een mens doet dit"),
        ("poort", "Poort", "Pas verder\nna akkoord"),
        ("keuze", "?", "Een keuze:\nja of nee"),
        ("eind", "Uitkomst", "Het resultaat"),
        ("noot", "toelichting", "Uitleg bij\nhet schema"),
    ]
    for i, (kind, t, lab) in enumerate(items):
        x = 50 + i * 100
        h = 52 if kind == "keuze" else 34
        d.node(f"l{i}", x, 38, t, kind=kind, w=84 if kind != "keuze" else 70, h=h,
               tag="AI" if kind == "app" else None)
        d.label(x, 90, lab, bg=False, italic=False, size=8.8)
    return d.svg()


def fig_wachtrij():
    d = Diagram(540)
    d.node("k", 230, 30, "Iemand klikt op een knop", kind="mens", w=210)
    d.node("q", 230, 100, "Taak in de wachtrij", w=210)
    d.node("w", 230, 170, "Werker pakt de taak op", "elke minuut", w=210)
    d.node("d1", 230, 255, "Resultaat\nal aanwezig?", kind="keuze", w=150, h=78)
    d.node("skip", 450, 255, "Overslaan", "nooit twee keer betalen", w=150)
    d.node("x", 230, 345, "Taak uitvoeren", "hooguit één zware AI-aanroep", w=210, tag="AI")
    d.node("d2", 230, 425, "Gelukt?", kind="keuze", w=120, h=56)
    d.node("retry", 70, 425, "Opnieuw proberen", "na 2, 4, 8 en 16 min", w=120)
    d.node("next", 230, 505, "Volgende taak klaarzetten", w=210)
    d.edge("k", "b", "q", "t")
    d.edge("q", "b", "w", "t")
    d.edge("w", "b", "d1", "t")
    d.edge("d1", "r", "skip", "l", label="ja")
    d.edge("d1", "b", "x", "t", label="nee", lpos=(245, 305), lanchor="start")
    d.edge("x", "b", "d2", "t")
    d.edge("d2", "l", "retry", "r", label="nee")
    a = d.nodes["retry"].anchor("t")
    b = d.nodes["q"].anchor("l")
    d.path([a, (a[0], b[1]), b], dashed=True, label="tot vier keer", lpos=(70, 250))
    d.edge("d2", "b", "next", "t", label="ja", lpos=(245, 465), lanchor="start")
    a = d.nodes["next"].anchor("r")
    b = d.nodes["q"].anchor("r")
    d.path([a, (565, a[1]), (565, b[1]), b], dashed=True, label="de keten\nloopt vanzelf door", lpos=(548, 400))
    return d.svg()


def fig_remmen():
    d = Diagram(222)
    d.node("k", 68, 70, "Knop die\ngeld kost", kind="mens", w=112, h=46)
    d.node("d1", 220, 70, "Start de\nconsultant?", kind="keuze", w=140, h=80)
    d.node("d2", 392, 70, "Onder het\ndagplafond?", kind="keuze", w=140, h=80)
    d.node("ok", 540, 70, "Taak in de\nwachtrij", kind="eind", w=100, h=46)
    d.node("n1", 220, 180, "Melding: je consultant\nregelt dit voor je", w=170)
    d.node("n2", 392, 180, "Melding met bedrag\nen plafond", w=150)
    d.edge("k", "r", "d1", "l")
    d.edge("d1", "r", "d2", "l", label="ja")
    d.edge("d2", "r", "ok", "l", label="ja")
    d.edge("d1", "b", "n1", "t", label="nee")
    d.edge("d2", "b", "n2", "t", label="nee")
    return d.svg()


def fig_kennislaag():
    d = Diagram(300)
    d.node("w", 85, 60, "De website", "waargenomen:\ncitaat teruggevonden", w=150)
    d.node("o", 85, 150, "Ondernemer\nof consultant", "verklaard", w=150)
    d.node("v", 85, 240, "Vermoeden\nvan de AI", "afgeleid", w=150, tag="AI")
    d.node("k", 315, 150, "De kennislaag", "aanbod, feiten, verhalen,\nstem, wat niet mag\n\nelk stukje met herkomst", w=170, h=150)
    d.node("s", 540, 150, "De schrijver", w=110, h=44)
    d.edge("w", "r", "k", "l", ob=-50)
    d.edge("o", "r", "k", "l")
    d.edge("v", "r", "k", "l", ob=50)
    d.edge("k", "r", "s", "l", label="alleen waargenomen\nen verklaard", lpos=(447, 128))
    d.node("n1", 530, 55, "Twee waarden voor\nhetzelfde gegeven?\nDe consultant kiest eerst.", kind="noot", w=130, h=48)
    d.node("n2", 530, 245, "Een vermoeden gaat\nniet mee naar\nde schrijver.", kind="noot", w=130, h=48)
    return d.svg()


def fig_fases():
    d = Diagram(130)
    names = ["Voorbereiden", "Klaar voor\nhet gesprek", "Gesprek gehad", "Overgedragen"]
    subs = ["merk aangemaakt\n(hoofdstuk 5)", "onderzoek klaar\n(hoofdstuk 6)", "gesprek vastgelegd\n(hoofdstuk 7)", "merk toegewezen\n(hoofdstuk 8)"]
    for i, (n, s) in enumerate(zip(names, subs)):
        x = 75 + i * 150
        d.node(f"f{i}", x, 42, n, kind="eind" if i == 3 else "app", w=122, h=46)
        d.label(x, 100, s, bg=False, size=8.6)
    for i in range(3):
        d.edge(f"f{i}", "r", f"f{i+1}", "l")
    return d.svg()


def fig_onderzoek():
    d = Diagram(630)
    X, w = 245, 250
    d.node("v", X, 32, "Vooronderzoek", "tot 1.000 pagina's, alleen titels", w=w, tag="code")
    d.node("s", X, 107, "De site uitlezen", "tot 150 pagina's helemaal", w=w, tag="code")
    d.node("t", 485, 107, "Technische controle", "loopt tegelijk mee", w=170, tag="code")
    d.node("b", X, 187, "Het bedrijf leren kennen", "branche, aanbod, werkgebied", w=w, tag="AI + web")
    d.node("nb", 485, 187, "Mislukt deze stap, dan\nstopt het onderzoek.", kind="noot", w=170, h=36)
    d.node("a", X, 267, "Het aanbod als boom", "elk onderdeel met bron en citaat", w=w, tag="AI")
    d.node("o", 130, 357, "Onderwerpen voorstellen", "5 tot 8 voorstellen", w=210, tag="AI")
    d.node("m", 360, 357, "De markt", "waarom winnen concurrenten?", w=210, tag="AI + web")
    d.node("k", X, 447, "De kennistest", "wat weet de AI al, en klopt het?", w=w, tag="AI + web")
    d.node("z", X, 527, "Alles samenbrengen", "dossier, feiten, open punten", w=w, tag="AI")
    d.node("e", X, 600, "Klaar voor het gesprek", kind="eind", w=w, h=36)
    d.edge("v", "b", "s", "t")
    d.edge("v", "r", "t", "t")
    d.edge("s", "b", "b", "t")
    d.edge("b", "r", "nb", "l", dashed=True, arrow=False)
    d.edge("b", "b", "a", "t")
    d.edge("a", "b", "o", "t")
    d.edge("a", "b", "m", "t")
    d.edge("o", "b", "k", "t")
    d.edge("m", "b", "k", "t")
    d.edge("k", "b", "z", "t")
    d.edge("z", "b", "e", "t")
    return d.svg()


def fig_citaat():
    d = Diagram(190)
    d.node("n", 78, 55, "De AI stelt een\ndienst voor", w=130, tag="AI")
    d.node("d", 262, 55, "Citaat letterlijk\nop de pagina?", kind="keuze", w=160, h=84)
    d.node("ja", 480, 55, "Komt in de\naanbodboom", kind="eind", w=160, h=44)
    d.node("nee", 262, 158, "Vervalt en wordt een\nopen punt voor het gesprek", w=230)
    d.edge("n", "r", "d", "l")
    d.edge("d", "r", "ja", "l", label="ja")
    d.edge("d", "b", "nee", "t", label="nee", lpos=(275, 110), lanchor="start")
    d.label(478, 158, "de app controleert dit zelf,\nniet de AI", bg=False, size=8.8)
    return d.svg()


def fig_gesprek():
    d = Diagram(340)
    d.label(110, 16, "WAT JE IN HET GESPREK INVULT", italic=False, weight=700, size=8.3, bg=False)
    d.label(490, 16, "WAAR HET TERECHTKOMT", italic=False, weight=700, size=8.3, bg=False)
    ins = ["Verhalen", "Verboden woorden", "Stemvoorbeelden", "Bezwaren met het antwoord",
           "Werkgebied en groeiregio's", "Gelijknamige bedrijven"]
    for i, t in enumerate(ins):
        d.node(f"i{i}", 110, 55 + i * 50, t, kind="mens", w=190, h=32)
    outs = [("De schrijver", "van elke pagina", 95), ("De meetvragen", None, 185),
            ("Het rapport", None, 250), ("De meting", "telt ze niet als eigen merk", 305)]
    for j, (t, s, y) in enumerate(outs):
        d.node(f"o{j}", 490, y, t, s, w=170, kind="eind" if j == 0 else "app")
    for a, b in [(0, 0), (1, 0), (2, 0), (3, 0), (3, 1), (4, 1), (4, 2), (5, 3)]:
        straight(d, f"i{a}", f"o{b}")
    return d.svg()


def fig_overdracht():
    d = Diagram(110)
    steps = [("Account van de\nconsultant", "app"), ("Toewijzen aan\ne-mailadres", "mens"),
             ("Pakket kiezen", "mens"), ("Klant kiest\nwachtwoord", "mens"), ("Account van\nde klant", "eind")]
    for i, (t, k) in enumerate(steps):
        d.node(f"s{i}", 58 + i * 121, 45, t, kind=k, w=104, h=46)
    for i in range(4):
        d.edge(f"s{i}", "r", f"s{i+1}", "l")
    d.label(300, 96, "heeft de klant al een inlog, dan is er meteen toegang", bg=False, size=8.8)
    return d.svg()


def fig_cluster():
    d = Diagram(560)
    d.node("k", 300, 32, "Onderwerp kiezen", "voorstel, of zelf ingetypt", kind="mens", w=230)
    d.node("o", 300, 107, "Onderwerp onderzoeken", "wat zegt de site, wie concurreert?", w=230, tag="AI + web")
    for i, (t, x) in enumerate([("Oriëntatie", 125), ("Overweging", 300), ("Beslissing", 475)]):
        d.node(f"f{i}", x, 195, t, "10 vragen", w=150, tag="AI")
        d.edge("o", "b", f"f{i}", "t")
    d.node("c", 300, 287, "Opschonen en aanvullen", "dubbele eruit, lokaal genoeg?", w=230, tag="code")
    for i in range(3):
        d.edge(f"f{i}", "b", "c", "t")
    d.node("v", 300, 362, "Zoekvolume schatten", "een schatting, geen echte zoekdata", w=230, tag="AI")
    d.node("p", 300, 447, "Bevestig en start meting", "pas meten na akkoord", kind="poort", w=230, h=46)
    d.node("m", 300, 527, "De meting", kind="eind", w=230, h=34)
    d.node("n", 505, 447, "Geen merknaam en\ngeen concurrent\nin de vragen.", kind="noot", w=140, h=48)
    d.edge("c", "b", "v", "t")
    d.edge("v", "b", "p", "t")
    d.edge("p", "b", "m", "t")
    return d.svg()


def fig_meting():
    d = Diagram(540)
    d.node("q", 300, 30, "Eén meetvraag", "de 8 zwaarste vragen drie keer", w=240)
    d.node("c", 185, 112, "ChatGPT", "met zoeken op internet", w=190, tag="AI + web")
    d.node("g", 415, 112, "Google AI Overview", "het AI-antwoord in Google", w=190)
    d.node("w", 300, 200, "Wie wordt er genoemd?", "plek en rol van elk merk", w=240, tag="AI")
    d.node("i", 300, 275, "Concurrent of iets anders?", "marktplaats, vergelijker, leverancier", w=240, tag="AI")
    d.node("s", 300, 350, "Eén score met marge", "vragen zonder aanbieder tellen apart", w=240, tag="code")
    d.node("r", 300, 425, "Waarom wint een concurrent?", "met een letterlijk citaat", w=240, tag="AI")
    d.node("e", 300, 505, "Het rapport", kind="eind", w=240, h=34)
    d.edge("q", "b", "c", "t")
    d.edge("q", "b", "g", "t")
    d.edge("c", "b", "w", "t")
    d.edge("g", "b", "w", "t")
    for a, b in [("w", "i"), ("i", "s"), ("s", "r"), ("r", "e")]:
        d.edge(a, "b", b, "t")
    return d.svg()


def fig_rapport():
    d = Diagram(565)
    X = 240
    d.node("m", X, 28, "De meting", w=230, h=32)
    d.node("g", X, 98, "De gaten", "waar winnen concurrenten?", w=230, tag="AI")
    d.node("s", X, 173, "De structuur", "welke dienst heeft een pagina?", w=230, tag="code")
    d.node("r", X, 248, "Het rapport", "met aanbevolen pagina's", w=230, tag="AI")
    d.node("d", X, 343, "Voldoet aan\nde vier eisen?", kind="keuze", w=170, h=84)
    d.node("x", 480, 343, "Afgewezen,\nmet de reden", w=140)
    d.node("k", X, 440, "Een kans", "met bewijs en kennisgat", w=230)
    d.node("e", X, 525, "Ideeënlijst van het contentplan", kind="eind", w=230, h=34)
    d.node("n", 480, 248, "Daarna op de achtergrond:\npotentie opnieuw schatten,\nexterne bronnen zoeken", kind="noot", w=170, h=50)
    d.node("e4", 480, 440, "De vier eisen: gemeten gemis,\nklant heeft iets te zeggen,\nnog geen pagina, geen overlap", kind="noot", w=180, h=50)
    for a, b in [("m", "g"), ("g", "s"), ("s", "r"), ("r", "d"), ("k", "e")]:
        d.edge(a, "b", b, "t")
    d.edge("d", "b", "k", "t", label="ja", lpos=(253, 403), lanchor="start")
    d.edge("d", "r", "x", "l", label="nee")
    d.edge("r", "r", "n", "l", dashed=True, arrow=False)
    return d.svg()


def fig_plan():
    d = Diagram(300)
    d.node("v", 80, 75, "Ideeënlijst", "alle pagina-ideeën,\nnooit gewist", w=120, h=64)
    x0, bw, gap = 215, 27, 3
    for i in range(12):
        x = x0 + i * (bw + gap)
        d.raw_front(f'<rect x="{x:.1f}" y="50" width="{bw}" height="50" rx="2" fill="#fff" stroke="#000" stroke-width="1"/>')
        d.raw_front(f'<text x="{x+bw/2:.1f}" y="114" text-anchor="middle" font-size="8.5" font-weight="{700 if i == 0 else 400}" fill="#000">{i+1}</text>')
        for k in range(3):
            d.raw_front(f'<rect x="{x+5:.1f}" y="{57+k*13}" width="{bw-10}" height="8" rx="1" fill="#000"/>')
    d.label(x0 + 6 * (bw + gap) - gap / 2, 132, "twaalf maanden; elke open maand wordt gevuld tot het pakket vol is", bg=False, size=8.8)
    d.path([(140, 64), (x0 - 1, 64)])
    d.path([(x0 - 1, 86), (140, 86)])
    d.label(177, 38, "inplannen en\nterugzetten", bg=False, size=8.5)
    d.node("p", 330, 200, "Maand starten", "alleen de consultant, kost geld", kind="poort", w=240, h=46)
    d.node("e", 330, 272, "Alle pagina's van de maand worden voorbereid", kind="eind", w=340, h=34)
    xm = x0 + bw / 2
    d.path([(xm, 100), (xm, 200), d.nodes["p"].anchor("l")])
    d.label(xm + 8, 165, "akkoord van\nde klant", bg=False, size=8.5, anchor="start")
    d.edge("p", "b", "e", "t")
    return d.svg()


def fig_voorbereiding():
    d = Diagram(290)
    xs = [110, 300, 490]
    for i, x in enumerate(xs):
        d.label(x, 16, f"PAGINA {i+1}", italic=False, weight=700, size=8.5, bg=False)
        d.node(f"o{i}", x, 62, "Vaste open vraag", "\"Wat wil je zelf vertellen?\"", w=160, tag="code")
        d.node(f"b{i}", x, 155, "Content brief", "onderzoek en tot 8 vragen", w=160, tag="AI + web")
        d.edge(f"o{i}", "b", f"b{i}", "t")
    d.edge("b0", "r", "b1", "l", label="ziet de\nvragen", lpos=(205, 185))
    d.edge("b1", "r", "b2", "l", label="ziet de\nvragen", lpos=(395, 185))
    d.label(300, 212, "op volgorde van publicatiedatum, na elkaar", bg=False, size=8.8)
    d.node("n", 300, 255, "Mislukt een brief vier keer? Dan gaat de pagina door met alleen de open vraag.", kind="noot", w=440, h=28)
    return d.svg()


def fig_antwoorden():
    d = Diagram(250)
    d.label(125, 16, "SOORT VRAAG", italic=False, weight=700, size=8.3, bg=False)
    d.label(475, 16, "GAAT NAAR", italic=False, weight=700, size=8.3, bg=False)
    ins = [("De open vraag", 60), ("Vraag van deze pagina", 125), ("Vraag voor het hele bedrijf", 190)]
    outs = [("De schrijver van deze pagina", 60), ("Pagina's over dezelfde dienst", 125), ("Elke volgende pagina", 190)]
    for i, (t, y) in enumerate(ins):
        d.node(f"i{i}", 125, y, t, kind="mens", w=200, h=34)
    for j, (t, y) in enumerate(outs):
        d.node(f"o{j}", 475, y, t, w=210, h=34, kind="eind" if j == 0 else "app")
    straight(d, "i0", "o0", label="letterlijk", lpos=(300, 60))
    straight(d, "i1", "o0")
    straight(d, "i1", "o1")
    straight(d, "i2", "o2")
    d.label(300, 236, "na elk antwoord kijkt de app of de pagina geschreven mag worden", bg=False, size=8.8)
    return d.svg()


def fig_schrijfpoort():
    d = Diagram(365)
    d.node("a", 170, 30, "Laatste antwoord gegeven", kind="mens", w=210)
    d.node("o", 430, 30, "Ochtendronde", "elke dag om 04:00", w=190)
    d.node("d1", 300, 128, "Brief klaar en\nnul vragen open?", kind="keuze", w=190, h=84)
    d.node("w1", 85, 128, "Wachten op\nde klant", w=120)
    d.node("d2", 300, 235, "Datum binnen\n10 dagen?", kind="keuze", w=170, h=80)
    d.node("w2", 85, 235, "Wachten tot\nde datum", w=120)
    d.node("n", 500, 235, "Nu laten schrijven", "consultant: slaat alleen\nde datum over", kind="mens", w=170, h=54)
    d.node("s", 300, 330, "Schrijven", kind="eind", w=190, h=36)
    d.edge("a", "b", "d1", "t")
    d.edge("o", "b", "d1", "t")
    d.edge("d1", "l", "w1", "r", label="nee")
    d.edge("d1", "b", "d2", "t", label="ja", lpos=(312, 184), lanchor="start")
    d.edge("d2", "l", "w2", "r", label="nee")
    d.edge("d2", "b", "s", "t", label="ja", lpos=(312, 290), lanchor="start")
    d.edge("n", "b", "s", "r")
    a = d.nodes["n"].anchor("t")
    d.path([a, (500, 128), d.nodes["d1"].anchor("r")], dashed=True, label="vragen\ntellen wel", lpos=(500, 170))
    return d.svg()


def fig_controle():
    d = Diagram(620)
    X = 240
    d.node("t", X, 28, "Geschreven tekst", w=240, h=32)
    d.node("c", X, 100, "Controle in de code", "harde beweringen, verboden woorden", w=240, tag="code")
    d.node("r", X, 178, "De eindredacteur", "klopt het? is het goed?", w=240, tag="AI")
    d.node("d", X, 270, "Goed, en niets\nonbewezen?", kind="keuze", w=180, h=86)
    d.node("h", X, 365, "Eén herschrijving", "met de feedback erbij", w=240, tag="AI")
    d.node("c2", X, 440, "Controle in de code", "de beste van de twee versies blijft", w=240, tag="code")
    d.node("g", X, 515, "Twijfelzinnen worden geel", w=240, tag="code")
    d.node("k", X, 588, "Naar de klant", kind="eind", w=240, h=36)
    d.node("n", 485, 365, "Er komt nooit een\ntweede beoordeling of\ntweede herschrijving.", kind="noot", w=160, h=50)
    for a, b in [("t", "c"), ("c", "r"), ("r", "d"), ("h", "c2"), ("c2", "g"), ("g", "k")]:
        d.edge(a, "b", b, "t")
    d.edge("d", "b", "h", "t", label="nee", lpos=(253, 330), lanchor="start")
    a = d.nodes["d"].anchor("r")
    b = d.nodes["k"].anchor("r")
    d.path([a, (575, a[1]), (575, b[1]), b], label="ja", lpos=(575, 300))
    return d.svg()


def fig_goedkeuren():
    d = Diagram(330)
    X = 220
    d.node("l", X, 30, "De klant leest de tekst", kind="mens", w=230)
    d.node("g", X, 108, "Gele zinnen nalopen", "\"Klopt\" of \"Pas aan\"", kind="mens", w=230, h=46)
    d.node("p", X, 195, "Keur goed", "pas als geen gele zin meer open staat", kind="poort", w=250, h=48)
    d.node("e", X, 285, "Het publicatiepakket", "tekst, FAQ, titels, bestand", kind="eind", w=230, h=46)
    d.node("a", 480, 108, "Vraag een aanpassing", "wens in eigen woorden", kind="mens", w=180, h=46)
    d.node("v", 480, 195, "Nieuwe versie", "de oude blijft bewaard", w=180, tag="AI")
    d.edge("l", "b", "g", "t")
    d.edge("g", "b", "p", "t")
    d.edge("p", "b", "e", "t")
    d.edge("g", "r", "a", "l", dashed=True, label="als het\nanders moet", lpos=(368, 108))
    d.edge("a", "b", "v", "t")
    a = d.nodes["v"].anchor("r")
    b = d.nodes["l"].anchor("r")
    d.path([a, (588, a[1]), (588, b[1]), b], dashed=True)
    return d.svg()


def fig_publiceren():
    d = Diagram(420)
    X = 195
    d.node("o", X, 30, "Klant zet de pagina online", kind="mens", w=250)
    d.node("u", X, 100, "Klant vult het live-adres in", kind="mens", w=250)
    d.node("g", X, 170, "Meteen gemarkeerd als gepubliceerd", w=250)
    d.node("h", X, 245, "De app haalt de pagina op", w=250, tag="code")
    d.node("e", X, 385, "Uitkomst in gewone taal", kind="eind", w=250, h=36)
    checks = ["Is de pagina bereikbaar?", "Staat de tekst erop? (60%)", "Gegevens voor zoekmachines?", "Stuurt het adres door?"]
    for i, c in enumerate(checks):
        d.node(f"c{i}", 480, 215 + i * 44, c, w=200, h=32)
    for a, b in [("o", "u"), ("u", "g"), ("g", "h"), ("h", "e")]:
        d.edge(a, "b", b, "t")
    a = d.nodes["h"].anchor("r")
    d.path([a, (360, a[1])], arrow=False)
    d.raw_back(f'<line x1="360" y1="215" x2="360" y2="{215+3*44}" stroke="#000" stroke-width="1.1"/>')
    for i in range(4):
        y = 215 + i * 44
        d.path([(360, y), (380, y)])
    d.node("n", 480, 130, "De klant hoeft niet\nte wachten op de controle.", kind="noot", w=200, h=36)
    return d.svg()


def fig_tijdlijn():
    d = Diagram(170)
    y = 70
    d.raw_back(f'<line x1="40" y1="{y}" x2="565" y2="{y}" stroke="#000" stroke-width="1.4"/>')
    pts = [(60, "dag 0", "Publicatie", "vertrekpunt: laatste meting\nvan vóór publicatie"),
           (310, "dag 14", "Golf 1", "doelvragen en controlegroep\nopnieuw meten"),
           (545, "dag 28", "Golf 2", "weegt zwaarder:\nde AI heeft tijd gehad")]
    for i, (x, dag, t, s) in enumerate(pts):
        fill = "#000" if i == 0 else "#fff"
        d.raw_front(f'<circle cx="{x}" cy="{y}" r="7" fill="{fill}" stroke="#000" stroke-width="1.6"/>')
        d.label(x, 38, dag, italic=False, weight=700, size=9.5, bg=False)
        d.label(x, 52, t, italic=False, size=9, bg=False)
        d.label(x, 115, s, bg=False, size=8.8)
    d.label(185, 88, "de AI moet de pagina eerst vinden", bg=True, size=8.5)
    return d.svg()


def fig_vergelijking():
    d = Diagram(290)
    d.node("dv", 150, 40, "Doelvragen", "de vragen waarvoor\nde pagina is gemaakt", w=200, h=58)
    d.node("cg", 450, 40, "Controlegroep", "tot 5 vragen\nzonder pagina", w=200, h=58)
    d.node("v1", 150, 130, "Verschil vóór en na", w=200, tag="code")
    d.node("v2", 450, 130, "Verschil vóór en na", w=200, tag="code")
    d.node("o", 300, 215, "Oordeel: gestegen, gelijk of gedaald", "binnen de marge telt als gelijk", kind="eind", w=300, h=46)
    d.edge("dv", "b", "v1", "t")
    d.edge("cg", "b", "v2", "t")
    d.edge("v1", "b", "o", "t", ob=-60)
    d.edge("v2", "b", "o", "t", ob=60)
    d.label(300, 270, "te weinig vragen om iets te zeggen? dan: \"nog te weinig gegevens\"", bg=False, size=8.8)
    return d.svg()


def fig_ladder():
    d = Diagram(330)
    steps = [
        ("Gepubliceerd en gecontroleerd", "de app zelf"),
        ("Zichtbaar in Google", "Search Console"),
        ("Genoemd door AI", "effectmeting"),
        ("Geciteerd door AI", "effectmeting"),
        ("Verkeer", "Search Console"),
        ("Conversie", "geen koppeling, dus geen gegevens"),
        ("Omzet", "geen koppeling, dus geen gegevens"),
    ]
    bw, bh, stepx = 240, 32, 22
    for i, (t, bron) in enumerate(steps):
        y = 290 - i * 40
        x = 30 + i * stepx
        dashed = i >= 5
        dash = ' stroke-dasharray="4 3"' if dashed else ""
        fill = "#f0f0f0" if dashed else "#fff"
        d.raw_front(f'<rect x="{x}" y="{y-bh/2}" width="{bw}" height="{bh}" rx="3" fill="{fill}" stroke="#000" stroke-width="1.1"{dash}/>')
        d.raw_front(f'<circle cx="{x+18}" cy="{y}" r="9" fill="#000"/>')
        d.raw_front(f'<text x="{x+18}" y="{y+3.4}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#fff">{i+1}</text>')
        col = "#555" if dashed else "#000"
        d.raw_front(f'<text x="{x+36}" y="{y+3.8}" font-size="10.5" font-weight="600" fill="{col}">{escape(t)}</text>')
        d.raw_front(f'<text x="{x+bw+12}" y="{y+3.5}" font-size="9" font-style="italic" fill="#222">{escape(bron)}</text>')
    return d.svg()


def fig_maand():
    import math
    d = Diagram(330)
    cx, cy, rx, ry = 300, 160, 215, 118
    names = [("Eerste van de maand", "eind"), ("Meetronde per cluster", "app"), ("Concurrentanalyse", "app"),
             ("Nieuw rapport", "app"), ("Nieuwe pagina-ideeën\nin de ideeënlijst", "app"), ("Contentplan en\nnieuwe pagina's", "mens")]
    for i, (t, k) in enumerate(names):
        ang = math.radians(-90 + i * 60)
        x, y = cx + rx * math.cos(ang), cy + ry * math.sin(ang)
        d.node(f"n{i}", x, y, t, kind=k, w=150, h=40 if "\n" in t else 32)
    for i in range(6):
        straight(d, f"n{i}", f"n{(i+1)%6}")
    d.label(cx, cy - 8, "Elke maand", bg=False, italic=False, weight=600, size=12)
    d.label(cx, cy + 16, "tegelijk: technische\ncontrole van de site", bg=False, size=8.8)
    return d.svg()


def fig_sales():
    rows = [
        ("Markt kiezen", "branche, plaats, straal", "mens", None),
        ("Bedrijven zoeken en ontdubbelen", "bestaande klanten eruit", "app", "AI"),
        ("Poort 1: de lijst goedkeuren", None, "poort", None),
        ("Sites van de bedrijven uitlezen", None, "app", "code"),
        ("Waar zoeken kopers naar?", "vragen per fase van de klantreis", "app", "AI"),
        ("Poort 2: vragen en kostenraming", None, "poort", None),
        ("Vragen stellen en beoordelen", "wie wordt genoemd?", "app", "AI + web"),
        ("Acht soorten kansen zoeken", "met een score", "app", "code"),
        ("Uitleg en een reden om te bellen", None, "app", "AI"),
        ("Medewerker pakt een kans op", None, "mens", None),
        ("Contactpersoon, conceptmail,\nbelvoorbereiding", None, "app", "AI"),
        ("Medewerker verstuurt zelf", "vanuit de eigen mailbox", "mens", None),
        ("Wordt het een klant? Dan een merk", "de reis begint bij hoofdstuk 5", "eind", None),
    ]
    step = 57
    d = Diagram(30 + step * len(rows))
    X = 235
    for i, (t, s, k, tag) in enumerate(rows):
        d.node(f"s{i}", X, 26 + i * step, t, s, kind=k, w=270, h=40, tag=tag)
    for i in range(len(rows) - 1):
        d.edge(f"s{i}", "b", f"s{i+1}", "t")
    d.node("n1", 490, 26 + 7 * step, "De code, niet de AI,\nbepaalt de soort kans:\nonzichtbaar, concurrent gap,\nverlies, en vijf andere.", kind="noot", w=170, h=58)
    d.node("n2", 490, 26 + 10 * step, "Elk getal in de mail\nwordt nagerekend\ntegen de meting.", kind="noot", w=170, h=48)
    d.node("n3", 490, 26 + 11 * step, "De app verstuurt\nnooit zelf een mail.", kind="noot", w=170, h=36)
    return d.svg()


FIGUREN = {
    "lus": (fig_lus, "De vier bewegingen van ORBIT ENGINE vormen een gesloten lus."),
    "rollen": (fig_rollen, "De twee rollen: de beheerder en de klant."),
    "reis": (fig_reis, "De hele reis: wie doet wat, van merk aanmaken tot de maandelijkse meting."),
    "legenda": (fig_legenda, "Hoe je de schema's in dit boek leest. Een zwart label bovenop een blok zegt wat daar het werk doet: AI, AI met zoeken op internet (AI + WEB), of vaste regels in de code (CODE)."),
    "wachtrij": (fig_wachtrij, "Wat er gebeurt met een taak in de wachtrij."),
    "remmen": (fig_remmen, "De twee remmen op de kosten."),
    "kennislaag": (fig_kennislaag, "De kennislaag: drie soorten herkomst, en wat er naar de schrijver gaat."),
    "fases": (fig_fases, "De fases van een merk, en wat het merk naar de volgende fase brengt."),
    "onderzoek": (fig_onderzoek, "Het automatische onderzoek, van vooronderzoek tot dossier."),
    "citaat": (fig_citaat, "Elke dienst in de aanbodboom moet te bewijzen zijn met een letterlijk citaat."),
    "gesprek": (fig_gesprek, "Wat er in het gesprek wordt ingevuld, en waar het later gebruikt wordt."),
    "overdracht": (fig_overdracht, "Het merk gaat van de consultant naar de klant."),
    "cluster": (fig_cluster, "Van onderwerp naar dertig goedgekeurde meetvragen."),
    "meting": (fig_meting, "Wat er met elke meetvraag gebeurt."),
    "rapport": (fig_rapport, "Van meting naar kansen."),
    "plan": (fig_plan, "Het contentplan: een ideeënlijst, twaalf maanden, en het starten van een maand."),
    "voorbereiding": (fig_voorbereiding, "De pagina's van een maand worden na elkaar voorbereid, zodat geen vraag dubbel gesteld wordt."),
    "antwoorden": (fig_antwoorden, "Waar een antwoord van de ondernemer terechtkomt."),
    "schrijfpoort": (fig_schrijfpoort, "De schrijfpoort: wanneer een pagina geschreven wordt."),
    "controle": (fig_controle, "De controle, met hooguit één herschrijving."),
    "goedkeuren": (fig_goedkeuren, "Lezen, goedkeuren en opleveren."),
    "publiceren": (fig_publiceren, "De klant publiceert, de app controleert."),
    "tijdlijn": (fig_tijdlijn, "De twee hermetingen na publicatie."),
    "vergelijking": (fig_vergelijking, "Doelvragen en controlegroep naast elkaar: zo ontstaat het oordeel."),
    "ladder": (fig_ladder, "De bewijsladder: zeven treden van publicatie tot omzet, met de bron van elk bewijs."),
    "maand": (fig_maand, "De maandelijkse cyclus die vanzelf doorloopt."),
    "sales": (fig_sales, "De Sales-module: van markt tot conceptmail, met twee poorten."),
}
