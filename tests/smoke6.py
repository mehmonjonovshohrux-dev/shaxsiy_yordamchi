import http.server, threading, functools, json, re
from playwright.sync_api import sync_playwright
ROOT='/home/claude/proj/frontend'
CSP=re.search(r'Content-Security-Policy: (.*)', open(ROOT+'/_headers').read()).group(1)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP); self.send_header('Cache-Control','no-store'); super().end_headers()
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8767),functools.partial(Q,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start()
mock=open('/home/claude/proj/tests/mock-supabase.js').read()
shots='/home/claude/proj/tests/shots'; errs=[]; fails=[]
def ok(c,m):
    print(('  ✓ ' if c else '  ✗ ')+m)
    if not c: fails.append(m)

mock_min={'v':'9.9.0'}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':360,'height':700},is_mobile=True, service_workers='block')
    ctx.add_init_script("localStorage.setItem('__user','1'); localStorage.setItem('__mfa','1'); localStorage.setItem('__seed','[]')")
    ctx.route('**/vendor/supabase.min.js',lambda r:r.fulfill(body=mock,content_type='application/javascript'))
    ctx.route('**/version.json*',lambda r:r.fulfill(body='{"version":"9.9.0","min":"%s"}'%mock_min['v'],content_type='application/json'))
    pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://127.0.0.1:8767/'); pg.wait_for_selector('#update-wall'); pg.wait_for_timeout(500)
    ok('Yangilanish bor' in pg.inner_text('#update-wall'),'eski versiya: devor chiqdi')
    ok(pg.evaluate("document.querySelector('.shell')===null && document.getElementById('app').children.length===0"),'ilova/ma\'lumot ko\'rinmaydi')
    pg.screenshot(path=f'{shots}/70-update-wall.png')
    # oflayn: oxirgi ma'lum talab qo'llanadi
    ctx.unroute('**/version.json*'); ctx.route('**/version.json*',lambda r:r.abort())
    pg.reload(); pg.wait_for_selector('#update-wall'); ok('Internetga ulaning' in pg.inner_text('#update-wall'),'oflayn: devor saqlanadi')
    # talab pasaysa ishlaydi
    ctx.unroute('**/version.json*'); ctx.route('**/version.json*',lambda r:r.fulfill(body='{"version":"2.7.0","min":"2.7.0"}',content_type='application/json'))
    pg.reload(); pg.wait_for_selector('.shell',timeout=8000); ok(pg.query_selector('#update-wall') is None,'versiya mos: ilova ochiladi')
    print('FAIL:',fails, errs); b.close()
