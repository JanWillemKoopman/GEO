# Verkoopdocument, voor de salesafdeling

`aura-verkoopdocument.pdf`, vijf pagina's: wat Aura is, welk probleem het oplost, de vijf fases,
de USP's en waarom een bedrijf dit niet kan missen. Geschreven voor het salesteam, niet voor de
klant: bevat interne cijfers (kostprijs per klant, het verkoopmodel).

**Bron.** Samengesteld uit de documentatie en code op `main`, peildatum 5 augustus 2026:
`README.md`, `APP_FLOW_DOCUMENTATION.md` (hoofdstuk 1, voor sales), `docs/logbook.md` §15
(sales-led strategie, InSpace Nova) en `docs/designsystem.md` (het kleurenpalet, rechtstreeks
overgenomen zodat het document er als Aura uitziet).

**Bijwerken.** `aura-verkoopdocument.html` is de bron, zelfstandig leesbaar in een browser. Na een
wijziging in de app die de cijfers of het verhaal raakt (nieuwe kosten, een nieuwe fase, een
gewijzigd verkoopmodel), werk eerst deze HTML bij en genereer opnieuw:

```bash
CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome   # of een andere Chromium/Chrome-executable
"$CHROME" --headless --disable-gpu --no-sandbox \
  --print-to-pdf=aura-verkoopdocument.pdf --print-to-pdf-no-header --no-pdf-header-footer \
  "file://$(pwd)/aura-verkoopdocument.html"
```

A4, vijf `.page`-secties met `page-break-after`. Kleuren en typografie volgen het dark-mode-palet
uit `docs/designsystem.md` §C (paars `#8511D9`, groen `#B9EFA3`, mono-labels voor stat-captions).
