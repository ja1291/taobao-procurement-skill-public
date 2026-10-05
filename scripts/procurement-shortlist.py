"""Apply evidence-led screening and prompt when the retained cohort is too broad."""
import argparse
import importlib.util
import json
from pathlib import Path
from urllib.parse import urlparse, parse_qs

spec = importlib.util.spec_from_file_location('screen', Path(__file__).with_name('procurement-screen.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def identity(row, index):
    if row.get('product_id'):
        return 'id:' + str(row['product_id'])
    url = row.get('product_url') or row.get('url')
    if url:
        parsed = urlparse(url)
        # Only Taobao/Tmall listing IDs identify products across tracking URLs.
        if parsed.hostname in ('item.taobao.com', 'detail.tmall.com'):
            pid = parse_qs(parsed.query).get('id', [None])[0]
            if pid:
                return 'id:' + pid
        return 'url:' + url
    # Unknown identities cannot safely be collapsed based on similar titles/photos.
    return 'unidentified:' + str(index)

def shortlist(rows, reference=None, limit=30):
    if type(limit) is not int or limit < 1:
        raise ValueError('limit must be a positive integer')
    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
        raise ValueError('Expected a list of product records')
    audit, retained = [], set()
    for index, row in enumerate(rows):
        # Explicit numeric comparable_price is set after checking currency/unit/conditions.
        # Do not parse a mixed currency, coupon or bundle price string as a unit price.
        decision, reason = module.screen(reference, row.get('comparable_price'),
            conditional=row.get('conditional', False), bundle=row.get('bundle', False),
            mismatch=row.get('mismatch'))
        key = identity(row, index)
        if not decision.startswith('排除'):
            retained.add(key)
        audit.append({'identity':key, 'product':row, 'decision':decision, 'reason':reason})
    broad = len(retained) > limit
    return {'scope':'本輪已載入候選，非全站結果', 'loaded_records':len(rows),
        'retained_unique':len(retained), 'limit':limit, 'needs_refinement':broad,
        'next_action':'ask_for_refinement' if broad else 'review_candidates',
        'prompt':f'初篩後仍有 {len(retained)} 件候選（本輪載入範圍，超過 {limit} 件）。請補充產品用途、材質、尺寸、預算或必要功能，或附上參考圖，以縮小範圍；也可以明確選擇保留目前範圍，分批查核。' if broad else None,
        'candidates':audit}

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',required=True)
    parser.add_argument('--output',required=True)
    parser.add_argument('--reference',type=float)
    parser.add_argument('--limit',type=int,default=30)
    args=parser.parse_args()
    raw=json.loads(Path(args.input).read_text(encoding='utf-8-sig'))
    if isinstance(raw,dict):
        raw=raw.get('result',raw)
        raw=raw.get('products') if isinstance(raw,dict) else raw
    result=shortlist(raw,args.reference,args.limit)
    dest=Path(args.output);dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k!='candidates'},ensure_ascii=False,indent=2))
