import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('shortlist',Path(__file__).with_name('procurement-shortlist.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Shortlist(unittest.TestCase):
    def cards(self,n):return [{'product_id':str(i)} for i in range(n)]
    def test_boundary(self):
        self.assertFalse(m.shortlist(self.cards(30))['needs_refinement'])
        self.assertTrue(m.shortlist(self.cards(31))['needs_refinement'])
        self.assertFalse(m.shortlist([])['needs_refinement'])
    def test_dedup_and_preserved_audit(self):
        rows=self.cards(30)*2+[{'product_url':'https://item.taobao.com/item.htm?id=1&tracking=a'}]
        result=m.shortlist(rows)
        self.assertEqual(result['retained_unique'],30)
        self.assertEqual(len(result['candidates']),61)
    def test_only_remaining_counted_and_unknown_not_excluded(self):
        rows=self.cards(29)+[{'product_id':'bad','mismatch':'short sleeve'}]+[{'product_id':'coupon','comparable_price':1,'conditional':True}]
        self.assertEqual(m.shortlist(rows,100)['retained_unique'],30)
        self.assertEqual(m.shortlist([{'price':'USD 100'}])['retained_unique'],1)
    def test_conflicting_duplicate_is_not_silently_discarded(self):
        rows=[{'product_id':'1','mismatch':'uncertain record'},{'product_id':'1'}]
        self.assertEqual(m.shortlist(rows)['retained_unique'],1)
    def test_missing_identity_not_merged(self):
        self.assertEqual(m.shortlist([{'title':'bag'}]*31)['retained_unique'],31)
    def test_no_reference_no_price_exclusion(self):
        r=m.shortlist([{'product_id':'1','comparable_price':9999}])
        self.assertEqual(r['retained_unique'],1)
        self.assertIn('未提供參考價',r['candidates'][0]['reason'])
    def test_custom_limit(self):
        self.assertTrue(m.shortlist(self.cards(3),limit=2)['needs_refinement'])
        with self.assertRaises(ValueError):m.shortlist([],limit=0)
if __name__=='__main__':unittest.main()
