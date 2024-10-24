import { createSignal, onMount } from 'solid-js';
import './ChangelogPopup.css';

const ChangelogPopup = () => {
  const [isVisible, setIsVisible] = createSignal(true);
  const [isHidden, setIsHidden] = createSignal(false);

  // Check localStorage on mount to see if the changelog should be shown
  onMount(() => {
    const hideChangelog = localStorage.getItem('hideChangelog') === 'true';
    setIsHidden(hideChangelog);
    setIsVisible(!hideChangelog);
  });

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleCheckboxChange = (e) => {
    const shouldHide = e.target.checked;
    setIsHidden(shouldHide);
    localStorage.setItem('hideChangelog', shouldHide);
  };

  return (
    <>
      {isVisible() && (
        <div class="popup-container">
          <div class="changelog-content">
            <h1>Catatan Perubahan</h1>
            <p class="subheading">Temukan fitur, peningkatan, dan perbaikan terbaru.</p>

            <div class="changelog-item">
              <div class="date">24 Oktober 2024 - v1.1.0</div>
              <ul class="bullet-list">
                <li><span class="label new">Fitur Baru:</span>
                  <ul>
                        <li>Menambahkan fungsi pembaruan otomatis</li>
                        <li>Memperkenalkan fitur StopTorrent untuk menghapus file yang diunduh bersamaan dengan menghentikan torrent</li>
                        <li>Mengimplementasikan filter dropdown untuk pemilihan genre game</li>
                        <li>Merancang fungsi dalam Rust untuk memeriksa kecerahan gambar, secara dinamis mengubah judul kategori berdasarkan kecerahan</li>
                        <li>Menambahkan rahasia ke variabel lingkungan untuk keamanan yang lebih baik</li>
                        <li>Meningkatkan desain slider dengan ikon penyaringan baru yang memungkinkan pengguna untuk menyaring game berdasarkan genre</li>
                        <li>Menambahkan opsi konfigurasi torrent yang lebih baik dalam format TOML</li>
                        <li>Menambahkan bagian Informasi Peers dalam slide vertikal</li>
                        <li>Menambahkan popup untuk Game Selesai dan Kesalahan Resume yang Tidak Terduga</li>
                        <li>Memungkinkan pengguna untuk memulai ulang torrent melalui slide vertikal</li>
                        <li>Merombak halaman Pengaturan dengan pemilih file, penanganan gambar latar belakang, dan penghapusan jalur input</li>
                        <li>Menambahkan popup catatan perubahan untuk menampilkan pembaruan</li>
                        <li>Mengimplementasikan peringatan kesalahan jaringan</li>
                        <li>Mempersiapkan perubahan gambar latar belakang di pembaruan mendatang</li>
                        <li>Memulai fitur penyegaran manual untuk pembaruan konten game</li>
                        <li>Fungsionalitas filter NSFW</li>
                        <li>Pemeriksa aman untuk JSON</li>
                        <li>Opsi pembaruan beta yang tersembunyi</li>
                        <li>Notifikasi konfirmasi untuk pengaturan</li>
                        <li>Meningkatkan penanganan kesalahan offline</li>
                  </ul>
                </li>
                <li><span class="label bugfix">Perbaikan Bug:</span>
                  <ul>
                        <li>Memperbaiki masalah dengan menghentikan game dari slide vertikal tanpa menginisialisasi torrent.</li>
                        <li>Memperbaiki masalah ukuran yang dikodekan keras, terutama untuk sidebar</li>
                        <li>Menyelesaikan masalah pemotongan dengan judul game panjang yang tidak pas</li>
                        <li>Mengoreksi masalah tumpang tindih Z-index dengan sidebar</li>
                        <li>Memperbaiki reaktivitas perpustakaan untuk meningkatkan kinerja</li>
                        <li>Menangani inkonsistensi bayangan kotak acak di seluruh elemen</li>
                        <li>Memperbaiki masalah hover untuk gambar game di slider</li>
                        <li>Meningkatkan keterbacaan dan fungsionalitas CSS</li>
                        <li>Meningkatkan hover ikon media sosial (Facebook & Telegram)</li>
                        <li>Memperbaiki navigasi tautan berguna sidebar untuk pemeliharaan yang lebih baik</li>
                        <li>Memperbaiki masalah penggantian jalur</li>
                        <li>Mengoreksi tipe bilah pencarian untuk validasi input yang lebih baik</li>
                        <li>Memperbaiki kesalahan yang dapat dihindari dengan `?`</li>
                        <li>Memperbaiki masalah AppCache di JSX</li>
                        <li>Memperbaiki kompatibilitas AppDir dan AppConfig (Unix-Based OS dan Windows)</li>
                        <li>Masalah pengaturan otomatisasi teratasi</li>
                        <li>Meningkatkan akurasi pemindaian tag</li>
                        <li>Masalah tampilan gambar diperbaiki untuk repack populer</li>
                        <li>Mengoreksi masalah ketahanan dan pengenalan file</li>
                        <li>Memperbaiki masalah tampilan 0MB/s</li>
                  </ul>
                </li>
                <li><span class="label improvement">Peningkatan:</span>
                  <ul>
                        <li>Menghapus sebagian besar pendengar acara untuk optimisasi yang lebih baik</li>
                        <li>Membuat muat ulang lebih cepat untuk mencegah masalah dari pengguna yang mengklik tombol "Simpan Pengaturan" terlalu sering</li>
                        <li>Mengganti kotak centang biasa dengan saklar untuk tampilan yang lebih modern dan memperbaiki desain pengaturan</li>
                        <li>Menyembunyikan gulir sidebar untuk desain yang lebih bersih</li>
                        <li>Meningkatkan bilah progress unduhan dengan penataan ikon yang lebih baik</li>
                        <li>Menyatukan set ikon aplikasi menjadi Lucid Icons untuk penampilan yang konsisten</li>
                        <li>Menegakkan penggunaan fontsource NPM untuk font, melarang perubahan langsung pada font-family aplikasi</li>
                        <li>Mengatur ulang CSS slider ke file khusus untuk pemeliharaan yang lebih baik</li>
                        <li>Mengoptimalkan otomatisasi UI dan meningkatkan logika untuk interaksi yang lebih lancar</li>
                        <li>Meningkatkan kecepatan pemindaian sekitar 70% untuk pengambilan gambar yang lebih cepat</li>
                        <li>Mengompresi permintaan dengan Brotli, Gzip, atau Deflate</li>
                        <li>Memulai migrasi ke Stores sebagai pengganti localStorage</li>
                        <li>Menambahkan penyimpanan `restartTorrentInfo`</li>
                        <li>Meningkatkan keterbacaan HTML</li>
                        <li>Penyesuaian spasi pada catatan perubahan</li>
                        <li>Menghentikan penggunaan localStorage</li>
                        <li>Meningkatkan logging selama pemindaian dan tugas jaringan untuk debugging yang lebih baik</li>
                        <li>Mempersiapkan basis kode untuk pembaruan komponen UI tanpa memuat ulang jendela sepenuhnya</li>
                        <li>Mengoptimalkan kode untuk pemeliharaan dan kinerja yang lebih baik</li>
                        <li>Menambahkan penggunaan Clippy untuk kode yang lebih bersih</li>
                        <li>Mengupgrade ke librqbit 7.0.1</li>
                        <li>Menambahkan fungsi asinkron untuk kinerja yang lebih baik</li>
                        <li>Fitur logging dan CTG (Game Torrenting Saat Ini)</li>
                        <li>Meningkatkan penanganan acara dan ketahanan DHT</li>
                        <li>Pemeriksa aman untuk JSON</li>
                  </ul>
                </li>
              </ul>
            </div>


            <div class="checkbox-container">
              <label>
                <input 
                  type="checkbox" 
                  checked={isHidden()} 
                  onChange={handleCheckboxChange} 
                />
                Jangan tampilkan lagi
              </label>
            </div>

            <button class="close-btn" onClick={handleClose}>Tutup</button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChangelogPopup;
