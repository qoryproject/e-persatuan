# Deploy ke Vercel melalui GitHub — e-Persatuan

Repo GitHub (sudah siap): **<https://github.com/qoryproject/e-persatuan>**

Repo ini sudah mengandungi `vercel.json`, `manifest.webmanifest`, `sw.js` dan semua aset PWA. **Tiada build step** diperlukan.

---

## 1. Import repo ke Vercel (sekali sahaja)

1. Buka **<https://vercel.com/new>**.
2. Log masuk / daftar dengan **Continue with GitHub**.
   - Gunakan akaun GitHub **qoryproject** (pemilik repo).
3. Jika diminta, tekan **Authorize Vercel** untuk memasang **Vercel GitHub App**.
   - Pilih **All repositories**, atau **Only select repositories → qoryproject/e-persatuan**.
4. Dalam senarai repo, cari **`e-persatuan`** → tekan **Import**.
5. Tetapan projek:
   - **Project Name:** `e-persatuan`
   - **Framework Preset:** `Other`
   - **Root Directory:** `./` (biarkan kosong)
   - **Build Command:** kosongkan / **Override** dimatikan
   - **Output Directory:** `./` (biarkan kosong)
   - **Install Command:** kosongkan / **Override** dimatikan
   - **Environment Variables:** tiada
6. Tekan **Deploy** dan tunggu 20–60 saat.

Selepas selesai, URL production akan muncul, contohnya:

```
https://e-persatuan.vercel.app
```

> Jika nama `e-persatuan` sudah digunakan oleh akaun Vercel lain, Vercel akan mencadangkan nama unik seperti `e-persatuan-qoryproject.vercel.app`. Anda boleh menukarnya di **Settings → General → Project Name**.

---

## 2. Pastikan GitHub ↔ Vercel benar-benar bersambung

Selepas import, buka:

**Project → Settings → Git**

Anda sepatutnya melihat:

```
Connected Git Repository: qoryproject/e-persatuan
Production Branch: main
```

Jika bahagian itu kosong atau tertulis *Connect Git Repository*, tekan **Connect Git Repository** dan pilih `qoryproject/e-persatuan`.

Ini yang menjadikan **auto-deploy** berfungsi:

| Tindakan | Keputusan Vercel |
|---|---|
| `git push` ke `main` | Deployment **Production** baharu |
| Pull request | Deployment **Preview** dengan URL sendiri |
| Rollback | Project → Deployments → pilih versi → **Promote to Production** |

---

## 3. Ujian selepas deploy

Buka URL Vercel, kemudian:

- [ ] Laman pendaratan muncul (hero biru, butang **Buka Aplikasi**)
- [ ] `https://DOMAIN/app.html` membuka aplikasi
- [ ] Log masuk `setiausaha@wadah.my` / `Demo1234!`
- [ ] Papan pemuka memaparkan **75%**
- [ ] Muat naik dokumen berjaya
- [ ] Manifest dimuat: `https://DOMAIN/manifest.webmanifest`
- [ ] Service worker aktif: DevTools → Application → Service Workers
- [ ] Butang **Pasang** berfungsi di Chrome desktop/Android
- [ ] iPhone Safari: Kongsi → Add to Home Screen

---

## 4. Kemas kini laman

Dari folder `WebApp`:

```powershell
git add .
git commit -m "Kemas kini kandungan"
git push
```

Vercel akan deploy semula secara automatik dalam masa 1–2 minit.

Jika perubahan tidak kelihatan kerana cache PWA:

1. Naikkan `VERSION` dalam `sw.js` (contoh `e-persatuan-v2.0.6` → `v2.0.7`).
2. Push semula.
3. Buka semula app dua kali (service worker ambil versi baharu).

---

## 5. Tukar nama projek / domain

### Nama projek (URL `*.vercel.app`)

**Project → Settings → General → Project Name** → simpan.
URL lama akan dialihkan ke URL baharu.

### Domain sendiri (pilihan)

**Project → Settings → Domains → Add** → masukkan domain anda → ikut rekod DNS yang dipaparkan.

---

## 6. Masalah biasa

| Masalah | Penyelesaian |
|---|---|
| Repo tidak muncul semasa import | Vercel GitHub App belum diberi akses. Klik **Adjust GitHub App Permissions** → tambah repo. |
| 404 selepas deploy | Pastikan **Root Directory** ialah `./` dan fail `index.html` berada di root repo. |
| Halaman putih | Buka DevTools → Console. Pastikan `assets/js/app.js` dimuat (bukan 404). |
| Service worker lama | DevTools → Application → Service Workers → **Unregister**, kemudian reload. |
| Kamera tidak berfungsi | Vercel menyediakan HTTPS; benarkan akses kamera dalam pelayar. |
| Data tidak sama antara peranti | Versi ini local-first (IndexedDB). Gunakan **Tetapan → Eksport/Import Sandaran**. |

---

## 7. Ringkasan status sambungan

| Komponen | Status |
|---|---|
| Repo GitHub | ✅ `qoryproject/e-persatuan` (public, branch `main`) |
| Kod di GitHub | ✅ Semua fail WebApp + `vercel.json` |
| Konfigurasi Vercel | ✅ `vercel.json` disediakan |
| Import Vercel | ⏳ Perlu login/authorize akaun Vercel anda (langkah 1) |
| Auto-deploy | ✅ Aktif selepas import Git disambungkan |

> Vercel memerlukan pengesahan akaun pemilik. Tiada kata laluan atau token Vercel disimpan dalam repo ini.
