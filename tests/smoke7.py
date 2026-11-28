# Service worker: yangilanish faqat foydalanuvchi bosganda; joylashuv bir marta so'raladi
import http.server, threading, functools, json, re, shutil, os, subprocess
from playwright.sync_api import sync_playwright
SRC='/home/claude/proj/frontend'; FE='/tmp/fe'
shutil.rmtree(FE,ignore_errors=True); shutil.copytree(SRC,FE)
mock=open('/home/claude/proj/tests/mock-supabase.js').read()
open(FE+'/vendor/supabase.min.js','w').write(mock)
subprocess.run(['node','-e',"""const fs=require('fs');const l=JSON.parse(fs.readFileSync('/tmp/fe/precache.json'));fs.writeFileSync('/tmp/fe/precache.json',JSON.stringify(l))"""])
CSP=re.search(r'Content-Security-Policy: (.*)', open(SRC+'/_headers').read()).group(1)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP); self.send_header('Cache-Control','no-cache'); super().end_headers()
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8772),functools.partial(Q,directory=FE)); threading.Thread(target=srv.serve_forever,daemon=True).start()
fails=[]
def ok(c,m):
    print(('  ✓ ' if c else '  ✗ ')+m)
    if not c: fails.append(m)
def sh(cmd): subprocess.run(cmd,shell=True,check=True)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':360,'height':740},is_mobile=True,has_touch=True,permissions=['geolocation'],geolocation={'latitude':41.3,'longitude':69.2})
    ctx.add_init_script("if(!localStorage.getItem('__init')){localStorage.setItem('__init','1');localStorage.setItem('__user','1');localStorage.setItem('__mfa','1');localStorage.setItem('__seed','[]');localStorage.setItem('accsavdo.profilePrompted','1')}")
    pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://127.0.0.1:8772/'); pg.wait_for_selector('.shell')
    print('• birinchi o\'rnatish')
    pg.wait_for_timeout(1500)
    n=pg.evaluate("caches.open('accsavdo-v10').then(c=>c.keys()).then(k=>k.length)")
    ok(n>50,'ilova fayllari keshlandi: %d'%n)
    pg.reload(); pg.wait_for_selector('.shell'); pg.wait_for_timeout(500)
    ok(pg.evaluate("navigator.serviceWorker.controller!==null"),'SW sahifani boshqaryapti')
    pg.evaluate("window.__marker=42")
    print('• yangi versiya chiqdi (sayt yangilandi)')
    sh("sed -i \"s/VERSION: '2.8.0'/VERSION: '2.9.0'/\" /tmp/fe/js/config.js; echo '{ \"version\": \"2.9.0\", \"min\": \"2.9.0\" }' > /tmp/fe/version.json; sed -i \"s/accsavdo-v10/accsavdo-v11/\" /tmp/fe/sw.js; sed -i \"s/Yangilanish endi faqat/Yangilanish YANGI endi faqat/\" /tmp/fe/js/screens/help.js")
    pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.update())"); pg.wait_for_timeout(2500)
    ok(pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>!!r.waiting)"),'yangi SW «kutish»da turibdi')
    ok(pg.evaluate("window.__marker")==42,'sahifa o\'zi qayta yuklanmadi (foydalanuvchi bosmagan)')
    ok(pg.evaluate("fetch('js/config.js').then(r=>r.text()).then(t=>t.includes('2.8.0'))"),'hali eski versiya xizmat qilmoqda')
    print('• foydalanuvchi bosadi')
    pg.evaluate("import('./js/services/update-gate.js').then(m=>m.checkGate())"); pg.wait_for_selector('#update-wall'); ok('Yangilanish bor' in pg.inner_text('#update-wall'),'«Yangilanish bor» oynasi chiqdi')
    pg.click('#uw-btn')
    for _ in range(60):
        pg.wait_for_timeout(250)
        try:
            if pg.evaluate('window.__marker')is None and pg.query_selector('.shell'): break
        except Exception: pass
    ok(pg.evaluate("import('./js/config.js').then(m=>m.CONFIG.VERSION)")=='2.9.0','bosgandan keyin 2.9.0 ishlayapti')
    ok(pg.evaluate("caches.keys()")==['accsavdo-v11'],'eski kesh tozalandi')
    print('• joylashuv bir marta')
    pg.wait_for_timeout(800)
    ok(pg.evaluate("localStorage.getItem('accsavdo.geoOk')")=='1','joylashuv olindi va eslab qolindi')
    print('• ruxsat prompt holatida: faqat bir marta so\'raladi')
    c2=b.new_context(viewport={'width':360,'height':740},is_mobile=True,service_workers='block')
    c2.add_init_script("if(!localStorage.getItem('__init')){localStorage.setItem('__init','1');localStorage.setItem('__user','1');localStorage.setItem('__mfa','1');localStorage.setItem('__seed','[]');localStorage.setItem('accsavdo.profilePrompted','1')} window.__calls=+localStorage.getItem('__calls')||0; navigator.permissions.query=async()=>({state:'prompt'}); navigator.geolocation.getCurrentPosition=(ok,err)=>{localStorage.setItem('__calls',String(++window.__calls)); err({code:1})}")
    q=c2.new_page(); q.goto('http://127.0.0.1:8772/'); q.wait_for_selector('.shell'); q.wait_for_timeout(1200)
    ok(q.evaluate("localStorage.getItem('__calls')")=='1','1-kirish: bir marta so\'radi')
    q.reload(); q.wait_for_selector('.shell'); q.wait_for_timeout(1200)
    ok(q.evaluate("localStorage.getItem('__calls')")=='1','2-kirish: qayta so\'ramadi')
    print('FAIL:',fails,errs); b.close()
