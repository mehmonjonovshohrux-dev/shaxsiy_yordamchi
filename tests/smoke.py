import http.server, threading, functools, sys, os, json
from playwright.sync_api import sync_playwright
ROOT = '/home/claude/proj/frontend'
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8765), functools.partial(Q, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
mock = open('/home/claude/proj/tests/mock-supabase.js').read()
errs = []; shots = '/home/claude/proj/tests/shots'; os.makedirs(shots, exist_ok=True)
def step(n): print('•', n)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route('**/vendor/supabase.min.js', lambda r: r.fulfill(body=mock, content_type='application/javascript'))
    pg = ctx.new_page()
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.goto('http://127.0.0.1:8765/'); pg.wait_for_selector('.auth-card'); pg.screenshot(path=f'{shots}/1-login.png')
    step('login xato parol')
    pg.fill('input[type=email]', 'a@b.uz'); pg.fill('input[type=password]', 'wrong'); pg.click('button[type=submit]')
    pg.wait_for_selector('.form-error'); print('  xabar:', pg.inner_text('.form-error'))
    pg.fill('input[type=password]', 'Old#Passw0rd1'); pg.click('button[type=submit]')
    step('2FA majburiy: parol qayta so\'raladi')
    pg.wait_for_selector('form[data-form=mfa-setup-pw]'); pg.fill('input[name=password]','wrong'); pg.click('form[data-form=mfa-setup-pw] button[type=submit]'); pg.wait_for_selector('.form-error:not([hidden])')
    pg.fill('input[name=password]','Old#Passw0rd1'); pg.click('form[data-form=mfa-setup-pw] button[type=submit]'); pg.wait_for_selector('form[data-form=mfa-setup-newpw]')
    step('yangi kuchli parol majburiy')
    assert pg.is_disabled('form[data-form=mfa-setup-newpw] button[type=submit]'), 'bo\'sh parol bilan davom etib bo\'lmasligi kerak'
    pg.fill('input[name=password]','weakpass'); pg.fill('input[name=confirm]','weakpass'); assert pg.is_disabled('form[data-form=mfa-setup-newpw] button[type=submit]'), 'zaif parol qabul qilinmasligi kerak'
    pg.fill('input[name=password]','N3w#Strong-Pass42'); pg.fill('input[name=confirm]','N3w#Strong-Pass42'); pg.screenshot(path=f'{shots}/2b-newpw.png')
    pg.click('form[data-form=mfa-setup-newpw] button[type=submit]'); pg.wait_for_selector('.qr'); pg.screenshot(path=f'{shots}/2-mfa-setup.png')
    assert pg.evaluate("window.__mock.pw")=='N3w#Strong-Pass42','parol yangilanmadi'
    assert pg.query_selector('.shell') is None
    pg.fill('input[name=code]','111111'); pg.click('form[data-form=mfa-setup-code] button[type=submit]'); pg.wait_for_timeout(600); assert pg.query_selector('.shell') is None
    pg.fill('input[name=code]','123456'); pg.click('form[data-form=mfa-setup-code] button[type=submit]')
    pg.wait_for_selector('.shell', timeout=5000); step('kirdi: ' + pg.inner_text('.topbar h1'))
    pg.wait_for_selector('form[data-form=profile]'); pg.keyboard.press('Escape'); pg.wait_for_selector('[data-act=onb-later]',timeout=8000); pg.click('[data-act=onb-later]'); pg.wait_for_timeout(500); pg.screenshot(path=f'{shots}/5-home-empty.png')
    step('akkaunt qo\'shish')
    pg.click('.fab'); pg.wait_for_selector('.sheet'); pg.wait_for_timeout(400); pg.screenshot(path=f'{shots}/6-form.png')
    print('  history.length, state:', pg.evaluate('history.length'))
    pg.fill('input[name=title]', 'Pro akk 100 level')
    pg.fill('input[name=buy_price]', '100000'); pg.fill('input[name=est_price]', '250000')
    png = bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000001e221bc330000000049454e44ae426082')
    open('/tmp/t.png', 'wb').write(png)
    pg.set_input_files('input[type=file]', '/tmp/t.png'); pg.wait_for_timeout(500)
    pg.click('.sheet button[type=submit]'); pg.wait_for_timeout(1200)
    step('ro\'yxat: ' + str(pg.evaluate('window.__mock.accounts.length')) + ' ta, rasm: ' + str(pg.evaluate('window.__mock.accounts[0]?.images?.length')))
    pg.screenshot(path=f'{shots}/7-after-add.png')
    step('orqaga tugmasi: forma yopilishi kerak')
    print('  sheet bor:', pg.query_selector('.sheet') is not None)
    pg.go_back(); pg.wait_for_timeout(500)
    print('  url:', pg.url, ' shell bor:', pg.query_selector('.shell') is not None)
    for tab in ['own', 'sold', 'report']:
        pg.click(f'.tabbar [data-act=tab][data-tab={tab}]') if pg.query_selector(f'.tabbar [data-tab={tab}]') else None
        pg.wait_for_timeout(300); pg.screenshot(path=f'{shots}/8-{tab}.png')
    step('console xatolar: ' + json.dumps(errs, ensure_ascii=False))
    b.close()
