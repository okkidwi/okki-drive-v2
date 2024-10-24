import { createSignal, createEffect, onCleanup } from 'solid-js';
import { Show } from "solid-js";
import Swal from 'sweetalert2';
import readFile from '../functions/readFileRust';
import clearFile from '../functions/clearFileRust';
import Carousel from '../Carousel-01/Carousel';
import { invoke } from '@tauri-apps/api/tauri';
import { translate } from '../../translation/translate';
import { open } from '@tauri-apps/api/dialog';
import { appCacheDir, appDataDir } from '@tauri-apps/api/path';
import { writeFile, readTextFile, removeFile } from '@tauri-apps/api/fs';
import './Gamehorizontal.css';
import { globalTorrentInfo, setGlobalTorrentInfo, setTorrentTrigger } from '../functions/dataStoreGlobal';
import { setRestartTorrentInfo, restartTorrentInfo } from '../functions/dataStoreGlobal';

const cacheDir = await appCacheDir();
const cacheDirPath = cacheDir;

console.log("App Cache :", cacheDir)

const appDir =  await appDataDir();
const dirPath = appDir;

const singularGamePath = `${dirPath}tempGames/single_game_images.json`;
const ftgConfigPath = `${dirPath}fitgirlConfig/settings.json`;
const gameImagesCache = `${cacheDirPath}image_cache.json`;

