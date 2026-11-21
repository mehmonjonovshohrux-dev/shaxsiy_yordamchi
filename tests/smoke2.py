import http.server, threading, functools, os, json
from playwright.sync_api import sync_playwright
ROOT='/home/claude/proj/frontend'
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8766),functools.partial(Q,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start()
mock=open('/home/claude/proj/tests/mock-supabase.js').read()
shots='/home/claude/proj/tests/shots'; errs=[]
def step(n): print('•',n)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':390,'height':800},device_scale_factor=2,is_mobile=True,has_touch=True)
    ctx.add_init_script("localStorage.setItem('__user','1')")
    ctx.route('**/vendor/supabase.min.js',lambda r:r.fulfill(body=mock,content_type='application/javascript'))
    pg=ctx.new_page(); pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e)))
    pg.goto('http://127.0.0.1:8766/'); pg.wait_for_selector('.shell')
    # ikkita akkaunt qo'shamiz (storega bevosita)
    pg.evaluate("""()=>{const m=window.__mock;m.accounts.push(
      {id:'x1',title:'Pro akk',game:'PUBG',kind:'own',buy_price:100000,est_price:250000,status:'active',images:[],created_at:new Date(Date.now()-20*864e5).toISOString(),partner_paid:false},
      {id:'x2',title:'Sherik akk',game:'FF',kind:'partner',partner_name:'Ali',buy_price:200000,est_price:500000,status:'active',images:[],created_at:new Date().toISOString(),partner_paid:false});}""")
    pg.click('[data-act=refresh]'); pg.wait_for_timeout(600)
    pg.screenshot(path=f'{shots}/9-home-data.png')
    step('detal'); pg.click('.tabbar [data-tab=own]'); pg.wait_for_timeout(300)
    pg.click('.acc-card'); pg.wait_for_selector('.sheet'); pg.wait_for_timeout(400); pg.screenshot(path=f'{shots}/10-detail.png')
    step('sotish'); pg.click('[data-act=do-sell]'); pg.wait_for_selector('input[name=sold_price]'); pg.wait_for_timeout(300)
    pg.fill('input[name=sold_price]','400000'); pg.wait_for_timeout(200); pg.screenshot(path=f'{shots}/11-sell.png')
    print('  overlay soni:',pg.evaluate("document.querySelectorAll('.sheet-wrap').length"))
    pg.click('.sheet-wrap:last-of-type button[type=submit]'); pg.wait_for_timeout(800)
    print('  holat:',pg.evaluate("window.__mock.accounts.find(a=>a.id==='x1').status"), pg.evaluate("window.__mock.accounts.find(a=>a.id==='x1').sold_price"))
    print('  ochiq oynalar:',pg.evaluate("document.querySelectorAll('.sheet-wrap.open').length"))
    step('orqaga ketma-ket')
    for i in range(1):
        pg.go_back(); pg.wait_for_timeout(350)
        print('  ',i,'url',pg.url,'| shell',pg.query_selector('.shell') is not None,'| toast:',[t.inner_text() for t in pg.query_selector_all('.toast')])
    step('hisobot'); pg.click('.tabbar [data-tab=report]'); pg.wait_for_timeout(500); pg.screenshot(path=f'{shots}/12-report.png')
    step('50/50 tab'); pg.click('.tabbar [data-tab=partner]'); pg.wait_for_timeout(400); pg.screenshot(path=f'{shots}/13-partner.png')
    pg.click('.acc-card'); pg.wait_for_selector('.sheet'); pg.wait_for_timeout(300); pg.go_back(); pg.wait_for_timeout(400)
    step('sozlamalar'); pg.click('.tabbar [data-tab=settings]'); pg.wait_for_timeout(400); pg.screenshot(path=f'{shots}/14-settings.png')
    step('PIN o\'rnatish'); pg.click('[data-act=sec-pin]') if pg.query_selector('[data-act=sec-pin]') else print('  pin-setup yo\'q', [e.get_attribute('data-act') for e in pg.query_selector_all('[data-act]')])
    pg.wait_for_timeout(500); pg.screenshot(path=f'{shots}/15-pin-setup.png')
    for d in '4827': pg.click(f'.pin-keys button[data-k="{d}"]') if pg.query_selector(f'.pin-keys button[data-k="{d}"]') else pg.click(f'.pin-keys button:text-is("{d}")')
    pg.wait_for_timeout(400)
    for d in '4827': pg.click(f'.pin-keys button:text-is("{d}")')
    pg.wait_for_timeout(900); print('  PIN yoqildi:',pg.evaluate("Object.keys(localStorage)"))
    step('qulf: sahifani qayta yuklash'); pg.reload(); pg.wait_for_selector('.lock-screen'); pg.screenshot(path=f'{shots}/16-lock.png')
    for d in '9999': pg.click(f'.pin-keys button:text-is("{d}")')
    pg.wait_for_timeout(500); print('  noto\'g\'ri PIN xabari:',pg.inner_text('.pin-msg'))
    for d in '4827': pg.click(f'.pin-keys button:text-is("{d}")')
    pg.wait_for_selector('.shell',timeout=5000); print('  ochildi')
    print('console xatolar:',json.dumps(errs,ensure_ascii=False)); b.close()
