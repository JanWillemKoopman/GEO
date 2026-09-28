"""Haalt de eerste kolom (JSON) uit een opgeslagen toolresultaat van de Supabase-tool.
Gebruik: python3 haal-uit-toolresult.py <toolresult.json> <kolom> <uit.json>"""
import json, sys
pad, kolom, uit = sys.argv[1:4]
buiten = json.load(open(pad))
tekst = buiten[0]["text"] if isinstance(buiten, list) else buiten
res = json.loads(tekst)["result"]
start = res.index("\n[") + 1
rijen = json.loads(res[start:res.rindex("]") + 1])
json.dump(rijen[0][kolom], open(uit, "w"), ensure_ascii=False, indent=1)
print(uit, len(rijen[0][kolom]))
