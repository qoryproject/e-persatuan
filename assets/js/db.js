/* ============================================================
   e-Persatuan — Lapisan data (IndexedDB) & utiliti
   ============================================================ */
(function (global) {
  'use strict';

  var DB_NAME = 'epersatuan-db';
  var DB_VER = 1;

  // keyPath & autoIncrement bagi setiap store
  var STORES = {
    users:     { keyPath: 'id' },
    profiles:  { keyPath: 'userId' },
    docs:      { keyPath: 'id' },
    finance:   { keyPath: 'id' },
    logs:      { keyPath: 'id', autoIncrement: true },
    checklist: { keyPath: 'key' },
    settings:  { keyPath: 'key' },
    meta:      { keyPath: 'key' }
  };

  var _db = null;
  var _openPromise = null;

  function openDB() {
    if (_openPromise) return _openPromise;
    _openPromise = new Promise(function (resolve, reject) {
      if (!('indexedDB' in global)) {
        reject(new Error('Pelayar ini tidak menyokong IndexedDB.'));
        return;
      }
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        Object.keys(STORES).forEach(function (name) {
          var cfg = STORES[name];
          if (!db.objectStoreNames.contains(name)) {
            var os = db.createObjectStore(name, {
              keyPath: cfg.keyPath,
              autoIncrement: !!cfg.autoIncrement
            });
            if (name === 'logs') os.createIndex('ts', 'ts', { unique: false });
            if (name === 'profiles') os.createIndex('status', 'status', { unique: false });
            if (name === 'docs') os.createIndex('kategori', 'kategori', { unique: false });
            if (name === 'finance') os.createIndex('tarikh', 'tarikh', { unique: false });
          }
        });
      };
      req.onsuccess = function () {
        _db = req.result;
        _db.onversionchange = function () { try { _db.close(); } catch (e) {} };
        resolve(_db);
      };
      req.onerror = function () { reject(req.error || new Error('Gagal membuka pangkalan data.')); };
      req.onblocked = function () { reject(new Error('Pangkalan data sedang digunakan dalam tab lain.')); };
    });
    return _openPromise;
  }

  function tx(store, mode, fn) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, mode);
        var os = t.objectStore(store);
        var out = fn(os);
        t.oncomplete = function () { resolve(out && out.__req ? out.__req.result : out); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error('Transaksi dibatalkan.')); };
      });
    });
  }

  function wrap(req) { return { __req: req }; }

  var Idb = {
    ready: openDB,

    all: function (store) {
      return openDB().then(function (db) {
        return new Promise(function (resolve, reject) {
          var t = db.transaction(store, 'readonly');
          var req = t.objectStore(store).getAll();
          req.onsuccess = function () { resolve(req.result || []); };
          req.onerror = function () { reject(req.error); };
        });
      });
    },

    get: function (store, key) {
      return openDB().then(function (db) {
        return new Promise(function (resolve, reject) {
          var t = db.transaction(store, 'readonly');
          var req = t.objectStore(store).get(key);
          req.onsuccess = function () { resolve(req.result || null); };
          req.onerror = function () { reject(req.error); };
        });
      });
    },

    put: function (store, value) {
      return tx(store, 'readwrite', function (os) { return wrap(os.put(value)); }).then(function (key) {
        if (value && typeof value === 'object' && value.id === undefined && key !== undefined) value.id = key;
        return key;
      });
    },

    putMany: function (store, values) {
      return openDB().then(function (db) {
        return new Promise(function (resolve, reject) {
          var t = db.transaction(store, 'readwrite');
          var os = t.objectStore(store);
          values.forEach(function (v) { os.put(v); });
          t.oncomplete = function () { resolve(true); };
          t.onerror = function () { reject(t.error); };
        });
      });
    },

    del: function (store, key) {
      return tx(store, 'readwrite', function (os) { return wrap(os.delete(key)); });
    },

    clear: function (store) {
      return tx(store, 'readwrite', function (os) { return wrap(os.clear()); });
    },

    count: function (store) {
      return openDB().then(function (db) {
        return new Promise(function (resolve, reject) {
          var t = db.transaction(store, 'readonly');
          var req = t.objectStore(store).count();
          req.onsuccess = function () { resolve(req.result || 0); };
          req.onerror = function () { reject(req.error); };
        });
      });
    }
  };

  /* ------------------------------------------------------------
     Utiliti umum
     ------------------------------------------------------------ */
  var Util = {
    uid: function (prefix) {
      var rnd;
      if (global.crypto && crypto.getRandomValues) {
        var a = new Uint8Array(8);
        crypto.getRandomValues(a);
        rnd = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      } else {
        rnd = Math.random().toString(16).slice(2) + Date.now().toString(16);
      }
      return (prefix || 'id') + '_' + rnd;
    },

    nowISO: function () { return new Date().toISOString(); },

    todayYmd: function () {
      var d = new Date();
      return [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-');
    },

    parseYmd: function (s) {
      if (!s) return null;
      var p = String(s).slice(0, 10).split('-');
      if (p.length !== 3) return null;
      var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
      return isNaN(d.getTime()) ? null : d;
    },

    daysUntil: function (ymd) {
      var d = Util.parseYmd(ymd);
      if (!d) return null;
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);
      return Math.round((d - today) / 86400000);
    },

    fmtDate: function (v, opts) {
      if (!v) return '—';
      var d = (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) ? Util.parseYmd(v) : new Date(v);
      if (!d || isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('ms-MY', opts || { day: '2-digit', month: 'short', year: 'numeric' });
    },

    fmtDateTime: function (v) {
      if (!v) return '—';
      var d = new Date(v);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleString('ms-MY', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    },

    fmtRM: function (n) {
      var v = Number(n) || 0;
      return 'RM ' + v.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    fmtSize: function (kb) {
      var n = Number(kb) || 0;
      if (n < 1024) return n.toFixed(0) + ' KB';
      return (n / 1024).toFixed(1) + ' MB';
    },

    maskIC: function (ic) {
      var s = String(ic || '').replace(/\D/g, '');
      if (s.length < 4) return s || '—';
      return s.slice(0, 6) + '-' + s.slice(6, 8) + '-**-****';
    },

    fmtIC: function (ic) {
      var s = String(ic || '').replace(/\D/g, '').slice(0, 12);
      if (s.length <= 6) return s;
      if (s.length <= 8) return s.slice(0, 6) + '-' + s.slice(6);
      return s.slice(0, 6) + '-' + s.slice(6, 8) + '-' + s.slice(8);
    },

    initials: function (name) {
      var parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return '?';
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    },

    esc: function (s) {
      return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },

    debounce: function (fn, ms) {
      var t;
      return function () {
        var args = arguments, ctx = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(ctx, args); }, ms || 250);
      };
    },

    sortBy: function (arr, key, desc) {
      return arr.slice().sort(function (a, b) {
        var av = a[key], bv = b[key];
        if (av === bv) return 0;
        if (av === undefined || av === null) return 1;
        if (bv === undefined || bv === null) return -1;
        return (av < bv ? -1 : 1) * (desc ? -1 : 1);
      });
    },

    download: function (filename, content, mime) {
      var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'application/octet-stream' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 800);
    },

    readFileAsDataURL: function (file) {
      return new Promise(function (resolve, reject) {
        var fr = new FileReader();
        fr.onload = function () { resolve(fr.result); };
        fr.onerror = function () { reject(fr.error); };
        fr.readAsDataURL(file);
      });
    },

    /* Mampat imej daripada kamera/galeri supaya saiz munasabah */
    compressImage: function (file, maxDim, quality) {
      maxDim = maxDim || 1200;
      quality = quality || 0.82;
      return Util.readFileAsDataURL(file).then(function (dataUrl) {
        return new Promise(function (resolve) {
          var img = new Image();
          img.onload = function () {
            var w = img.naturalWidth, h = img.naturalHeight;
            var scale = Math.min(1, maxDim / Math.max(w, h));
            var cw = Math.max(1, Math.round(w * scale));
            var ch = Math.max(1, Math.round(h * scale));
            var canvas = document.createElement('canvas');
            canvas.width = cw; canvas.height = ch;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, cw, ch);
            ctx.drawImage(img, 0, 0, cw, ch);
            try { resolve(canvas.toDataURL('image/jpeg', quality)); }
            catch (e) { resolve(dataUrl); }
          };
          img.onerror = function () { resolve(dataUrl); };
          img.src = dataUrl;
        });
      });
    },

    csv: function (rows) {
      return rows.map(function (row) {
        return row.map(function (cell) {
          var s = String(cell === undefined || cell === null ? '' : cell);
          return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        }).join(',');
      }).join('\r\n');
    },

    /* Hash kata laluan — SHA-256 bila tersedia (HTTPS), fallback untuk pratonton fail */
    hashPassword: function (password, salt) {
      var input = String(salt || '') + '::' + String(password || '') + '::epersatuan';
      if (global.crypto && crypto.subtle && crypto.subtle.digest) {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)).then(function (buf) {
          return Array.prototype.map.call(new Uint8Array(buf), function (b) {
            return ('0' + b.toString(16)).slice(-2);
          }).join('');
        });
      }
      // Fallback bukan kriptografi — hanya untuk pratonton file://
      var h1 = 0x811c9dc5, h2 = 0x1000193;
      for (var i = 0; i < input.length; i++) {
        var c = input.charCodeAt(i);
        h1 ^= c; h1 = Math.imul(h1, 16777619) >>> 0;
        h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
      }
      return Promise.resolve('fb' + h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0'));
    },

    randomPassword: function (len) {
      var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
      var out = '';
      var a = new Uint8Array(len || 10);
      if (global.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
      else for (var i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
      for (var j = 0; j < a.length; j++) out += chars[a[j] % chars.length];
      return out;
    },

    randomCode: function (digits) {
      var n = digits || 6, s = '';
      var a = new Uint32Array(n);
      if (global.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
      else for (var i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 1e9);
      for (var j = 0; j < n; j++) s += String(a[j] % 10);
      return s;
    }
  };

  global.Idb = Idb;
  global.Util = Util;
})(window);
