// Sinov uchun soxta supabase (xotirada ishlaydi)
(function () {
  const store = { secrets: {}, accounts: JSON.parse(localStorage.getItem('__seed') || '[]'), user: localStorage.getItem('__user') ? { id: 'u1', email: 'a@b.uz' } : null, otp: '123456', pw: 'Old#Passw0rd1', n: 0, listeners: [] };
  window.__mock = store;
  const sess = () => (store.user ? { user: store.user, access_token: 't' } : null);
  const emit = (ev) => store.listeners.forEach((f) => f(ev, sess()));
  const ok = (data) => Promise.resolve({ data, error: null });
  const err = (message) => Promise.resolve({ data: null, error: { message } });
  function q(table) {
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
      if (op === 'update') { const r = store.accounts.find((x) => x.id === filt); Object.assign(r, patch); return single ? ok(r) : ok([r]); }
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
      signOut: () => { store.user = null; emit('SIGNED_OUT'); return ok(null); },
      signUp: () => err('Signups not allowed'),
      resend: () => ok({}),
      resetPasswordForEmail: (email) => { store.resetFor = email; return ok({}); },
      verifyOtp: ({ token }) => { if (token !== store.otp) return err('Token has expired or is invalid'); store.user = { id: 'u1', email: store.resetFor }; return ok({ session: sess() }); },
      updateUser: ({ password, data }) => { if (password) store.pw = password; if (data) store.user = { ...store.user, user_metadata: { ...(store.user.user_metadata || {}), ...data } }; return ok({ user: store.user }); },
      mfa: {
        getAuthenticatorAssuranceLevel: () => ok({ currentLevel: 'aal1', nextLevel: 'aal1' }),
        listFactors: () => ok({ totp: [], all: [] }),
        challenge: () => ok({ id: 'c' }), verify: () => ok({}), unenroll: () => ok({}),
        enroll: () => ok({ id: 'f', totp: { qr_code: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>', secret: 'ABCD' } }),
      },
    },
  }) };
})();
