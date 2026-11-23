// Sinov uchun soxta supabase (xotirada ishlaydi)
(function () {
  const store = { payments: [], secrets: {}, accounts: JSON.parse(localStorage.getItem('__seed') || '[]'), user: localStorage.getItem('__user') ? { id: 'u1', email: 'a@b.uz' } : null, otp: '123456', pw: 'Old#Passw0rd1', n: 0, listeners: [], factor: localStorage.getItem('__mfa') ? { id: 'f1', factor_type: 'totp', status: 'verified' } : null, aal: (localStorage.getItem('__user') && localStorage.getItem('__mfa')) ? 'aal2' : 'aal1', enforced: false, others: 0 };
  window.__mock = store;
  const sess = () => (store.user ? { user: store.user, access_token: 't' } : null);
  const emit = (ev) => store.listeners.forEach((f) => f(ev, sess()));
  const ok = (data) => Promise.resolve({ data, error: null });
  const err = (message) => Promise.resolve({ data: null, error: { message } });
  function q(table) {
    if (table === 'payments') {
      let op = 'sel', patch, f = null;
      const b = { select() { return b; }, order() { return b; }, single() { return b; }, eq(_, v) { f = v; return b; },
        insert(p) { op = 'ins'; patch = p; return b; }, delete() { op = 'del'; return b; },
        then(res, rej) {
          if (store.noPayments) return err("relation \"public.payments\" does not exist").then(res, rej);
          if (op === 'ins') { const r = { id: 'p' + ++store.n, user_id: 'u1', created_at: new Date().toISOString(), note: '', ...patch }; store.payments.push(r); return ok(r).then(res, rej); }
          if (op === 'del') { store.payments = store.payments.filter((x) => x.id !== f); return ok(null).then(res, rej); }
          return ok([...store.payments]).then(res, rej);
        } };
      return b;
    }
    if (table === 'devices') {
      store.devices = store.devices || [];
      let op = 'sel', patch, f = {}, one = false;
      const b = { select() { return b; }, order() { return b; }, eq(k, v) { f[k] = v; return b; }, maybeSingle() { one = true; return b; },
        upsert(p) { op = 'ups'; patch = p; return b; }, update(p) { op = 'upd'; patch = p; return b; }, delete() { op = 'del'; return b; },
        then(res, rej) {
          if (store.noDevices) return err('relation "public.devices" does not exist').then(res, rej);
          const m = (d) => Object.entries(f).every(([k, v]) => d[k] === v);
          if (op === 'ups') { let r = store.devices.find((d) => d.device_id === patch.device_id); if (r) Object.assign(r, patch); else { r = { id: 'dv' + ++store.n, first_seen: new Date().toISOString(), revoked: false, ...patch }; store.devices.push(r); } return ok(r).then(res, rej); }
          if (op === 'upd') { store.devices.filter(m).forEach((d) => Object.assign(d, patch)); return ok(null).then(res, rej); }
          if (op === 'del') { store.devices = store.devices.filter((d) => !m(d)); return ok(null).then(res, rej); }
          const rows = store.devices.filter(m); return ok(one ? rows[0] || null : rows).then(res, rej);
        } };
      return b;
    }
    if (table === 'push_subscriptions') { const b = { upsert() { return ok(null); }, delete() { return b; }, eq() { return b; }, then(res, rej) { return ok(null).then(res, rej); } }; return b; }
    if (table === 'account_secrets') {
      let f = null, op = 'sel', patch;
      const b = { select() { return b; }, eq(_, v) { f = v; return b; }, maybeSingle() { return ok(store.secrets[f] || null); },
        upsert(p) { store.secrets[p.account_id] = p; return ok(null); }, delete() { op = 'del'; return b; },
        then(res, rej) { if (op === 'del') delete store.secrets[f]; return ok(null).then(res, rej); } };
      return b;
    }
    let rows = store[table], op = 'select', patch, filt = null, single = false;
    const run = () => {
      if (op === 'select') return ok([...rows]);
      if (op === 'insert') { const r = { id: 'a' + ++store.n, created_at: new Date().toISOString(), status: 'active', images: [], ...patch }; store.accounts.unshift(r); return single ? ok(r) : ok([r]); }
      if (op === 'update') { if (store.noBuyer && 'buyer' in patch) return err("Could not find the 'buyer' column of 'accounts' in the schema cache"); const r = store.accounts.find((x) => x.id === filt); Object.assign(r, patch); return single ? ok(r) : ok([r]); }
      if (op === 'delete') { store.accounts = store.accounts.filter((x) => x.id !== filt); return ok(null); }
    };
    const b = {
      select() { return b; }, order() { return b; }, single() { single = true; return b; },
      insert(p) { op = 'insert'; patch = p; return b; }, update(p) { op = 'update'; patch = p; return b; },
      delete() { op = 'delete'; return b; }, eq(_, v) { filt = v; return b; },
      then(res, rej) { return run().then(res, rej); },
    };
    return b;
  }
  const files = {};
  window.supabase = { createClient: () => ({
    from: q,
    rpc: (name) => (name === 'mfa_enforced' ? ok(store.enforced) : err('no rpc')),
    storage: { from: () => ({
      upload: (p, f) => { files[p] = f; return ok({ path: p }); },
      remove: (ps) => { ps.forEach((p) => delete files[p]); return ok([]); },
      createSignedUrl: (p) => ok({ signedUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' }),
      createSignedUrls: (ps) => ok(ps.map((p) => ({ path: p, signedUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', error: null }))),
    }) },
    auth: {
      getSession: () => ok({ session: sess() }),
      onAuthStateChange: (f) => { store.listeners.push(f); return { data: { subscription: { unsubscribe() {} } } }; },
      signInWithPassword: ({ email, password }) => {
        if (password !== store.pw) return err('Invalid login credentials');
        store.user = { id: 'u1', email }; emit('SIGNED_IN'); return ok({ session: sess(), user: store.user });
      },
      signOut: (o) => { if (o && o.scope === 'others') { store.others++; return ok(null); } store.user = null; store.aal = 'aal1'; emit('SIGNED_OUT'); return ok(null); },
      signUp: () => err('Signups not allowed'),
      resend: () => ok({}),
      resetPasswordForEmail: (email) => { store.resetFor = email; return ok({}); },
      verifyOtp: ({ token }) => { if (token !== store.otp) return err('Token has expired or is invalid'); store.user = { id: 'u1', email: store.resetFor }; return ok({ session: sess() }); },
      updateUser: ({ password, data }) => { if (password) store.pw = password; if (data) store.user = { ...store.user, user_metadata: { ...(store.user.user_metadata || {}), ...data } }; return ok({ user: store.user }); },
      mfa: {
        getAuthenticatorAssuranceLevel: () => ok({ currentLevel: store.aal, nextLevel: store.factor ? 'aal2' : 'aal1' }),
        listFactors: () => ok({ totp: store.factor && store.factor.status === 'verified' ? [store.factor] : [], all: store.factor ? [store.factor] : [] }),
        challenge: () => ok({ id: 'c' }),
        verify: ({ code }) => { if (code !== '123456') return err('Invalid TOTP code entered'); if (store.factor) store.factor.status = 'verified'; store.aal = 'aal2'; localStorage.setItem('__mfa', '1'); return ok({}); },
        unenroll: () => { store.factor = null; localStorage.removeItem('__mfa'); return ok({}); },
        enroll: () => { store.factor = { id: 'f1', factor_type: 'totp', status: 'unverified' }; return ok({ id: 'f1', totp: { qr_code: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>', secret: 'ABCD' } }); },
      },
    },
  }) };
})();
