import json,sys
from pathlib import Path
from html.parser import HTMLParser
class Parser(HTMLParser):
 def __init__(self): super().__init__(); self.images=[]; self.stack=[]; self.tabs=[]; self.inputs=[]
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=='img': self.images.append(dict(a,context='/'.join(self.stack[-5:])))
  if t=='input': self.inputs.append(a)
  if t not in ['img','input','br','hr','meta','link','source','wbr']: self.stack.append(a.get('class',t))
 def handle_endtag(self,t):
  if self.stack:self.stack.pop()
p=Path(sys.argv[1]); parser=Parser();parser.feed(p.read_text(encoding='utf8'))
root=Path(sys.argv[3]) if len(sys.argv)>3 else Path('data/apparel-reference')
root.mkdir(parents=True,exist_ok=True)
out=root/('media-'+sys.argv[2]+'.json');out.write_text(json.dumps(parser.images,ensure_ascii=False,indent=2),encoding='utf8')
print('IMAGES',len(parser.images),'INPUTS',json.dumps(parser.inputs,ensure_ascii=False))
for i,x in enumerate(parser.images):
 print(i, x.get('alt',''),x.get('src','')[:180],x.get('data-src','')[:150],x.get('context','')[-150:])
text=p.read_text(encoding='utf8')
for s in ['图文详情','数量','有货']:
 i=text.find(s);print('CONTEXT',s,text[max(0,i-260):i+200])
