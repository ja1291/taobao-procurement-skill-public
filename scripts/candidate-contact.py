"""Download observed candidate image URLs and render all candidates, without a top-N cut."""
from pathlib import Path
import sys,json,urllib.request,concurrent.futures
from PIL import Image,ImageDraw,ImageFont
source=Path(sys.argv[1]).resolve();out=source.parent/'screening-r3';out.mkdir(exist_ok=True)
obj=json.loads(source.read_text(encoding='utf8'));products=obj['result']['products']
def get(p):
 f=out/(p['product_id']+'.jpg')
 try:
  if not p.get('image_url'):return {'id':p['product_id'],'status':'missing_url'}
  if not f.exists():
   req=urllib.request.Request(p['image_url'],headers={'User-Agent':'Mozilla/5.0'})
   with urllib.request.urlopen(req,timeout=25) as r:f.write_bytes(r.read())
  with Image.open(f) as im:im.verify()
  return {'id':p['product_id'],'status':'saved','path':str(f),'url':p['image_url']}
 except Exception as e:return {'id':p['product_id'],'status':'error','error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:results=list(ex.map(get,products))
font=ImageFont.truetype('C:/Windows/Fonts/msjh.ttc',17)
for start in range(0,len(products),18):
 im=Image.new('RGB',(1500,1080),'white');d=ImageDraw.Draw(im)
 for j,(p,r) in enumerate(zip(products[start:start+18],results[start:start+18])):
  x=(j%6)*250;y=(j//6)*360
  if r['status']=='saved':
   with Image.open(r['path']) as pic:
    pic=pic.convert('RGB');pic.thumbnail((240,286));im.paste(pic,(x+(240-pic.width)//2,y))
  else:d.text((x+5,y+70),'無圖 / Not available',font=font,fill='black')
  d.text((x+4,y+290),f"#{start+j+1} {p['product_id']}",font=font,fill='black')
  d.text((x+4,y+313),p['price']+' '+p.get('price_note',''),font=font,fill='black')
  d.text((x+4,y+337),p['title'][:12],font=font,fill='black')
 im.save(out/f'contact-{start//18+1}.jpg')
(out/'images.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
(out/'candidates.json').write_text(json.dumps(products,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'source':str(source),'count':len(products),'images_saved':sum(r['status']=='saved' for r in results),'sheets':(len(products)+17)//18},ensure_ascii=False))
