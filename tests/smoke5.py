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
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    seed=json.dumps([{'id':'x1','title':'Pro akk','game':'PUBG','kind':'own','buy_price':100000,'est_price':900000,'sold_price':900000,'sold_at':'2026-11-05','status':'sold','images':[],'created_at':'2026-11-01T10:00:00Z','partner_paid':False,'inst_weekly':0}])
    ctx=b.new_context(viewport={'width':320,'height':740},device_scale_factor=2,is_mobile=True,has_touch=True,permissions=['geolocation'],geolocation={'latitude':41.3111,'longitude':69.2797},accept_downloads=True)
    ctx.add_init_script("localStorage.setItem('__user','1'); localStorage.setItem('__mfa','1'); localStorage.setItem('__seed', %s)" % json.dumps(seed))
    ctx.route('**/vendor/supabase.min.js',lambda r:r.fulfill(body=mock,content_type='application/javascript'))
    pg=ctx.new_page(); pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e)))
    pg.goto('http://127.0.0.1:8767/'); pg.wait_for_selector('.shell')
    pg.wait_for_selector('form[data-form=profile]')
    print('• profil oynasi surilmaydi')
    pg.evaluate("""()=>{document.querySelector('.profile-head .btn-row').insertAdjacentHTML('beforeend','<button type=button class="btn sm danger-ghost">Olib tashlash</button>')}""")
    w=pg.evaluate("()=>{const s=document.querySelector('.sheet');return [s.scrollWidth,s.clientWidth,document.documentElement.scrollWidth,innerWidth]}")
    ok(w[0]==w[1] and w[2]==w[3],'gorizontal surilish yo\'q %s'%w); pg.screenshot(path=f'{shots}/60-profile-320.png')
    pg.keyboard.press('Escape'); pg.wait_for_selector('[data-act=onb-later]',timeout=8000); pg.click('[data-act=onb-later]'); pg.wait_for_timeout(500)

    print('• qurilmalar')
    pg.wait_for_timeout(800)
    ok(len(pg.evaluate("window.__mock.devices||[]"))==1,'shu qurilma ro\'yxatga yozildi')
    pg.evaluate("window.__mock.devices.push({id:'dvX',device_id:'other-phone-1',name:'Android · Chrome',first_seen:new Date().toISOString(),last_seen:new Date(Date.now()-3600e3).toISOString(),revoked:false,lat:41.2995,lng:69.2401,accuracy:30,loc_at:new Date().toISOString()})")
    pg.evaluate("window.__open=()=>0")
    def act(name): pg.evaluate("n=>{const b=document.createElement('button');b.dataset.act=n;document.body.appendChild(b);b.click();b.remove()}",name)
    act('open-security'); pg.wait_for_timeout(400)
    pg.wait_for_selector('[data-act=open-devices]'); pg.click('[data-act=open-devices]'); pg.wait_for_selector('.dev'); pg.wait_for_timeout(300)
    ok(len(pg.query_selector_all('.dev'))==2,'2 ta qurilma ko\'rinadi'); ok('Shu qurilma' in pg.inner_text('.dev'),'joriy qurilma belgilangan')
    ok(pg.query_selector('a.dev-loc[href*="openstreetmap.org"]') is not None,'joylashuv: xaritada ko\'rish havolasi'); pg.screenshot(path=f'{shots}/61-devices.png')
    pg.click('[data-act=dev-geo]'); pg.wait_for_timeout(700)
    me=[d for d in pg.evaluate("window.__mock.devices") if d['id']!='dvX'][0]
    ok(abs(me.get('lat',0)-41.3111)<1e-6,'GPS saqlandi: %s,%s'%(me.get('lat'),me.get('lng')))
    pg.click('[data-act=dev-revoke]'); pg.wait_for_selector('button[data-c="1"]'); pg.click('button[data-c="1"]'); pg.wait_for_timeout(500)
    ok(pg.evaluate("window.__mock.devices.find(d=>d.id==='dvX').revoked")==True,'boshqa qurilma chiqarildi (revoked)')
    # chiqarilgan qurilma ochilganda tizimdan chiqadi
    pg.evaluate("window.__mock.devices.find(d=>d.id!=='dvX').revoked=true")
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)

    print('• hisobot yuklash')
    pg2=ctx.new_page(); pg2.on('pageerror',lambda e:errs.append('PAGEERR2 '+str(e)))
    pg.evaluate("window.__mock.devices.forEach(d=>d.revoked=false)")
    pg.reload(); pg.wait_for_selector('.shell'); pg.wait_for_timeout(600)
    pg.wait_for_selector('[data-act=onb-later]',timeout=8000); pg.click('[data-act=onb-later]'); pg.wait_for_timeout(500)
    pg.click('.tabbar [data-tab=report]'); pg.wait_for_selector('[data-act=export-docx]'); pg.screenshot(path=f'{shots}/62-report-dl.png', full_page=True)
    with pg.expect_download() as dl: pg.click('[data-act=export-docx]')
    d=dl.value; path='/tmp/hisobot.docx'; d.save_as(path); ok(d.suggested_filename.endswith('.docx'),'Word fayl: '+d.suggested_filename)
    import docx; doc=docx.Document(path); ok(len(doc.tables)>=3 and doc.paragraphs[0].text=='AccSavdo hisoboti','docx ochiladi, jadvallar: %d'%len(doc.tables))
    pg.evaluate("void (window.print=()=>{window.__printed=document.getElementById('print-root').textContent})")
    pg.click('[data-act=export-pdf]'); pg.wait_for_timeout(300)
    ok('AccSavdo hisoboti' in (pg.evaluate("window.__printed||''")),'PDF: chop etish ko\'rinishi chizildi')

    print('• parolni almashtirish (2FA kodi bilan)')
    act('open-security'); pg.wait_for_timeout(400)
    pg.wait_for_selector('[data-act=sec-password]'); pg.click('[data-act=sec-password]'); pg.wait_for_selector('form[data-form=change-pw]')
    ok(pg.query_selector('form[data-form=change-pw] input[name=code]') is not None,'kod maydoni bor')
    pg.fill('input[name=code]','000000'); pg.fill('input[name=password]','Zamon#Kitob8Quyosh'); pg.fill('input[name=confirm]','Zamon#Kitob8Quyosh')
    pg.wait_for_timeout(300); pg.evaluate("document.querySelector('form[data-form=change-pw] button[type=submit]').disabled=false"); pg.click('form[data-form=change-pw] button[type=submit]'); pg.wait_for_timeout(500)
    ok(pg.evaluate("window.__mock.pw")=='Old#Passw0rd1','noto\'g\'ri kod bilan parol o\'zgarmadi')
    pg.fill('input[name=code]','123456'); pg.fill('input[name=password]','Zamon#Kitob8Quyosh'); pg.fill('input[name=confirm]','Zamon#Kitob8Quyosh'); pg.evaluate("document.querySelector('form[data-form=change-pw] button[type=submit]').disabled=false"); pg.click('form[data-form=change-pw] button[type=submit]'); pg.wait_for_timeout(800)
    ok(pg.evaluate("window.__mock.pw")=='Zamon#Kitob8Quyosh','to\'g\'ri kod bilan parol yangilandi'); ok(pg.evaluate("window.__mock.others")>=1,'boshqa qurilmalar chiqarildi')
    print('console xatolar:',errs); 
    print('FAIL:',fails)
    b.close()
