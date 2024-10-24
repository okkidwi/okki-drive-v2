import { createSignal, onCleanup, onMount } from 'solid-js'
import { appCacheDir, appDataDir } from '@tauri-apps/api/path'
import Swal from 'sweetalert2'
import Chart from 'chart.js/auto'
import { invoke } from '@tauri-apps/api'
import './Gamedownloadvertical.css'
import { restartTorrentInfo, setTorrentTrigger } from '../functions/dataStoreGlobal'

const cacheDir = await appCacheDir()
const cacheDirPath = cacheDir

const appDir = await appDataDir()
const dirPath = appDir

function Gameverticaldownloadslide({ isActive, setIsActive }) {
    const [gameInfo, setGameInfo] = createSignal(null)
    const [loading, setLoading] = createSignal(true)
    const [percentage, setPercentage] = createSignal(0)
    const [isPaused, setIsPaused] = createSignal(false)
    const [peerStats, setPeerStats] = createSignal(null)

    let downloadUploadChart
    let bytesChart

    const fetchStats = async () => {
        try {
            const stats = JSON.parse(localStorage.getItem('CDG_Stats'))

            setGameInfo(stats)
            const progressPercentage = (
                (gameInfo()?.progress_bytes / gameInfo()?.total_bytes) *
                100
            ).toFixed(2)
            setPercentage(isNaN(progressPercentage) ? 0 : progressPercentage)
            setLoading(false)
            updateCharts(stats)

            // Fetch peer stats and set them
            const peers = stats?.live?.snapshot?.peer_stats
            setPeerStats(peers ? peers : null)
        } catch (error) {
            console.error('Terjadi kesalahan saat mengambil statistik torrent:', error)
        }
    }

    const finishedGamePopup = () => {
        Swal.fire({
            title: 'Game Selesai',
            text: 'Game ini sudah selesai diunduh, silakan periksa folder Anda dan/atau periksa apakah pengaturan game sudah diinstal, jika ya, biarkan diinstal.',
            icon: 'info',
        })
    }

    const unexpectedGameResumeError = () => {
        Swal.fire({
            title: 'Kesalahan Tak Terduga',
            text: 'Terjadi kesalahan yang tidak terduga saat melanjutkan game, silakan coba melanjutkan pengunduhan dengan mencari game dan mengklik tombol Unduh lagi, ini akan melanjutkannya, jika tidak silakan hubungi kami di Facebook atau Telegram yang tersedia di halaman Pengaturan.',
            icon: 'error',
        })
    }

    const unexpectedGameStopError = () => {
        Swal.fire({
            title: 'Kesalahan Tak Terduga',
            text: 'Terjadi kesalahan yang tidak terduga saat menghentikan game, coba mulai ulang pengunduhan dengan mencari game dan mengklik tombol Unduh lagi, ini akan melanjutkannya, Anda kemudian dapat menghentikannya. Jika tidak berhasil, silakan hubungi kami di Facebook atau Telegram yang tersedia di halaman Pengaturan.',
            icon: 'error',
        })
    }

    const unexpectedGameDeleteError = () => {
        Swal.fire({
            title: 'Kesalahan Tak Terduga',
            text: 'Terjadi kesalahan tak terduga saat menghapus file game, harap periksa apakah Anda tidak menjalankan game atau tidak ada proses apa pun yang merayapi file apa pun (Bisa berupa apa saja yang telah membuka file game, bahkan buku catatan). Jika tidak berhasil, silakan hubungi kami di Facebook atau Telegram yang tersedia di halaman Pengaturan.',
            icon: 'error',
        })
    }

    const handleButtonClick = async () => {
        const currentState = gameInfo().state
        const isFinishedState = gameInfo().finished
        const CTG = localStorage.getItem('CTG')
        let hash = JSON.parse(CTG).torrent_idx
        try {
            if (currentState === 'paused' && !isFinishedState) {
                try {
                    await invoke('api_resume_torrent', { torrentIdx: hash })
                } catch (err) {
                    console.error('Kesalahan Saat Melanjutkan Torrent :', err)
                    if (
                        err.AnyhowError === 'TorrentManager tidak diinisialisasi.'
                    ) {
                        const lastInputPath = localStorage.getItem('LUP')
                        console.log(
                            'TorrentManager tidak diinisialisasi. Menginisialisasinya...'
                        )

                        // Initialize Torrent.
                        try {
                            console.log('Initializing')
                            await invoke('api_initialize_torrent_manager', {
                                downloadPath: lastInputPath,
                                appCachePath: cacheDirPath,
                                appSettingsPath: dirPath,
                            })
                            console.log('Selesai Inisiasi')
                            try {
                                console.log('Melanjutkan')

                                //! ERROR :  Read Below.
                                //TODO: Due to an issue in the librqbit v7.1.0-beta.1 that we are using,we cannot just restart a game by unpausing it, we have to "start" it, we can't do anything but wait for a fix in librqbit.
                                await invoke('api_download_with_args', {
                                    magnetLink: restartTorrentInfo.magnetLink,
                                    downloadFileList:
                                        restartTorrentInfo.fileList,
                                })

                                setTorrentTrigger(true)
                            } catch (error) {
                                console.error(
                                    'Kesalahan Saat Mengalihkan Status Torrent Lagi:',
                                    error
                                )
                                unexpectedGameResumeError()
                            }
                        } catch (error) {
                            console.error(
                                'Kesalahan Saat Menginisialisasi Sesi Torrent:',
                                error
                            )
                        }
                    } else {
                        console.error(
                            'Terjadi kesalahan saat melanjutkan torrent:',
                            err
                        )
                    }
                }
                setIsPaused(false)
            } else if (isFinishedState) {
                finishedGamePopup()
            } else if (currentState === 'live') {
                await invoke('api_pause_torrent', { torrentIdx: hash })
                setIsPaused(true)
            }
        } catch (error) {
            console.error('Terjadi kesalahan saat mengganti status torrent:', error)
        }
    }

    const PauseResumeSvg = () => {
        const iconCorr = () => {
            const state = gameInfo()?.state

            switch (state) {
                case 'paused':
                    return (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-play"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                    )
                default:
                    return (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-pause"><circle cx="12" cy="12" r="10"/><line x1="10" x2="10" y1="15" y2="9"/><line x1="14" x2="14" y1="15" y2="9"/></svg>
                    )
            }
        }

        return (
            <span class="icon" onClick={handleButtonClick}>
                {iconCorr}
            </span>
        )
    }

    const PauseResumeButton = () => {
        const buttonText = () => {
            try {
                const state = gameInfo()?.state
                if (state === null || state === undefined) {
                    return 'Tidak aktif'
                }
                switch (state) {
                    case 'dijeda':
                        return 'Melanjutkan'
                    case 'live':
                        return 'Jeda'
                    case 'menginisialisasi':
                        return 'Memuat...'
                    default:
                        return 'State tidak diketahui'
                }
            } catch (error) {
                console.error('Kesalahan dalam menentukan teks tombol:', error)
                return 'Kesalahan'
            }
        }

        return <button onClick={handleButtonClick}>{buttonText()}</button>
    }

    const updateCharts = (stats) => {
        if (downloadUploadChart && bytesChart) {
            const mbDownloadSpeed = stats?.live?.download_speed?.human_readable
            const mbUploadSpeed = stats?.live?.upload_speed?.human_readable
            const downloadedMB = (stats?.progress_bytes || 0) / (1024 * 1024)
            const uploadedMB = (stats?.uploaded_bytes || 0) / (1024 * 1024)

            downloadUploadChart.data.datasets[0].data.push(
                parseFloat(mbDownloadSpeed).toFixed(2)
            )
            downloadUploadChart.data.datasets[1].data.push(
                parseFloat(mbUploadSpeed).toFixed(2)
            )
            bytesChart.data.datasets[0].data.push(downloadedMB)
            bytesChart.data.datasets[1].data.push(uploadedMB)

            const currentTime = new Date().toLocaleTimeString()
            downloadUploadChart.data.labels.push('')
            bytesChart.data.labels.push('')

            downloadUploadChart.update()
            bytesChart.update()
        }
    }

    onMount(() => {
        fetchStats()
        const intervalId = setInterval(fetchStats, 500)

        if (gameInfo()?.finished) {
            clearInterval(intervalId)
        }
        onCleanup(() => clearInterval(intervalId))

        // Initialize charts
        const ctx1 = document
            .getElementById('downloadUploadChart')
            .getContext('2d')
        downloadUploadChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Kecepatan Unduh (MB/s)',
                        data: [],
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: false,
                        pointStyle: false,
                    },
                    {
                        label: 'Kecepatan Unggah (MB/s)',
                        data: [],
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        fill: false,
                        pointStyle: false,
                    },
                ],
            },
            options: {
                scales: {
                    x: {
                        title: {
                            display: false,
                            text: 'Waktu',
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Kecepatan (MB/s)',
                        },
                    },
                },
            },
        })

        const ctx2 = document.getElementById('bytesChart').getContext('2d')
        bytesChart = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Telah Diunduh MB',
                        data: [],
                        borderColor: 'rgba(144, 238, 144, 1)',
                        backgroundColor: 'rgba(144, 238, 144, 0.2)',
                        fill: false,
                        pointStyle: false,
                    },
                    {
                        label: 'Diunggah MB',
                        data: [],
                        borderColor: 'rgba(221, 160, 221, 1)',
                        backgroundColor: 'rgba(221, 160, 221, 0.2)',
                        fill: false,
                        pointStyle: false,
                    },
                ],
            },
            options: {
                scales: {
                    x: {
                        title: {
                            display: false,
                            text: 'Waktu',
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Megabytes (MB)',
                        },
                    },
                },
            },
        })
    })

    const handleStopTorrent = async () => {
        const CTG = localStorage.getItem('CTG')
        let hash = JSON.parse(CTG)?.torrent_idx
        console.log(hash)
        if (CTG) {
            Swal.fire({
                title: 'Apa Anda yakin?',
                text: "Apakah Anda benar-benar ingin menghapus unduhan saat ini? Tindakan ini akan menghentikan unduhan saat ini tetapi tidak akan menghapus file sehingga Anda masih dapat memulainya nanti.",
                footer: 'Anda juga dapat menghapus file secara langsung dengan mengklik tombol ini <button id="delete-files-btn" class="swal2-styled" style="background-color: red; color: white;">Delete Files</button>!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Ya, hapus itu!',
                cancelButtonText: 'Batal',
                didRender: () => {
                    if (hash) {
                        // Add event listener for the custom "Delete Files" button
                        const deleteFilesBtn =
                            document.getElementById('delete-files-btn')
                        deleteFilesBtn.addEventListener('click', async () => {
                            try {

                                try {
                                    await invoke('api_delete_torrent', {
                                        torrentIdx: hash,
                                    })
                                    Swal.fire({
                                        title: 'Dihapus',
                                        text: 'File unduhan saat ini telah dihapus.',
                                        icon: 'success',
                                    })
                                    localStorage.removeItem('CDG')
                                    localStorage.removeItem('CTG')
                                    window.dispatchEvent(new Event('storage'))
                                } catch(error) {
                                    console.error('Kesalahan Saat Melanjutkan Torrent :', error)
                                    if (
                                        error.AnyhowError === 'TorrentManager tidak diinisialisasi.'
                                    ) {
                                        const lastInputPath = localStorage.getItem('LUP')
                                        console.log(
                                            'TorrentManager tidak diinisialisasi. Menginisialisasinya...'
                                        )
                
                                        // Initialize Torrent.
                                        try {
                                            console.log('Initializing')
                                            await invoke('api_initialize_torrent_manager', {
                                                downloadPath: lastInputPath,
                                                appCachePath: cacheDirPath,
                                                appSettingsPath: dirPath,
                                            })
                                            console.log('Selesai Inisiasi')
                                            try {
                                                console.log('Dihentikan')
            
                                                await invoke('api_stop_torrent', { torrentIdx: hash })
                                                localStorage.removeItem('CDG')
                                                window.dispatchEvent(new Event('storage'))
                                                Swal.fire({
                                                    title: 'Dihapus',
                                                    text: 'Unduhan saat ini telah dihapus.',
                                                    icon: 'success',
                                                })
                                            } catch (error) {
                                                console.error(
                                                    'Kesalahan Saat Menghapus Torrent Lagi:',
                                                    error
                                                )
                                                unexpectedGameResumeError()
                                            }
                                        } catch (err) {
                                            unexpectedGameDeleteError
                                        }
                                    }
                                }
                                


                            } catch (error) {
                                Swal.fire({
                                    title: 'Kesalahan Saat Menghapus File',
                                    text: `Terjadi kesalahan saat menghapus file: ${error}`,
                                    footer: 'Jika Anda tidak memahami kesalahannya, silakan hubungi kami di Facebook atau Telegram.',
                                    icon: 'error',
                                })
                            }
                        })
                    } else {
                        const deleteFilesBtn =
                            document.getElementById('delete-files-btn')
                        deleteFilesBtn.style.backgroundColor = 'gray'
                        deleteFilesBtn.disabled = true
                    }
                },
            }).then(async (result) => {
                if (result.isConfirmed) {
                    // lmao forgot error handling here, added it with also Swal alert :D - carrotrub
                    try {
                        await invoke('api_stop_torrent', { torrentIdx: hash })
                        localStorage.removeItem('CDG')
                        window.dispatchEvent(new Event('storage'))
                        Swal.fire({
                            title: 'Dihapus',
                            text: 'Unduhan saat ini telah dihapus.',
                            icon: 'success',
                        })
                    } catch(error) {
                        console.error('Kesalahan Saat Melanjutkan Torrent :', error)
                        if (
                            error.AnyhowError === 'TorrentManager tidak diinisialisasi.'
                        ) {
                            const lastInputPath = localStorage.getItem('LUP')
                            console.log(
                                'TorrentManager tidak diinisialisasi. Menginisialisasinya...'
                            )
    
                            // Initialize Torrent.
                            try {
                                console.log('Initializing')
                                await invoke('api_initialize_torrent_manager', {
                                    downloadPath: lastInputPath,
                                    appCachePath: cacheDirPath,
                                    appSettingsPath: dirPath,
                                })
                                console.log('Selesai Inisiasi')
                                try {
                                    console.log('Dihentikan')

                                    await invoke('api_stop_torrent', { torrentIdx: hash })
                                    localStorage.removeItem('CDG')
                                    window.dispatchEvent(new Event('storage'))
                                    Swal.fire({
                                        title: 'Dihapus',
                                        text: 'Unduhan saat ini telah dihapus.',
                                        icon: 'success',
                                    })
                                } catch (error) {
                                    console.error(
                                        'Kesalahan Saat Menghentikan Torrent Lagi:',
                                        error
                                    )
                                    unexpectedGameResumeError()
                                }
                            } catch (err) {
                                unexpectedGameStopError()
                            }
                        }
                    }

                }
            })
        } else {
            Swal.fire({
                title: 'Tidak Ada',
                text: 'Tidak ada yang berhenti di sini :D',
                icon: 'question',
            })
        }
    }

    const slideLeft = () => {
        localStorage.setItem('isSidebarActive', false)
        setIsActive = false
        const verdiv = document.querySelector('.sidebar-space')
        verdiv.style = 'display: none'
    }

    // Ensure that the percentage is valid before rendering the component
    if (isNaN(percentage()) || percentage() === null) {
        return null
    }

    return (
        <div
            class="sidebar-space"
            style={{ display: isActive ? 'block' : 'none' }}
        >
            <div class="arrow-container left" onClick={slideLeft}>
                <div class="arrow-down"></div>
            </div>
            <div class="stats-panel">
                <h2>Progress Unduhan Game</h2>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div
                            class="progress"
                            style={{ width: `${percentage()}%` }}
                        ></div>
                        <span class="progress-text">
                            MENGUNDUH {percentage()}%
                        </span>
                        <div class="icons">
                            <span class="icon" onClick={handleStopTorrent}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            </span>
                            <div class="icon-divider"></div>
                            <PauseResumeSvg />
                        </div>
                    </div>
                </div>
                <div className='canvas-container'>
                    <canvas id="downloadUploadChart"></canvas>
                    <canvas id="bytesChart"></canvas>
                </div>
                {/* Display peer stats */}
                <div class="peer-stats-container">
                    <h3>Informasi Peer Torrent:</h3>
                    {peerStats() ? (
                        <>
                            <p>
                                <strong>Peer Terhubung:</strong>{' '}
                                {peerStats().live}
                            </p>
                            <p>
                                <strong>Menghubungkan Peer:</strong>{' '}
                                {peerStats().connecting}
                            </p>
                            <p>
                                <strong>Peer Mati:</strong> {peerStats().dead}
                            </p>
                            <p>
                                <strong>Peer Mengantri:</strong>{' '}
                                {peerStats().queued}
                            </p>
                            <p>
                                <strong>Peer Terlihat:</strong> {peerStats().seen}
                            </p>
                        </>
                    ) : (
                        <p>Tidak ada data peer yang tersedia.</p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Gameverticaldownloadslide
