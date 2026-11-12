/* ============================================================
   e-Persatuan — Aplikasi utama
   ============================================================ */
(function () {
  'use strict';

  var esc = Util.esc;
  var SESSION_KEY = 'ep_session_v1';
  var SESSION_HOURS = 12;

  var S = {
    user: null,
    users: [],
    profiles: [],
    docs: [],
    finance: [],
    logs: [],
    checklist: [],
    settings: {},
    route: 'dashboard',
    param: '',
    authMode: 'login',
    uploadDraft: null,
    docFile: null,
    calOffset: 0,
    installPrompt: null,
    modalOnClose: null
  };

  var NAV = [
    { route: 'dashboard', label: 'Papan Pemuka', icon: 'bi-grid-1x2', perm: 'dashboard', group: 'ops' },
    { route: 'semak', label: 'Senarai Semak', icon: 'bi-check2-square', perm: 'checklist', group: 'ops' },
    { route: 'profil', label: 'Profil Saya', icon: 'bi-person-badge', perm: 'ownProfile', group: 'ops' },
    { route: 'ajk', label: 'Senarai AJK', icon: 'bi-people', perm: 'ajkList', group: 'ops' },
    { route: 'review', label: 'Semakan Profil', icon: 'bi-shield-check', perm: 'review', group: 'ops' },
    { route: 'dokumen', label: 'Dokumen', icon: 'bi-folder2-open', perm: 'documents', group: 'ops' },
    { route: 'kewangan', label: 'Kewangan', icon: 'bi-cash-coin', perm: 'finance', group: 'ops' },
    { route: 'lulus', label: 'Kelulusan Akhir', icon: 'bi-patch-check', perm: 'approve', group: 'ops' },
    { route: 'laporan', label: 'Laporan & Eksport', icon: 'bi-file-earmark-pdf', perm: 'reports', group: 'ops' },
    { route: 'log', label: 'Log Aktiviti', icon: 'bi-clock-history', perm: 'activityLog', group: 'ops' },
    { route: 'pengguna', label: 'Pengguna', icon: 'bi-person-gear', perm: 'users', group: 'admin' },
    { route: 'tetapan', label: 'Tetapan', icon: 'bi-gear', perm: 'settings', group: 'admin' }
  ];

  /* ============================================================
     Utiliti UI
     ============================================================ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function toast(msg, kind, icon) {
    kind = kind || 'info';
    var root = $('#toast-root');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast ' + kind;
    var ic = icon || (kind === 'ok' ? 'bi-check-circle'
      : kind === 'warn' ? 'bi-exclamation-triangle'
      : kind === 'err' ? 'bi-x-octagon' : 'bi-info-circle');
    el.innerHTML = '<i class="bi ' + ic + '" aria-hidden="true"></i><div>' + esc(msg) + '</div>';
    root.appendChild(el);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 220);
    }, 4200);
  }

  function openModal(opts) {
    var root = $('#modal-root');
    var size = opts.size ? ' modal-' + opts.size : '';
    root.innerHTML =
      '<div class="modal-backdrop" data-modal-backdrop>' +
        '<div class="modal' + size + '" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
          '<div class="modal-head">' +
            '<div><h3 id="modalTitle">' + opts.title + '</h3>' + (opts.sub ? '<p>' + opts.sub + '</p>' : '') + '</div>' +
            '<button class="modal-close" type="button" data-act="closeModal" aria-label="Tutup"><i class="bi bi-x-lg"></i></button>' +
          '</div>' +
          '<div class="modal-body">' + opts.body + '</div>' +
          (opts.foot ? '<div class="modal-foot">' + opts.foot + '</div>' : '') +
        '</div>' +
      '</div>';
    S.modalOnClose = opts.onClose || null;
    var backdrop = $('[data-modal-backdrop]', root);
    backdrop.addEventListener('mousedown', function (e) {
      if (e.target === backdrop) closeModal();
    });
    document.body.style.overflow = 'hidden';
    if (opts.onMount) opts.onMount($('.modal', root));
    var focusable = $('.modal-body input:not([type="hidden"]), .modal-body select, .modal-body textarea', $('.modal', root)) ||
      $('.modal-foot .btn', $('.modal', root));
    if (focusable) setTimeout(function () { try { focusable.focus(); } catch (e) {} }, 60);
  }

  function closeModal() {
    var root = $('#modal-root');
    if (!root || !root.innerHTML) return;
    root.innerHTML = '';
    document.body.style.overflow = '';
    var cb = S.modalOnClose;
    S.modalOnClose = null;
    if (cb) cb();
  }

  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      openModal({
        title: opts.title || 'Pengesahan',
        sub: opts.sub || '',
        size: 'sm',
        body: '<p style="margin:0;font-size:.9rem;line-height:1.6">' + (opts.message || '') + '</p>',
        foot: '<button class="btn btn-ghost" type="button" data-act="closeModal">Batal</button>' +
              '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" type="button" id="cfmOk">' + (opts.ok || 'Teruskan') + '</button>',
        onMount: function (root) {
          $('#cfmOk', root).addEventListener('click', function () {
            resolve(true);
            closeModal();
          });
        },
        onClose: function () { resolve(false); }
      });
    });
  }

  function statusChip(st) {
    var s = EP.STATUS[st] || { label: st, chip: 'chip-grey', icon: 'bi-circle' };
    return '<span class="chip ' + s.chip + '"><i class="bi ' + s.icon + '"></i>' + s.label + '</span>';
  }

  function roleChip(role) {
    var r = EP.ROLES[role];
    if (!r) return '';
    return '<span class="chip chip-blue"><i class="bi ' + r.icon + '"></i>' + r.label + '</span>';
  }

  function avatar(name, cls) {
    return '<span class="avatar ' + (cls || '') + '">' + esc(Util.initials(name)) + '</span>';
  }

  function pageHead(title, sub, actions) {
    return '<div class="page-head"><div><h2>' + title + '</h2><p>' + (sub || '') + '</p></div>' +
      (actions ? '<div class="actions">' + actions + '</div>' : '') + '</div>';
  }

  function can(perm) {
    return !!(S.user && EP.PERMS[perm] && EP.PERMS[perm].indexOf(S.user.peranan) >= 0);
  }

  function roleLabel(role) { return (EP.ROLES[role] || {}).label || role; }
  function userById(id) { return S.users.filter(function (u) { return u.id === id; })[0] || null; }
  function profileOf(id) { return S.profiles.filter(function (p) { return p.userId === id; })[0] || null; }
  function activeUsers() { return S.users.filter(function (u) { return u.status === 'aktif'; }); }

  function ensureProfileObject(user) {
    return {
      userId: user.id,
      namaPenuh: user.nama || '',
      ic: '', jawatan: user.jawatan || roleLabel(user.peranan),
      alamat: '', telefon: user.telefon || '', email: user.email || '',
      pekerjaan: '', majikan: '', icDepan: '', icBelakang: '', pasport: '',
      status: 'draf', catatan: '', tarikhHantar: '', tarikhSahkan: '',
      disahkanOleh: '', updatedAt: ''
    };
  }

  /* ============================================================
     Sesi
     ============================================================ */
  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.userId || !s.exp || s.exp < Date.now()) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return s;
    } catch (e) { return null; }
  }

  function saveSession(user) {
    var s = { userId: user.id, exp: Date.now() + SESSION_HOURS * 3600 * 1000 };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  /* ============================================================
     Muat data
     ============================================================ */
  async function reloadData() {
    var res = await Promise.all([
      Idb.all('users'), Idb.all('profiles'), Idb.all('docs'),
      Idb.all('finance'), Idb.all('logs'), Idb.all('checklist'), Idb.get('settings', 'app')
    ]);
    S.users = res[0];
    S.profiles = res[1];
    S.docs = res[2];
    S.finance = res[3];
    S.logs = res[4];
    S.checklist = res[5];
    S.settings = res[6] || Object.assign({}, EP.DEFAULT_SETTINGS);
  }

  async function addLog(tindakan, objek, butiran) {
    if (!S.user) return;
    await Idb.put('logs', {
      ts: Util.nowISO(), userId: S.user.id, nama: S.user.nama,
      tindakan: tindakan, objek: objek, butiran: butiran
    });
    S.logs = await Idb.all('logs');
  }

  async function refresh() {
    await reloadData();
    renderShell();
    renderRoute();
  }

  /* ============================================================
     PENGIRAAN & STATUS
     ============================================================ */
  function deriveChecklist() {
    var out = {};
    var minit = S.docs.filter(function (d) { return d.aktif && d.kategori === 'Minit Mesyuarat'; })[0];
    out.minit = minit
      ? (minit.format === 'PDF'
          ? { status: 'lengkap', note: 'PDF dimuat naik ' + Util.fmtDate(minit.tarikh) }
          : { status: 'semakan', note: 'Dokumen bukan PDF — perlu versi PDF' })
      : { status: 'belum', note: 'Belum ada dokumen dimuat naik' };

    var pl = S.docs.filter(function (d) { return d.aktif && d.kategori === 'Perlembagaan'; })[0];
    out.perlembagaan = pl
      ? (pl.format === 'PDF'
          ? { status: 'lengkap', note: 'Versi ' + pl.versi + ' dimuat naik ' + Util.fmtDate(pl.tarikh) }
          : { status: 'semakan', note: 'Draf ' + pl.format + ' — PDF diperlukan untuk penyerahan' })
      : { status: 'belum', note: 'Belum ada perlembagaan dimuat naik' };

    var kewDoc = S.docs.filter(function (d) { return d.aktif && d.kategori === 'Kewangan'; })[0];
    if (!S.finance.length) {
      out.kewangan = { status: 'belum', note: 'Belum ada rekod kewangan' };
    } else if (!kewDoc) {
      out.kewangan = { status: 'semakan', note: 'Rekod ada — muat naik penyata bank' };
    } else {
      out.kewangan = { status: 'lengkap', note: 'Rekod dan penyata dimuat naik' };
    }

    var users = activeUsers();
    var total = users.length;
    var lengkap = 0, pembetulan = 0, menunggu = 0, belum = 0;
    users.forEach(function (u) {
      var p = profileOf(u.id);
      if (!p || p.status === 'draf') { belum++; return; }
      if (p.status === 'lengkap') lengkap++;
      else if (p.status === 'pembetulan') pembetulan++;
      else menunggu++;
    });
    var st = 'lengkap';
    if (pembetulan > 0) st = 'pembetulan';
    else if (belum > 0 || menunggu > 0) st = 'menunggu';
    else if (!total) st = 'belum';
    out.ajk = {
      status: st,
      note: lengkap + ' / ' + total + ' profil lengkap' +
        (pembetulan ? ' • ' + pembetulan + ' perlu pembetulan' : '') +
        (menunggu ? ' • ' + menunggu + ' menunggu' : '')
    };
    return out;
  }

  function checklistState() {
    var derived = deriveChecklist();
    return EP.CHECK_ITEMS.map(function (it) {
      var rec = S.checklist.filter(function (c) { return c.key === it.key; })[0] || null;
      var manual = !!(rec && rec.manual);
      var st = manual ? rec.status : derived[it.key].status;
      return {
        key: it.key, nama: it.nama, desc: it.desc, icon: it.icon,
        kategori: it.kategori, role: it.role,
        status: st,
        note: manual ? (rec.catatan || 'Ditetapkan secara manual') : derived[it.key].note,
        manual: manual,
        oleh: manual ? rec.oleh : 'Automatik',
        tarikh: manual ? rec.tarikh : ''
      };
    });
  }

  function completion() {
    var items = checklistState();
    var done = items.filter(function (i) { return i.status === 'lengkap'; }).length;
    return { items: items, done: done, total: items.length, pct: Math.round(done / items.length * 100) };
  }

  function financeTotals() {
    var masuk = 0, keluar = 0;
    S.finance.forEach(function (f) {
      var n = Number(f.jumlah) || 0;
      if (f.arah === 'keluar') keluar += n; else masuk += n;
    });
    return { masuk: masuk, keluar: keluar, baki: masuk - keluar };
  }

  function pendingProfiles() {
    return activeUsers().map(function (u) {
      return { user: u, profile: profileOf(u.id) };
    }).filter(function (x) { return x.profile && x.profile.status === 'menunggu'; });
  }

  function profileCounts() {
    var c = { lengkap: 0, menunggu: 0, pembetulan: 0, draf: 0, total: 0 };
    activeUsers().forEach(function (u) {
      c.total++;
      var p = profileOf(u.id);
      if (!p) c.draf++;
      else c[p.status] = (c[p.status] || 0) + 1;
    });
    return c;
  }

  function docCount(kategori) {
    return S.docs.filter(function (d) { return d.aktif && d.kategori === kategori; }).length;
  }

  /* ============================================================
     LOG MASUK / DAFTAR
     ============================================================ */
  function showAuth(mode) {
    S.user = null;
    S.authMode = mode || S.authMode || 'login';
    $('#app').hidden = true;
    $('#bottomnav').hidden = true;
    var auth = $('#auth');
    auth.hidden = false;

    var isLogin = S.authMode === 'login';
    var demo = [
      { role: 'Setiausaha', email: 'setiausaha@wadah.my', nama: 'Ahmad Razif' },
      { role: 'Bendahari', email: 'bendahari@wadah.my', nama: 'Siti Aminah' },
      { role: 'Pengerusi', email: 'pengerusi@wadah.my', nama: 'Kamal Ariffin' },
      { role: 'AJK Penaja', email: 'razali@wadah.my', nama: 'Razali Hassan' }
    ];

    auth.innerHTML =
      '<div class="auth-screen">' +
        '<div class="auth-brand">' +
          '<a class="brand" href="index.html">' +
            '<span class="brand-mark" aria-hidden="true">' +
              '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2.6 4.7 5.5v5.9c0 4.4 3.1 8.1 7.3 9.4 4.2-1.3 7.3-5 7.3-9.4V5.5L12 2.6Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="m8.4 11.9 2.5 2.5 4.8-4.9" stroke="#E9B44C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</span>' +
            '<span class="brand-name"><b>e-Persatuan</b><span>Sistem Pendaftaran</span></span>' +
          '</a>' +
          '<div class="auth-pitch">' +
            '<h2>Urus pendaftaran persatuan <em>dengan tenang</em>.</h2>' +
            '<p>Satu ruang kerja untuk dokumen, profil AJK, kewangan dan kelulusan — boleh diakses dari telefon.</p>' +
            '<ul class="auth-points">' +
              '<li><i class="bi bi-check2" aria-hidden="true"></i> Papan pemuka kelengkapan automatik</li>' +
              '<li><i class="bi bi-check2" aria-hidden="true"></i> Profil AJK &amp; muat naik IC dari kamera</li>' +
              '<li><i class="bi bi-check2" aria-hidden="true"></i> Laporan berkop rasmi sedia cetak</li>' +
              '<li><i class="bi bi-check2" aria-hidden="true"></i> Log aktiviti dan kawalan peranan</li>' +
            '</ul>' +
          '</div>' +
          '<div class="auth-foot">© ' + new Date().getFullYear() + ' e-Persatuan. Data peribadi dilindungi mengikut PDPA 2010.</div>' +
        '</div>' +

        '<div class="auth-panel">' +
          '<div class="auth-box">' +
            '<a class="brand auth-logo" href="index.html">' +
              '<span class="brand-mark" aria-hidden="true">' +
                '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2.6 4.7 5.5v5.9c0 4.4 3.1 8.1 7.3 9.4 4.2-1.3 7.3-5 7.3-9.4V5.5L12 2.6Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="m8.4 11.9 2.5 2.5 4.8-4.9" stroke="#E9B44C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              '</span>' +
              '<span class="brand-name"><b>e-Persatuan</b><span>Sistem Pendaftaran</span></span>' +
            '</a>' +
            (isLogin ? loginHtml(demo) : registerHtml()) +
            '<div class="auth-foot-link">' +
              (isLogin
                ? 'Belum ada akaun? <button class="link-btn" data-act="authMode" data-mode="register">Daftar sebagai AJK</button>'
                : 'Sudah ada akaun? <button class="link-btn" data-act="authMode" data-mode="login">Log masuk</button>') +
              ' · <a href="index.html">Laman utama</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    window.scrollTo(0, 0);
  }

  function loginHtml(demo) {
    return '' +
      '<h1>Selamat kembali</h1>' +
      '<p class="auth-sub">Log masuk untuk meneruskan pengurusan pendaftaran persatuan.</p>' +
      '<div class="auth-error" id="authErr" role="alert"></div>' +
      '<form data-form="login" novalidate>' +
        '<div class="field">' +
          '<label for="loginId">E-mel atau No. Matrik</label>' +
          '<input class="input" id="loginId" name="id" autocomplete="username" placeholder="cth. setiausaha@wadah.my" required>' +
        '</div>' +
        '<div class="field">' +
          '<label for="loginPass">Kata laluan</label>' +
          '<div class="pw-wrap">' +
            '<input class="input" id="loginPass" name="pass" type="password" autocomplete="current-password" placeholder="Kata laluan anda" required>' +
            '<button class="pw-toggle" type="button" data-act="togglePw" data-target="loginPass" aria-label="Tunjuk kata laluan"><i class="bi bi-eye"></i></button>' +
          '</div>' +
        '</div>' +
        '<div class="auth-row">' +
          '<label class="check"><input type="checkbox" name="remember" checked> Ingat saya</label>' +
          '<button class="link-btn" type="button" data-act="forgot">Lupa kata laluan?</button>' +
        '</div>' +
        '<button class="btn btn-primary btn-block btn-lg" type="submit"><i class="bi bi-box-arrow-in-right"></i> Log Masuk</button>' +
      '</form>' +
      '<div class="demo-box">' +
        '<b><i class="bi bi-stars"></i> Akaun demo — kata laluan <code>' + EP.DEMO_PASSWORD + '</code></b>' +
        '<div class="demo-list">' +
          demo.map(function (d) {
            return '<div>' + d.role + ': <code>' + d.email + '</code></div>';
          }).join('') +
        '</div>' +
        '<button type="button" data-act="demoLogin" data-email="setiausaha@wadah.my">Isi akaun Setiausaha</button>' +
      '</div>';
  }

  function registerHtml() {
    return '' +
      '<h1>Daftar sebagai AJK</h1>' +
      '<p class="auth-sub">Pendaftaran perlu diluluskan oleh Setiausaha sebelum anda boleh log masuk.</p>' +
      '<div class="auth-error" id="authErr" role="alert"></div>' +
      '<form data-form="register" novalidate>' +
        '<div class="field"><label for="regNama">Nama penuh</label><input class="input" id="regNama" name="nama" autocomplete="name" placeholder="Seperti dalam MyKad" required></div>' +
        '<div class="field"><label for="regEmail">E-mel</label><input class="input" id="regEmail" name="email" type="email" autocomplete="email" placeholder="nama@contoh.com" required></div>' +
        '<div class="field-row">' +
          '<div class="field"><label for="regMatrik">No. Matrik / Ahli</label><input class="input" id="regMatrik" name="matrik" placeholder="cth. WADAH009"></div>' +
          '<div class="field"><label for="regTel">No. Telefon</label><input class="input" id="regTel" name="telefon" inputmode="tel" placeholder="012-345 6789"></div>' +
        '</div>' +
        '<div class="field-row">' +
          '<div class="field"><label for="regPass">Kata laluan</label><input class="input" id="regPass" name="pass" type="password" autocomplete="new-password" placeholder="Sekurang-kurangnya 8 aksara" required></div>' +
          '<div class="field"><label for="regPass2">Sahkan kata laluan</label><input class="input" id="regPass2" name="pass2" type="password" autocomplete="new-password" required></div>' +
        '</div>' +
        '<label class="check" style="margin-bottom:1rem;align-items:flex-start">' +
          '<input type="checkbox" name="pdpa" style="margin-top:3px">' +
          '<span style="font-size:.74rem;line-height:1.5">Saya bersetuju data peribadi saya diproses untuk tujuan pendaftaran persatuan selaras dengan PDPA 2010.</span>' +
        '</label>' +
        '<button class="btn btn-primary btn-block btn-lg" type="submit"><i class="bi bi-person-plus"></i> Hantar Pendaftaran</button>' +
      '</form>';
  }

  async function doLogin(form) {
    var idIn = String(form.id.value || '').trim().toLowerCase();
    var pass = String(form.pass.value || '');
    var err = $('#authErr');
    function fail(msg) {
      if (err) { err.className = 'auth-error show'; err.innerHTML = '<i class="bi bi-exclamation-circle"></i><span>' + esc(msg) + '</span>'; }
    }
    if (!idIn || !pass) return fail('Sila masukkan e-mel/No. Matrik dan kata laluan.');

    var user = S.users.filter(function (u) {
      return String(u.email || '').toLowerCase() === idIn || String(u.matrik || '').toLowerCase() === idIn;
    })[0];

    if (!user) return fail('Akaun tidak dijumpai. Sila daftar atau hubungi Setiausaha.');
    if (user.status === 'menunggu') return fail('Akaun anda masih menunggu kelulusan Setiausaha.');
    if (user.status === 'nyahaktif') return fail('Akaun ini telah dinyahaktifkan. Hubungi Setiausaha.');

    var hash = await Util.hashPassword(pass, user.salt);
    if (hash !== user.hash) return fail('Kata laluan tidak betul. Sila cuba lagi.');

    user.lastLogin = Util.nowISO();
    await Idb.put('users', user);
    saveSession(user);
    S.user = user;
    S.uploadDraft = null;
    S.calOffset = 0;
    await reloadData();
    S.user = userById(user.id) || user;
    await addLog('logmasuk', 'Sesi', 'Log masuk ke sistem');
    await reloadData();
    enterApp();
    toast('Selamat kembali, ' + user.nama.split(' ')[0] + '.', 'ok');
  }

  async function doRegister(form) {
    var nama = String(form.nama.value || '').trim();
    var email = String(form.email.value || '').trim().toLowerCase();
    var matrik = String(form.matrik.value || '').trim().toUpperCase();
    var telefon = String(form.telefon.value || '').trim();
    var pass = String(form.pass.value || '');
    var pass2 = String(form.pass2.value || '');
    var pdpa = form.pdpa.checked;
    var err = $('#authErr');
    function fail(msg) {
      if (err) { err.className = 'auth-error show'; err.innerHTML = '<i class="bi bi-exclamation-circle"></i><span>' + esc(msg) + '</span>'; }
    }
    if (nama.length < 3) return fail('Sila masukkan nama penuh.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail('Format e-mel tidak sah.');
    if (pass.length < 8) return fail('Kata laluan mesti sekurang-kurangnya 8 aksara.');
    if (pass !== pass2) return fail('Kata laluan tidak sepadan.');
    if (!pdpa) return fail('Sila bersetuju dengan notis PDPA untuk meneruskan.');

    var dupe = S.users.filter(function (u) {
      return String(u.email || '').toLowerCase() === email || (matrik && String(u.matrik || '').toUpperCase() === matrik);
    })[0];
    if (dupe) return fail('E-mel atau No. Matrik ini sudah didaftarkan.');

    var salt = Util.uid('s');
    var hash = await Util.hashPassword(pass, salt);
    var user = {
      id: Util.uid('u'), nama: nama, email: email, matrik: matrik || '',
      peranan: 'ajk', jawatan: 'AJK Penaja', telefon: telefon,
      status: 'menunggu', salt: salt, hash: hash,
      createdAt: Util.nowISO(), lastLogin: '', perluTukar: false
    };
    await Idb.put('users', user);
    await Idb.put('profiles', ensureProfileObject(user));
    await Idb.put('logs', {
      ts: Util.nowISO(), userId: user.id, nama: nama,
      tindakan: 'daftar', objek: 'Akaun', butiran: 'Pendaftaran ahli baharu menunggu kelulusan'
    });
    await reloadData();
    showAuth('login');
    toast('Pendaftaran dihantar. Tunggu kelulusan Setiausaha.', 'ok');
  }

  function enterApp() {
    $('#auth').hidden = true;
    $('#app').hidden = false;
    $('#bottomnav').hidden = false;
    renderShell();
    var r = hashRoute();
    S.route = r.route;
    S.param = r.param;
    renderRoute();
    window.scrollTo(0, 0);
  }

  function logout() {
    clearSession();
    S.user = null;
    S.uploadDraft = null;
    $('#auth').hidden = false;
    showAuth('login');
    if (location.hash) location.hash = '';
    toast('Anda telah log keluar.', 'info');
  }

  /* ============================================================
     SHELL
     ============================================================ */
  function renderShell() {
    if (!S.user) return;
    var role = EP.ROLES[S.user.peranan] || { label: S.user.peranan, icon: 'bi-person' };
    var pending = pendingProfiles().length;
    var notices = buildNotices();
    var c = completion();

    var ops = NAV.filter(function (n) { return n.group === 'ops' && can(n.perm); });
    var admin = NAV.filter(function (n) { return n.group === 'admin' && can(n.perm); });

    function navLink(n) {
      var badge = '';
      if (n.route === 'review' && pending) badge = '<span class="badge">' + pending + '</span>';
      return '<a class="nav-item' + (S.route === n.route || (n.route === 'ajk' && S.route === 'review') ? ' active' : '') + '" href="#/' + n.route + '">' +
        '<i class="bi ' + n.icon + '"></i><span>' + n.label + '</span>' + badge + '</a>';
    }

    $('#sidebar').innerHTML =
      '<a class="side-brand" href="#/dashboard">' +
        '<span class="logo">' +
          (S.settings.logo
            ? '<img src="' + S.settings.logo + '" alt="Logo persatuan">'
            : '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2.6 4.7 5.5v5.9c0 4.4 3.1 8.1 7.3 9.4 4.2-1.3 7.3-5 7.3-9.4V5.5L12 2.6Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="m8.4 11.9 2.5 2.5 4.8-4.9" stroke="#E9B44C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>') +
        '</span>' +
        '<span><b>e-Persatuan</b><span>v3.0 · ' + esc(S.settings.namaPendek || 'WADAH') + '</span></span>' +
      '</a>' +
      '<div class="side-scroll">' +
        '<div class="nav-label">Modul Operasi</div>' + ops.map(navLink).join('') +
        (admin.length ? '<div class="nav-label">Pentadbiran</div>' + admin.map(navLink).join('') : '') +
        '<div class="side-mini">' +
          '<div class="sm-top"><span>Kelengkapan</span><b>' + c.pct + '%</b></div>' +
          '<div class="sm-bar"><i style="width:' + c.pct + '%"></i></div>' +
          '<p>' + c.done + ' / ' + c.total + ' item lengkap</p>' +
        '</div>' +
      '</div>' +
      '<div class="side-foot">' +
        '<div class="side-user">' +
          avatar(S.user.nama, '') +
          '<div class="who"><b>' + esc(S.user.nama) + '</b><span>' + role.label + '</span></div>' +
        '</div>' +
        '<button class="side-logout" type="button" data-act="logout"><i class="bi bi-box-arrow-right"></i> Log Keluar</button>' +
      '</div>';

    var current = NAV.filter(function (n) { return n.route === S.route; })[0] || { label: 'Papan Pemuka' };
    var title = S.route === 'review' ? 'Semakan Profil' : current.label;

    $('#topbar').innerHTML =
      '<div class="top-title">' +
        '<div class="crumb">' + role.label + '</div>' +
        '<h1>' + title + '</h1>' +
      '</div>' +
      '<div class="top-actions">' +
        '<button class="search-trigger" type="button" data-act="openSearch" aria-label="Cari halaman">' +
          '<i class="bi bi-search"></i><span>Cari halaman…</span><kbd>Ctrl K</kbd>' +
        '</button>' +
        '<span class="top-role"><i class="bi ' + role.icon + '"></i>' + role.label + '</span>' +
        '<button class="icon-btn" type="button" data-act="installApp" title="Pasang aplikasi" aria-label="Pasang aplikasi"><i class="bi bi-download"></i></button>' +
        '<button class="icon-btn" type="button" data-act="showNotices" title="Pemberitahuan" aria-label="Pemberitahuan">' +
          '<i class="bi bi-bell"></i>' + (notices.some(function (n) { return n.urgent; }) ? '<span class="dot"></span>' : '') +
        '</button>' +
        '<div class="top-user">' +
          avatar(S.user.nama, '') +
          '<div class="who"><b>' + esc(S.user.nama.split(' ')[0]) + '</b><span>' + role.label + '</span></div>' +
        '</div>' +
        '<button class="icon-btn" type="button" data-act="logout" title="Log keluar" aria-label="Log keluar"><i class="bi bi-box-arrow-right"></i></button>' +
      '</div>';

    var preferByRole = {
      setiausaha: ['dashboard', 'semak', 'ajk', 'dokumen'],
      bendahari: ['dashboard', 'semak', 'kewangan', 'dokumen'],
      pengerusi: ['dashboard', 'semak', 'lulus', 'dokumen'],
      ajk: ['dashboard', 'semak', 'profil']
    };
    var preferred = (preferByRole[S.user.peranan] || []).concat(
      ['dashboard', 'semak', 'profil', 'dokumen', 'kewangan', 'laporan', 'pengguna', 'tetapan']
    );
    var bn = [];
    var seen = {};
    preferred.forEach(function (r) {
      if (bn.length >= 4 || seen[r]) return;
      seen[r] = true;
      var n = NAV.filter(function (x) { return x.route === r && can(x.perm); })[0];
      if (n) bn.push(n);
    });

    var shortLabels = {
      dashboard: 'Papan', semak: 'Semak', profil: 'Profil', ajk: 'AJK', review: 'Semakan',
      dokumen: 'Dokumen', kewangan: 'Kewangan', lulus: 'Kelulusan', laporan: 'Laporan',
      log: 'Log', pengguna: 'Pengguna', tetapan: 'Tetapan'
    };
    $('#bottomnav').innerHTML = '<div class="bottomnav-inner">' +
      bn.map(function (n) {
        return '<a class="bn-item' + (S.route === n.route ? ' active' : '') + '" href="#/' + n.route + '">' +
          '<i class="bi ' + n.icon + '"></i><span>' + (shortLabels[n.route] || n.label) + '</span></a>';
      }).join('') +
      '<button class="bn-item" type="button" data-act="moreNav"><i class="bi bi-grid-3x3-gap"></i><span>Lagi</span></button>' +
      '</div>';
  }

  function buildNotices() {
    var list = [];
    var c = completion();
    var dAkhir = Util.daysUntil(S.settings.tarikhAkhir);
    var pending = pendingProfiles().length;
    var pct = profileCounts();

    if (c.pct === 100 && S.settings.statusKelulusan !== 'lulus') {
      list.push({
        kind: 'ok', icon: 'bi-patch-check', title: 'Semua item lengkap',
        text: 'Semua dokumen telah lengkap. Menunggu Kelulusan Akhir Pengerusi.',
        urgent: true
      });
    }
    if (S.settings.statusKelulusan === 'lulus') {
      list.push({
        kind: 'ok', icon: 'bi-check-circle', title: 'Kelulusan Akhir diberikan',
        text: 'Laporan rasmi kini boleh dijana dan dicetak oleh Setiausaha.',
        urgent: false
      });
    }
    if (dAkhir !== null && dAkhir <= 14 && dAkhir >= 0) {
      list.push({
        kind: dAkhir <= 7 ? 'danger' : 'warn', icon: 'bi-calendar-event',
        title: 'Tarikh akhir ' + (dAkhir === 0 ? 'hari ini' : dAkhir + ' hari lagi'),
        text: 'Serahan maklumat penaja pada ' + Util.fmtDate(S.settings.tarikhAkhir) + '. Pastikan semua item lengkap.',
        urgent: dAkhir <= 7
      });
    }
    if (pending > 0) {
      list.push({
        kind: 'warn', icon: 'bi-person-exclamation', title: pending + ' profil menunggu semakan',
        text: 'Semak dan sahkan profil AJK sebelum tarikh akhir.',
        urgent: true, route: 'review'
      });
    }
    if (pct.pembetulan > 0) {
      list.push({
        kind: 'danger', icon: 'bi-exclamation-octagon', title: pct.pembetulan + ' profil perlu pembetulan',
        text: 'AJK berkenaan perlu memuat naik semula dokumen yang tidak jelas.',
        urgent: true
      });
    }
    if (!list.length) {
      list.push({
        kind: 'info', icon: 'bi-info-circle', title: 'Tiada tindakan mendesak',
        text: 'Semua rekod dalam keadaan baik. Teruskan memantau kemajuan.',
        urgent: false
      });
    }
    return list;
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  function hashRoute() {
    var h = String(location.hash || '').replace(/^#\/?/, '');
    if (!h) return { route: 'dashboard', param: '' };
    var parts = h.split('/');
    return { route: parts[0] || 'dashboard', param: parts.slice(1).join('/') };
  }

  function navigate(route, param) {
    var h = '#/' + route + (param ? '/' + param : '');
    if (location.hash === h) { renderRoute(); return; }
    location.hash = h;
  }

  function renderRoute() {
    if (!S.user) return;
    var r = hashRoute();
    var known = NAV.filter(function (n) { return n.route === r.route; })[0];
    if (r.route === 'review' && !can('review') && !can('ajkList')) { navigate('dashboard'); return; }
    if (known && !can(known.perm)) { navigate('dashboard'); return; }
    S.route = r.route;
    S.param = r.param;

    var pages = {
      dashboard: pageDashboard,
      semak: pageSemak,
      profil: pageProfil,
      ajk: pageAjk,
      review: pageReview,
      dokumen: pageDokumen,
      kewangan: pageKewangan,
      lulus: pageLulus,
      laporan: pageLaporan,
      log: pageLog,
      pengguna: pagePengguna,
      tetapan: pageTetapan
    };
    var fn = pages[S.route] || pageDashboard;
    var content = $('#content');
    content.innerHTML = fn();
    renderShell();
    var mount = MOUNTS[S.route];
    if (mount) mount(content);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  var MOUNTS = {};

  /* ============================================================
     PAPAN PEMUKA
     ============================================================ */
  function statCard(label, value, foot, icon, color) {
    return '<div class="stat">' +
      '<div class="s-top"><span class="s-label">' + label + '</span><span class="s-icon ' + (color || '') + '"><i class="bi ' + icon + '"></i></span></div>' +
      '<b class="s-value">' + value + '</b>' +
      '<div class="s-foot">' + (foot || '') + '</div>' +
    '</div>';
  }

  function qaItem(icon, label, sub, act, attrs, cls, count) {
    return '<button class="qa" type="button" data-act="' + act + '" ' + (attrs || '') + '>' +
      '<span class="qa-ic ' + (cls || '') + '"><i class="bi ' + icon + '"></i></span>' +
      '<span class="qa-copy"><b>' + label + '</b><span>' + sub + '</span></span>' +
      (count ? '<span class="count">' + count + '</span>' : '') +
    '</button>';
  }

  function quickTiles() {
    var role = S.user.peranan;
    var pc = profileCounts();
    if (role === 'setiausaha') {
      return [
        qaItem('bi-journal-arrow-up', 'Muat Naik Minit', 'Dokumen rasmi PDF', 'uploadDoc', 'data-kat="Minit Mesyuarat"', 'q1'),
        qaItem('bi-shield-check', 'Sahkan Profil', 'Semak permohonan AJK', 'go', 'data-route="review"', 'q5', pc.menunggu || ''),
        qaItem('bi-file-earmark-pdf', 'Jana Laporan', 'Selepas kelulusan', 'go', 'data-route="laporan"', 'q4'),
        qaItem('bi-person-plus', 'Tambah Pengguna', 'Urus akses sistem', 'go', 'data-route="pengguna"', 'q3'),
        qaItem('bi-check2-square', 'Senarai Semak', '4 item statutori', 'go', 'data-route="semak"', 'q2'),
        qaItem('bi-download', 'Eksport Data', 'CSV &amp; sandaran', 'go', 'data-route="laporan"', 'q6')
      ].join('');
    }
    if (role === 'bendahari') {
      return [
        qaItem('bi-plus-circle', 'Rekod Kutipan', 'Yuran &amp; sumbangan', 'addFinance', 'data-arah="masuk"', 'q5'),
        qaItem('bi-dash-circle', 'Rekod Perbelanjaan', 'Perbelanjaan awal', 'addFinance', 'data-arah="keluar"', 'q6'),
        qaItem('bi-cash-stack', 'Buku Tunai', 'Semak baki semasa', 'go', 'data-route="kewangan"', 'q1'),
        qaItem('bi-file-earmark-arrow-up', 'Muat Naik Penyata', 'Dokumen kewangan', 'uploadDoc', 'data-kat="Kewangan"', 'q3'),
        qaItem('bi-download', 'Eksport Kewangan', 'Fail CSV', 'exportFinance', '', 'q4')
      ].join('');
    }
    if (role === 'pengerusi') {
      return [
        qaItem('bi-check2-square', 'Senarai Semak', 'Pantau kemajuan', 'go', 'data-route="semak"', 'q1'),
        qaItem('bi-people', 'Senarai AJK', 'Profil penaja', 'go', 'data-route="ajk"', 'q5'),
        qaItem('bi-folder2-open', 'Dokumen', 'Lihat fail utama', 'go', 'data-route="dokumen"', 'q2'),
        qaItem('bi-patch-check', 'Kelulusan Akhir', 'Keputusan penyerahan', 'go', 'data-route="lulus"', 'q4')
      ].join('');
    }
    return [
      qaItem('bi-person-badge', 'Profil Saya', 'Kemas kini maklumat', 'go', 'data-route="profil"', 'q1'),
      qaItem('bi-camera', 'Ambil Gambar IC', 'Kamera telefon', 'go', 'data-route="profil"', 'q3'),
      qaItem('bi-image', 'Muat Naik Pasport', 'Latar belakang putih', 'go', 'data-route="profil"', 'q2'),
      qaItem('bi-check2-square', 'Status Semakan', 'Lihat senarai semak', 'go', 'data-route="semak"', 'q5')
    ].join('');
  }

  function donutSvg(pct) {
    var r = 54;
    var circ = 2 * Math.PI * r;
    var off = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
    return '<svg viewBox="0 0 140 140" role="img" aria-label="' + pct + ' peratus lengkap">' +
      '<defs><linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#7C93FF"/><stop offset=".55" stop-color="#22D3EE"/><stop offset="1" stop-color="#F5C451"/>' +
      '</linearGradient></defs>' +
      '<circle class="d-bg" cx="70" cy="70" r="' + r + '"/>' +
      '<circle class="d-fg" cx="70" cy="70" r="' + r + '" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
    '</svg>';
  }

  function timeAgo(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    var diff = Date.now() - d.getTime();
    if (diff < 60000) return 'baru sahaja';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min lalu';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' jam lalu';
    if (diff < 604800000) return Math.floor(diff / 86400000) + ' hari lalu';
    return Util.fmtDate(iso);
  }

  function pageDashboard() {
    var me = S.user;
    var role = me.peranan;
    var c = completion();
    var f = financeTotals();
    var pc = profileCounts();
    var dAkhir = Util.daysUntil(S.settings.tarikhAkhir);
    var dSasaran = Util.daysUntil(S.settings.tarikhSasaran);
    var myProfile = profileOf(me.id);
    var myStatus = myProfile ? myProfile.status : 'draf';
    var phase = S.settings.statusKelulusan === 'lulus' ? 'Lulus' : c.pct === 100 ? 'Sedia untuk kelulusan' : 'Fasa semakan';
    var today = new Date().toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    var firstName = String(me.nama || '').split(' ')[0];

    var stats = '';
    if (role === 'setiausaha' || role === 'pengerusi') {
      stats = [
        statCard('Peratusan Kelengkapan', c.pct + '%', '<span class="' + (c.pct >= 75 ? 'up' : '') + '">' + c.done + ' / ' + c.total + ' item lengkap</span>', 'bi-pie-chart', ''),
        statCard('Jumlah AJK', String(pc.total), '<span>' + pc.lengkap + ' profil lengkap</span>', 'bi-people', 'green'),
        statCard('AJK Belum Lengkap', String(pc.total - pc.lengkap), '<span class="' + (pc.total - pc.lengkap ? 'down' : '') + '">' + (pc.pembetulan + pc.draf) + ' perlu tindakan</span>', 'bi-person-exclamation', 'gold'),
        statCard('Menunggu Pengesahan', String(pc.menunggu), '<span>' + (pc.menunggu ? 'Sedia untuk semakan' : 'Tiada menunggu') + '</span>', 'bi-hourglass-split', 'gold')
      ].join('');
    } else if (role === 'bendahari') {
      stats = [
        statCard('Jumlah Kutipan', Util.fmtRM(f.masuk), '<span>Termasuk yuran &amp; sumbangan</span>', 'bi-arrow-down-circle', 'green'),
        statCard('Jumlah Perbelanjaan', Util.fmtRM(f.keluar), '<span>' + S.finance.filter(function (x) { return x.arah === 'keluar'; }).length + ' rekod perbelanjaan</span>', 'bi-arrow-up-circle', 'red'),
        statCard('Baki Semasa', Util.fmtRM(f.baki), '<span>Dikira automatik</span>', 'bi-wallet2', ''),
        statCard('Dokumen Kewangan', String(docCount('Kewangan')), '<span>Penyata dimuat naik</span>', 'bi-file-earmark-text', 'green')
      ].join('');
    } else {
      stats = [
        statCard('Status Profil Saya', '<span style="font-size:1.15rem">' + (EP.STATUS[myStatus] || {}).label + '</span>', '<span>' + (myStatus === 'lengkap' ? 'Profil dikunci' : 'Kemas kini diperlukan') + '</span>', 'bi-person-badge', myStatus === 'lengkap' ? 'green' : 'gold'),
        statCard('Hari ke Tarikh Akhir', dAkhir === null ? '—' : String(dAkhir), '<span>' + Util.fmtDate(S.settings.tarikhAkhir) + '</span>', 'bi-calendar-event', dAkhir !== null && dAkhir <= 7 ? 'red' : ''),
        statCard('Item Lengkap', c.done + ' / ' + c.total, '<span>' + c.pct + '% keseluruhan</span>', 'bi-check2-square', 'green'),
        statCard('Tarikh Sasaran', dSasaran === null ? '—' : String(dSasaran) + ' hari', '<span>' + Util.fmtDate(S.settings.tarikhSasaran) + '</span>', 'bi-flag', '')
      ].join('');
    }

    var heroMsg = '';
    if (role === 'setiausaha') {
      heroMsg = pc.menunggu + ' profil menunggu semakan, ' + (pc.pembetulan + pc.draf) + ' lagi perlu tindakan. Semua rekod boleh dipantau dari sini.';
    } else if (role === 'bendahari') {
      heroMsg = 'Baki semasa ' + Util.fmtRM(f.baki) + ' daripada ' + S.finance.length + ' rekod kewangan. Kemas kini buku tunai sebelum tarikh akhir.';
    } else if (role === 'pengerusi') {
      heroMsg = c.pct + '% kelengkapan penyerahan. ' + (S.settings.statusKelulusan === 'lulus' ? 'Persatuan telah diluluskan.' : 'Semak kesediaan sebelum memberi Kelulusan Akhir.');
    } else {
      heroMsg = myStatus === 'lengkap'
        ? 'Profil anda telah disahkan dan dikunci. Terima kasih kerana melengkapkan maklumat.'
        : 'Lengkapkan profil dan dokumen pengenalan anda untuk semakan Setiausaha.';
    }

    var noticeList = buildNotices();
    if (role === 'ajk' && myStatus !== 'lengkap') {
      noticeList = [{
        kind: myStatus === 'pembetulan' ? 'danger' : 'warn',
        icon: 'bi-person-badge',
        title: myStatus === 'pembetulan' ? 'Profil perlu pembetulan' : 'Lengkapkan profil anda',
        text: myStatus === 'pembetulan' ? 'Sila muat naik semula dokumen yang diminta.' : 'Isi maklumat dan muat naik IC serta gambar pasport.',
        route: 'profil'
      }].concat(noticeList);
    }
    var tasks = noticeList.slice(0, 3).map(function (n) {
      var cls = n.kind === 'danger' ? 'danger' : n.kind === 'warn' ? '' : n.kind === 'ok' ? 'ok' : 'info';
      return '<div class="v3-task ' + cls + '">' +
        '<span class="t-icon"><i class="bi ' + n.icon + '"></i></span>' +
        '<div class="t-copy"><b>' + esc(n.title) + '</b><span>' + esc(n.text) + '</span></div>' +
        (n.route ? '<button class="t-go" type="button" data-act="go" data-route="' + n.route + '" aria-label="Buka"><i class="bi bi-arrow-right"></i></button>' : '') +
      '</div>';
    }).join('');

    var rows = c.items.map(function (it) {
      var cls = it.status === 'lengkap' ? '' : (it.status === 'semakan' || it.status === 'menunggu') ? 'pending' : 'todo';
      var ic = it.status === 'lengkap' ? 'bi-check-lg' : it.status === 'belum' ? 'bi-dash' : 'bi-hourglass';
      return '<div class="v3-prow ' + cls + '" data-act="go" data-route="semak" role="button" tabindex="0">' +
        '<span class="p-ic"><i class="bi ' + ic + '"></i></span>' +
        '<div class="p-copy"><b>' + it.nama + '</b><span>' + it.note + '</span></div>' +
        statusChip(it.status) +
      '</div>';
    }).join('');

    var logIcons = {
      muatnaik: 'bi-cloud-arrow-up', sahkan: 'bi-patch-check', pembetulan: 'bi-exclamation-triangle',
      padam: 'bi-trash', logmasuk: 'bi-box-arrow-in-right', daftar: 'bi-person-plus',
      kelulusan: 'bi-check2-circle', cetak: 'bi-printer', tambah: 'bi-plus-circle',
      ubah: 'bi-pencil', reset: 'bi-key', notifikasi: 'bi-bell', setup: 'bi-gear'
    };
    var recent = S.logs.slice().sort(function (a, b) { return String(b.ts).localeCompare(String(a.ts)); }).slice(0, 5);
    var activity = recent.length ? recent.map(function (l) {
      return '<div class="act">' +
        '<span class="act-dot"><i class="bi ' + (logIcons[l.tindakan] || 'bi-activity') + '"></i></span>' +
        '<div style="min-width:0"><b>' + esc(l.butiran || l.tindakan) + '</b><span>' + esc(l.nama || 'Sistem') + '</span></div>' +
        '<time>' + timeAgo(l.ts) + '</time>' +
      '</div>';
    }).join('') : '<p class="muted small" style="margin:.4rem 0">Tiada aktiviti direkodkan.</p>';

    return '' +
      '<div class="v3-hero">' +
        '<div class="v3-hero-copy">' +
          '<span class="v3-date"><i class="bi bi-calendar3"></i> ' + today + '</span>' +
          '<h2>Selamat kembali, <span>' + esc(firstName) + '</span></h2>' +
          '<p>' + esc(heroMsg) + '</p>' +
          '<div class="v3-hero-chips">' +
            '<span class="v3-hchip"><i class="bi bi-hash"></i> ' + esc(S.settings.noRujukan) + '</span>' +
            '<span class="v3-hchip"><i class="bi bi-people"></i> Sesi ' + esc(S.settings.sesi) + '</span>' +
            '<span class="v3-hchip gold"><i class="bi bi-broadcast"></i> ' + phase + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="v3-donut">' +
          donutSvg(c.pct) +
          '<div class="v3-donut-center"><b>' + c.pct + '%</b><span>Lengkap</span><em>' + c.done + ' / ' + c.total + ' item</em></div>' +
        '</div>' +
      '</div>' +

      '<div class="v3-section"><h3><i class="bi bi-lightning-charge-fill" style="color:var(--gold-700);margin-right:.15rem"></i> Tindakan pantas</h3>' +
        '<button class="v3-link" type="button" data-act="moreNav">Semua menu <i class="bi bi-arrow-right"></i></button></div>' +
      '<div class="v3-quick">' + quickTiles() + '</div>' +

      '<div class="v3-section"><h3>Ringkasan</h3><span class="muted small">Dikemas kini ' + Util.fmtDateTime(Util.nowISO()) + '</span></div>' +
      '<div class="stat-grid">' + stats + '</div>' +

      '<div class="v3-grid">' +
        '<div class="v3-col">' +
          '<div class="card">' +
            '<div class="v3-card-head"><div><h3>Keutamaan hari ini</h3><p>Tindakan yang memerlukan perhatian</p></div>' +
              '<span class="chip chip-gold">' + Math.min(noticeList.length, 3) + ' item</span></div>' +
            '<div class="v3-tasks">' + tasks + '</div>' +
          '</div>' +
          '<div class="card">' +
            '<div class="v3-card-head"><div><h3>Kelengkapan penyerahan</h3><p>Empat item statutori</p></div>' +
              '<span class="chip chip-blue">' + c.pct + '%</span></div>' +
            '<div class="v3-progress">' + rows + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="v3-col">' +
          '<div class="card">' +
            '<div class="v3-card-head"><div><h3>Kalendar</h3><p>Tarikh penting pendaftaran</p></div></div>' +
            calendarHtml() +
          '</div>' +
          '<div class="card">' +
            '<div class="v3-card-head"><div><h3>Aktiviti terkini</h3><p>Jejak audit sistem</p></div>' +
              '<a class="v3-link" href="#/log">Lihat</a></div>' +
            '<div class="v3-activity">' + activity + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function noticesHtml(list) {
    return list.map(function (n) {
      return '<div class="notice ' + n.kind + '">' +
        '<i class="bi ' + n.icon + '"></i>' +
        '<div><b>' + esc(n.title) + '</b><span>' + esc(n.text) + '</span>' +
        (n.route ? '<a class="link" href="#/' + n.route + '">Semak sekarang →</a>' : '') +
        '</div></div>';
    }).join('');
  }

  function calendarHtml() {
    var base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + S.calOffset);
    var y = base.getFullYear(), m = base.getMonth();
    var monthName = base.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' });
    var firstDow = new Date(y, m, 1).getDay();
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var prevDays = new Date(y, m, 0).getDate();
    var today = new Date();
    var marks = {};
    [S.settings.tarikhMesyuarat, S.settings.tarikhAkhir, S.settings.tarikhSasaran].forEach(function (d) {
      if (d) marks[d] = true;
    });
    var cells = '';
    ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'].forEach(function (d) {
      cells += '<div class="dow">' + d + '</div>';
    });
    for (var i = firstDow - 1; i >= 0; i--) {
      cells += '<div class="cal-day out">' + (prevDays - i) + '</div>';
    }
    for (var d = 1; d <= daysInMonth; d++) {
      var ymd = y + '-' + ('0' + (m + 1)).slice(-2) + '-' + ('0' + d).slice(-2);
      var cls = 'cal-day';
      if (ymd === Util.todayYmd()) cls += ' today';
      if (marks[ymd]) cls += ' mark';
      cells += '<div class="' + cls + '">' + d + '</div>';
    }
    var totalShown = firstDow + daysInMonth;
    var trail = (7 - (totalShown % 7)) % 7;
    for (var t = 1; t <= trail; t++) cells += '<div class="cal-day out">' + t + '</div>';

    return '<div class="cal">' +
      '<div class="cal-head">' +
        '<b>' + monthName + '</b>' +
        '<div class="cal-nav">' +
          '<button type="button" data-act="calNav" data-dir="-1" aria-label="Bulan sebelum"><i class="bi bi-chevron-left"></i></button>' +
          '<button type="button" data-act="calNav" data-dir="1" aria-label="Bulan selepas"><i class="bi bi-chevron-right"></i></button>' +
        '</div>' +
      '</div>' +
      '<div class="cal-grid">' + cells + '</div>' +
      '<div class="cal-legend">' +
        '<span><i style="background:var(--blue)"></i> Hari ini</span>' +
        '<span><i style="background:var(--gold)"></i> Tarikh penting</span>' +
      '</div>' +
    '</div>';
  }

  /* ============================================================
     SENARAI SEMAK
     ============================================================ */
  function pageSemak() {
    var c = completion();
    var items = c.items.map(function (it) {
      var cls = it.status === 'lengkap' ? 'done' : (it.status === 'belum' ? '' : 'warn');
      var canAct = S.user.peranan === it.role;
      var actions = '';
      if (it.kategori && can('uploadDocs') && S.user.peranan === it.role) {
        actions += '<button class="btn btn-sm btn-ghost" type="button" data-act="uploadDoc" data-kat="' + esc(it.kategori) + '"><i class="bi bi-upload"></i> Muat Naik</button>';
      }
      if (it.key === 'kewangan' && can('manageFinance')) {
        actions += '<button class="btn btn-sm btn-ghost" type="button" data-act="go" data-route="kewangan"><i class="bi bi-cash-coin"></i> Buku Tunai</button>';
      }
      if (canAct && can('checklist')) {
        actions += it.manual
          ? '<button class="btn btn-sm btn-ghost" type="button" data-act="resetCheck" data-key="' + it.key + '"><i class="bi bi-arrow-counterclockwise"></i> Set Semula Auto</button>'
          : '<button class="btn btn-sm btn-soft" type="button" data-act="markCheck" data-key="' + it.key + '"><i class="bi bi-check2-all"></i> Tanda Lengkap</button>';
      }
      return '<article class="item ' + cls + '">' +
        '<div class="it-icon"><i class="bi ' + it.icon + '"></i></div>' +
        '<div class="it-copy">' +
          '<div class="it-top"><h4>' + it.nama + '</h4>' + statusChip(it.status) + '</div>' +
          '<p>' + it.desc + '</p>' +
          '<div class="it-meta">' +
            '<span><i class="bi bi-info-circle"></i> ' + esc(it.note) + '</span>' +
            '<span><i class="bi bi-clock"></i> ' + (it.manual ? 'Manual • ' + esc(it.oleh) + (it.tarikh ? ' • ' + Util.fmtDate(it.tarikh) : '') : 'Dikira automatik') + '</span>' +
          '</div>' +
          (actions ? '<div class="it-actions">' + actions + '</div>' : '') +
        '</div>' +
      '</article>';
    }).join('');

    return pageHead('Senarai Semak Pendaftaran',
      'Empat kumpulan dokumen statutori. Status dikira automatik daripada dokumen dan profil yang dimuat naik.',
      can('checklist') && S.user.peranan === 'setiausaha'
        ? '<button class="btn btn-ghost btn-sm" type="button" data-act="recompute"><i class="bi bi-arrow-repeat"></i> Kira Semula</button>'
        : '') +
      '<div class="card card-pad" style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;margin-bottom:1rem">' +
        '<div class="pp-pct" style="font-size:2rem">' + c.pct + '%</div>' +
        '<div style="flex:1;min-width:180px">' +
          '<div class="pp-bar" style="margin:0 0 .4rem"><i style="width:' + c.pct + '%"></i></div>' +
          '<span class="muted small">' + c.done + ' daripada ' + c.total + ' item lengkap</span>' +
        '</div>' +
        (S.settings.statusKelulusan === 'lulus'
          ? '<span class="chip chip-green"><i class="bi bi-patch-check"></i> Kelulusan Akhir</span>'
          : '<span class="chip chip-blue"><i class="bi bi-hourglass"></i> Belum diluluskan</span>') +
      '</div>' +
      (S.user.peranan === 'ajk'
        ? '<div class="lock-banner"><i class="bi bi-info-circle"></i><div>Anda boleh melihat status keseluruhan. Item <b>Butir-butir AJK</b> bergantung pada profil anda — pastikan profil lengkap dan disahkan.</div></div>'
        : '') +
      '<div class="item-list">' + items + '</div>';
  }

  /* ============================================================
     PROFIL SAYA
     ============================================================ */
  function getMyProfile() {
    return profileOf(S.user.id);
  }

  function uploadTile(field, label, hint, value, accept) {
    var has = !!value;
    return '<label class="upload' + (has ? ' has-file' : '') + '" data-tile="' + field + '">' +
      '<input type="file" data-upload="' + field + '" accept="' + (accept || 'image/*') + '" aria-label="' + esc(label) + '">' +
      (has ? '' : '<i class="bi bi-camera"></i>') +
      '<b>' + label + '</b>' +
      '<span>' + (has ? 'Klik untuk ganti' : hint) + '</span>' +
      (has ? '<span class="thumb-label"><i class="bi bi-check2"></i> Dimuat naik</span>' : '') +
    '</label>';
  }

  function pageProfil() {
    var user = S.user;
    var p = getMyProfile();
    if (!p) {
      p = ensureProfileObject(user);
    }
    if (!S.uploadDraft) {
      S.uploadDraft = {
        icDepan: p.icDepan || '',
        icBelakang: p.icBelakang || '',
        pasport: p.pasport || ''
      };
    }
    var locked = p.status === 'lengkap';
    var st = p.status || 'draf';

    var banner = '';
    if (st === 'lengkap') {
      banner = '<div class="lock-banner green"><i class="bi bi-lock"></i><div><b>Profil telah disahkan.</b> Rekod dikunci. Hubungi Setiausaha jika perlu membuat pembetulan.</div></div>';
    } else if (st === 'pembetulan') {
      banner = '<div class="lock-banner red"><i class="bi bi-exclamation-octagon"></i><div><b>Perlu pembetulan.</b> ' + esc(p.catatan || 'Sila semak semula dokumen anda.') + '</div></div>';
    } else if (st === 'menunggu') {
      banner = '<div class="lock-banner"><i class="bi bi-hourglass-split"></i><div><b>Menunggu pengesahan Setiausaha.</b> Anda masih boleh mengemas kini profil sebelum disahkan.</div></div>';
    } else {
      banner = '<div class="lock-banner amber"><i class="bi bi-info-circle"></i><div><b>Profil belum lengkap.</b> Isi semua medan wajib dan muat naik dokumen pengenalan.</div></div>';
    }

    var form =
      '<form data-form="profile" id="profileForm" novalidate>' +
        '<div class="field-row">' +
          '<div class="field"><label for="pfNama">Nama penuh (seperti MyKad) <span class="req">*</span></label><input class="input" id="pfNama" name="namaPenuh" value="' + esc(p.namaPenuh) + '" ' + (locked ? 'disabled' : '') + ' required></div>' +
          '<div class="field"><label for="pfIc">No. Kad Pengenalan <span class="req">*</span></label><input class="input" id="pfIc" name="ic" inputmode="numeric" maxlength="14" value="' + esc(Util.fmtIC(p.ic)) + '" placeholder="900101-01-5533" ' + (locked ? 'disabled' : '') + ' required></div>' +
        '</div>' +
        '<div class="field-row">' +
          '<div class="field"><label for="pfJawatan">Jawatan <span class="req">*</span></label><select class="select" id="pfJawatan" name="jawatan" ' + (locked ? 'disabled' : '') + '>' +
            ['Pengerusi', 'Setiausaha', 'Bendahari', 'AJK Penaja'].map(function (j) {
              return '<option' + (p.jawatan === j ? ' selected' : '') + '>' + j + '</option>';
            }).join('') +
          '</select></div>' +
          '<div class="field"><label for="pfTel">No. Telefon Bimbit <span class="req">*</span></label><input class="input" id="pfTel" name="telefon" inputmode="tel" value="' + esc(p.telefon) + '" placeholder="012-345 6789" ' + (locked ? 'disabled' : '') + ' required></div>' +
        '</div>' +
        '<div class="field"><label for="pfAlamat">Alamat kediaman <span class="req">*</span></label><textarea class="textarea" id="pfAlamat" name="alamat" ' + (locked ? 'disabled' : '') + ' required>' + esc(p.alamat) + '</textarea></div>' +
        '<div class="field-row">' +
          '<div class="field"><label for="pfEmail">E-mel aktif <span class="req">*</span></label><input class="input" id="pfEmail" name="email" type="email" value="' + esc(p.email || user.email) + '" ' + (locked ? 'disabled' : '') + ' required></div>' +
          '<div class="field"><label for="pfKerja">Pekerjaan <span class="req">*</span></label><input class="input" id="pfKerja" name="pekerjaan" value="' + esc(p.pekerjaan) + '" ' + (locked ? 'disabled' : '') + ' required></div>' +
        '</div>' +
        '<div class="field"><label for="pfMajikan">Majikan / Institusi</label><input class="input" id="pfMajikan" name="majikan" value="' + esc(p.majikan) + '" ' + (locked ? 'disabled' : '') + '></div>' +

        '<hr class="divider">' +
        '<h3 style="font-size:.95rem;margin-bottom:.25rem">Dokumen Pengenalan</h3>' +
        '<p class="muted small" style="margin-bottom:.75rem">Imej dimampatkan secara automatik. Format JPG/PNG/PDF sehingga 5MB.</p>' +
        '<div class="upload-grid">' +
          uploadTile('icDepan', 'IC Depan', 'Ambil gambar / pilih fail', S.uploadDraft.icDepan, 'image/*,application/pdf') +
          uploadTile('icBelakang', 'IC Belakang', 'Ambil gambar / pilih fail', S.uploadDraft.icBelakang, 'image/*,application/pdf') +
          uploadTile('pasport', 'Gambar Pasport', 'Latar belakang putih', S.uploadDraft.pasport, 'image/*') +
        '</div>' +

        '<div class="lock-banner" style="margin-top:1rem"><i class="bi bi-shield-check"></i><div><b>Notis PDPA 2010.</b> Data peribadi anda dikumpul untuk tujuan pendaftaran persatuan sahaja. Hanya anda, Setiausaha dan Pengerusi boleh melihat dokumen ini.</div></div>' +

        (locked
          ? '<div class="form-actions"><span class="chip chip-green"><i class="bi bi-lock"></i> Profil dikunci selepas pengesahan</span></div>'
          : '<div class="form-actions"><button class="btn btn-primary" type="submit"><i class="bi bi-send"></i> Simpan &amp; Hantar Semakan</button>' +
            '<button class="btn btn-ghost" type="reset"><i class="bi bi-arrow-counterclockwise"></i> Set Semula</button></div>') +
      '</form>';

    var side = '<div class="card card-pad">' +
      '<div class="profile-hero">' + avatar(p.namaPenuh || user.nama, 'lg') +
        '<div class="ph-copy"><h3>' + esc(p.namaPenuh || user.nama) + '</h3><p>' + roleLabel(user.peranan) + ' • ' + esc(user.matrik || '—') + '</p></div>' +
      '</div>' +
      '<dl class="detail-list">' +
        '<div class="dl"><dt>Status Profil</dt><dd>' + statusChip(st) + '</dd></div>' +
        '<div class="dl"><dt>No. Kad Pengenalan</dt><dd>' + esc(Util.fmtIC(p.ic) || '—') + '</dd></div>' +
        '<div class="dl"><dt>No. Telefon</dt><dd>' + esc(p.telefon || '—') + '</dd></div>' +
        '<div class="dl"><dt>E-mel</dt><dd>' + esc(p.email || user.email) + '</dd></div>' +
        '<div class="dl"><dt>Pekerjaan</dt><dd>' + esc(p.pekerjaan || '—') + (p.majikan ? ' • ' + esc(p.majikan) : '') + '</dd></div>' +
        '<div class="dl"><dt>Kemas Kini</dt><dd>' + Util.fmtDateTime(p.updatedAt || p.tarikhHantar) + '</dd></div>' +
        (p.tarikhSahkan ? '<div class="dl"><dt>Disahkan Oleh</dt><dd>' + esc(p.disahkanOleh || '—') + '<br><span class="muted small">' + Util.fmtDate(p.tarikhSahkan) + '</span></dd></div>' : '') +
      '</dl>' +
      '<hr class="divider">' +
      '<div class="sec-list" style="margin:0 0 1rem">' +
        '<li><i class="bi bi-check"></i><div><b>Data dilindungi</b><span>No. KP disamarkan di senarai awam.</span></div></li>' +
        '<li><i class="bi bi-check"></i><div><b>Kamera telefon</b><span>Tekan kotak muat naik untuk ambil gambar terus.</span></div></li>' +
      '</div>' +
      '<button class="btn btn-ghost btn-block btn-sm" type="button" data-act="changePassword"><i class="bi bi-key"></i> Tukar Kata Laluan</button>' +
    '</div>';

    return pageHead('Profil Saya', 'Lengkapkan profil dan dokumen pengenalan untuk semakan Setiausaha.', '') +
      banner +
      '<div class="profile-layout">' +
        '<div class="card profile-card">' + form + '</div>' +
        side +
      '</div>';
  }

  MOUNTS.profil = function () {
    var p = getMyProfile();
    if (p && p.status === 'lengkap') {
      var form = $('#profileForm');
      if (form) {
        $$('input, select, textarea', form).forEach(function (el) { el.disabled = true; });
      }
    }
  };

  /* ============================================================
     SENARAI AJK
     ============================================================ */
  function pageAjk() {
    var counts = profileCounts();
    var rows = activeUsers().map(function (u) {
      var p = profileOf(u.id) || ensureProfileObject(u);
      return { u: u, p: p };
    });
    rows.sort(function (a, b) {
      var order = { pengerusi: 0, setiausaha: 1, bendahari: 2, ajk: 3 };
      return (order[a.u.peranan] - order[b.u.peranan]) || a.u.nama.localeCompare(b.u.nama);
    });

    var body = rows.map(function (x) {
      var st = x.p.status || 'draf';
      return '<tr data-row data-status="' + st + '" data-search="' + esc((x.u.nama + ' ' + x.u.email + ' ' + x.p.ic + ' ' + roleLabel(x.u.peranan)).toLowerCase()) + '">' +
        '<td><div class="user-cell">' + avatar(x.u.nama) + '<div><b>' + esc(x.u.nama) + '</b><span>' + esc(x.u.email) + '</span></div></div></td>' +
        '<td><span class="chip chip-blue">' + esc(x.p.jawatan || roleLabel(x.u.peranan)) + '</span></td>' +
        '<td class="tnum">' + esc(Util.maskIC(x.p.ic)) + '</td>' +
        '<td class="nowrap">' + esc(x.p.telefon || '—') + '</td>' +
        '<td>' + statusChip(st) + '</td>' +
        '<td class="nowrap"><button class="btn btn-sm btn-ghost" type="button" data-act="openReview" data-id="' + x.u.id + '"><i class="bi bi-eye"></i> Lihat</button></td>' +
      '</tr>';
    }).join('');

    return pageHead('Senarai AJK Penaja',
      'Semak profil, dokumen pengenalan dan status pengesahan setiap AJK.',
      '<button class="btn btn-ghost btn-sm" type="button" data-act="exportAjk"><i class="bi bi-download"></i> Eksport CSV</button>') +
      '<div class="stat-grid" style="margin-bottom:1rem">' +
        statCard('Jumlah AJK', String(counts.total), '<span>Ahli aktif</span>', 'bi-people', '') +
        statCard('Lengkap', String(counts.lengkap), '<span>Disahkan Setiausaha</span>', 'bi-check-circle', 'green') +
        statCard('Menunggu', String(counts.menunggu), '<span>Untuk disemak</span>', 'bi-hourglass', 'gold') +
        statCard('Perlu Pembetulan', String(counts.pembetulan + counts.draf), '<span>Belum lengkap</span>', 'bi-exclamation-circle', 'red') +
      '</div>' +
      '<div class="card" style="margin-bottom:1rem;padding:.9rem 1rem;display:flex;gap:.7rem;flex-wrap:wrap;align-items:center">' +
        '<div class="field" style="margin:0;flex:1;min-width:200px"><input class="input" id="ajkSearch" placeholder="Cari nama, e-mel atau No. KP…" aria-label="Cari AJK"></div>' +
        '<select class="select" id="ajkFilter" style="max-width:200px" aria-label="Tapis status">' +
          '<option value="">Semua status</option>' +
          '<option value="lengkap">Lengkap</option>' +
          '<option value="menunggu">Menunggu Semakan</option>' +
          '<option value="pembetulan">Perlu Pembetulan</option>' +
          '<option value="draf">Belum Lengkap</option>' +
        '</select>' +
      '</div>' +
      '<div class="card table-wrap">' +
        '<table class="data"><thead><tr>' +
          '<th>Nama</th><th>Jawatan</th><th>No. KP</th><th>Telefon</th><th>Status</th><th></th>' +
        '</tr></thead><tbody id="ajkBody">' + (body || '<tr><td colspan="6" class="empty-row">Tiada AJK aktif.</td></tr>') + '</tbody></table>' +
      '</div>';
  }

  MOUNTS.ajk = function () {
    var q = $('#ajkSearch'), f = $('#ajkFilter');
    function apply() {
      var term = (q.value || '').toLowerCase();
      var st = f.value;
      $$('#ajkBody tr[data-row]').forEach(function (tr) {
        var ok = (!term || tr.dataset.search.indexOf(term) >= 0) && (!st || tr.dataset.status === st);
        tr.hidden = !ok;
      });
    }
    q.addEventListener('input', Util.debounce(apply, 150));
    f.addEventListener('change', apply);
  };

  /* ============================================================
     SEMAKAN PROFIL
     ============================================================ */
  function pageReview() {
    var id = S.param;
    var user = userById(id);
    if (!user) {
      var first = pendingProfiles()[0];
      if (first) { setTimeout(function () { navigate('review', first.user.id); }, 30); }
      return pageHead('Semakan Profil', 'Pilih AJK daripada senarai untuk disemak.', '') +
        '<div class="card card-pad">Tiada profil dipilih. <a href="#/ajk">Buka Senarai AJK</a>.</div>';
    }
    var p = profileOf(user.id) || ensureProfileObject(user);
    var st = p.status || 'draf';
    var canReview = S.user.peranan === 'setiausaha';
    var fullIc = S.user.peranan === 'setiausaha' || S.user.peranan === 'pengerusi';

    var img = function (label, dataUrl, icon) {
      if (!dataUrl) {
        return '<div class="upload" style="cursor:default;min-height:140px"><i class="bi bi-camera"></i><b>' + label + '</b><span>Tiada dokumen</span></div>';
      }
      var isPdf = String(dataUrl).indexOf('data:application/pdf') === 0;
      if (isPdf) {
        return '<button class="upload has-file" type="button" data-act="openData" data-id="' + user.id + '" data-field="' + icon + '" style="min-height:140px;border-style:solid">' +
          '<i class="bi bi-file-earmark-pdf"></i><b>' + label + '</b><span>PDF — klik untuk buka</span></button>';
      }
      return '<button class="upload has-file" type="button" data-act="viewImage" data-id="' + user.id + '" data-field="' + icon + '" style="min-height:140px;border-style:solid;padding:0">' +
        '<img src="' + dataUrl + '" alt="' + label + '" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0">' +
        '<span class="thumb-label" style="margin-top:auto">' + label + '</span></button>';
    };

    var actions = '';
    if (canReview && st !== 'lengkap') {
      actions =
        '<button class="btn btn-gold" type="button" data-act="approveProfile" data-id="' + user.id + '"><i class="bi bi-patch-check"></i> Sahkan Profil</button>' +
        '<button class="btn btn-danger-ghost" type="button" data-act="requestFix" data-id="' + user.id + '"><i class="bi bi-exclamation-triangle"></i> Minta Pembetulan</button>';
    } else if (st === 'lengkap') {
      actions = '<span class="chip chip-green"><i class="bi bi-lock"></i> Profil telah disahkan dan dikunci</span>';
    } else {
      actions = '<span class="chip chip-blue"><i class="bi bi-eye"></i> Mod baca sahaja</span>';
    }

    var docFields = [
      { key: 'icDepan', label: 'IC Depan', icon: 'icDepan' },
      { key: 'icBelakang', label: 'IC Belakang', icon: 'icBelakang' },
      { key: 'pasport', label: 'Gambar Pasport', icon: 'pasport' }
    ];

    var completeFields = ['namaPenuh', 'ic', 'jawatan', 'alamat', 'telefon', 'email', 'pekerjaan']
      .filter(function (k) { return !!p[k]; }).length;

    return pageHead('Semakan Profil AJK',
      'Semak dokumen pengenalan dan maklumat statutori sebelum mengesahkan profil.',
      '<a class="btn btn-ghost btn-sm" href="#/ajk"><i class="bi bi-arrow-left"></i> Kembali</a>') +
      (p.catatan && st === 'pembetulan'
        ? '<div class="lock-banner red"><i class="bi bi-exclamation-octagon"></i><div><b>Catatan pembetulan:</b> ' + esc(p.catatan) + '</div></div>'
        : '') +
      '<div class="dash-grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">' +
        '<div class="card card-pad">' +
          '<div class="profile-hero">' + avatar(p.namaPenuh || user.nama, 'lg') +
            '<div class="ph-copy"><h3>' + esc(p.namaPenuh || user.nama) + '</h3><p>' + esc(p.jawatan || roleLabel(user.peranan)) + ' • ' + esc(user.matrik || '—') + '</p></div>' +
            '<div style="margin-left:auto">' + statusChip(st) + '</div>' +
          '</div>' +
          '<div class="upload-grid">' + docFields.map(function (d) { return img(d.label, p[d.key], d.icon); }).join('') + '</div>' +
          '<div class="lock-banner" style="margin-top:1rem"><i class="bi bi-shield-lock"></i><div><b>Notis Kawal Selia PDPA.</b> Akses dokumen rasmi terhad kepada Setiausaha dan Pengerusi sahaja.</div></div>' +
        '</div>' +
        '<div class="card card-pad">' +
          '<dl class="detail-list">' +
            '<div class="dl"><dt>No. Kad Pengenalan</dt><dd>' + esc(fullIc ? Util.fmtIC(p.ic) : Util.maskIC(p.ic)) + '</dd></div>' +
            '<div class="dl"><dt>No. Telefon</dt><dd>' + esc(p.telefon || '—') + '</dd></div>' +
            '<div class="dl"><dt>E-mel</dt><dd>' + esc(p.email || user.email) + '</dd></div>' +
            '<div class="dl"><dt>Pekerjaan / Majikan</dt><dd>' + esc(p.pekerjaan || '—') + (p.majikan ? '<br><span class="muted small">' + esc(p.majikan) + '</span>' : '') + '</dd></div>' +
            '<div class="dl"><dt>Alamat Kediaman</dt><dd>' + esc(p.alamat || '—') + '</dd></div>' +
            '<div class="dl"><dt>Kelengkapan Medan</dt><dd>' + completeFields + ' / 7 medan wajib</dd></div>' +
            '<div class="dl"><dt>Tarikh Hantar</dt><dd>' + Util.fmtDateTime(p.tarikhHantar) + '</dd></div>' +
          '</dl>' +
          '<hr class="divider">' +
          '<div style="display:grid;gap:.5rem">' + actions + '</div>' +
          '<p class="muted small" style="margin:.8rem 0 0">Tindakan pengesahan direkodkan dalam Log Aktiviti bersama cap masa.</p>' +
        '</div>' +
      '</div>';
  }

  /* ============================================================
     DOKUMEN
     ============================================================ */
  function allowedCats() {
    if (S.user.peranan === 'bendahari') return ['Kewangan'];
    if (S.user.peranan === 'setiausaha') return ['Minit Mesyuarat', 'Perlembagaan', 'Lain-lain'];
    return [];
  }

  function pageDokumen() {
    var cats = ['Minit Mesyuarat', 'Perlembagaan', 'Kewangan', 'Lain-lain'];
    var docs = S.docs.slice();
    if (S.user.peranan === 'bendahari') {
      docs = docs.filter(function (d) { return d.kategori === 'Kewangan'; });
    }
    docs.sort(function (a, b) { return (b.tarikh || '').localeCompare(a.tarikh || ''); });
    var list = docs.map(function (d) {
      var ext = (d.format || '').toUpperCase();
      var cls = ext === 'PDF' ? 'pdf' : (ext === 'JPG' || ext === 'PNG' || ext === 'JPEG' ? 'img' : 'doc');
      var ic = ext === 'PDF' ? 'bi-file-earmark-pdf' : (cls === 'img' ? 'bi-file-earmark-image' : 'bi-file-earmark-text');
      return '<article class="doc-card" data-doc data-kat="' + esc(d.kategori) + '" data-search="' + esc((d.nama + ' ' + d.kategori + ' ' + d.olehNama).toLowerCase()) + '">' +
        '<div class="di ' + cls + '"><i class="bi ' + ic + '"></i></div>' +
        '<div class="dc-copy">' +
          '<b title="' + esc(d.nama) + '">' + esc(d.nama) + '</b>' +
          '<span>' + esc(d.kategori) + ' • ' + esc(d.format) + ' • ' + Util.fmtSize(d.saiz) + '</span>' +
          '<span>Versi ' + d.versi + ' • ' + Util.fmtDate(d.tarikh) + (d.aktif ? '' : ' • <em>lama</em>') + '</span>' +
          '<div class="dc-actions">' +
            '<button type="button" data-act="openDoc" data-id="' + d.id + '" title="Lihat"><i class="bi bi-eye"></i></button>' +
            '<button type="button" data-act="downloadDoc" data-id="' + d.id + '" title="Muat turun"><i class="bi bi-download"></i></button>' +
            (can('uploadDocs') ? '<button class="del" type="button" data-act="deleteDoc" data-id="' + d.id + '" title="Padam"><i class="bi bi-trash"></i></button>' : '') +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');

    return pageHead('Pengurusan Dokumen',
      'Muat naik, cari dan urus dokumen utama persatuan. Versi lama disimpan secara automatik.',
      (can('uploadDocs')
        ? '<button class="btn btn-primary btn-sm" type="button" data-act="uploadDoc"><i class="bi bi-cloud-arrow-up"></i> Muat Naik</button>'
        : '')) +
      '<div class="card" style="padding:.9rem 1rem;display:flex;gap:.7rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem">' +
        '<div class="field" style="margin:0;flex:1;min-width:200px"><input class="input" id="docSearch" placeholder="Cari nama fail, kategori atau pemuat naik…" aria-label="Cari dokumen"></div>' +
        '<select class="select" id="docFilter" style="max-width:190px" aria-label="Tapis kategori">' +
          '<option value="">Semua kategori</option>' +
          cats.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<div class="doc-grid" id="docGrid">' + (list || '<div class="card card-pad">Belum ada dokumen dimuat naik.</div>') + '</div>';
  }

  MOUNTS.dokumen = function () {
    var q = $('#docSearch'), f = $('#docFilter');
    function apply() {
      var term = (q.value || '').toLowerCase();
      var cat = f.value;
      $$('[data-doc]').forEach(function (el) {
        var ok = (!term || el.dataset.search.indexOf(term) >= 0) && (!cat || el.dataset.kat === cat);
        el.hidden = !ok;
      });
    }
    q.addEventListener('input', Util.debounce(apply, 150));
    f.addEventListener('change', apply);
  };

  /* ============================================================
     KEWANGAN
     ============================================================ */
  function pageKewangan() {
    var f = financeTotals();
    var rows = S.finance.slice().sort(function (a, b) { return (b.tarikh || '').localeCompare(a.tarikh || ''); });
    var body = rows.map(function (r) {
      return '<tr>' +
        '<td class="nowrap">' + Util.fmtDate(r.tarikh) + '</td>' +
        '<td><b style="font-size:.8rem">' + esc(r.keterangan) + '</b><br><span class="muted small">' + esc(r.jenis) + ' • ' + esc(r.rujukan || '—') + '</span></td>' +
        '<td class="money ' + (r.arah === 'keluar' ? 'out' : 'in') + ' nowrap">' + (r.arah === 'keluar' ? '− ' : '+ ') + Util.fmtRM(r.jumlah) + '</td>' +
        '<td class="nowrap muted small">' + esc(r.olehNama || '—') + '</td>' +
        '<td class="nowrap">' +
          (can('manageFinance')
            ? '<button class="btn btn-sm btn-ghost" type="button" data-act="deleteFinance" data-id="' + r.id + '" title="Padam"><i class="bi bi-trash"></i></button>'
            : '') +
        '</td>' +
      '</tr>';
    }).join('');

    return pageHead('Kedudukan Kewangan',
      'Rekod kutipan, perbelanjaan dan baki buku tunai persatuan.',
      '<button class="btn btn-ghost btn-sm" type="button" data-act="exportFinance"><i class="bi bi-download"></i> Eksport CSV</button>' +
      (can('manageFinance') ? '<button class="btn btn-primary btn-sm" type="button" data-act="addFinance" data-arah="masuk"><i class="bi bi-plus-lg"></i> Rekod Baharu</button>' : '')) +
      '<div class="stat-grid" style="margin-bottom:1rem">' +
        statCard('Jumlah Kutipan', Util.fmtRM(f.masuk), '<span>Yuran &amp; sumbangan</span>', 'bi-arrow-down-circle', 'green') +
        statCard('Jumlah Perbelanjaan', Util.fmtRM(f.keluar), '<span>Perbelanjaan awal</span>', 'bi-arrow-up-circle', 'red') +
        statCard('Baki Semasa', Util.fmtRM(f.baki), '<span>Dikira automatik</span>', 'bi-wallet2', '') +
        statCard('Rekod', String(S.finance.length), '<span>Transaksi</span>', 'bi-list-check', 'gold') +
      '</div>' +
      '<div class="card table-wrap">' +
        '<table class="data"><thead><tr><th>Tarikh</th><th>Keterangan</th><th>Jumlah</th><th>Direkod Oleh</th><th></th></tr></thead>' +
        '<tbody>' + (body || '<tr><td colspan="5" class="empty-row">Belum ada rekod kewangan.</td></tr>') + '</tbody></table>' +
      '</div>';
  }

  /* ============================================================
     KELULUSAN AKHIR
     ============================================================ */
  function pageLulus() {
    var c = completion();
    var done = c.pct === 100;
    var lulus = S.settings.statusKelulusan === 'lulus';
    var rows = c.items.map(function (it) {
      return '<div class="check-row ' + (it.status === 'lengkap' ? '' : 'todo') + '">' +
        '<span class="cr-icon"><i class="bi ' + (it.status === 'lengkap' ? 'bi-check-lg' : 'bi-dash') + '"></i></span>' +
        '<div class="cr-copy"><b>' + it.nama + '</b><span>' + it.note + '</span></div>' +
        statusChip(it.status) +
      '</div>';
    }).join('');

    return pageHead('Kelulusan Akhir',
      'Kelulusan Pengerusi diperlukan sebelum laporan rasmi boleh dijana.',
      '') +
      (lulus
        ? '<div class="lock-banner green"><i class="bi bi-patch-check"></i><div><b>Persatuan telah diluluskan.</b> Diluluskan oleh ' + esc(S.settings.olehLulus || 'Pengerusi') + ' pada ' + Util.fmtDateTime(S.settings.tarikhLulus) + '. Laporan rasmi kini boleh dijana oleh Setiausaha.</div></div>'
        : done
          ? '<div class="lock-banner amber"><i class="bi bi-check2-circle"></i><div><b>Semua item lengkap.</b> Pengerusi boleh memberikan kelulusan akhir sekarang.</div></div>'
          : '<div class="lock-banner red"><i class="bi bi-exclamation-octagon"></i><div><b>Belum boleh diluluskan.</b> ' + c.done + ' / ' + c.total + ' item lengkap. Selesaikan item yang tertunggak dahulu.</div></div>') +
      '<div class="dash-grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)">' +
        '<div class="card progress-panel">' +
          '<div class="pp-head"><div><h3>Kesediaan Penyerahan</h3><p>Semua item mesti berstatus Lengkap</p></div><div class="pp-pct">' + c.pct + '%</div></div>' +
          '<div class="pp-bar"><i style="width:' + c.pct + '%"></i></div>' +
          '<div class="check-rows">' + rows + '</div>' +
        '</div>' +
        '<div class="card card-pad">' +
          '<div class="profile-hero"><span class="avatar lg blue"><i class="bi bi-patch-check"></i></span>' +
            '<div class="ph-copy"><h3>Kelulusan Pengerusi</h3><p>Keputusan muktamad penyerahan</p></div></div>' +
          (lulus
            ? '<dl class="detail-list">' +
                '<div class="dl"><dt>Status</dt><dd>' + statusChip('lengkap') + '</dd></div>' +
                '<div class="dl"><dt>Diluluskan Oleh</dt><dd>' + esc(S.settings.olehLulus || '—') + '</dd></div>' +
                '<div class="dl"><dt>Tarikh</dt><dd>' + Util.fmtDateTime(S.settings.tarikhLulus) + '</dd></div>' +
              '</dl><hr class="divider"><a class="btn btn-primary btn-block" href="#/laporan"><i class="bi bi-file-earmark-pdf"></i> Pergi ke Laporan</a>'
            : '<p class="muted small">Dengan menekan butang di bawah, Pengerusi mengesahkan bahawa semua dokumen telah disemak dan bersedia untuk penyerahan kepada pihak berkuasa.</p>' +
              '<button class="btn btn-gold btn-block btn-lg" type="button" data-act="approveFinal"' + (done ? '' : ' disabled') + '><i class="bi bi-patch-check"></i> Beri Kelulusan Akhir</button>' +
              (!done ? '<p class="muted small" style="margin:.7rem 0 0">Butang aktif apabila semua item lengkap.</p>' : '')) +
        '</div>' +
      '</div>';
  }

  /* ============================================================
     LAPORAN & EKSPORT
     ============================================================ */
  function reportHtml(opts) {
    var c = completion();
    var f = financeTotals();
    var pc = profileCounts();
    var logo = S.settings.logo
      ? '<img src="' + S.settings.logo + '" alt="Logo">'
      : esc(Util.initials(S.settings.namaPendek || 'eP'));
    var rows = c.items.map(function (it) {
      return '<tr><td>' + it.nama + '</td><td>' + (it.status === 'lengkap' ? 'ADA' : 'TIADA') + '</td><td>' + esc((EP.STATUS[it.status] || {}).label || it.status) + '</td><td>' + esc(it.note) + '</td></tr>';
    }).join('');
    var ajkRows = activeUsers().map(function (u) {
      var p = profileOf(u.id) || ensureProfileObject(u);
      return '<tr><td>' + esc(p.namaPenuh || u.nama) + '</td><td>' + esc(p.jawatan || roleLabel(u.peranan)) + '</td><td>' + esc(Util.maskIC(p.ic)) + '</td><td>' + esc((EP.STATUS[p.status] || {}).label || p.status) + '</td></tr>';
    }).join('');

    return '<div class="report-preview">' +
      '<div class="report-head">' +
        '<div class="rlogo">' + logo + '</div>' +
        '<div style="flex:1"><h2>' + esc(S.settings.namaRasmi) + '</h2>' +
          '<p>' + esc(S.settings.alamat).replace(/\n/g, '<br>') + '</p>' +
          '<p>No. Rujukan: ' + esc(S.settings.noRujukan) + ' • Sesi ' + esc(S.settings.sesi) + '</p>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:center;margin-bottom:1rem">' +
        '<h3 style="margin:0;font-size:1.05rem">LAPORAN KELENGKAPAN PENDAFTARAN PERSATUAN</h3>' +
        '<p class="muted small" style="margin:.2rem 0 0">Dijana pada ' + Util.fmtDateTime(Util.nowISO()) + '</p>' +
      '</div>' +
      '<div class="report-meta">' +
        '<div><small>Peratusan Kelengkapan</small><b>' + c.pct + '% (' + c.done + '/' + c.total + ')</b></div>' +
        '<div><small>Jumlah AJK</small><b>' + pc.total + ' orang</b></div>' +
        '<div><small>Status Kelulusan</small><b>' + (S.settings.statusKelulusan === 'lulus' ? 'DILULUSKAN' : 'BELUM') + '</b></div>' +
      '</div>' +
      '<h4 style="font-size:.9rem;margin-bottom:.4rem">A. Senarai Semak Dokumen</h4>' +
      '<div class="table-wrap"><table class="data"><thead><tr><th>Item</th><th>Status Dokumen</th><th>Status</th><th>Catatan</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<h4 style="font-size:.9rem;margin:1.2rem 0 .4rem">B. Senarai AJK Penaja</h4>' +
      '<div class="table-wrap"><table class="data"><thead><tr><th>Nama</th><th>Jawatan</th><th>No. KP</th><th>Status</th></tr></thead><tbody>' + ajkRows + '</tbody></table></div>' +
      '<h4 style="font-size:.9rem;margin:1.2rem 0 .4rem">C. Ringkasan Kewangan</h4>' +
      '<div class="table-wrap"><table class="data"><tbody>' +
        '<tr><td>Jumlah Kutipan</td><td class="money in">' + Util.fmtRM(f.masuk) + '</td></tr>' +
        '<tr><td>Jumlah Perbelanjaan</td><td class="money out">' + Util.fmtRM(f.keluar) + '</td></tr>' +
        '<tr><td><b>Baki Semasa</b></td><td class="money"><b>' + Util.fmtRM(f.baki) + '</b></td></tr>' +
      '</tbody></table></div>' +
      '<div class="sign-grid">' +
        '<div class="sign-box"><b>Disahkan oleh Setiausaha</b><br><br><br>______________________<br>' + esc(S.settings.namaPendek || 'Setiausaha') + '<br>Tarikh: ____________</div>' +
        '<div class="sign-box"><b>Diluluskan oleh Pengerusi</b><br><br><br>______________________<br>' + esc(S.settings.namaPendek || 'Pengerusi') + '<br>Tarikh: ____________</div>' +
      '</div>' +
      '<p class="muted small" style="margin-top:1.2rem">Dokumen ini dijana oleh sistem e-Persatuan. Sah hanya dengan tandatangan fizikal pihak berkuasa persatuan.</p>' +
    '</div>';
  }

  function pageLaporan() {
    var lulus = S.settings.statusKelulusan === 'lulus';
    return pageHead('Laporan & Eksport',
      'Jana laporan berkop rasmi dan eksport data untuk sandaran.',
      '') +
      (lulus
        ? '<div class="lock-banner green"><i class="bi bi-check-circle"></i><div><b>Sedia untuk penyerahan.</b> Kelulusan Akhir telah diberikan. Laporan rasmi boleh dicetak atau disimpan sebagai PDF.</div></div>'
        : '<div class="lock-banner amber"><i class="bi bi-lock"></i><div><b>Laporan rasmi dikunci.</b> Kelulusan Akhir Pengerusi diperlukan sebelum laporan rasmi boleh dijana. Anda masih boleh melihat pratonton dan mengeksport data.</div></div>') +
      '<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem" class="no-print">' +
        '<button class="btn btn-primary" type="button" data-act="printReport"' + (lulus ? '' : ' disabled') + '><i class="bi bi-printer"></i> Cetak / Simpan PDF</button>' +
        '<button class="btn btn-ghost" type="button" data-act="exportAjk"><i class="bi bi-people"></i> Eksport AJK (CSV)</button>' +
        '<button class="btn btn-ghost" type="button" data-act="exportFinance"><i class="bi bi-cash-coin"></i> Eksport Kewangan (CSV)</button>' +
        '<button class="btn btn-ghost" type="button" data-act="exportDocs"><i class="bi bi-folder"></i> Eksport Dokumen (CSV)</button>' +
      '</div>' +
      '<div id="reportHost">' + reportHtml() + '</div>';
  }

  /* ============================================================
     LOG AKTIVITI
     ============================================================ */
  function pageLog() {
    var logs = S.logs.slice().sort(function (a, b) { return String(b.ts).localeCompare(String(a.ts)); });
    var icons = {
      muatnaik: 'bi-cloud-arrow-up', sahkan: 'bi-patch-check', pembetulan: 'bi-exclamation-triangle',
      padam: 'bi-trash', logmasuk: 'bi-box-arrow-in-right', daftar: 'bi-person-plus',
      kelulusan: 'bi-check2-circle', cetak: 'bi-printer', tambah: 'bi-plus-circle',
      ubah: 'bi-pencil', reset: 'bi-key', notifikasi: 'bi-bell'
    };
    var list = logs.slice(0, 200).map(function (l) {
      return '<div class="log-item">' +
        '<span class="li-dot"><i class="bi ' + (icons[l.tindakan] || 'bi-activity') + '"></i></span>' +
        '<div style="min-width:0"><b>' + esc(l.butiran || l.tindakan) + '</b>' +
          '<span>' + esc(l.nama || 'Sistem') + ' • ' + esc(l.objek || '—') + '</span></div>' +
        '<time>' + Util.fmtDateTime(l.ts) + '</time>' +
      '</div>';
    }).join('');

    return pageHead('Log Aktiviti',
      'Jejak audit semua tindakan penting. Log tidak boleh disunting atau dipadam melalui aplikasi.',
      '<span class="chip chip-blue"><i class="bi bi-shield-lock"></i> ' + S.logs.length + ' rekod</span>') +
      '<div class="log-list">' + (list || '<div class="card card-pad">Tiada aktiviti direkodkan.</div>') + '</div>';
  }

  /* ============================================================
     PENGURUSAN PENGGUNA
     ============================================================ */
  function pagePengguna() {
    var pending = S.users.filter(function (u) { return u.status === 'menunggu'; });
    var rows = S.users.slice().sort(function (a, b) {
      var o = { setiausaha: 0, pengerusi: 1, bendahari: 2, ajk: 3 };
      return (o[a.peranan] - o[b.peranan]) || String(a.nama).localeCompare(String(b.nama));
    });
    var body = rows.map(function (u) {
      return '<tr>' +
        '<td><div class="user-cell">' + avatar(u.nama) + '<div><b>' + esc(u.nama) + '</b><span>' + esc(u.email) + '</span></div></div></td>' +
        '<td>' + roleChip(u.peranan) + '</td>' +
        '<td class="tnum nowrap">' + esc(u.matrik || '—') + '</td>' +
        '<td>' + statusChip(u.status === 'aktif' ? 'aktif' : u.status) + '</td>' +
        '<td class="muted small nowrap">' + (u.lastLogin ? Util.fmtDateTime(u.lastLogin) : 'Belum log masuk') + '</td>' +
        '<td class="nowrap" style="display:flex;gap:.2rem">' +
          '<button class="btn btn-sm btn-ghost" type="button" data-act="editUser" data-id="' + u.id + '" title="Tukar peranan"><i class="bi bi-pencil-square"></i></button>' +
          '<button class="btn btn-sm btn-ghost" type="button" data-act="resetPassword" data-id="' + u.id + '" title="Set semula kata laluan"><i class="bi bi-key"></i></button>' +
          (u.id !== S.user.id
            ? '<button class="btn btn-sm btn-ghost" type="button" data-act="toggleUser" data-id="' + u.id + '" title="' + (u.status === 'aktif' ? 'Nyahaktif' : 'Aktifkan') + '"><i class="bi ' + (u.status === 'aktif' ? 'bi-slash-circle' : 'bi-check-circle') + '"></i></button>'
            : '') +
        '</td>' +
      '</tr>';
    }).join('');

    var pendingHtml = pending.length
      ? '<div class="card" style="margin-bottom:1rem;border-color:#FCD34D;background:#FFFDF5">' +
          '<div class="card-head"><div><h3 style="font-size:.9rem">Menunggu Kelulusan (' + pending.length + ')</h3><p class="sub">Sahkan ahli baharu untuk memberi akses</p></div></div>' +
          '<div class="table-wrap"><table class="data"><tbody>' +
            pending.map(function (u) {
              return '<tr><td><div class="user-cell">' + avatar(u.nama) + '<div><b>' + esc(u.nama) + '</b><span>' + esc(u.email) + '</span></div></div></td>' +
                '<td class="nowrap">' + esc(u.matrik || '—') + '</td>' +
                '<td class="nowrap" style="text-align:right">' +
                  '<button class="btn btn-sm btn-primary" type="button" data-act="approveUser" data-id="' + u.id + '"><i class="bi bi-check2"></i> Luluskan</button> ' +
                  '<button class="btn btn-sm btn-ghost" type="button" data-act="rejectUser" data-id="' + u.id + '"><i class="bi bi-x"></i> Tolak</button>' +
                '</td></tr>';
            }).join('') +
          '</tbody></table></div>' +
        '</div>'
      : '';

    return pageHead('Pengurusan Pengguna',
      'Tambah pengguna, tukar peranan, set semula kata laluan dan urus akses.',
      '<button class="btn btn-primary btn-sm" type="button" data-act="addUser"><i class="bi bi-person-plus"></i> Tambah Pengguna</button>') +
      pendingHtml +
      '<div class="card table-wrap">' +
        '<table class="data"><thead><tr><th>Nama</th><th>Peranan</th><th>No. Matrik</th><th>Status</th><th>Log Masuk Terakhir</th><th></th></tr></thead>' +
        '<tbody>' + body + '</tbody></table>' +
      '</div>';
  }

  /* ============================================================
     TETAPAN
     ============================================================ */
  function pageTetapan() {
    var st = S.settings;
    return pageHead('Tetapan Sistem',
      'Maklumat persatuan, tarikh penting, kop surat dan sandaran data.',
      '') +
      '<div class="settings-grid">' +
        '<div class="card card-pad">' +
          '<h3 style="font-size:.95rem;margin-bottom:.8rem">Maklumat Persatuan</h3>' +
          '<form data-form="settings">' +
            '<div class="field"><label for="stNama">Nama rasmi</label><input class="input" id="stNama" name="namaRasmi" value="' + esc(st.namaRasmi) + '" required></div>' +
            '<div class="field-row">' +
              '<div class="field"><label for="stPendek">Nama pendek</label><input class="input" id="stPendek" name="namaPendek" value="' + esc(st.namaPendek) + '"></div>' +
              '<div class="field"><label for="stRuj">No. rujukan</label><input class="input" id="stRuj" name="noRujukan" value="' + esc(st.noRujukan) + '"></div>' +
            '</div>' +
            '<div class="field"><label for="stAlamat">Alamat</label><textarea class="textarea" id="stAlamat" name="alamat" style="min-height:70px">' + esc(st.alamat) + '</textarea></div>' +
            '<div class="field"><label for="stMatlamat">Matlamat utama</label><textarea class="textarea" id="stMatlamat" name="matlamat" style="min-height:70px">' + esc(st.matlamat) + '</textarea></div>' +
            '<div class="field-row">' +
              '<div class="field"><label for="stKategori">Kategori</label><input class="input" id="stKategori" name="kategori" value="' + esc(st.kategori) + '"></div>' +
              '<div class="field"><label for="stSesi">Sesi</label><input class="input" id="stSesi" name="sesi" value="' + esc(st.sesi) + '"></div>' +
            '</div>' +
            '<div class="form-actions"><button class="btn btn-primary" type="submit"><i class="bi bi-save"></i> Simpan Maklumat</button></div>' +
          '</form>' +
        '</div>' +

        '<div class="card card-pad">' +
          '<h3 style="font-size:.95rem;margin-bottom:.8rem">Tarikh Penting</h3>' +
          '<form data-form="dates">' +
            '<div class="field"><label for="stMesyuarat">Tarikh mesyuarat penubuhan</label><input class="input" id="stMesyuarat" name="tarikhMesyuarat" type="date" value="' + esc(st.tarikhMesyuarat) + '"></div>' +
            '<div class="field"><label for="stAkhir">Tarikh akhir serahan maklumat penaja</label><input class="input" id="stAkhir" name="tarikhAkhir" type="date" value="' + esc(st.tarikhAkhir) + '"></div>' +
            '<div class="field"><label for="stSasaran">Tarikh sasaran pendaftaran (JPPM/RoS)</label><input class="input" id="stSasaran" name="tarikhSasaran" type="date" value="' + esc(st.tarikhSasaran) + '"></div>' +
            '<div class="form-actions"><button class="btn btn-primary" type="submit"><i class="bi bi-calendar-check"></i> Simpan Tarikh</button></div>' +
          '</form>' +
          '<hr class="divider">' +
          '<h3 style="font-size:.95rem;margin-bottom:.5rem">Kop Surat &amp; Logo</h3>' +
          '<form data-form="kop">' +
            '<div class="field"><label for="stKop">Teks kop surat</label><textarea class="textarea" id="stKop" name="cop" style="min-height:90px">' + esc(st.cop) + '</textarea></div>' +
            '<div class="field"><label for="stLogo">Logo persatuan</label><input class="input" type="file" id="stLogo" accept="image/*"></div>' +
            '<div class="form-actions"><button class="btn btn-primary" type="submit"><i class="bi bi-save"></i> Simpan Kop</button></div>' +
          '</form>' +
        '</div>' +

        '<div class="card card-pad">' +
          '<h3 style="font-size:.95rem;margin-bottom:.8rem">Sandaran &amp; Data</h3>' +
          '<div class="setting-row">' +
            '<div class="sr-copy"><b>Eksport sandaran penuh</b><span>Muat turun semua data (JSON) termasuk dokumen dan profil.</span></div>' +
            '<button class="btn btn-sm btn-ghost" type="button" data-act="exportBackup"><i class="bi bi-download"></i> Eksport</button>' +
          '</div>' +
          '<div class="setting-row">' +
            '<div class="sr-copy"><b>Import sandaran</b><span>Pulihkan data daripada fail sandaran JSON.</span></div>' +
            '<button class="btn btn-sm btn-ghost" type="button" data-act="importBackup"><i class="bi bi-upload"></i> Import</button>' +
          '</div>' +
          '<div class="setting-row">' +
            '<div class="sr-copy"><b>Pasang aplikasi</b><span>Pasang e-Persatuan pada skrin utama telefon.</span></div>' +
            '<button class="btn btn-sm btn-ghost" type="button" data-act="installApp"><i class="bi bi-phone"></i> Pasang</button>' +
          '</div>' +
          '<div class="setting-row">' +
            '<div class="sr-copy"><b>Set semula data demo</b><span>Padam semua data pada peranti ini dan pulihkan data contoh.</span></div>' +
            '<button class="btn btn-sm btn-danger-ghost" type="button" data-act="resetDemo"><i class="bi bi-arrow-counterclockwise"></i> Set Semula</button>' +
          '</div>' +
        '</div>' +

        '<div class="card card-pad">' +
          '<h3 style="font-size:.95rem;margin-bottom:.8rem">Maklumat Sistem</h3>' +
          '<dl class="detail-list">' +
            '<div class="dl"><dt>Versi</dt><dd>e-Persatuan 3.0 (PWA)</dd></div>' +
            '<div class="dl"><dt>Penyimpanan</dt><dd>IndexedDB pada peranti ini</dd></div>' +
            '<div class="dl"><dt>Status Kelulusan</dt><dd>' + (st.statusKelulusan === 'lulus' ? statusChip('lengkap') : '<span class="chip chip-blue"><i class="bi bi-hourglass"></i>Belum diluluskan</span>') + '</dd></div>' +
            '<div class="dl"><dt>Pelayar</dt><dd>' + esc(navigator.userAgent.split(')')[0] + ')') + '</dd></div>' +
          '</dl>' +
          '<div class="lock-banner" style="margin-top:1rem"><i class="bi bi-info-circle"></i><div><b>Mod demo.</b> Data disimpan dalam pelayar peranti ini. Gunakan eksport/import sandaran untuk memindahkan data antara peranti.</div></div>' +
        '</div>' +
      '</div>';
  }

  MOUNTS.tetapan = function () {
    var logoInput = $('#stLogo');
    if (logoInput) {
      logoInput.addEventListener('change', async function () {
        var file = logoInput.files && logoInput.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast('Saiz logo melebihi 2MB.', 'warn'); return; }
        var data = await Util.compressImage(file, 400, 0.9);
        S.settings.logo = data;
        await Idb.put('settings', S.settings);
        renderShell();
        toast('Logo dikemas kini. Tekan Simpan Kop untuk menyimpan teks.', 'ok');
      });
    }
  };

  /* ============================================================
     TINDAKAN (ACTIONS)
     ============================================================ */
  var ACTIONS = {
    go: function (el) { navigate(el.dataset.route || 'dashboard'); },
    logout: function () { logout(); },
    authMode: function (el) { S.authMode = el.dataset.mode; showAuth(S.authMode); },
    closeModal: function () { closeModal(); },

    togglePw: function (el) {
      var input = document.getElementById(el.dataset.target);
      if (!input) return;
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      el.innerHTML = '<i class="bi ' + (show ? 'bi-eye-slash' : 'bi-eye') + '"></i>';
    },

    demoLogin: function (el) {
      var f = $('form[data-form="login"]');
      if (!f) return;
      f.id.value = el.dataset.email;
      f.pass.value = EP.DEMO_PASSWORD;
      f.pass.focus();
    },

    forgot: function () {
      openModal({
        title: 'Lupa kata laluan',
        size: 'sm',
        body: '<p style="font-size:.88rem;margin:0 0 .8rem">Untuk keselamatan, set semula kata laluan dilakukan oleh Setiausaha persatuan.</p>' +
          '<div class="lock-banner" style="margin:0"><i class="bi bi-envelope"></i><div>Hubungi Setiausaha dan minta <b>Set Semula Kata Laluan</b> dari halaman Pengguna. Kata laluan sementara akan diberikan kepada anda.</div></div>',
        foot: '<button class="btn btn-primary" type="button" data-act="closeModal">Faham</button>'
      });
    },

    changePassword: function () {
      openModal({
        title: 'Tukar Kata Laluan',
        size: 'sm',
        body: '<form data-form="changePassword">' +
          '<div class="field"><label for="cpNow">Kata laluan semasa</label><input class="input" id="cpNow" name="semasa" type="password" autocomplete="current-password" required></div>' +
          '<div class="field"><label for="cpNew">Kata laluan baharu</label><input class="input" id="cpNew" name="baru" type="password" autocomplete="new-password" placeholder="Sekurang-kurangnya 8 aksara" required></div>' +
          '<div class="field"><label for="cpNew2">Sahkan kata laluan baharu</label><input class="input" id="cpNew2" name="ulang" type="password" autocomplete="new-password" required></div>' +
          '<button class="btn btn-primary btn-block" type="submit"><i class="bi bi-key"></i> Simpan Kata Laluan</button>' +
        '</form>'
      });
    },

    moreNav: function () {
      var items = NAV.filter(function (n) { return can(n.perm); });
      openModal({
        title: 'Semua Menu',
        size: 'sm',
        body: '<div style="display:grid;gap:.35rem">' + items.map(function (n) {
          return '<a class="nav-item" style="color:var(--text);background:#F8FAFF;border:1px solid var(--border)" href="#/' + n.route + '" data-act="closeModal">' +
            '<i class="bi ' + n.icon + '" style="color:var(--blue)"></i><span>' + n.label + '</span></a>';
        }).join('') + '</div>'
      });
    },

    openSearch: function () {
      var items = NAV.filter(function (n) { return can(n.perm); }).map(function (n) {
        return { label: n.label, icon: n.icon, route: n.route };
      });
      if (can('uploadDocs')) items.push({ label: 'Muat naik dokumen', icon: 'bi-cloud-arrow-up', run: 'upload' });
      if (can('users')) items.push({ label: 'Tambah pengguna', icon: 'bi-person-plus', route: 'pengguna' });
      items.push({ label: 'Pasang aplikasi', icon: 'bi-phone', run: 'install' });
      items.push({ label: 'Log keluar', icon: 'bi-box-arrow-right', run: 'logout' });

      function row(it, i) {
        return '<button class="palette-item' + (i === 0 ? ' sel' : '') + '" type="button" data-act="paletteGo" data-route="' + (it.route || '') + '" data-run="' + (it.run || '') + '">' +
          '<i class="bi ' + it.icon + '"></i><span>' + it.label + '</span><kbd>↵</kbd>' +
        '</button>';
      }

      openModal({
        title: 'Cari &amp; arahan pantas',
        sub: 'Taip untuk menapis — Enter untuk pilih',
        size: 'sm',
        body: '<div class="palette-search"><i class="bi bi-search"></i><input id="paletteInput" placeholder="Cari halaman atau tindakan…" autocomplete="off" aria-label="Cari halaman"></div>' +
          '<div class="palette-list" id="paletteList">' + items.map(row).join('') + '</div>',
        onMount: function (root) {
          var input = $('#paletteInput', root);
          var list = $('#paletteList', root);
          var buttons = Array.prototype.slice.call(list.querySelectorAll('.palette-item'));
          function apply() {
            var q = String(input.value || '').toLowerCase();
            var first = null;
            buttons.forEach(function (b) {
              var ok = b.innerText.toLowerCase().indexOf(q) >= 0;
              b.hidden = !ok;
              b.classList.remove('sel');
              if (ok && !first) first = b;
            });
            if (first) first.classList.add('sel');
          }
          input.addEventListener('input', apply);
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
              var target = buttons.filter(function (b) { return !b.hidden; })[0];
              if (target) { e.preventDefault(); target.click(); }
            }
          });
          setTimeout(function () { input.focus(); }, 50);
        }
      });
    },

    paletteGo: function (el) {
      var route = el.dataset.route;
      var run = el.dataset.run;
      closeModal();
      if (run === 'logout') { logout(); return; }
      if (run === 'upload') { setTimeout(function () { openUploadModal(''); }, 90); return; }
      if (run === 'install') { setTimeout(function () { ACTIONS.installApp(); }, 90); return; }
      if (route) navigate(route);
    },

    showNotices: function () {
      var list = buildNotices();
      openModal({
        title: 'Pemberitahuan',
        sub: list.length + ' makluman sistem',
        body: '<div class="notices" style="padding:0">' + noticesHtml(list) + '</div>',
        foot: '<button class="btn btn-ghost" type="button" data-act="closeModal">Tutup</button>'
      });
    },

    calNav: function (el) {
      S.calOffset += Number(el.dataset.dir);
      renderRoute();
    },

    installApp: function () {
      if (S.installPrompt) {
        S.installPrompt.prompt();
        S.installPrompt.userChoice.then(function (res) {
          if (res.outcome === 'accepted') toast('Aplikasi dipasang pada peranti.', 'ok');
          S.installPrompt = null;
        });
        return;
      }
      var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      openModal({
        title: 'Pasang e-Persatuan',
        size: 'sm',
        body: '<p style="font-size:.88rem;margin:0 0 .7rem">Tambahkan e-Persatuan ke skrin utama untuk pengalaman seperti aplikasi.</p>' +
          '<div class="install-cards" style="grid-template-columns:1fr">' +
            '<div class="install-card" style="background:#F8FAFF;border-color:var(--border)"><i class="bi bi-android2" style="color:var(--blue)"></i><div><b>Android (Chrome)</b><span style="color:var(--muted)">Menu ⋮ → “Add to Home screen” atau “Install app”.</span></div></div>' +
            '<div class="install-card" style="background:#F8FAFF;border-color:var(--border)"><i class="bi bi-apple" style="color:var(--blue)"></i><div><b>iPhone (Safari)</b><span style="color:var(--muted)">Butang Kongsi → “Add to Home Screen”.</span></div></div>' +
            '<div class="install-card" style="background:#F8FAFF;border-color:var(--border)"><i class="bi bi-laptop" style="color:var(--blue)"></i><div><b>Komputer</b><span style="color:var(--muted)">' + (iOS ? 'Gunakan Safari.' : 'Ikon pasang di bar alamat pelayar.') + '</span></div></div>' +
          '</div>',
        foot: '<button class="btn btn-primary" type="button" data-act="closeModal">Selesai</button>'
      });
    },

    /* --- profil --- */
    uploadDoc: function (el) {
      openUploadModal(el.dataset.kat || '');
    },

    openReview: function (el) { navigate('review', el.dataset.id); },

    openDoc: function (el) { openDocById(el.dataset.id); },
    downloadDoc: function (el) { downloadDocById(el.dataset.id); },

    viewImage: function (el) {
      var user = userById(el.dataset.id);
      var p = user && profileOf(user.id);
      if (!p) return;
      var field = el.dataset.field;
      var src = p[field];
      if (!src) return;
      openModal({
        title: 'Dokumen Pengenalan',
        size: 'lg',
        body: '<img src="' + src + '" alt="Dokumen" style="width:100%;border-radius:10px;border:1px solid var(--border)">',
        foot: '<button class="btn btn-ghost" type="button" data-act="closeModal">Tutup</button>'
      });
    },

    openData: function (el) {
      var user = userById(el.dataset.id);
      var p = user && profileOf(user.id);
      if (!p) return;
      var src = p[el.dataset.field];
      if (src) openDataUrl(src, 'dokumen.pdf');
    },

    approveProfile: async function (el) {
      var user = userById(el.dataset.id);
      if (!user) return;
      var ok = await confirmDialog({
        title: 'Sahkan Profil',
        message: 'Sahkan profil <b>' + esc(user.nama) + '</b>? Profil akan dikunci dan tidak boleh disunting oleh AJK.',
        ok: 'Sahkan'
      });
      if (!ok) return;
      var p = profileOf(user.id) || ensureProfileObject(user);
      p.status = 'lengkap';
      p.tarikhSahkan = Util.nowISO();
      p.disahkanOleh = S.user.nama;
      p.catatan = '';
      p.updatedAt = Util.nowISO();
      await Idb.put('profiles', p);
      await addLog('sahkan', 'Profil ' + user.nama, 'Profil disahkan oleh ' + S.user.nama);
      await refresh();
      toast('Profil ' + user.nama + ' telah disahkan.', 'ok');
    },

    requestFix: function (el) {
      var user = userById(el.dataset.id);
      if (!user) return;
      openModal({
        title: 'Minta Pembetulan',
        sub: user.nama,
        size: 'sm',
        body: '<form data-form="requestFix" data-id="' + user.id + '">' +
          '<div class="field"><label for="fixNote">Catatan pembetulan <span class="req">*</span></label>' +
          '<textarea class="textarea" id="fixNote" name="catatan" placeholder="Nyatakan apa yang perlu dibetulkan…" required></textarea>' +
          '<span class="hint">Catatan ini akan dipaparkan kepada AJK.</span></div>' +
          '<button class="btn btn-danger btn-block" type="submit"><i class="bi bi-send"></i> Hantar Permintaan</button>' +
        '</form>'
      });
    },

    /* --- senarai semak --- */
    markCheck: async function (el) {
      var key = el.dataset.key;
      var item = EP.CHECK_ITEMS.filter(function (i) { return i.key === key; })[0];
      if (!item) return;
      var ok = await confirmDialog({
        title: 'Tanda Lengkap',
        message: 'Tandakan <b>' + item.nama + '</b> sebagai lengkap secara manual? Status automatik akan diatasi.',
        ok: 'Tanda Lengkap'
      });
      if (!ok) return;
      var rec = S.checklist.filter(function (c) { return c.key === key; })[0] || { key: key };
      rec.status = 'lengkap';
      rec.manual = true;
      rec.catatan = 'Ditandakan lengkap secara manual oleh ' + S.user.nama;
      rec.oleh = S.user.nama;
      rec.tarikh = Util.nowISO();
      await Idb.put('checklist', rec);
      await addLog('ubah', item.nama, 'Status ditanda lengkap secara manual');
      await refresh();
      toast('Status ' + item.nama + ' ditanda lengkap.', 'ok');
    },

    resetCheck: async function (el) {
      var key = el.dataset.key;
      var rec = S.checklist.filter(function (c) { return c.key === key; })[0];
      if (!rec) return;
      rec.manual = false;
      rec.catatan = '';
      await Idb.put('checklist', rec);
      await refresh();
      toast('Status kembali kepada pengiraan automatik.', 'info');
    },

    recompute: async function () {
      await refresh();
      toast('Status senarai semak dikira semula.', 'ok');
    },

    /* --- kewangan --- */
    addFinance: function (el) {
      var arah = el.dataset.arah || 'masuk';
      var today = Util.todayYmd();
      openModal({
        title: arah === 'keluar' ? 'Rekod Perbelanjaan' : 'Rekod Kutipan',
        size: 'sm',
        body: '<form data-form="finance" data-arah="' + arah + '">' +
          '<div class="field-row">' +
            '<div class="field"><label for="fnTarikh">Tarikh</label><input class="input" id="fnTarikh" name="tarikh" type="date" value="' + today + '" required></div>' +
            '<div class="field"><label for="fnJumlah">Jumlah (RM)</label><input class="input" id="fnJumlah" name="jumlah" inputmode="decimal" placeholder="0.00" required></div>' +
          '</div>' +
          '<div class="field"><label for="fnJenis">Jenis</label><select class="select" id="fnJenis" name="jenis">' +
            (arah === 'keluar'
              ? '<option>Perbelanjaan Awal</option><option>Lain-lain</option>'
              : '<option>Kutipan Yuran Penaja</option><option>Sumbangan Penaja</option><option>Lain-lain</option>') +
          '</select></div>' +
          '<div class="field"><label for="fnKet">Keterangan</label><input class="input" id="fnKet" name="keterangan" placeholder="cth. Yuran penaja — nama ahli" required></div>' +
          '<div class="field"><label for="fnRuj">Rujukan resit / fail</label><input class="input" id="fnRuj" name="rujukan" placeholder="cth. RCP-008"></div>' +
          '<button class="btn btn-primary btn-block" type="submit"><i class="bi bi-save"></i> Simpan Rekod</button>' +
        '</form>'
      });
    },

    deleteFinance: async function (el) {
      var rec = S.finance.filter(function (f) { return f.id === el.dataset.id; })[0];
      if (!rec) return;
      var ok = await confirmDialog({
        title: 'Padam Rekod',
        message: 'Padam rekod <b>' + esc(rec.keterangan) + '</b> (' + Util.fmtRM(rec.jumlah) + ')?',
        ok: 'Padam', danger: true
      });
      if (!ok) return;
      await Idb.del('finance', rec.id);
      await addLog('padam', rec.keterangan, 'Rekod kewangan dipadam');
      await refresh();
      toast('Rekod kewangan dipadam.', 'ok');
    },

    /* --- kelulusan --- */
    approveFinal: async function () {
      var c = completion();
      if (c.pct !== 100) { toast('Semua item mesti lengkap dahulu.', 'warn'); return; }
      var ok = await confirmDialog({
        title: 'Kelulusan Akhir',
        message: 'Berikan Kelulusan Akhir? Tindakan ini membolehkan laporan rasmi dijana dan direkodkan dalam log.',
        ok: 'Luluskan'
      });
      if (!ok) return;
      S.settings.statusKelulusan = 'lulus';
      S.settings.tarikhLulus = Util.nowISO();
      S.settings.olehLulus = S.user.nama;
      await Idb.put('settings', S.settings);
      await addLog('kelulusan', 'Penyerahan Persatuan', 'Kelulusan Akhir diberikan oleh ' + S.user.nama);
      await refresh();
      toast('Kelulusan Akhir telah diberikan.', 'ok');
    },

    /* --- laporan & eksport --- */
    printReport: function () {
      if (S.settings.statusKelulusan !== 'lulus') { toast('Laporan rasmi memerlukan Kelulusan Akhir.', 'warn'); return; }
      var host = $('#print-root');
      host.innerHTML = reportHtml();
      addLog('cetak', 'Laporan Pendaftaran', 'Laporan rasmi dijana untuk cetakan');
      setTimeout(function () { window.print(); }, 120);
    },

    exportAjk: function () {
      var rows = [['Nama', 'E-mel', 'No. Matrik', 'Peranan', 'Jawatan', 'No. KP', 'Telefon', 'Pekerjaan', 'Majikan', 'Status Profil']];
      activeUsers().forEach(function (u) {
        var p = profileOf(u.id) || ensureProfileObject(u);
        rows.push([p.namaPenuh || u.nama, u.email, u.matrik || '', roleLabel(u.peranan), p.jawatan || '', p.ic || '', p.telefon || '', p.pekerjaan || '', p.majikan || '', (EP.STATUS[p.status] || {}).label || p.status]);
      });
      Util.download('senarai-ajk-' + Util.todayYmd() + '.csv', '\uFEFF' + Util.csv(rows), 'text/csv;charset=utf-8');
      toast('CSV senarai AJK dimuat turun.', 'ok');
    },

    exportFinance: function () {
      var rows = [['Tarikh', 'Jenis', 'Arah', 'Keterangan', 'Jumlah (RM)', 'Rujukan', 'Direkod Oleh']];
      S.finance.slice().sort(function (a, b) { return String(a.tarikh).localeCompare(String(b.tarikh)); }).forEach(function (f) {
        rows.push([f.tarikh, f.jenis, f.arah, f.keterangan, Number(f.jumlah).toFixed(2), f.rujukan || '', f.olehNama || '']);
      });
      Util.download('kewangan-' + Util.todayYmd() + '.csv', '\uFEFF' + Util.csv(rows), 'text/csv;charset=utf-8');
      toast('CSV kewangan dimuat turun.', 'ok');
    },

    exportDocs: function () {
      var rows = [['Nama Fail', 'Kategori', 'Format', 'Saiz (KB)', 'Versi', 'Aktif', 'Dimuat Naik Oleh', 'Tarikh']];
      S.docs.forEach(function (d) {
        rows.push([d.nama, d.kategori, d.format, d.saiz, d.versi, d.aktif ? 'Ya' : 'Tidak', d.olehNama || '', Util.fmtDate(d.tarikh)]);
      });
      Util.download('dokumen-' + Util.todayYmd() + '.csv', '\uFEFF' + Util.csv(rows), 'text/csv;charset=utf-8');
      toast('CSV dokumen dimuat turun.', 'ok');
    },

    /* --- pengguna --- */
    addUser: function () {
      openModal({
        title: 'Tambah Pengguna',
        sub: 'Kata laluan sementara akan dijana secara automatik.',
        body: '<form data-form="addUser">' +
          '<div class="field"><label for="auNama">Nama penuh</label><input class="input" id="auNama" name="nama" required></div>' +
          '<div class="field"><label for="auEmail">E-mel</label><input class="input" id="auEmail" name="email" type="email" required></div>' +
          '<div class="field-row">' +
            '<div class="field"><label for="auMatrik">No. Matrik</label><input class="input" id="auMatrik" name="matrik"></div>' +
            '<div class="field"><label for="auTel">Telefon</label><input class="input" id="auTel" name="telefon"></div>' +
          '</div>' +
          '<div class="field"><label for="auRole">Peranan</label><select class="select" id="auRole" name="peranan">' +
            Object.keys(EP.ROLES).map(function (r) { return '<option value="' + r + '">' + EP.ROLES[r].label + '</option>'; }).join('') +
          '</select></div>' +
          '<button class="btn btn-primary btn-block" type="submit"><i class="bi bi-person-plus"></i> Tambah &amp; Jana Kata Laluan</button>' +
        '</form>'
      });
    },

    editUser: function (el) {
      var u = userById(el.dataset.id);
      if (!u) return;
      openModal({
        title: 'Tukar Peranan',
        sub: u.nama,
        size: 'sm',
        body: '<form data-form="editRole" data-id="' + u.id + '">' +
          '<div class="field"><label for="erRole">Peranan</label><select class="select" id="erRole" name="peranan">' +
            Object.keys(EP.ROLES).map(function (r) {
              return '<option value="' + r + '"' + (u.peranan === r ? ' selected' : '') + '>' + EP.ROLES[r].label + '</option>';
            }).join('') +
          '</select></div>' +
          '<div class="field"><label for="erNama">Nama</label><input class="input" id="erNama" name="nama" value="' + esc(u.nama) + '"></div>' +
          '<div class="field"><label for="erTel">Telefon</label><input class="input" id="erTel" name="telefon" value="' + esc(u.telefon || '') + '"></div>' +
          '<button class="btn btn-primary btn-block" type="submit">Simpan Perubahan</button>' +
        '</form>'
      });
    },

    resetPassword: async function (el) {
      var u = userById(el.dataset.id);
      if (!u) return;
      var ok = await confirmDialog({
        title: 'Set Semula Kata Laluan',
        message: 'Jana kata laluan sementara baharu untuk <b>' + esc(u.nama) + '</b>?',
        ok: 'Jana'
      });
      if (!ok) return;
      var temp = Util.randomPassword(10);
      u.salt = Util.uid('s');
      u.hash = await Util.hashPassword(temp, u.salt);
      u.perluTukar = true;
      await Idb.put('users', u);
      await addLog('reset', 'Akaun ' + u.nama, 'Kata laluan ditetapkan semula oleh Setiausaha');
      openModal({
        title: 'Kata Laluan Sementara',
        size: 'sm',
        body: '<p style="font-size:.86rem;margin:0 0 .8rem">Berikan kata laluan ini kepada <b>' + esc(u.nama) + '</b>. Ia dipaparkan sekali sahaja.</p>' +
          '<div style="padding:1rem;background:var(--gold-50);border:1px dashed var(--gold);border-radius:10px;text-align:center;font-family:monospace;font-size:1.2rem;letter-spacing:.1em;font-weight:700">' + esc(temp) + '</div>',
        foot: '<button class="btn btn-ghost" type="button" data-act="copyText" data-text="' + esc(temp) + '"><i class="bi bi-copy"></i> Salin</button>' +
              '<button class="btn btn-primary" type="button" data-act="closeModal">Selesai</button>'
      });
    },

    toggleUser: async function (el) {
      var u = userById(el.dataset.id);
      if (!u || u.id === S.user.id) return;
      var off = u.status === 'aktif';
      var ok = await confirmDialog({
        title: off ? 'Nyahaktifkan Pengguna' : 'Aktifkan Pengguna',
        message: (off ? 'Nyahaktifkan' : 'Aktifkan') + ' akaun <b>' + esc(u.nama) + '</b>?',
        ok: off ? 'Nyahaktif' : 'Aktifkan', danger: off
      });
      if (!ok) return;
      u.status = off ? 'nyahaktif' : 'aktif';
      await Idb.put('users', u);
      await addLog('ubah', 'Akaun ' + u.nama, off ? 'Akaun dinyahaktifkan' : 'Akaun diaktifkan');
      await refresh();
      toast('Status pengguna dikemas kini.', 'ok');
    },

    approveUser: async function (el) {
      var u = userById(el.dataset.id);
      if (!u) return;
      u.status = 'aktif';
      await Idb.put('users', u);
      await addLog('sahkan', 'Akaun ' + u.nama, 'Pendaftaran ahli diluluskan');
      await refresh();
      toast('Akaun ' + u.nama + ' diluluskan.', 'ok');
    },

    rejectUser: async function (el) {
      var u = userById(el.dataset.id);
      if (!u) return;
      var ok = await confirmDialog({
        title: 'Tolak Pendaftaran', message: 'Tolak dan padam pendaftaran <b>' + esc(u.nama) + '</b>?',
        ok: 'Tolak', danger: true
      });
      if (!ok) return;
      await Idb.del('users', u.id);
      await Idb.del('profiles', u.id).catch(function () {});
      await addLog('padam', 'Pendaftaran ' + u.nama, 'Pendaftaran ahli ditolak');
      await refresh();
      toast('Pendaftaran ditolak.', 'ok');
    },

    copyText: function (el) {
      var text = el.dataset.text || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast('Disalin ke papan klip.', 'ok'); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); toast('Disalin ke papan klip.', 'ok'); } catch (e) {}
        ta.remove();
      }
    },

    /* --- tetapan --- */
    exportBackup: async function () {
      var data = {
        app: 'e-Persatuan', version: 2, exportedAt: Util.nowISO(),
        users: await Idb.all('users'),
        profiles: await Idb.all('profiles'),
        docs: await Idb.all('docs'),
        finance: await Idb.all('finance'),
        logs: await Idb.all('logs'),
        checklist: await Idb.all('checklist'),
        settings: await Idb.get('settings', 'app')
      };
      Util.download('sandaran-ePersatuan-' + Util.todayYmd() + '.json', JSON.stringify(data, null, 2), 'application/json');
      toast('Sandaran penuh dimuat turun.', 'ok');
    },

    importBackup: function () {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = function () {
        var file = input.files && input.files[0];
        if (!file) return;
        var fr = new FileReader();
        fr.onload = async function () {
          try {
            var data = JSON.parse(fr.result);
            if (!data || data.app !== 'e-Persatuan') throw new Error('Fail bukan sandaran e-Persatuan.');
            var ok = await confirmDialog({
              title: 'Import Sandaran',
              message: 'Import akan <b>menggantikan semua data</b> pada peranti ini. Teruskan?',
              ok: 'Import', danger: true
            });
            if (!ok) return;
            var stores = ['users', 'profiles', 'docs', 'finance', 'logs', 'checklist'];
            for (var i = 0; i < stores.length; i++) {
              await Idb.clear(stores[i]);
              if (data[stores[i]]) await Idb.putMany(stores[i], data[stores[i]]);
            }
            if (data.settings) await Idb.put('settings', data.settings);
            await Idb.put('meta', { key: 'seeded', value: true, at: Util.nowISO() });
            await reloadData();
            var current = userById(S.user.id);
            if (!current) { logout(); return; }
            S.user = current;
            await refresh();
            toast('Sandaran berjaya diimport.', 'ok');
          } catch (e) {
            toast('Gagal import: ' + e.message, 'err');
          }
        };
        fr.readAsText(file);
      };
      input.click();
    },

    resetDemo: async function () {
      var ok = await confirmDialog({
        title: 'Set Semula Data Demo',
        message: 'Semua data pada peranti ini akan dipadam dan digantikan dengan data contoh. Tindakan ini tidak boleh dibatalkan.',
        ok: 'Set Semula', danger: true
      });
      if (!ok) return;
      var stores = ['users', 'profiles', 'docs', 'finance', 'logs', 'checklist', 'settings', 'meta'];
      for (var i = 0; i < stores.length; i++) await Idb.clear(stores[i]);
      await EP.seedAll();
      await reloadData();
      clearSession();
      S.user = null;
      showAuth('login');
      toast('Data demo telah dipulihkan.', 'ok');
    }
  };

  /* ============================================================
     BORANG
     ============================================================ */
  var FORMS = {
    login: function (form) { doLogin(form); },

    register: function (form) { doRegister(form); },

    profile: async function (form) {
      var p = getMyProfile() || ensureProfileObject(S.user);
      if (p.status === 'lengkap') { toast('Profil telah dikunci.', 'warn'); return; }
      var nama = String(form.namaPenuh.value || '').trim();
      var ic = String(form.ic.value || '').replace(/\D/g, '');
      var jawatan = String(form.jawatan.value || '');
      var alamat = String(form.alamat.value || '').trim();
      var telefon = String(form.telefon.value || '').trim();
      var email = String(form.email.value || '').trim().toLowerCase();
      var pekerjaan = String(form.pekerjaan.value || '').trim();
      var majikan = String(form.majikan.value || '').trim();

      if (nama.length < 3) { toast('Nama penuh diperlukan.', 'warn'); form.namaPenuh.focus(); return; }
      if (ic.length !== 12) { toast('No. Kad Pengenalan mesti 12 digit.', 'warn'); form.ic.focus(); return; }
      if (alamat.length < 8) { toast('Alamat kediaman diperlukan.', 'warn'); form.alamat.focus(); return; }
      if (telefon.length < 9) { toast('No. telefon tidak sah.', 'warn'); form.telefon.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { toast('E-mel tidak sah.', 'warn'); form.email.focus(); return; }
      if (!pekerjaan) { toast('Pekerjaan diperlukan.', 'warn'); form.pekerjaan.focus(); return; }
      if (!S.uploadDraft.icDepan || !S.uploadDraft.icBelakang) {
        var ok = await confirmDialog({
          title: 'Dokumen belum lengkap',
          message: 'IC depan dan belakang belum dimuat naik. Simpan profil tanpa dokumen?',
          ok: 'Simpan juga'
        });
        if (!ok) return;
      }

      Object.assign(p, {
        namaPenuh: nama, ic: ic, jawatan: jawatan, alamat: alamat, telefon: telefon,
        email: email, pekerjaan: pekerjaan, majikan: majikan,
        icDepan: S.uploadDraft.icDepan, icBelakang: S.uploadDraft.icBelakang, pasport: S.uploadDraft.pasport,
        status: 'menunggu', tarikhHantar: Util.nowISO(), updatedAt: Util.nowISO()
      });
      p.catatan = '';
      await Idb.put('profiles', p);
      await addLog('ubah', 'Profil ' + nama, 'Profil dihantar untuk semakan');
      await reloadData();
      await refresh();
      toast('Profil dihantar untuk pengesahan Setiausaha.', 'ok');
    },

    changePassword: async function (form) {
      var semasa = String(form.semasa.value || '');
      var baru = String(form.baru.value || '');
      var ulang = String(form.ulang.value || '');
      if (baru.length < 8) { toast('Kata laluan baharu mesti sekurang-kurangnya 8 aksara.', 'warn'); return; }
      if (baru !== ulang) { toast('Kata laluan baharu tidak sepadan.', 'warn'); return; }
      var hash = await Util.hashPassword(semasa, S.user.salt);
      if (hash !== S.user.hash) { toast('Kata laluan semasa tidak betul.', 'err'); return; }
      S.user.salt = Util.uid('s');
      S.user.hash = await Util.hashPassword(baru, S.user.salt);
      S.user.perluTukar = false;
      await Idb.put('users', S.user);
      await addLog('ubah', 'Kata Laluan', 'Kata laluan ditukar oleh pengguna');
      closeModal();
      toast('Kata laluan berjaya ditukar.', 'ok');
    },

    requestFix: async function (form) {
      var id = form.dataset.id;
      var user = userById(id);
      var p = profileOf(id);
      if (!user || !p) return;
      var catatan = String(form.catatan.value || '').trim();
      if (catatan.length < 5) { toast('Sila masukkan catatan pembetulan.', 'warn'); return; }
      p.status = 'pembetulan';
      p.catatan = catatan;
      p.updatedAt = Util.nowISO();
      await Idb.put('profiles', p);
      await addLog('pembetulan', 'Profil ' + user.nama, catatan);
      closeModal();
      await refresh();
      toast('Permintaan pembetulan dihantar kepada AJK.', 'ok');
    },

    finance: async function (form) {
      var arah = form.dataset.arah || 'masuk';
      var jumlah = Number(String(form.jumlah.value || '').replace(',', '.'));
      if (!jumlah || jumlah <= 0) { toast('Jumlah tidak sah.', 'warn'); return; }
      var tarikh = form.tarikh.value || Util.todayYmd();
      var rec = {
        id: Util.uid('f'), tarikh: tarikh, jenis: form.jenis.value,
        arah: arah, keterangan: String(form.keterangan.value || '').trim(),
        jumlah: jumlah, rujukan: String(form.rujukan.value || '').trim(),
        olehId: S.user.id, olehNama: S.user.nama, kemaskini: Util.nowISO()
      };
      if (!rec.keterangan) { toast('Keterangan diperlukan.', 'warn'); return; }
      await Idb.put('finance', rec);
      await addLog(arah === 'keluar' ? 'tambah' : 'tambah', 'Kewangan', (arah === 'keluar' ? 'Perbelanjaan' : 'Kutipan') + ' ' + Util.fmtRM(jumlah) + ' direkodkan');
      closeModal();
      await refresh();
      toast('Rekod kewangan disimpan.', 'ok');
    },

    addUser: async function (form) {
      var nama = String(form.nama.value || '').trim();
      var email = String(form.email.value || '').trim().toLowerCase();
      var matrik = String(form.matrik.value || '').trim().toUpperCase();
      var telefon = String(form.telefon.value || '').trim();
      var peranan = form.peranan.value;
      if (nama.length < 3) { toast('Nama diperlukan.', 'warn'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { toast('E-mel tidak sah.', 'warn'); return; }
      var dupe = S.users.filter(function (u) {
        return String(u.email).toLowerCase() === email || (matrik && String(u.matrik || '').toUpperCase() === matrik);
      })[0];
      if (dupe) { toast('E-mel atau No. Matrik sudah wujud.', 'warn'); return; }

      var temp = Util.randomPassword(10);
      var salt = Util.uid('s');
      var hash = await Util.hashPassword(temp, salt);
      var user = {
        id: Util.uid('u'), nama: nama, email: email, matrik: matrik, peranan: peranan,
        jawatan: roleLabel(peranan), telefon: telefon, status: 'aktif',
        salt: salt, hash: hash, createdAt: Util.nowISO(), lastLogin: '', perluTukar: true
      };
      await Idb.put('users', user);
      await Idb.put('profiles', ensureProfileObject(user));
      await addLog('tambah', 'Akaun ' + nama, 'Pengguna baharu ditambah sebagai ' + roleLabel(peranan));
      await reloadData();
      openModal({
        title: 'Pengguna Ditambah',
        size: 'sm',
        body: '<p style="font-size:.86rem;margin:0 0 .8rem"><b>' + esc(nama) + '</b> telah ditambah. Berikan kata laluan sementara ini — dipaparkan sekali sahaja.</p>' +
          '<div style="padding:1rem;background:var(--gold-50);border:1px dashed var(--gold);border-radius:10px;text-align:center;font-family:monospace;font-size:1.2rem;letter-spacing:.1em;font-weight:700">' + esc(temp) + '</div>' +
          '<p class="muted small" style="margin:.7rem 0 0">E-mel: ' + esc(email) + '</p>',
        foot: '<button class="btn btn-ghost" type="button" data-act="copyText" data-text="' + esc(temp) + '"><i class="bi bi-copy"></i> Salin</button>' +
              '<button class="btn btn-primary" type="button" data-act="closeModal">Selesai</button>'
      });
      renderShell();
      renderRoute();
    },

    editRole: async function (form) {
      var u = userById(form.dataset.id);
      if (!u) return;
      var newRole = form.peranan.value;
      if (u.peranan === 'setiausaha' && newRole !== 'setiausaha') {
        var su = S.users.filter(function (x) { return x.peranan === 'setiausaha' && x.status === 'aktif'; });
        if (su.length <= 1) { toast('Mesti ada sekurang-kurangnya seorang Setiausaha.', 'warn'); return; }
      }
      u.peranan = newRole;
      u.nama = String(form.nama.value || u.nama).trim();
      u.telefon = String(form.telefon.value || '').trim();
      await Idb.put('users', u);
      var p = profileOf(u.id);
      if (p) { p.jawatan = roleLabel(newRole); await Idb.put('profiles', p); }
      await addLog('ubah', 'Akaun ' + u.nama, 'Peranan ditukar kepada ' + roleLabel(newRole));
      closeModal();
      await reloadData();
      S.user = userById(S.user.id) || S.user;
      await refresh();
      toast('Peranan dikemas kini.', 'ok');
    },

    settings: async function (form) {
      S.settings.namaRasmi = form.namaRasmi.value;
      S.settings.namaPendek = form.namaPendek.value;
      S.settings.noRujukan = form.noRujukan.value;
      S.settings.alamat = form.alamat.value;
      S.settings.matlamat = form.matlamat.value;
      S.settings.kategori = form.kategori.value;
      S.settings.sesi = form.sesi.value;
      await Idb.put('settings', S.settings);
      await addLog('ubah', 'Tetapan', 'Maklumat persatuan dikemas kini');
      await refresh();
      toast('Maklumat persatuan disimpan.', 'ok');
    },

    dates: async function (form) {
      S.settings.tarikhMesyuarat = form.tarikhMesyuarat.value;
      S.settings.tarikhAkhir = form.tarikhAkhir.value;
      S.settings.tarikhSasaran = form.tarikhSasaran.value;
      await Idb.put('settings', S.settings);
      await addLog('ubah', 'Tetapan', 'Tarikh penting dikemas kini');
      await refresh();
      toast('Tarikh penting disimpan.', 'ok');
    },

    kop: async function (form) {
      S.settings.cop = form.cop.value;
      await Idb.put('settings', S.settings);
      await refresh();
      toast('Kop surat disimpan.', 'ok');
    }
  };

  /* ============================================================
     MUAT NAIK DOKUMEN
     ============================================================ */
  function openUploadModal(preKat) {
    var cats = allowedCats();
    if (!cats.length) { toast('Anda tiada kebenaran memuat naik dokumen.', 'warn'); return; }
    var kat = preKat && cats.indexOf(preKat) >= 0 ? preKat : cats[0];
    S.docFile = null;
    openModal({
      title: 'Muat Naik Dokumen',
      sub: 'Format PDF, DOCX, JPG atau PNG • maksimum 5MB',
      body: '<form data-form="docUpload">' +
        '<div class="field"><label for="upKat">Kategori</label><select class="select" id="upKat" name="kategori">' +
          cats.map(function (c) { return '<option' + (c === kat ? ' selected' : '') + '>' + c + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label for="upNama">Nama dokumen</label><input class="input" id="upNama" name="nama" placeholder="cth. Minit Mesyuarat Penubuhan.pdf"></div>' +
        '<div class="field"><label>Fail</label>' +
          '<div class="dropzone" id="upZone"><i class="bi bi-cloud-arrow-up"></i><b>Pilih fail atau seret ke sini</b><span>PDF, DOCX, JPG, PNG — maks 5MB</span>' +
            '<input type="file" id="upFile" aria-label="Pilih fail dokumen" accept=".pdf,.docx,.jpg,.jpeg,.png" style="position:absolute;inset:0;opacity:0;cursor:pointer">' +
          '</div>' +
          '<p class="hint" id="upFileInfo">Tiada fail dipilih.</p>' +
        '</div>' +
        '<div class="field"><label for="upCatatan">Catatan (pilihan)</label><input class="input" id="upCatatan" name="catatan" placeholder="cth. Versi yang ditandatangani"></div>' +
        '<button class="btn btn-primary btn-block" type="submit"><i class="bi bi-cloud-arrow-up"></i> Muat Naik</button>' +
      '</form>',
      onMount: function (root) {
        var input = $('#upFile', root);
        var zone = $('#upZone', root);
        var info = $('#upFileInfo', root);
        var nameInput = $('#upNama', root);
        input.addEventListener('change', function () {
          var f = input.files && input.files[0];
          S.docFile = f || null;
          if (f) {
            info.innerHTML = '<b>' + esc(f.name) + '</b> • ' + Util.fmtSize(f.size / 1024);
            zone.style.borderColor = 'var(--green)';
            zone.style.background = 'var(--green-50)';
            if (!nameInput.value) nameInput.value = f.name;
          }
        });
        ['dragover', 'dragenter'].forEach(function (ev) {
          zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('drag'); });
        });
        ['dragleave', 'drop'].forEach(function (ev) {
          zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('drag'); });
        });
        zone.addEventListener('drop', function (e) {
          var f = e.dataTransfer.files && e.dataTransfer.files[0];
          if (f) {
            S.docFile = f;
            info.innerHTML = '<b>' + esc(f.name) + '</b> • ' + Util.fmtSize(f.size / 1024);
            zone.style.borderColor = 'var(--green)';
            zone.style.background = 'var(--green-50)';
            if (!nameInput.value) nameInput.value = f.name;
          }
        });
      }
    });
  }

  async function doUploadDoc(form) {
    var file = S.docFile;
    if (!file) { toast('Sila pilih fail terlebih dahulu.', 'warn'); return; }
    if (file.size > 5 * 1024 * 1024) { toast('Fail melebihi 5MB.', 'warn'); return; }
    var ext = (file.name.split('.').pop() || '').toUpperCase();
    if (['PDF', 'DOCX', 'JPG', 'JPEG', 'PNG'].indexOf(ext) < 0) { toast('Format fail tidak sah.', 'warn'); return; }
    var nama = String(form.nama.value || '').trim() || file.name;
    var kategori = form.kategori.value;

    var dataUrl = await Util.readFileAsDataURL(file);
    if (/^image\//.test(file.type)) {
      dataUrl = await Util.compressImage(file, 1600, 0.85);
    }
    var same = S.docs.filter(function (d) { return d.kategori === kategori && d.nama === nama; });
    var versi = 1;
    if (same.length) {
      versi = Math.max.apply(null, same.map(function (d) { return d.versi || 1; })) + 1;
      for (var i = 0; i < same.length; i++) {
        if (same[i].aktif) { same[i].aktif = false; await Idb.put('docs', same[i]); }
      }
    }
    var doc = {
      id: Util.uid('d'), kategori: kategori, nama: nama,
      format: ext === 'JPEG' ? 'JPG' : ext,
      saiz: Math.max(1, Math.round(file.size / 1024)),
      versi: versi, aktif: true,
      olehId: S.user.id, olehNama: S.user.nama,
      tarikh: Util.nowISO(), catatan: String(form.catatan.value || '').trim(),
      dataUrl: dataUrl
    };
    await Idb.put('docs', doc);
    await addLog('muatnaik', nama, 'Muat naik dokumen ' + kategori + ' (versi ' + versi + ')');
    S.docFile = null;
    closeModal();
    await refresh();
    toast('Dokumen berjaya dimuat naik.', 'ok');
  }

  function openDocById(id) {
    var d = S.docs.filter(function (x) { return x.id === id; })[0];
    if (!d || !d.dataUrl) { toast('Fail tidak tersedia.', 'warn'); return; }
    openDataUrl(d.dataUrl, d.nama);
  }

  function downloadDocById(id) {
    var d = S.docs.filter(function (x) { return x.id === id; })[0];
    if (!d || !d.dataUrl) { toast('Fail tidak tersedia.', 'warn'); return; }
    dataUrlToBlob(d.dataUrl).then(function (blob) {
      Util.download(d.nama, blob);
    });
  }

  function dataUrlToBlob(dataUrl) {
    return fetch(dataUrl).then(function (r) { return r.blob(); });
  }

  function openDataUrl(dataUrl, filename) {
    dataUrlToBlob(dataUrl).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var w = window.open(url, '_blank');
      if (!w) {
        var a = document.createElement('a');
        a.href = url; a.download = filename || 'dokumen';
        document.body.appendChild(a); a.click(); a.remove();
        toast('Popup disekat — fail dimuat turun.', 'warn');
      }
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    }).catch(function () { toast('Gagal membuka fail.', 'err'); });
  }

  /* ============================================================
     MUAT NAIK IMEJ PROFIL
     ============================================================ */
  async function handleProfileUpload(input) {
    var field = input.dataset.upload;
    var file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Fail melebihi 5MB.', 'warn'); input.value = ''; return; }
    var isPdf = file.type === 'application/pdf';
    if (isPdf && field === 'pasport') { toast('Gambar pasport mesti imej.', 'warn'); input.value = ''; return; }
    var data;
    if (isPdf) data = await Util.readFileAsDataURL(file);
    else data = await Util.compressImage(file, 1400, 0.82);
    S.uploadDraft[field] = data;

    var tile = input.closest('.upload');
    if (tile) {
      tile.classList.add('has-file');
      var icon = tile.querySelector('i.bi');
      if (icon) icon.remove();
      var thumbs = tile.querySelectorAll('.thumb-label');
      if (!thumbs.length) {
        var span = document.createElement('span');
        span.className = 'thumb-label';
        span.innerHTML = '<i class="bi bi-check2"></i> Dimuat naik';
        tile.appendChild(span);
      }
      if (!isPdf) {
        var old = tile.querySelector('img.thumb');
        if (old) old.remove();
        var img = document.createElement('img');
        img.className = 'thumb'; img.src = data; img.alt = 'Pratonton';
        tile.insertBefore(img, tile.firstChild);
      }
      var hint = tile.querySelector('span:not(.thumb-label)');
      if (hint) hint.textContent = 'Klik untuk ganti';
    }
    toast('Dokumen sedia disimpan.', 'ok');
  }

  /* ============================================================
     EVENT GLOBAL
     ============================================================ */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var name = el.getAttribute('data-act');
    if (ACTIONS[name]) {
      e.preventDefault();
      try { ACTIONS[name](el, e); }
      catch (err) { console.error(err); toast('Ralat: ' + err.message, 'err'); }
    }
  });

  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    var name = form.getAttribute('data-form');
    if (name === 'docUpload') { doUploadDoc(form).catch(function (err) { toast(err.message, 'err'); }); return; }
    if (FORMS[name]) {
      Promise.resolve(FORMS[name](form, e)).catch(function (err) {
        console.error(err);
        toast('Ralat: ' + err.message, 'err');
      });
    }
  });

  document.addEventListener('change', function (e) {
    var input = e.target;
    if (input.matches('[data-upload]')) handleProfileUpload(input);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
    if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k') {
      if (!S.user) return;
      e.preventDefault();
      if ($('#modal-root') && $('#modal-root').innerHTML) closeModal();
      ACTIONS.openSearch();
    }
  });

  window.addEventListener('hashchange', function () {
    if (S.user) renderRoute();
  });

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    S.installPrompt = e;
  });

  /* ============================================================
     INIT
     ============================================================ */
  async function init() {
    try {
      await Idb.ready();
      await EP.seedIfEmpty();
      await reloadData();
    } catch (err) {
      $('#splash').innerHTML = '<div class="splash-inner"><b>Ralat sistem</b><p style="max-width:32ch;font-size:.85rem;color:#C9D3F2">' +
        esc(err.message) + '<br><br>Jika menggunakan mod fail, sila jalankan melalui pelayan web (http/https).</p></div>';
      console.error(err);
      return;
    }

    if (navigator.storage && navigator.storage.persist) {
      try { navigator.storage.persist(); } catch (e) {}
    }

    var sess = loadSession();
    var user = sess ? userById(sess.userId) : null;
    if (user && user.status === 'aktif') {
      S.user = user;
      await addLog('logmasuk', 'Sesi', 'Sesi dipulihkan');
      await reloadData();
      S.user = userById(user.id) || user;
      $('#splash').hidden = true;
      enterApp();
      return;
    }

    clearSession();
    $('#splash').hidden = true;
    showAuth('login');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
