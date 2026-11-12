# e-Persatuan — Laman Web + PWA

Portal pengurusan dokumen dan pendaftaran persatuan, dibina sebagai **laman web statik + PWA** (boleh dipasang di telefon). Tiada proses *build*, tiada pangkalan data pelayan — semua fail boleh dimuat naik terus ke hosting statik.

---

## 1. Kandungan pakej

```
WebApp/
├─ index.html                 Laman pendaratan awam
├─ app.html                   Aplikasi (PWA)
├─ manifest.webmanifest       Manifest PWA
├─ sw.js                      Service worker (cache luar talian)
├─ offline.html               Halaman luar talian
├─ 404.html                   Halaman ralat
├─ netlify.toml               Tetapan hosting Netlify (pilihan)
├─ robots.txt
├─ assets/
│  ├─ css/  base.css · landing.css · app.css
│  ├─ js/   db.js · seed.js · app.js
│  └─ img/  ikon PWA, favicon, logo
└─ tools/
   ├─ serve.ps1               Pelayan ujian tempatan (Windows)
   └─ make-icons.ps1          Penjana semula ikon PWA
```

## 2. Ciri

- Papan pemuka kelengkapan automatik (4 item statutori)
- Senarai semak dengan status automatik + override manual
- Profil AJK + muat naik IC/pasport dari kamera telefon
- Semakan & pengesahan profil oleh Setiausaha
- Pengurusan dokumen berversi (PDF/DOCX/JPG/PNG)
- Kewangan: kutipan, perbelanjaan, baki automatik
- Kelulusan Akhir oleh Pengerusi
- Laporan berkop rasmi (cetak / simpan PDF)
- Log aktiviti, pengurusan pengguna, tetapan
- Eksport CSV + sandaran penuh JSON
- PWA: boleh dipasang, cache luar talian, tema telefon

## 3. Akaun demo

Kata laluan semua akaun: **`Demo1234!`**

| Peranan | E-mel |
|---|---|
| Setiausaha | `setiausaha@wadah.my` |
| Bendahari | `bendahari@wadah.my` |
| Pengerusi | `pengerusi@wadah.my` |
| AJK Penaja | `razali@wadah.my` |

Data demo dijana secara automatik pada pembukaan pertama.

## 4. Cuba di komputer

PWA memerlukan `http://` atau `https://` (bukan `file://`) untuk service worker, kamera dan kriptografi.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8000
```

Buka <http://localhost:8000/>.

## 5. Terbitkan secara public

**Repo GitHub:** <https://github.com/qoryproject/e-persatuan>

Panduan utama (Vercel): **[DEPLOY-VERCEL.md](DEPLOY-VERCEL.md)**

Ringkasan pilihan:

1. **Vercel + GitHub** (disyorkan) — import repo sekali, auto-deploy setiap `git push`, domain `https://e-persatuan.vercel.app`.
2. **Netlify Drop** — drag & drop folder, URL public serta-merta.
3. **GitHub Pages** — percuma, sesuai untuk jangka panjang.
4. **Cloudflare Pages** — percuma, pantas di Malaysia.

Panduan semua pilihan: **[PANDUAN-DEPLOY.md](PANDUAN-DEPLOY.md)**

Selepas terbit:

- URL public (contoh `https://e-persatuan.vercel.app`)
- Pasang di telefon: Android Chrome → *Install app*; iPhone Safari → *Kongsi → Add to Home Screen*.

## 6. Had penting (versi ini)

Versi ini ialah **MVP local-first**:

- Data disimpan dalam **IndexedDB pada peranti masing-masing**, bukan pelayan kongsi.
- Ia sesuai untuk demo, pembentangan dan penggunaan satu peranti.
- Untuk data **dikongsi antara AJK/Setiausaha/Bendahari merentas peranti**, fasa seterusnya perlu backend (Supabase/Firebase) atau sambungan kepada aplikasi Google Apps Script sedia ada.
- Gunakan **Eksport / Import Sandaran** (Tetapan) untuk memindahkan data antara peranti.
- Kata laluan di-hash SHA-256 di sisi pelayar. Untuk pengesahan sebenar merentas peranti, auth pelayan diperlukan.

## 7. Menyesuaikan

- **Nama, alamat, tarikh, kop surat, logo** → dalam aplikasi: *Tetapan*.
- **Warna jenama** → `assets/css/base.css` (`:root`).
- **Ikon PWA** → ganti fail dalam `assets/img/`, atau jalankan semula:
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File tools/make-icons.ps1
  ```
- **Versi cache** → naikkan `VERSION` dalam `sw.js` setiap kali fail teras berubah supaya pengguna mendapat versi baharu.

## 8. Keselamatan & PDPA

- No. KP disamarkan dalam senarai; penuh hanya pada profil/PDF yang dibenarkan.
- Kawalan peranan pada setiap halaman dan tindakan.
- Log aktiviti tidak boleh disunting melalui aplikasi.
- Notis PDPA dipaparkan pada borang profil.
- **Nota:** kawalan ini berkuat kuasa di antara muka. Untuk jaminan keselamatan sebenar, backend mesti mengesahkan setiap permintaan.

## 9. Lesen aset

- Ikon: [Bootstrap Icons](https://icons.getbootstrap.com/) (MIT) melalui CDN.
- Fon: Plus Jakarta Sans & Inter (Google Fonts, OFL).
- Ikon aplikasi dijana sendiri oleh `tools/make-icons.ps1`.
