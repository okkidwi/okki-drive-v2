import WebTorrent from 'webtorrent';
import moment from 'moment';

class TorrentManager {
  constructor() {
    this.torrent = null;
    this.client = null;
    this.torrentInfo = {
      remainingTime: null,
      totalSize: null,
      downloadedSize: null,
      peers: null
    };
  }

  downloadTorrent(magnetLink, gamePath) {
    this.client = new WebTorrent();
    this.client.add(magnetLink, { path: gamePath }, torrent => {
      this.torrent = torrent;

      console.log("downloading");
      console.log(this.torrent.downloaded);

      this.torrent.on('download', () => {
        this.retrieveTorrentInfo();
      });

      this.torrent.on('done', () => {
        console.log('Torrent download finished');
        clearInterval(interval);
      });

      const interval = setInterval(() => {
        this.retrieveTorrentInfo();
        if (this.torrent.progress === 1) {
          clearInterval(interval);
          console.log(this.torrent.length);
        }
      }, 500);

      return this.torrent;
    });
  }

  retrieveTorrentInfo() {
    if (this.torrent) {
      this.torrentInfo.remainingTime = this.torrent.done ? 'Done.' : moment.duration(this.torrent.timeRemaining / 1000, 'seconds').humanize();
      this.torrentInfo.downloadedSize = this.torrent.downloaded;
      this.torrentInfo.totalSize = this.torrent.length;
      this.torrentInfo.peers = this.torrent.numPeers;
    }
    return this.torrentInfo;
  }

  stopTorrent() {
    if (this.client) {
      this.client.destroy(err => {
        if (err) {
          console.error('Kesalahan saat menghentikan klien torrent:', err);
        } else {
          console.log('Klien torrent berhasil dihentikan.');
        }
      });
    } else {
      console.log('Tidak ada klien torrent aktif yang harus dihentikan.');
    }
  }
}

export default TorrentManager;
