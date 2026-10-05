from pathlib import Path
from urllib.request import Request,urlopen
from PIL import Image,ImageOps,ImageDraw
import json,sys,time
pid=sys.argv[1]; root=Path(sys.argv[2]) if len(sys.argv)>2 else Path('data/apparel-reference'); out=root/('images-'+pid);out.mkdir(exist_ok=True)
media=json.loads((root/('media-'+pid+'.json')).read_text(encoding='utf8')); saved=[]
for i,m in enumerate(media):
 if not any(s in m.get('context','') for s in ['descV8-singleImage','descV8-richtext','mainPicWrap','thumbnailItem']):continue
 u=m.get('src','');u='https:'+u if u.startswith('//') else u
 if not u.startswith('https://'):continue
 path=out/f'{i:03}.jpg'
 try:
  if not path.exists():
   with urlopen(Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=25) as r: data=r.read(20_000_000)
   import io
   Image.open(io.BytesIO(data)).convert('RGB').save(path,quality=95)
   time.sleep(.15)
  im=Image.open(path)
  if im.height<25:continue
  saved.append({'index':i,'path':str(path),'url':u,'size':im.size})
 except Exception as e: print('FAILED',i,str(e))
(out/'manifest.json').write_text(json.dumps(saved,ensure_ascii=False,indent=2),encoding='utf8')
for start in range(0,len(saved),12):
 batch=saved[start:start+12]; sheet=Image.new('RGB',(1200,950),'#edf1f4');draw=ImageDraw.Draw(sheet)
 for k,m in enumerate(batch):
  im=Image.open(m['path']); im.thumbnail((282,280));x=(k%4)*300+(300-im.width)//2;y=(k//4)*315+25
  sheet.paste(im,(x,y));draw.text(((k%4)*300+10,(k//4)*315+5),f"Image {m['index']} | {m['size'][0]}x{m['size'][1]}",fill='black')
 sheet.save(out/f'contact-{start//12+1}.jpg',quality=92)
print(json.dumps({'saved':len(saved),'dir':str(out)},ensure_ascii=False))
