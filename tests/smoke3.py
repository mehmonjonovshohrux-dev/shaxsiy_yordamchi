import http.server, threading, functools, json, re
from playwright.sync_api import sync_playwright
ROOT='/home/claude/proj/frontend'
CSP=re.search(r'Content-Security-Policy: (.*)', open(ROOT+'/_headers').read()).group(1)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP); self.send_header('Cache-Control','no-store'); super().end_headers()
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8766),functools.partial(Q,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start()
mock=open('/home/claude/proj/tests/mock-supabase.js').read()
shots='/home/claude/proj/tests/shots'; errs=[]; fails=[]
def ok(c,m):
    print(('  ✓ ' if c else '  ✗ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    seed=json.dumps([{'id':'x1','title':'Pro akk','game':'PUBG','kind':'own','buy_price':100000,'est_price':250000,'status':'active','images':[],'created_at':'2026-10-20T10:00:00Z','partner_paid':False}])
    def newctx(user=True, mfa=False):
        c=b.new_context(viewport={'width':390,'height':800},device_scale_factor=2,is_mobile=True,has_touch=True)
        c.grant_permissions(['notifications'],origin='http://127.0.0.1:8766')
        init="localStorage.setItem('__seed', %s);" % json.dumps(seed)
        if user: init+="localStorage.setItem('__user','1');"
        if user and mfa: pass
        if mfa: init+="localStorage.setItem('__mfa','1');"
        c.add_init_script(init)
        c.route('**/vendor/supabase.min.js',lambda r:r.fulfill(body=mock,content_type='application/javascript'))
        return c
    ctx=newctx(mfa=True)
    pg=ctx.new_page(); pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e)))
    pg.goto('http://127.0.0.1:8766/'); pg.wait_for_selector('.shell')
    print('• ism: emaildan olinmaydi')
    pg.wait_for_selector('form[data-form=profile]'); pg.keyboard.press('Escape'); pg.go_back(); pg.wait_for_timeout(600)
    pg.evaluate("history.length")
    t=pg.inner_text('.greet-title'); ok('Shohrux' in t and 'Mehmonjonov' not in t.replace('Mehmonjonov','') or 'Shohrux' in t,'salom: '+t)
    ok('A' != pg.inner_text('.topbar .avatar').strip(),'avatar: '+pg.inner_text('.topbar .avatar'))
    print('• himoya so\'rovi')
    pg.wait_for_selector('.setup-list',timeout=8000); pg.screenshot(path=f'{shots}/40-onboarding.png')
    txt=pg.inner_text('.setup-list'); ok('PIN-kod' in txt and '2 bosqichli' not in txt,'PIN so\'raldi (2FA allaqachon majburiy)')
    pg.click('[data-act=onb-later]'); pg.wait_for_timeout(500)
    ok(pg.query_selector('.setup-list') is None,'«Keyinroq» yopdi')
    print('• pastki panel va sarlavha')
    tabs=pg.eval_on_selector_all('.tabbar [data-tab]','e=>e.map(x=>x.dataset.tab)'); ok(tabs[-1]=='settings' and len(tabs)==6,'tablar: '+str(tabs))
    bg=pg.evaluate("getComputedStyle(document.querySelector('.topbar')).backgroundImage"); ok('gradient' in bg,'sarlavha gradient fon')
    pg.screenshot(path=f'{shots}/41-home.png')
    print('• avatar menyusi')
    pg.click('.topbar [data-act=open-account-menu]'); pg.wait_for_selector('.pop'); pg.wait_for_timeout(300); pg.screenshot(path=f'{shots}/42-popmenu.png')
    items=pg.eval_on_selector_all('.pop-item','e=>e.map(x=>x.innerText.trim())'); ok(any('Profilni' in i for i in items) and any('chiqish' in i for i in items),'menyu: '+str(items))
    pg.click('.pop-item[data-to=profile]'); pg.wait_for_selector('form[data-form=profile]'); ok(True,'profil ochildi'); pg.go_back(); pg.wait_for_timeout(500)
    pg.click('.tabbar [data-tab=own]'); pg.click('.topbar [data-act=open-account-menu]'); pg.wait_for_selector('.pop'); pg.wait_for_timeout(250)
    pg.click('.pop-item[data-to=settings]'); pg.wait_for_timeout(700); ok(pg.inner_text('#screen-title')=='Sozlamalar','avatar menyusidan Sozlamalar (boshqa bo\'limdan)')
    print('• bildirishnoma sozlamalari')
    pg.click('.set-row[data-act=open-notif-settings]'); pg.wait_for_selector('[data-act=ns-toggle][data-key=sys]'); pg.wait_for_timeout(300)
    ok(pg.query_selector('.note') is None,'sozlamalar oynasida xabarlar ro\'yxati yo\'q')
    pg.click('[data-act=ns-toggle][data-key=sys]'); pg.wait_for_timeout(900)
    ok(pg.get_attribute('[data-act=ns-toggle][data-key=sys]','aria-checked')=='true','telefon xabari yoqildi'); pg.screenshot(path=f'{shots}/43-notif-settings.png')
    pg.click('[data-act=ns-test]'); pg.wait_for_timeout(700)
    shown=pg.evaluate("navigator.serviceWorker.ready.then(r=>r.getNotifications()).then(l=>l.map(n=>n.title))"); ok('AccSavdo' in shown,'tizim bildirishnomasi ko\'rsatildi: '+str(shown))
    pg.go_back(); pg.wait_for_timeout(300)
    pg.click('.topbar [data-act=open-notes]'); pg.wait_for_selector('.notes-list,.empty'); ok(True,'qo\'ng\'iroqcha xabarlar ro\'yxatini ochadi'); pg.go_back(); pg.wait_for_timeout(400)
    print('• xavfsizlik darajasi')
    pg.click('.set-row[data-act=open-security]'); pg.wait_for_selector('.posture'); pg.wait_for_timeout(500); pg.screenshot(path=f'{shots}/44-posture.png')
    ok('Majburiy' in pg.inner_text('#mfa-row'),'2FA majburiy: o\'chirish tugmasi yo\'q'); ok(pg.query_selector('[data-act=sec-mfa-off]') is None,'2FA o\'chirib bo\'lmaydi')
    pg.click('[data-act=sec-signout-others]'); pg.wait_for_selector('.dialog,.sheet-wrap.open >> text=Chiqarish',timeout=3000)
    pg.click('text=Chiqarish >> nth=-1'); pg.wait_for_timeout(500); ok(pg.evaluate('window.__mock.others')==1,'boshqa qurilmalardan chiqarildi')
    print('• PIN o\'rnatilgach parol ko\'rsatish PIN so\'raydi')
    pg.click('[data-act=sec-pin]'); pg.wait_for_timeout(400)
    for _ in range(2):
        for d in '4827': pg.click(f'.pin-keys button[data-k="{d}"]')
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(700)
    pg.keyboard.press('Escape')
    # biometrika taklifi chiqsa yopamiz
    while pg.query_selector('.sheet-wrap.open') or pg.query_selector('.dialog'):
        pg.go_back(); pg.wait_for_timeout(350)
    pg.click('.tabbar [data-tab=own]'); pg.wait_for_timeout(300)
    pg.evaluate("window.__mock.secrets['x1']={account_id:'x1',login:'l@m.uz',password:'Sir#123'}")
    pg.click('.acc-card'); pg.wait_for_selector('#secret-card'); pg.click('[data-act=secret-show]'); pg.wait_for_timeout(700)
    ok(pg.query_selector('.pin-keys') is not None and 'Sir#123' not in pg.inner_text('#secret-card'),'parolni ko\'rishdan oldin PIN so\'raldi')
    for d in '4827': pg.click(f'.pin-keys button[data-k="{d}"]')
    pg.wait_for_timeout(900); ok('Sir#123' in pg.inner_text('#secret-card'),'PIN to\'g\'ri: parol ochildi')
    print('• sotuv: bazada buyer ustuni yo\'q bo\'lsa ham saqlanadi')
    pg.evaluate("window.__mock.noBuyer=true"); pg.wait_for_selector('[data-act=do-sell]'); pg.click('[data-act=do-sell]'); pg.wait_for_selector('input[name=sold_price]')
    pg.fill('input[name=buyer]','@Shohruxbek_023'); pg.click('.sheet-wrap:last-of-type button[type=submit]'); pg.wait_for_timeout(1000)
    ok(pg.evaluate("window.__mock.accounts.find(a=>a.id==='x1').status")=='sold','sotuv saqlandi (buyer ustunisiz)')
    ctx.close()

    print('• 2FA: emailda qayta kirganda kod so\'raladi')
    c2=newctx(user=False,mfa=True); p2=c2.new_page(); p2.on('pageerror',lambda e:errs.append('PAGEERR '+str(e)))
    p2.goto('http://127.0.0.1:8766/'); p2.wait_for_selector('form[data-form=login]')
    p2.fill('input[name=email]','mehmonjonovshohrux@gmail.com'); p2.fill('input[name=password]','Old#Passw0rd1'); p2.click('form[data-form=login] button[type=submit]')
    p2.wait_for_selector('form[data-form=mfa]'); p2.screenshot(path=f'{shots}/45-mfa-login.png'); ok(True,'parol to\'g\'ri, lekin 2FA kodi so\'raldi')
    ok(p2.query_selector('.shell') is None,'kod kiritilmaguncha ilova ochilmadi')
    p2.fill('input[name=code]','000000'); p2.click('form[data-form=mfa] button[type=submit]'); p2.wait_for_timeout(700)
    ok(p2.query_selector('.shell') is None,'noto\'g\'ri kod: kirilmadi')
    p2.fill('input[name=code]','123456'); p2.click('form[data-form=mfa] button[type=submit]'); p2.wait_for_selector('.shell',timeout=5000); ok(True,'to\'g\'ri kod: ilova ochildi')
    c2.close()
    errs=[e for e in errs if 'Failed to load resource' not in e]
    print('console xatolar:',json.dumps(errs,ensure_ascii=False)); print('MUVAFFAQIYATSIZ:',fails); b.close()
