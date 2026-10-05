"""Evidence-led first-pass gate. Prices use integer cents; photos are reviewed by a human/agent."""
from decimal import Decimal

def screen(reference, price, conditional=False, bundle=False, mismatch=None, threshold=60):
    if mismatch:
        return '排除 / Exclude', mismatch
    if bundle or price is None:
        return '待確認 / Pending', '單件價格待確認 / Unit price unknown'
    if reference is None:
        return '待確認 / Pending', '未提供參考價，不依價格排除 / No reference price; no price exclusion'
    ref = int(Decimal(str(reference))*100)
    value = int(Decimal(str(price))*100)
    if ref <= 0:
        raise ValueError('Reference price must be positive')
    if not 0 < threshold < 100:
        raise ValueError('Threshold must be between 0 and 100')
    outside = abs(value-ref)*100 >= ref*Decimal(str(threshold))
    if outside and conditional:
        return '待確認 / Pending', '優惠前價格待確認 / Unconditional price unknown'
    if outside:
        return '排除 / Exclude', f'頁面價格價差達{threshold}% / Listed price deviation >={threshold}%'
    return '保留 / Retain', '頁面價格在範圍內，仍須核對SKU / Listed price within range; verify SKU'

if __name__ == '__main__':
    import unittest
    class Gates(unittest.TestCase):
        def test_boundaries(self):
            for p in (59.2,236.8,34.9,279):self.assertTrue(screen(148,p)[0].startswith('排除'))
            for p in (59.21,236.79,148,78):self.assertTrue(screen(148,p)[0].startswith('保留'))
        def test_historical_threshold(self):
            self.assertTrue(screen(148,78,threshold=40)[0].startswith('排除'))
        def test_uncertain_prices(self):
            for kwargs in ({'conditional':True},{'bundle':True}):self.assertTrue(screen(148,49,**kwargs)[0].startswith('待'))
            self.assertTrue(screen(148,None)[0].startswith('待'))
        def test_explicit_mismatch(self):
            self.assertTrue(screen(148,99,conditional=True,mismatch='short sleeves')[0].startswith('排除'))
    unittest.main()
