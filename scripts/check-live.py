"""Read-only audit of public deployment. Uses curl's system TLS trust; no account access."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
import json
import subprocess
import xml.etree.ElementTree as ET

HOST = 'https://raemerrr.github.io'
APP = HOST + '/3d-lotto-number-generator/'
class Page(HTMLParser):
    def __init__(self, html):
        super().__init__(); self.tags = []; self.feed(html)
    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))
def fetch(url):
    raw = subprocess.check_output(['curl', '-sS', '--max-time', '25', '-w', '\n%{http_code}', url], text=True)
    body, code = raw.rsplit('\n', 1)
    return url, int(code), body
urls = [HOST+'/', HOST+'/privacy.html', HOST+'/robots.txt', HOST+'/sitemap.xml', HOST+'/ads.txt', APP+'sitemap.xml']
urls += [APP+lang+'/' for lang in ['ko','en','zh-hans','ja','ru','hi']]
rows = list(ThreadPoolExecutor(max_workers=4).map(fetch, urls))
checks = []
def check(label, ok, pending=False):
    checks.append({'check': label, 'status': 'pass' if ok else ('pending' if pending else 'fail')})
for url, code, body in rows:
    is_ads = url == HOST+'/ads.txt'
    check(url+' HTTP 200', code == 200, is_ads)
    if is_ads:
        check('Live ads.txt matches verified publisher', body.strip() == 'google.com, pub-4576154921851098, DIRECT, f08c47fec0942fa0', True)
    elif url.endswith('sitemap.xml') and code == 200:
        locs = [x.text for x in ET.fromstring(body).iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
        expected = {APP, *[APP+l+'/' for l in ['ko','en','zh-hans','ja','ru','hi']]}
        check(url+' expected URLs', set(locs) in [{HOST+'/', HOST+'/privacy.html'}, {HOST+'/', HOST+'/privacy.html', HOST+'/contact.html'}] if url == HOST+'/sitemap.xml' else set(locs) == expected)
    elif url.endswith('robots.txt'):
        check('Root robots advertises both sitemaps', all(x in body for x in [HOST+'/sitemap.xml',APP+'sitemap.xml']))
        check('Root robots has no disallow directive', not any(line.strip().lower().startswith('disallow:') and line.split(':',1)[1].strip() for line in body.splitlines()))
    elif code == 200:
        page = Page(body)
        check(url+' self canonical', any(t=='link' and a.get('rel')=='canonical' and a.get('href')==url for t,a in page.tags))
        check(url+' no noindex meta', not any(t=='meta' and a.get('name','').lower() in ['robots','googlebot'] and 'noindex' in a.get('content','').lower() for t,a in page.tags))
        if url == HOST+'/':
            for name in ['google-site-verification','google-adsense-account']:
                check('Root '+name+' present', any(t=='meta' and a.get('name')==name and a.get('content') for t,a in page.tags))
        if url.startswith(APP):
            check(url+' seven language alternatives', sum(t=='link' and a.get('rel')=='alternate' and bool(a.get('hreflang')) for t,a in page.tags)==7)
report = {'checked_at_utc': datetime.now(timezone.utc).isoformat(), 'scope':'Public HTTP and HTML only; not Search Console indexing or AdSense approval', 'checks':checks}
Path('artifacts').mkdir(exist_ok=True)
Path('artifacts/live-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
for row in checks: print(row['status'].upper()+': '+row['check'])
raise SystemExit(1 if any(x['status']=='fail' for x in checks) else 0)
