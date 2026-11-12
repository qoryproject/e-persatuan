/* ============================================================
   e-Persatuan — Pemalar, kebenaran & data demo
   ============================================================ */
(function (global) {
  'use strict';

  var ROLES = {
    setiausaha: { label: 'Setiausaha', short: 'SU', icon: 'bi-person-gear', desc: 'Pentadbir sistem' },
    bendahari:  { label: 'Bendahari', short: 'BD', icon: 'bi-cash-coin', desc: 'Pengurus kewangan' },
    pengerusi:  { label: 'Pengerusi', short: 'PR', icon: 'bi-patch-check', desc: 'Pemantau & kelulusan' },
    ajk:        { label: 'AJK Penaja', short: 'AJK', icon: 'bi-person-badge', desc: 'Ahli jawatankuasa' }
  };

  var PERMS = {
    dashboard:    ['setiausaha', 'bendahari', 'pengerusi', 'ajk'],
    checklist:    ['setiausaha', 'bendahari', 'pengerusi', 'ajk'],
    ownProfile:   ['setiausaha', 'bendahari', 'pengerusi', 'ajk'],
    ajkList:      ['setiausaha', 'pengerusi'],
    review:       ['setiausaha'],
    documents:    ['setiausaha', 'bendahari', 'pengerusi'],
    uploadDocs:   ['setiausaha', 'bendahari'],
    finance:      ['bendahari', 'pengerusi'],
    manageFinance:['bendahari'],
    approve:      ['pengerusi'],
    reports:      ['setiausaha', 'pengerusi'],
    generatePdf:  ['setiausaha'],
    activityLog:  ['setiausaha', 'pengerusi'],
    users:        ['setiausaha'],
    settings:     ['setiausaha']
  };

  var CHECK_ITEMS = [
    {
      key: 'minit',
      nama: 'Minit Mesyuarat Penubuhan',
      desc: 'Minit mesyuarat penubuhan yang lengkap, bertarikh dan ditandatangani Pengerusi serta Setiausaha.',
      icon: 'bi-journal-text',
      kategori: 'Minit Mesyuarat',
      role: 'setiausaha'
    },
    {
      key: 'perlembagaan',
      nama: 'Perlembagaan Persatuan',
      desc: 'Draf perlembagaan mengikut kehendak Akta Pertubuhan 1966 (versi terkini).',
      icon: 'bi-book',
      kategori: 'Perlembagaan',
      role: 'setiausaha'
    },
    {
      key: 'kewangan',
      nama: 'Kedudukan Kewangan',
      desc: 'Rekod kutipan yuran penaja, perbelanjaan awal dan penyata bank terkini.',
      icon: 'bi-cash-stack',
      kategori: 'Kewangan',
      role: 'bendahari'
    },
    {
      key: 'ajk',
      nama: 'Butir-butir AJK Penaja',
      desc: 'Profil lengkap setiap AJK termasuk salinan IC, gambar pasport dan pengesahan Setiausaha.',
      icon: 'bi-people',
      kategori: '',
      role: 'setiausaha'
    }
  ];

  var STATUS = {
    draf:       { label: 'Belum Lengkap', chip: 'chip-grey', icon: 'bi-dash-circle' },
    menunggu:   { label: 'Menunggu Semakan', chip: 'chip-blue', icon: 'bi-hourglass-split' },
    lengkap:    { label: 'Lengkap', chip: 'chip-green', icon: 'bi-check-circle' },
    pembetulan: { label: 'Perlu Pembetulan', chip: 'chip-amber', icon: 'bi-exclamation-circle' },
    semakan:    { label: 'Dalam Semakan', chip: 'chip-amber', icon: 'bi-hourglass-split' },
    aktif:      { label: 'Aktif', chip: 'chip-green', icon: 'bi-check-circle' },
    menungguKelulusan: { label: 'Menunggu Kelulusan', chip: 'chip-amber', icon: 'bi-hourglass-split' },
    nyahaktif:  { label: 'Nyahaktif', chip: 'chip-grey', icon: 'bi-slash-circle' }
  };

  var DEFAULT_SETTINGS = {
    key: 'app',
    namaRasmi: 'Wadah Daya Aspirasi Anak Kedah (WADAH)',
    namaPendek: 'WADAH',
    noRujukan: 'PPM-024-10-14102026',
    alamat: 'No. 14, Jalan Meranti 3/2, Seksyen 3, 43650 Bandar Baru Bangi, Selangor',
    matlamat: 'Memperkasa anak muda Kedah melalui program pendidikan, kebajikan dan kepimpinan komuniti.',
    kategori: 'Kebajikan & Pendidikan',
    sesi: '2026/2027',
    tarikhMesyuarat: '2026-10-12',
    tarikhAkhir: '2026-11-20',
    tarikhSasaran: '2026-12-15',
    statusKelulusan: 'belum',
    tarikhLulus: '',
    olehLulus: '',
    cop: 'WADAH DAYA ASPIRASI ANAK KEDAH\nNo. 14, Jalan Meranti 3/2, Seksyen 3\n43650 Bandar Baru Bangi, Selangor\nwadah.rasmi@gmail.com  •  012-345 6789',
    logo: ''
  };

  var DEMO_PASSWORD = 'Demo1234!';

  /* ---------- Penjana PDF demo ringkas ---------- */
  function makeDemoPdf(title, lines) {
    var ascii = function (s) {
      return String(s)
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2022\u00B7]/g, '-')
        .replace(/[^\x20-\x7E\n]/g, '?');
    };
    var esc = function (s) { return ascii(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); };
    var body = 'BT /F1 16 Tf 56 790 Td (' + esc(title) + ') Tj ET\n';
    body += '0.31 0.37 0.65 RG 1 w 56 780 m 540 780 l S\n';
    lines.forEach(function (l, i) {
      body += 'BT /F1 11 Tf 56 ' + (752 - i * 20) + ' Td (' + esc(l) + ') Tj ET\n';
    });
    body += 'BT /F1 9 Tf 56 60 Td (Dokumen demo dijana oleh e-Persatuan. Bukan dokumen rasmi.) Tj ET\n';

    var objs = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
      '<< /Length ' + body.length + ' >>\nstream\n' + body + 'endstream',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
    ];

    var pdf = '%PDF-1.4\n';
    var offsets = [];
    objs.forEach(function (o, i) {
      offsets.push(pdf.length);
      pdf += (i + 1) + ' 0 obj\n' + o + '\nendobj\n';
    });
    var xref = pdf.length;
    pdf += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offsets.forEach(function (o) { pdf += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
    pdf += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    return 'data:application/pdf;base64,' + btoa(pdf);
  }

  function pdfKB(dataUrl) {
    var b64 = String(dataUrl).split(',')[1] || '';
    return Math.max(1, Math.round((b64.length * 3 / 4) / 1024));
  }

  /* ---------- Imej demo (kad pengenalan & pasport) ---------- */
  function demoIC(nama, ic, sisi) {
    try {
      var c = document.createElement('canvas');
      c.width = 900; c.height = 568;
      var g = c.getContext('2d');
      var grad = g.createLinearGradient(0, 0, 900, 568);
      grad.addColorStop(0, '#EDF2FF');
      grad.addColorStop(1, '#D3DCF5');
      g.fillStyle = grad;
      g.fillRect(0, 0, 900, 568);

      g.fillStyle = '#1F2B6B';
      g.fillRect(0, 0, 900, 74);
      g.fillStyle = '#fff';
      g.font = 'bold 30px sans-serif';
      g.fillText('MALAYSIA', 34, 48);
      g.fillStyle = '#E9B44C';
      g.font = 'bold 17px sans-serif';
      g.fillText('KAD PENGENALAN', 700, 47);

      g.fillStyle = '#C9D3EA';
      g.fillRect(650, 110, 200, 250);
      g.fillStyle = '#8A94A6';
      g.beginPath(); g.arc(750, 200, 44, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(750, 320, 78, 58, 0, 0, Math.PI * 2); g.fill();

      g.fillStyle = '#1F2937';
      g.font = 'bold 26px sans-serif';
      g.fillText(String(nama).toUpperCase(), 40, 150);

      g.fillStyle = '#5B6474';
      g.font = '17px sans-serif';
      g.fillText('No. Kad Pengenalan', 40, 205);
      g.fillStyle = '#1F2937';
      g.font = 'bold 34px monospace';
      g.fillText(String(ic), 40, 245);

      g.fillStyle = '#5B6474';
      g.font = '18px sans-serif';
      g.fillText('Warganegara: MALAYSIA', 40, 305);
      g.fillText('Alamat:', 40, 345);
      g.fillText('No. 14, Jalan Meranti 3/2, Seksyen 3', 40, 372);
      g.fillText('43650 Bandar Baru Bangi, Selangor', 40, 399);

      g.fillStyle = 'rgba(43,58,143,.10)';
      for (var i = 0; i < 10; i++) g.fillRect(0, 430 + i * 7, 900, 3);

      g.fillStyle = '#1F2B6B';
      g.font = 'bold 22px sans-serif';
      g.fillText(String(sisi || '').toUpperCase() + '  •  SALINAN DEMO', 40, 520);

      return c.toDataURL('image/jpeg', 0.86);
    } catch (e) { return ''; }
  }

  function demoPassport(nama) {
    try {
      var c = document.createElement('canvas');
      c.width = 480; c.height = 640;
      var g = c.getContext('2d');
      g.fillStyle = '#F7F9FF';
      g.fillRect(0, 0, 480, 640);
      g.fillStyle = '#DCE3F5';
      g.beginPath(); g.arc(240, 220, 82, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(240, 440, 140, 120, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#2B3A8F';
      g.lineWidth = 6;
      g.strokeRect(14, 14, 452, 612);
      g.fillStyle = '#1F2B6B';
      g.font = 'bold 19px sans-serif';
      g.textAlign = 'center';
      g.fillText(String(nama).toUpperCase(), 240, 588);
      g.fillStyle = '#8A94A6';
      g.font = '14px sans-serif';
      g.fillText('GAMBAR PASPORT (DEMO)', 240, 614);
      return c.toDataURL('image/jpeg', 0.88);
    } catch (e) { return ''; }
  }

  /* ---------- Semak sama ada pangkalan data kosong ---------- */
  function seedIfEmpty() {
    return Idb.get('meta', 'seeded').then(function (m) {
      if (m && m.value) return { seeded: false };
      return seedAll().then(function () { return { seeded: true }; });
    });
  }

  function seedAll() {
    var now = new Date().toISOString();
    var users = [
      { id: 'u_setiausaha', nama: 'Ahmad Razif bin Osman', email: 'setiausaha@wadah.my', matrik: 'WADAH001', peranan: 'setiausaha', jawatan: 'Setiausaha', telefon: '012-345 6789', status: 'aktif' },
      { id: 'u_bendahari', nama: 'Siti Aminah binti Yusof', email: 'bendahari@wadah.my', matrik: 'WADAH002', peranan: 'bendahari', jawatan: 'Bendahari', telefon: '013-456 7890', status: 'aktif' },
      { id: 'u_pengerusi', nama: 'Kamal bin Ariffin', email: 'pengerusi@wadah.my', matrik: 'WADAH003', peranan: 'pengerusi', jawatan: 'Pengerusi', telefon: '019-876 5432', status: 'aktif' },
      { id: 'u_razali', nama: 'Razali bin Hassan', email: 'razali@wadah.my', matrik: 'WADAH004', peranan: 'ajk', jawatan: 'AJK Penaja', telefon: '012-345 6790', status: 'aktif' },
      { id: 'u_nurul', nama: 'Nurul Izzati binti Hamzah', email: 'nurul@wadah.my', matrik: 'WADAH005', peranan: 'ajk', jawatan: 'AJK Penaja', telefon: '011-2345 6789', status: 'aktif' },
      { id: 'u_faizal', nama: 'Faizal bin Ahmad', email: 'faizal@wadah.my', matrik: 'WADAH006', peranan: 'ajk', jawatan: 'AJK Penaja', telefon: '017-654 3210', status: 'aktif' },
      { id: 'u_tan', nama: 'Tan Mei Ling', email: 'tan@wadah.my', matrik: 'WADAH007', peranan: 'ajk', jawatan: 'AJK Penaja', telefon: '016-789 0123', status: 'aktif' },
      { id: 'u_hafiz', nama: 'Muhammad Hafiz bin Salleh', email: 'hafiz@wadah.my', matrik: 'WADAH008', peranan: 'ajk', jawatan: 'AJK Penaja', telefon: '014-321 0987', status: 'menunggu' }
    ];

    return Promise.all(users.map(function (u) {
      u.salt = Util.uid('s');
      return Util.hashPassword(DEMO_PASSWORD, u.salt).then(function (h) {
        u.hash = h;
        u.createdAt = now;
        u.lastLogin = '';
        u.perluTukar = false;
        return u;
      });
    })).then(function (readyUsers) {
      var profileBase = {
        icDepan: '', icBelakang: '', pasport: '',
        status: 'lengkap', catatan: '', tarikhHantar: now, tarikhSahkan: now,
        disahkanOleh: 'Ahmad Razif bin Osman', updatedAt: now
      };

      var profiles = [
        Object.assign({}, profileBase, {
          userId: 'u_setiausaha', namaPenuh: 'Ahmad Razif bin Osman', ic: '900101015533',
          jawatan: 'Setiausaha', alamat: 'No. 10, Jalan Kenanga 2, 08000 Sungai Petani, Kedah',
          telefon: '012-345 6789', email: 'setiausaha@wadah.my', pekerjaan: 'Pegawai Tadbir',
          majikan: 'Kementerian Pendidikan'
        }),
        Object.assign({}, profileBase, {
          userId: 'u_bendahari', namaPenuh: 'Siti Aminah binti Yusof', ic: '920304045566',
          jawatan: 'Bendahari', alamat: 'No. 22, Taman Sri Wangi, 06000 Jitra, Kedah',
          telefon: '013-456 7890', email: 'bendahari@wadah.my', pekerjaan: 'Akauntan',
          majikan: 'Syarikat Perunding Amanah'
        }),
        Object.assign({}, profileBase, {
          userId: 'u_pengerusi', namaPenuh: 'Kamal bin Ariffin', ic: '880512035544',
          jawatan: 'Pengerusi', alamat: 'No. 5, Jalan Melati, 05150 Alor Setar, Kedah',
          telefon: '019-876 5432', email: 'pengerusi@wadah.my', pekerjaan: 'Pengurus Operasi',
          majikan: 'Koperasi Usahawan Kedah'
        }),
        Object.assign({}, profileBase, {
          userId: 'u_razali', namaPenuh: 'Razali bin Hassan', ic: '900101015555',
          jawatan: 'AJK Penaja', alamat: 'No. 14, Jalan Meranti 3/2, Seksyen 3, 43650 Bandar Baru Bangi, Selangor',
          telefon: '012-345 6790', email: 'razali@wadah.my', pekerjaan: 'Pegawai Tadbir',
          majikan: 'Kementerian Pendidikan',
          status: 'pembetulan', tarikhSahkan: '',
          catatan: 'Imej kad pengenalan kurang jelas. Sila muat naik semula salinan IC depan dan belakang yang terang serta gambar pasport berlatar belakang putih.'
        }),
        Object.assign({}, profileBase, {
          userId: 'u_nurul', namaPenuh: 'Nurul Izzati binti Hamzah', ic: '010203045566',
          jawatan: 'AJK Penaja', alamat: 'No. 7, Taman Harmoni, 09000 Kulim, Kedah',
          telefon: '011-2345 6789', email: 'nurul@wadah.my', pekerjaan: 'Guru',
          majikan: 'Kementerian Pendidikan'
        }),
        Object.assign({}, profileBase, {
          userId: 'u_faizal', namaPenuh: 'Faizal bin Ahmad', ic: '950607085577',
          jawatan: 'AJK Penaja', alamat: 'No. 18, Jalan Cempaka, 08000 Sungai Petani, Kedah',
          telefon: '017-654 3210', email: 'faizal@wadah.my', pekerjaan: 'Juruteknik',
          majikan: 'Kilang Elektronik Utara',
          status: 'menunggu', tarikhSahkan: '', disahkanOleh: ''
        })
      ];

      profiles.forEach(function (p) {
        if (!p.ic) return;
        p.icDepan = demoIC(p.namaPenuh, p.ic, 'Depan');
        p.icBelakang = demoIC(p.namaPenuh, p.ic, 'Belakang');
        p.pasport = demoPassport(p.namaPenuh);
      });

      var minitPdf = makeDemoPdf('MINIT MESYUARAT PENUBUHAN', [
        'Wadah Daya Aspirasi Anak Kedah (WADAH)',
        'Tarikh: 12 Oktober 2026   |   Tempat: Dewan Seri Aman, Sungai Petani',
        'Masa: 8.30 malam',
        '',
        '1. Ucapan aluan Pengerusi dan pembentangan cadangan penubuhan.',
        '2. Pembentangan matlamat dan objektif persatuan.',
        '3. Pemilihan AJK penaja bagi sesi 2026/2027.',
        '4. Penetapan tarikh akhir serahan maklumat dan yuran penaja.',
        '5. Hal-hal lain dan penutup.',
        '',
        'Disahkan oleh:',
        '______________________            ______________________',
        'Pengerusi                                    Setiausaha'
      ]);

      var perlembagaanPdf = makeDemoPdf('PERLEMBAGAAN PERSATUAN', [
        'Wadah Daya Aspirasi Anak Kedah (WADAH)',
        'Draf versi 2.1 — menurut kehendak Akta Pertubuhan 1966',
        '',
        'Fasal 1  — Nama',
        'Fasal 2  — Tempat dan alamat berdaftar',
        'Fasal 3  — Matlamat dan objektif',
        'Fasal 4  — Keahlian dan yuran',
        'Fasal 5  — Jawatankuasa dan tugas',
        'Fasal 6  — Mesyuarat agung dan mesyuarat AJK',
        'Fasal 7  — Kewangan dan akaun',
        'Fasal 8  — Pindaan perlembagaan',
        'Fasal 9  — Pembubaran persatuan'
      ]);

      var kewanganPdf = makeDemoPdf('PENYATA KEDUDUKAN KEWANGAN', [
        'Wadah Daya Aspirasi Anak Kedah (WADAH)',
        'Bagi tempoh 12 Oktober 2026 hingga 31 Oktober 2026',
        '',
        'Kutipan yuran penaja                    RM 3,650.00',
        'Perbelanjaan awal                       RM   200.00',
        '-----------------------------------------------',
        'Baki tunai                              RM 3,450.00',
        '',
        'Akaun bank: Maybank 5123 4567 8901',
        'Penyata bank disertakan untuk semakan Bendahari.'
      ]);

      var docs = [
        {
          id: 'd_minit', kategori: 'Minit Mesyuarat', nama: 'Minit Mesyuarat Penubuhan.pdf',
          format: 'PDF', saiz: pdfKB(minitPdf), versi: 1, aktif: true,
          olehId: 'u_setiausaha', olehNama: 'Ahmad Razif bin Osman', tarikh: '2026-10-13T10:20:00.000Z',
          catatan: 'Minit asal yang ditandatangani.', dataUrl: minitPdf
        },
        {
          id: 'd_perlembagaan', kategori: 'Perlembagaan', nama: 'Perlembagaan WADAH v2.1.pdf',
          format: 'PDF', saiz: pdfKB(perlembagaanPdf), versi: 1, aktif: true,
          olehId: 'u_setiausaha', olehNama: 'Ahmad Razif bin Osman', tarikh: '2026-10-14T09:05:00.000Z',
          catatan: 'Draf perlembagaan untuk semakan.', dataUrl: perlembagaanPdf
        },
        {
          id: 'd_kewangan', kategori: 'Kewangan', nama: 'Penyata Kewangan Oktober 2026.pdf',
          format: 'PDF', saiz: pdfKB(kewanganPdf), versi: 1, aktif: true,
          olehId: 'u_bendahari', olehNama: 'Siti Aminah binti Yusof', tarikh: '2026-10-20T14:30:00.000Z',
          catatan: 'Penyata ringkas untuk semakan Setiausaha.', dataUrl: kewanganPdf
        }
      ];

      var finance = [
        { id: 'f1', tarikh: '2026-10-12', jenis: 'Kutipan Yuran Penaja', arah: 'masuk', keterangan: 'Yuran penaja — Ahmad Razif', jumlah: 150, rujukan: 'RCP-001', olehId: 'u_bendahari', olehNama: 'Siti Aminah binti Yusof' },
        { id: 'f2', tarikh: '2026-10-12', jenis: 'Kutipan Yuran Penaja', arah: 'masuk', keterangan: 'Yuran penaja — Siti Aminah', jumlah: 150, rujukan: 'RCP-002', olehId: 'u_bendahari', olehNama: 'Siti Aminah binti Yusof' },
        { id: 'f3', tarikh: '2026-10-13', jenis: 'Kutipan Yuran Penaja', arah: 'masuk', keterangan: 'Yuran penaja — Kamal Ariffin', jumlah: 150, rujukan: 'RCP-003', olehId: 'u_bendahari', olehNama: 'Siti Aminah binti Yusof' },
        { id: 'f4', tarikh: '2026-10-13', jenis: 'Kutipan Yuran Penaja', arah: 'masuk', keterangan: 'Yuran penaja — Razali Hassan', jumlah: 150, rujukan: 'RCP-004', olehId: 'u_bendahari', olehNama: 'Siti Aminah binti Yusof' },
        { id: 'f5', tarikh: '2026-10-14', jenis: 'Kutipan Yuran Penaja', arah: 'masuk', keterangan: 'Yuran penaja — Nurul Izzati', jumlah: 150, rujukan: 'RCP-005', olehId: 'u_bendahari', olehNama: 'Siti Aminah binti Yusof' },
        { id: 'f6', tarikh: '2026-10-14', jenis: 'Kutipan Yuran Penaja', arah: 'masuk', keterangan: 'Yuran penaja — Faizal Ahmad', jumlah: 150, rujukan: 'RCP-006', olehId: 'u_bendahari', olehNama: 'Siti Aminah binti Yusof' },
        { id: 'f7', tarikh: '2026-10-18', jenis: 'Sumbangan Penaja', arah: 'masuk', keterangan: 'Sumbangan penaja komuniti', jumlah: 2750, rujukan: 'RCP-007', olehId: 'u_bendahari', olehNama: 'Siti Aminah binti Yusof' },
        { id: 'f8', tarikh: '2026-10-19', jenis: 'Perbelanjaan Awal', arah: 'keluar', keterangan: 'Duti setem dan materai', jumlah: 120, rujukan: 'INV-0101', olehId: 'u_bendahari', olehNama: 'Siti Aminah binti Yusof' },
        { id: 'f9', tarikh: '2026-10-20', jenis: 'Perbelanjaan Awal', arah: 'keluar', keterangan: 'Cetakan borang dan fail', jumlah: 80, rujukan: 'INV-0102', olehId: 'u_bendahari', olehNama: 'Siti Aminah binti Yusof' }
      ].map(function (f) { f.kemaskini = now; return f; });

      var checklist = [
        { key: 'minit', status: 'lengkap', catatan: 'Dimuat naik 13 Okt 2026', auto: false, oleh: 'Ahmad Razif bin Osman', tarikh: '2026-10-13T10:20:00.000Z' },
        { key: 'perlembagaan', status: 'lengkap', catatan: 'Versi 2.1 disemak', auto: false, oleh: 'Ahmad Razif bin Osman', tarikh: '2026-10-14T09:05:00.000Z' },
        { key: 'kewangan', status: 'semakan', catatan: 'Menunggu penyata bank rasmi', auto: false, oleh: 'Siti Aminah binti Yusof', tarikh: '2026-10-20T14:30:00.000Z' },
        { key: 'ajk', status: 'pembetulan', catatan: '1 AJK perlu muat naik semula IC', auto: false, oleh: 'Ahmad Razif bin Osman', tarikh: '2026-10-24T11:00:00.000Z' }
      ];

      var logs = [
        { ts: '2026-10-12T13:00:00.000Z', userId: 'u_setiausaha', nama: 'Ahmad Razif bin Osman', tindakan: 'setup', objek: 'Sistem', butiran: 'Persatuan didaftarkan dalam sistem' },
        { ts: '2026-10-13T10:20:00.000Z', userId: 'u_setiausaha', nama: 'Ahmad Razif bin Osman', tindakan: 'muatnaik', objek: 'Minit Mesyuarat Penubuhan.pdf', butiran: 'Muat naik dokumen Minit Mesyuarat' },
        { ts: '2026-10-14T09:05:00.000Z', userId: 'u_setiausaha', nama: 'Ahmad Razif bin Osman', tindakan: 'muatnaik', objek: 'Perlembagaan WADAH v2.1.pdf', butiran: 'Muat naik dokumen Perlembagaan' },
        { ts: '2026-10-20T14:30:00.000Z', userId: 'u_bendahari', nama: 'Siti Aminah binti Yusof', tindakan: 'muatnaik', objek: 'Penyata Kewangan Oktober 2026.pdf', butiran: 'Muat naik penyata kewangan' },
        { ts: '2026-10-24T11:00:00.000Z', userId: 'u_setiausaha', nama: 'Ahmad Razif bin Osman', tindakan: 'pembetulan', objek: 'Profil Razali bin Hassan', butiran: 'Minta pembetulan imej IC' }
      ];

      return Promise.all([
        Idb.putMany('users', readyUsers),
        Idb.putMany('profiles', profiles),
        Idb.putMany('docs', docs),
        Idb.putMany('finance', finance),
        Idb.putMany('checklist', checklist),
        Idb.putMany('logs', logs),
        Idb.put('settings', Object.assign({}, DEFAULT_SETTINGS)),
        Idb.put('meta', { key: 'seeded', value: true, at: now })
      ]);
    });
  }

  global.EP = {
    ROLES: ROLES,
    PERMS: PERMS,
    CHECK_ITEMS: CHECK_ITEMS,
    STATUS: STATUS,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    DEMO_PASSWORD: DEMO_PASSWORD,
    seedIfEmpty: seedIfEmpty,
    seedAll: seedAll,
    makeDemoPdf: makeDemoPdf
  };
})(window);
