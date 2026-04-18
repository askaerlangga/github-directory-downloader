# GitHub Directory Downloader (Web Statis)

Aplikasi ini memungkinkan Anda untuk mengunduh direktori spesifik dari repositori GitHub sebagai file ZIP tanpa perlu mengkloning seluruh repositori.

## Cara Penggunaan
1. Buka file `index.html` di browser Anda (atau host di GitHub Pages/Netlify).
2. Masukkan URL folder GitHub yang ingin diunduh.
   - Contoh: `https://github.com/OCA/web/tree/18.0/web_responsive`
3. Klik tombol **Unduh ZIP**.
4. Tunggu hingga proses selesai dan file ZIP akan terunduh secara otomatis.

## Fitur
- **Pure Frontend:** Tidak ada server backend, semua diproses di browser.
- **Fast:** Menggunakan GitHub Git Trees API untuk efisiensi request.
- **Modern UI:** Desain responsif dengan Glassmorphism style.
- **JSZip:** Kompresi dilakukan langsung di sisi klien.

## Catatan
- GitHub API memiliki limit 60 request per jam untuk pengguna yang tidak terautentikasi.
- Hanya berfungsi untuk repositori publik.
