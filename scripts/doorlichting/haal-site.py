import sys,re,html,urllib.request,os
naam,urls=sys.argv[1],sys.argv[2:]
out=open(naam+'.txt','w')
for u in urls:
    try:
        s=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=20).read().decode('utf8','ignore')
    except Exception as e:
        out.write(f'\n\n### {u}\nFOUT {e}\n'); continue
    s=re.sub(r'(?s)<(script|style|nav|footer|header)[^>]*>.*?</\1>',' ',s)
    t=html.unescape(re.sub(r'<[^>]+>',' ',s)); t=' '.join(t.split())
    out.write(f'\n\n### {u}\n{t}\n')
