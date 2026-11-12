# Panduan Deploy — e-Persatuan (Public + PWA)

Panduan ini menerbitkan folder `WebApp` sebagai laman web **public** yang boleh **dipasang sebagai app di telefon**.

> **Penting:** anda perlukan akaun hosting milik anda sendiri. Semua langkah di bawah percuma.

---

## Pilihan Vercel + GitHub (disyorkan)

Repo sudah siap: **<https://github.com/qoryproject/e-persatuan>**

Panduan penuh: **[DEPLOY-VERCEL.md](DEPLOY-VERCEL.md)**

Ringkasan:

1. Buka <https://vercel.com/new> → log masuk dengan GitHub (`qoryproject`).
2. Authorize **Vercel GitHub App** untuk repo `e-persatuan`.
3. Import → Framework Preset **Other**, Root `./`, tiada build command → **Deploy**.
4. URL: `https://e-persatuan.vercel.app` (atau nama unik yang dicadangkan).
5. Sahkan **Project → Settings → Git → Connected Git Repository** menunjukkan `qoryproject/e-persatuan` supaya setiap `git push` auto-deploy.

---

## Pilihan A — Netlify Drop (paling pantas, 3–5 minit)

Sesuai jika anda mahu URL public segera tanpa command line.

### Langkah

1. Buka <https://app.netlify.com/drop>.
2. Log masuk / daftar (boleh guna e-mel atau GitHub).
3. Seret **folder `WebApp`** (bukan zip, bukan folder induk) ke dalam kotak Drop.
4. Tunggu sehingga selesai. Anda akan dapat URL seperti:
   `https://nama-rawak.netlify.app`
5. Buka URL tersebut. Laman pendaratan sepatutnya muncul.
6. Klik **Buka Aplikasi** → log masuk dengan akaun demo:
   - `setiausaha@wadah.my`
   - Kata laluan: `Demo1234!`
7. (Pilihan) Tukar nama tapak: **Site configuration → Site details → Change site name** → jadi
   `https://e-persatuan-wadah.netlify.app`.

### Kemas kini kemudian

Seret semula folder `WebApp` ke tab **Deploys** → *Drag and drop your site output folder here*. URL kekal sama.

### Nota Netlify

- Fail `netlify.toml` sudah disertakan (cache `sw.js` tidak disimpan lama).
- Tiada build command diperlukan — biarkan kosong.

---

## Pilihan B — GitHub Pages (percuma, kekal)

Sesuai jika anda mahu simpan kod dalam GitHub dan kemas kini melalui `git push`.

### B1. Cipta repositori

1. Buka <https://github.com/new>.
2. Nama: `e-persatuan` (contoh).
3. Tetapan: **Public**.
4. Klik **Create repository** (jangan tambah README).

### B2. Hantar kod dari komputer

Buka PowerShell di folder projek (`E Persatuan`), kemudian:

```powershell
cd "WebApp"
git init
git add .
git commit -m "e-Persatuan PWA v2.0"
git branch -M main
git remote add origin https://github.com/USERNAME/e-persatuan.git
git push -u origin main
```

Gantikan `USERNAME` dengan nama pengguna GitHub anda.

> Jika diminta log masuk, gunakan **Personal Access Token** (Settings → Developer settings → Tokens) sebagai kata laluan, atau GitHub Desktop.

### B3. Hidupkan Pages

1. Dalam repositori → **Settings** → **Pages**.
2. **Source**: `Deploy from a branch`.
3. **Branch**: `main` / folder `/(root)` → **Save**.
4. Tunggu 1–2 minit. URL akan jadi:
   `https://USERNAME.github.io/e-persatuan/`

### B4. Kemas kini

```powershell
cd "WebApp"
git add .
git commit -m "Kemas kini"
git push
```

GitHub Pages akan terbit semula secara automatik.

> **Penting:** semua laluan dalam projek adalah **relatif** (`./`), jadi ia berfungsi di subfolder GitHub Pages.

---

## Pilihan C — Cloudflare Pages

1. Buka <https://dash.cloudflare.com/> → **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
2. Namakan projek: `e-persatuan`.
3. Seret folder `WebApp` → **Deploy**.
4. URL: `https://e-persatuan.pages.dev`.

---

## Selepas deploy — pasang di telefon

PWA mesti dibuka melalui **HTTPS** (semua pilihan di atas menyediakan HTTPS).

### Android (Chrome)

1. Buka URL public.
2. Tekan butang **Pasang** di laman, atau menu **⋮** → **Install app / Add to Home screen**.
3. Ikon e-Persatuan akan muncul pada skrin utama.

### iPhone (Safari)

1. Buka URL public dalam **Safari** (bukan Chrome).
2. Tekan butang **Kongsi** (petak dengan anak panah).
3. Pilih **Add to Home Screen** → **Add**.
4. Buka ikon dari skrin utama — ia berjalan dalam mod penuh (tanpa bar alamat).

### Komputer (Chrome/Edge)

Klik ikon **pasang** di hujung bar alamat, atau menu → **Install e-Persatuan**.

---

## Ujian selepas deploy (senarai semak)

- [ ] Laman pendaratan terbuka di telefon dan komputer
- [ ] Butang **Buka Aplikasi** membuka `app.html`
- [ ] Log masuk Setiausaha berjaya
- [ ] Papan pemuka memaparkan 75% dan 4 kad statistik
- [ ] Buka **Semakan Profil** → gambar IC demo kelihatan
- [ ] Muat naik dokumen baharu berjaya
- [ ] Log masuk Bendahari → tambah rekod kewangan → baki berubah
- [ ] Log masuk Pengerusi → Kelulusan Akhir → Laporan boleh dicetak
- [ ] **Pasang** app di telefon → ikon muncul → dibuka tanpa bar alamat
- [ ] Mod pesawat: antara muka asas masih terbuka (data sedia ada)

---

## Masalah biasa

| Masalah | Penyebab & penyelesaian |
|---|---|
| Halaman putih | Buka Console pelayar (F12). Pastikan `assets/js/*.js` dimuat naik. |
| “IndexedDB tidak disokong” | Gunakan Chrome/Safari/Edge terkini; jangan buka melalui `file://`. |
| Kamera tidak terbuka | Perlu HTTPS. Di iPhone, kamera hanya melalui input fail. |
| App tidak muncul “Install” | Pastikan HTTPS, manifest dimuat, dan belum dipasang. Cuba menu pelayar. |
| Perubahan tidak kelihatan | Naikkan `VERSION` dalam `sw.js`, muat semula dua kali, atau kosongkan cache. |
| Data hilang selepas clear cache | Data local-first disimpan dalam pelayar. Sentiasa buat **Eksport Sandaran** (Tetapan). |

---

## Selepas MVP — data dikongsi

Untuk membolehkan semua AJK melihat data yang sama merentas peranti, pilih satu:

1. **Sambung Supabase** (Postgres + Auth + Storage) — disyorkan untuk laman statik.
2. **Sambung Firebase** (Firestore + Auth + Storage).
3. **Guna semula backend Google Apps Script** yang sudah ada dalam folder `Script/`.

Struktur data dalam `assets/js/db.js` dan `assets/js/seed.js` sudah diasingkan supaya lapisan penyegerakan boleh ditambah tanpa menulis semula UI.
