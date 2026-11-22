import json, re, html
tl=json.load(open('artifacts/timeline.json'))
T=tl['total']
def sentences(text):
    parts=re.split(r'(?<=[.!?])\s+',text.strip())
    out=[]
    for p in parts:
        if out and len(out[-1])<38: out[-1]+=' '+p
        else: out.append(p)
    return out
caps=[]
for v in tl['vo']:
    ss=sentences(v['text']); tot=sum(len(x) for x in ss); t=v['t']
    for x in ss:
        d=v['dur']*len(x)/tot; caps.append((t,d,x)); t+=d
cards=''.join(f'<div class="card" id="card-{s["key"]}"><div class="ph">{html.escape(s["phase"])}</div><div class="ti">{html.escape(s["title"])}</div></div>' for s in tl['segs'] if s['title'] and s['key'] not in ('title','blueprint','end'))
capdivs=''.join(f'<div class="cap" id="cap{i}"><span>{html.escape(x)}</span></div>' for i,(t,d,x) in enumerate(caps))
phases=['Raw materials','Preparation','Surface treatment','Assembly','Final touches','Operation']
pb=''.join(f'<div class="ph"><i>{i+1}</i>{p}</div>' for i,p in enumerate(phases))
seg={s['key']:s for s in tl['segs']}
js=[]
for s in tl['segs']:
    if s['key'] in ('title','blueprint','end') or not s['title']: continue
    a,b=s['start'],s['start']+s['dur']
    js.append(f'tl.fromTo("#card-{s["key"]}",{{opacity:0,x:-40}},{{opacity:1,x:0,duration:0.6,ease:"power3.out"}},{a+0.25});')
    js.append(f'tl.to("#card-{s["key"]}",{{opacity:0,x:-20,duration:0.45,ease:"power2.in"}},{b-0.55});')
for i,(t,d,x) in enumerate(caps):
    js.append(f'tl.fromTo("#cap{i}",{{opacity:0,y:10}},{{opacity:1,y:0,duration:0.25}},{t:.2f});')
    js.append(f'tl.to("#cap{i}",{{opacity:0,duration:0.2}},{t+d-0.05:.2f});')
ti,bp,en,run,cure=seg['title'],seg['blueprint'],seg['end'],seg['run'],seg['cure']
js += [
 f'tl.fromTo("#titlecard",{{opacity:0}},{{opacity:1,duration:1.2}},0.2);',
 f'tl.fromTo("#titlecard .big",{{y:40,opacity:0}},{{y:0,opacity:1,duration:1.2,ease:"power3.out"}},0.5);',
 f'tl.fromTo("#titlecard .sub",{{y:20,opacity:0}},{{y:0,opacity:1,duration:1.0,ease:"power3.out"}},1.3);',
 f'tl.to("#titlecard",{{opacity:0,duration:0.8}},{ti["dur"]-0.9});',
 f'tl.fromTo("#blueprint",{{opacity:0}},{{opacity:1,duration:0.8}},{bp["start"]});',
 f'tl.fromTo("#bp-side",{{opacity:0,scale:0.92,y:30}},{{opacity:1,scale:1,y:0,duration:1.0,ease:"power3.out"}},{bp["start"]+0.6});',
 f'tl.to("#bp-side",{{scale:1.06,duration:8,ease:"none"}},{bp["start"]+1.6});',
 f'tl.fromTo("#bp-front",{{opacity:0,scale:0.92,y:30}},{{opacity:1,scale:1,y:0,duration:1.0,ease:"power3.out"}},{bp["start"]+9.0});',
 f'tl.to("#bp-front",{{scale:1.06,duration:9,ease:"none"}},{bp["start"]+10});',
 f'tl.fromTo("#bp-notes",{{opacity:0}},{{opacity:1,duration:0.8}},{bp["start"]+13});',
 f'tl.to("#blueprint",{{opacity:0,duration:0.8}},{bp["start"]+bp["dur"]-0.8});',
 f'tl.fromTo("#clock",{{opacity:0}},{{opacity:1,duration:0.5}},{cure["start"]+0.5});',
 f'tl.fromTo("#clock .hand",{{rotation:0}},{{rotation:2880,duration:{cure["dur"]-1.5},ease:"none"}},{cure["start"]+0.8});',
 f'tl.to("#clock",{{opacity:0,duration:0.5}},{cure["start"]+cure["dur"]-0.6});',
 f'tl.fromTo("#stats",{{opacity:0,x:60}},{{opacity:1,x:0,duration:0.8,ease:"power3.out"}},{run["start"]+49});',
 f'tl.fromTo("#stats .row",{{opacity:0,x:30}},{{opacity:1,x:0,duration:0.5,stagger:0.5}},{run["start"]+49.4});',
 f'tl.to("#stats",{{opacity:0,duration:0.6}},{run["start"]+run["dur"]-0.8});',
 f'tl.fromTo("#endcard",{{opacity:0}},{{opacity:1,duration:1.2}},{en["start"]+0.5});',
 f'tl.fromTo("#endcard .e",{{y:24,opacity:0}},{{y:0,opacity:1,duration:0.8,stagger:0.35,ease:"power3.out"}},{en["start"]+0.9});',
 f'tl.fromTo("#fadeout",{{opacity:0}},{{opacity:1,duration:1.0}},{T-1.0});',
 f'tl.set({{}},{{}},{T});']
page=open('src/index.tpl.html').read()
page=page.replace('%TOTAL%',str(T)).replace('%CARDS%',cards).replace('%CAPS%',capdivs).replace('%PHASES%',pb).replace('%TLJS%','\n'.join(js))
open('hf/index.html','w').write(page)
print('captions',len(caps))