const GameHorizontalSlide = ({ gameTitlePromise, filePathPromise, gameLinkPromise }) => {
    const [gameInfo, setGameInfo] = createSignal(null);
    const [loading, setLoading] = createSignal(true);
    const [isDescOpen, setDescOpen] = createSignal(false);
    const [additionalImages, setAdditionalImages] = createSignal([]);
    const [showPlaceholder, setShowPlaceholder] = createSignal(true);
    const [externalCheckboxes, setExternalCheckboxes] = createSignal([]);
    const [searchResultDisplay, setSearchResultDisplay] = createSignal(false);    // False = None, True = Flex
    
    var jsonCheckingTimeoutID;
    var imagesCheckingTimeoutID;
    var errorCheckingTimeoutID;
    var placeholderTimeoutID;

    setSearchResultDisplay(false);
    let searchResultsDiv = document.getElementById('search-results');
    
    if(searchResultsDiv.style.display === 'none') {
        setSearchResultDisplay(false);
    } else {
        searchResultsDiv.style.display = 'none'
        setSearchResultDisplay(true);
    }


    async function torrentDownloadPopup(cdgGameMagnet, cdgGameTitle, cdgGameImage) 
    {
        const lastInputPath = localStorage.getItem('LUP');
        const currentCDG = JSON.parse(localStorage.getItem('CDG'));
        const currentCDGStats = JSON.parse(localStorage.getItem('CDG_Stats')) || [];

        

        console.log(currentCDGStats);
    
        const infoSingleCDG = {
            gameMagnet: cdgGameMagnet,
            gameTitle: cdgGameTitle,
            gameImage: cdgGameImage
        };
    

        // TODO: Add default state of cdgGame to paused in case of leaving the dialog during download.
        if (currentCDG) {
            if (currentCDG[0].gameMagnet === cdgGameMagnet && currentCDGStats.state !== "paused" && currentCDGStats.state) {
                Swal.fire({
                    title: "Informasi",
                    text: "Game ini sudah diunduh.",
                    icon: "info"
                });
                return;
            } else if (currentCDG[0].gameMagnet === cdgGameMagnet && (!currentCDGStats.state || currentCDGStats.state === "paused")) {
                Swal.fire({
                    title: 'Lanjutkan unduhan Anda?',
                    text: "Apakah Anda ingin melanjutkan unduhan saat ini??",
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonText: 'Ya, lanjutkan lagi!',
                    cancelButtonText: 'Batal'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        startDownloadProcess();
                    }
                });
            } else {
                Swal.fire({
                    title: "Kesalahan",
                    text: "Game lain sedang diunduh.",
                    icon: "error",
                    showCancelButton: true,
                    confirmButtonText: 'Hapus Unduhan Saat Ini',
                    cancelButtonText: 'Batal'
                }).then((result) => {
                    if (result.isConfirmed) {
                        Swal.fire({
                            title: 'Apa Anda yakin?',
                            text: "Apakah Anda benar-benar ingin menghapus unduhan saat ini? Tindakan ini akan menghentikan unduhan saat ini tetapi tidak akan menghapus file sehingga Anda masih dapat memulainya nanti.",
                            footer: 'Anda juga dapat menghapus file secara langsung dengan mengklik tombol ini <button id="delete-files-btn" class="swal2-styled" style="background-color: red; color: white;">Delete Files</button>!',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Ya, hapus itu!',
                            cancelButtonText: 'Batal',
                            didRender: () => {
                                let CTG = localStorage.getItem('CTG');
                                let hash = JSON.parse(CTG).torrent_idx;
        
                                if (hash) {
                                    // Add event listener for the custom "Delete Files" button
                                    const deleteFilesBtn = document.getElementById('delete-files-btn');
                                    deleteFilesBtn.addEventListener('click', async () => {
                                        try {
                                            await invoke('api_delete_torrent', { torrentIdx: hash });
                                            Swal.fire({
                                                title: "Dihapus",
                                                text: "File unduhan saat ini telah dihapus.",
                                                icon: "success"
                                            }).then(()=> {
                                                localStorage.removeItem('CTG');
                                                startDownloadProcess();
                                            });
                                        } catch (error) {
                                            Swal.fire({
                                                title: "Kesalahan Saat Menghapus File",
                                                text: `Terjadi kesalahan saat menghapus file: ${error}`,
                                                footer: "Jika Anda tidak memahami kesalahannya, silakan hubungi kami di Facebook atau Telegram.",
                                                icon: 'error'
                                            });
                                        }
                                    });
                                } else {
                                    const deleteFilesBtn = document.getElementById('delete-files-btn');
                                    deleteFilesBtn.style.backgroundColor = 'gray';
                                    deleteFilesBtn.disabled = true;
                                }
                            }
                        }).then((result) => {
                            if (result.isConfirmed) {
                                localStorage.removeItem('CDG');
                                Swal.fire({
                                    title: "Dihapus",
                                    text: "Unduhan saat ini telah dihapus.",
                                    icon: "success"
                                }).then(() => {
                                    startDownloadProcess();
                                });
                            }
                        });
                    }
                });
                return;
            }
        } else {
            startDownloadProcess();
        }
    
        async function startDownloadProcess() {
            const pathResult = await Swal.fire({
                title: 'Dimana Anda ingin mengunduh game ini??',
                icon: 'question',
                html: 
                    `<input type="text" id="gamePathInput" class="swal2-input" placeholder="Game Path">
                     <button id="selectPathButton" class="swal2-confirm swal2-styled">Pilih Jalur</button>`,
                showCancelButton: true,
                confirmButtonText: 'Unduh!',
                didOpen: () => {
                    if (lastInputPath) {
                        document.getElementById('gamePathInput').value = lastInputPath;
                    }
        
                    document.getElementById('selectPathButton').addEventListener('click', async (event) => {
                        event.preventDefault();
                        const selected = await open({
                            directory: true,
                            multiple: false,
                            defaultPath: lastInputPath || '',
                        });
                        if (selected) {
                            document.getElementById('gamePathInput').value = selected;
                        }
                    });
                }
            });
        
            if (pathResult.isConfirmed) {
                const inputPath = document.getElementById('gamePathInput').value;
                if (inputPath) {
                    try {
                        const exists = await invoke('check_folder_path', { path: inputPath });
                        if (exists) {
                            localStorage.setItem('LUP', inputPath);
        
                            // Update the game path in settings.json
                            await updateGamePathInSettings(inputPath);
        
                            // Declare fileList in a higher scope
                            let fileList = [];  
                            const fileContentObj = await readFile(ftgConfigPath);
                            const fileContent = fileContentObj.content;
                            const configData = JSON.parse(fileContent);
                            let should_bool_limit = configData.two_gb_limit;
                            await invoke('api_initialize_torrent_manager', {downloadPath: inputPath, appCachePath: cacheDirPath, appSettingsPath: dirPath})
                            fileList = await invoke('api_get_torrent_details', {
                                magnetLink: cdgGameMagnet,
                            });
                            
                            console.log("Daftar file:", fileList);
                            
                            let correctFileList = JSON.stringify(fileList)
                            if (!correctFileList) {
                        
                                Swal.fire({
                                    title: "Kesalahan Saat Memulai Pengunduhan!",
                                    text: "Masalah mungkin muncul karena tautan magnet yang salah.",
                                    icon: "error"
                                })
                                return;
                            }
                            localStorage.setItem('CTG', correctFileList);

                            // Add the new checkboxes here
                            const externalCheckboxesHtml = `
                                <div>
                                    <input type="checkbox" id="downloadDirectX" value="Unduh DirectX">
                                    <label for="downloadDirectX">Unduh DirectX</label>
                                </div>
                                <div>
                                    <input type="checkbox" id="downloadMSCpp" value="Unduh Microsoft C++">
                                    <label for="downloadMSCpp">Unduh Microsoft C++</label>
                                </div>
                            `;
        

                            const fileCheckboxes = fileList.torrent_files_names.map((file, index) => {
                                const isOptional = file.includes('optional');
                                const isSelective = file.includes('fg-selective');
                                
                                let label = file;
                            
                                // Customize labels for fg-selective and fg-optional files
                                if (isSelective) {
                                    // Extract language or feature from the filename
                                    const languageOrFeature = file.match(/fg-selective-(.*)\.bin/i);
                                    label = languageOrFeature ? `Select ${languageOrFeature[1].replace(/-/g, ' ').charAt(0).toUpperCase() + languageOrFeature[1].replace(/-/g, ' ').slice(1)} Language` : 'Select Language';
                                } else if (isOptional) {
                                    label = `Optional: ${file.replace(/fg-optional-|\.bin/g, '').replace(/-/g, ' ').charAt(0).toUpperCase() + file.replace(/fg-optional-|\.bin/g, '').replace(/-/g, ' ').slice(1)}`;
                                }
                            
                                return `
                                    <div style="display: ${isOptional || isSelective ? 'block' : 'none'};">
                                        <input type="checkbox" id="file${index}" value="${index}" ${!isOptional && !isSelective ? 'checked' : ''}>
                                        <label for="file${index}">${label}</label>
                                    </div>
                                `;
                            }).join('');
                            
                            const dividerHtml = `
                            <div style="border-top: 1px solid #52515185; margin: 10px 0;"></div>
                            `;
                            
                            const { value: selectedFiles } = await Swal.fire({
                                title: "Select Files to Download",
                                html: 
                                    `<form id="fileSelectionForm">
                                        ${externalCheckboxesHtml}
                                        ${dividerHtml}
                                        ${fileCheckboxes}
                                    </form>`,
                                confirmButtonText: 'Unduh File Pilihan',
                                showCancelButton: true,
                                preConfirm: () => {
                                    const form = document.getElementById('fileSelectionForm');
                            
                                    // Check the status of DirectX and Microsoft C++ checkboxes
                                    const directXCheckbox = form.querySelector('#downloadDirectX');
                                    const msvcCheckbox = form.querySelector('#downloadMSCpp');
                            
                                    const uncheckedOptions = [];
                            
                                    if (directXCheckbox.checked) {
                                        uncheckedOptions.push("directx");
                                    } else {
                                        uncheckedOptions.push("")
                                    }
                                    if (msvcCheckbox.checked) {
                                        uncheckedOptions.push("microsoft");
                                    } else {
                                        uncheckedOptions.push("")
                                    }
                            
                                    // Update the signal with unchecked options
                                    setExternalCheckboxes(uncheckedOptions);
                            
                                    // Gather selected files from form
                                    const selected = Array.from(form.querySelectorAll('input[type="checkbox"]:checked'))
                                    .map(checkbox => parseInt(checkbox.value, 10)) // Convert strings to numbers
                                    .filter(value => !isNaN(value)); // Ensure NaN values are filtered out
                            
                                    console.log("File yang dipilih:", selected);
                                    return selected;
                                }
                            });
        
                            if (selectedFiles) {
                                console.log("File dipilih untuk diunduh:", selectedFiles);
                                // Send the selected files to the backend

                                console.log('File dipilih untuk diunduh:', selectedFiles);
        
                                // Log the external checkboxes signal value
                                console.log('Kotak centang eksternal:', externalCheckboxes());
                                

                                const CTG = localStorage.getItem('CTG');
                                let hash = JSON.parse(CTG).torrent_idx;
                                let outputFolder = JSON.parse(CTG).torrent_output_folder;

                                setGlobalTorrentInfo({
                                    torrentIdx: hash,
                                    torrentOutputFolder: outputFolder,
                                    checkboxesList: externalCheckboxes(),
                                    twoGbLimit: should_bool_limit
                                });
                                
                                await invoke('api_download_with_args', {
                                    magnetLink: cdgGameMagnet,
                                    downloadFileList: selectedFiles
                                })

                                

                                setRestartTorrentInfo({
                                    magnetLink: cdgGameMagnet,
                                    fileList: selectedFiles
                                })
                                
                                Swal.fire({
                                    title: "Mulai Unduh!",
                                    text: "File yang dipilih sekarang sedang diunduh.",
                                    icon: "success"
                                }).then(() => {
                                    localStorage.setItem('CDG', JSON.stringify([infoSingleCDG]));  // Store only the current game
                                    
                                });
                                
                                setTorrentTrigger(true);
                            } 
                        } else {
                            Swal.fire({
                                title: "KESALAHAN: JALUR TIDAK ADA",
                                text: "Jalur Anda tidak ada, silakan gunakan tombol 'Pilih Jalur' untuk memastikan Anda menggunakan jalur yang benar.",
                                icon: "error"
                            });
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        Swal.fire({
                            title: "KESALAHAN: JALUR TIDAK VALID",
                            text: "Terjadi kesalahan saat memeriksa jalur, silakan coba lagi.",
                            icon: "error"
                        });
                    }
                } else {
                    Swal.fire({
                        title: "KESALAHAN: JALUR KOSONG",
                        text: "Jalur Anda kosong, silakan gunakan tombol dialog untuk memastikan Anda menggunakan jalur.",
                        icon: "error"
                    });
                }
            }
        }
    }

    async function updateGamePathInSettings(newPath) {
        try {
            const fileContentObj = await readFile(ftgConfigPath);
            const fileContent = fileContentObj.content;
            const configData = JSON.parse(fileContent);

            // Update the gamePath in the config
            configData.defaultDownloadPath = newPath;

            // Write the updated config back to the file
            await writeFile(ftgConfigPath, JSON.stringify(configData, null, 2));
        } catch (error) {
            console.error('Gagal memperbarui settings.json:', error);
            Swal.fire({
                title: "KESALAHAN: GAGAL MEMPERBARUI JALUR GAME",
                text: "Terjadi kesalahan saat memperbarui jalur game di file pengaturan.",
                icon: "error"
            });
        }
    }
    
    async function fetchGameInfo(title, filePath) {
        try {
            const fileContentObj = await readFile(filePath);
            const fileContent = fileContentObj.content;
            const gameData = JSON.parse(fileContent);
            let game = gameData.find(game => game.title === title);

            if (game && game.img) {
                // Check if game.img contains a comma
                const commaIndex = game.img.indexOf(',');
                if (commaIndex !== -1) {
                    // Get the part after the comma
                    game.img = game.img.substring(commaIndex + 1).trim();
                }
            }
            console.log(gameData)
            console.log(title)
            setGameInfo(game);
            setLoading(false);
            const horizontalSlide = document.querySelector('.horizontal-slide');
            horizontalSlide.style.transform = 'translateY(0)';
        } catch (error) {
            console.error('Terjadi kesalahan saat mengambil info game:', error);
            setLoading(false);
        }
    }

    async function fetchAdditionalImages() {

        async function checkImages(url) {
            try {
                const cacheFileContentObj = await readFile(gameImagesCache);
                const cacheFileContent = cacheFileContentObj.content;

                let imagesCache;

                try {
                    imagesCache = JSON.parse(cacheFileContent);
                } catch (parseError) {
                    console.log("JSON Cache Persisten Tidak Valid");
                    return;
                }

                if (imagesCache[url]) {
                    setAdditionalImages(imagesCache[url]);
                    setShowPlaceholder(false);
                } else {
                    console.log("Tidak ditemukan dalam cache persisten, akan memulai fungsi.");
                    imagesCheckingTimeoutID = setTimeout(checkImages.bind(null, url), 500);
                }

            } catch (error) {
                throw new Error(error);
            }
 
        }
    
        try {

            await checkImages(gameLinkPromise);
        } catch (error) {
            console.error('Terjadi kesalahan saat mengambil gambar tambahan:', error);
        }
    }

    createEffect(async () => {
        const gameTitle = await gameTitlePromise;
        const filePath = await filePathPromise;
        if (gameTitle && filePath) {
            fetchGameInfo(gameTitle, filePath);
            try {
                fetchAdditionalImages();
                const body = document.body;
                body.style = 'overflow-y : hidden;'
            } catch (error) {
                throw new Error(error);
            }
        }
    });

    // Set a timeout to remove the placeholder after 30 seconds
    placeholderTimeoutID = setTimeout(() => {
        setShowPlaceholder(false);
    }, 20000);

    onCleanup(() => {
        clearTimeout(jsonCheckingTimeoutID);
        clearTimeout(errorCheckingTimeoutID);
        clearTimeout(imagesCheckingTimeoutID);
        clearTimeout(placeholderTimeoutID);
    });

    function cutTheDescription(description) {
        if (!description) {
            return { repackDescription: 'Deskripsi tidak tersedia', officialDescription: 'Deskripsi tidak tersedia' };
        }

        const repackIndex = description.indexOf('Fitur Repack');
        const gameDescriptionIndex = description.indexOf('\nDeskripsi Game\n');

        if (repackIndex !== -1 && gameDescriptionIndex !== -1) {

            const repackDescription = description.substring(repackIndex, gameDescriptionIndex).trim();
            const officialDescription = description.substring(gameDescriptionIndex + '\nDeskripsi Game\n'.length).trim();
            return { repackDescription, officialDescription };

        } else {
            return { repackDescription: description.trim(), officialDescription: '' };
        }
    }

    function extractDetails(description) {
        let genresTagsMatch = description.match(/Genre\/Tag:\s*([^\n]+)/);
        let companiesMatch = description.match(/Perusahaan:\s*([^\n]+)/);
        if (companiesMatch === null) {
            companiesMatch = description.match(/Perusahaan:\s*([^\n]+)/);
        }
        const languageMatch = description.match(/Bahasa:\s*([^\n]+)/);
        const originalSizeMatch = description.match(/Ukuran Asli:\s*([^\n]+)/);
        const repackSizeMatch = description.match(/Ukuran Repack:\s*([^\n]+)/);

        return {
            'Genre/Tags:': genresTagsMatch ? genresTagsMatch[1].trim() : 'N/A',
            Companies: companiesMatch ? companiesMatch[1].trim() : 'N/A',
            Language: languageMatch ? languageMatch[1].trim() : 'N/A',
            OriginalSize: originalSizeMatch ? originalSizeMatch[1].trim() : 'N/A',
            RepackSize: repackSizeMatch ? repackSizeMatch[1].trim() : 'N/A',
        };
    }

    function toggleDescription() {
        setDescOpen(!isDescOpen());
    }

    async function clearAllTimeoutsID() {
        clearTimeout(jsonCheckingTimeoutID);
        clearTimeout(errorCheckingTimeoutID);
        clearTimeout(imagesCheckingTimeoutID);
    }
    
    async function slideDown() {
        const horizontalSlide = document.querySelector('.horizontal-slide');
        horizontalSlide.style.transform = 'translateY(100%)';
        horizontalSlide.addEventListener('transitionend', () => {
            horizontalSlide.remove();
        });
        const body = document.body;
        body.style = '';
        
        await invoke(`stop_get_games_images`);
        await clearAllTimeoutsID();
        if(searchResultDisplay()) {
            document.getElementById('search-results').style.display = 'flex';
        } else {
            return;
        }

        await clearFile(singularGamePath)
        
    }

    return (
        <div class={`horizontal-slide`}>
            <div class="arrow-container" onClick={slideDown}>
                <div class="arrow-down"></div>
            </div>
            {loading() ? (
                <p>Memuat...</p>
            ) : (
                gameInfo() && (
                    <div class="game-info">
                        <div class="header-horizontal-game-info">
                            <div class="header-horizontal-game-info-logo-title" onClick={slideDown}>
                                <img src={gameInfo().img} alt={`${gameInfo().title} logo`} class="game-logo" />
                                <h1 class="game-title">{gameInfo().title.toUpperCase()}</h1>
                            </div>
                            <button class="download-btn" onClick={() => torrentDownloadPopup(gameInfo().magnetlink, gameInfo().title, gameInfo().img)}>Unduh Game</button>
                        </div>
                        <div class="body-horizontal-game-info">
                            <div class="description-section">
                                <div class={`game-description ${isDescOpen() ? 'open' : ''}`}>
                                    {cutTheDescription(gameInfo().desc).officialDescription}
                                </div>
                                <span class="read-more" onClick={toggleDescription}>
                                    {isDescOpen() ? 'Baca lebih sedikit...' : 'Baca lebih banyak...'}
                                </span>
                                <div class="repack-description">
                                    {Object.entries(extractDetails(gameInfo().desc)).map(([title, description], index) => (
                                        <DescriptionSection
                                            key={title}
                                            title={index === 0 ? title : title.replace(/(?!^)([A-Z])/g, ' $1')}
                                            description={description}
                                        />
                                    ))}
                                </div>
                            </div>
                            <Show when={showPlaceholder() && additionalImages().length === 0}>
                                <div class="image-placeholder">
                                    {/* Placeholder content */}
                                </div>
                            </Show>
                            <div class="images-section">
                                {additionalImages().length > 0 && (
                                    <Carousel images={additionalImages()} />
                                )}
                            </div>
                        </div>
                    </div>
                )
            )}
        </div>
    );
};

const DescriptionSection = ({ title, description }) => (
    <div class="description-box">
        <p>
            <span class="descriptionUniqueTitle">{title} </span>
            <span class="descriptionUniqueContent">{description}</span>
        </p>
    </div>
);

export default GameHorizontalSlide;
