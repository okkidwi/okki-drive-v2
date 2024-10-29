import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { invoke } from '@tauri-apps/api/tauri';
import './Gamehub.css';
import Newgames from '../../components/Newgames-01/Newgames';
import Popularrepacks from '../../components/Popularrepacks-01/Popularrepacks';
import UpdatedGames from '../../components/Updatedrepacks-01/Updatedrepacks';
import clearFile from '../../components/functions/clearFileRust';
import { appDataDir } from "@tauri-apps/api/path";
import { readTextFile, writeTextFile, exists } from "@tauri-apps/api/fs";
import { createDir } from "@tauri-apps/api/fs";
import { listen, emit } from '@tauri-apps/api/event';

function Gamehub() {
    const defaultSettings = {
        defaultDownloadPath: localStorage.getItem('LUP') || "", 
        autoClean: true,
        hoverTitle: true,
        autoInstall: true,
        importPath: localStorage.getItem('LIP') || "",
        two_gb_limit: true,
        hide_nsfw_content: false,
        background_image_path: localStorage.getItem('LBIP') || "",
        background_image_path_64: localStorage.getItem('LBIP_PATH_64') || "",
    };

    const [settings, setSettings] = createSignal(defaultSettings); 
    const [backgroundMainBrightness, setBackgroundMainBrightness] = createSignal("dark");

    onMount(() => {
        console.log('Gamehub component mounted');

        // Load settings at startup
        loadSettings().then((loadedSettings) => {
            console.log("Gamehub: Pengaturan dimuat saat memulai:", loadedSettings);
            setSettings(loadedSettings); // Update settings signal with loaded settings
        }).catch((error) => {
            console.error("Gamehub: Kesalahan memuat pengaturan saat memulai:", error);
        });

        let gamehubDiv = document.querySelector('.gamehub-container');
        let libraryDiv = document.querySelectorAll('.launcher-container');
        let settingsDiv = document.querySelectorAll('.settings-page');

        if (gamehubDiv) {
            let gamehubLinkText = document.querySelector('#link-gamehub');
            gamehubLinkText.style.backgroundColor = '#ffffff0d';
            gamehubLinkText.style.borderRadius = '5px';
        }

        if (libraryDiv) {
            let libraryLinkText = document.querySelector('#link-library');
            libraryLinkText.style.backgroundColor = '';
        }

        if (settingsDiv) {
            let gamehubLinkText = document.querySelector('#link-settings');
            gamehubLinkText.style.backgroundColor = '';
        }
    });

    // Function to load settings from the JSON file, or create it if not present
    async function loadSettings() {
        const configDir = await appDataDir();
        const dirPath = `${configDir.replace(/\\/g, '/')}/fitgirlConfig`; // Directory path
        const settingsPath = `${dirPath}/settings.json`; // Settings file path

        try {
            console.log("Gamehub: Memuat pengaturan dari:", settingsPath);

            // Check if the directory exists, and if not, create it
            const dirExists = await exists(dirPath);
            if (!dirExists) {
                await createDir(dirPath, { recursive: true });
                console.log("Gamehub: Direktori yang dibuat:", dirPath);
            }

            // Check if the settings file exists
            const fileExists = await exists(settingsPath);
            if (!fileExists) {
                await writeTextFile(settingsPath, JSON.stringify(defaultSettings, null, 2));
                console.log("Gamehub: Membuat file pengaturan dengan pengaturan default:", defaultSettings);
                return defaultSettings;
            } else {
                console.log("Gamehub: File pengaturan ada:", settingsPath);
            }

            // If the file exists, read and parse it
            const json = await readTextFile(settingsPath);
            return JSON.parse(json);
        } catch (error) {
            console.error("Gamehub: Gagal memuat pengaturan:", error);
            return defaultSettings;
        }
    }

    const singularGamePath = '../src/temp/singular_games.json';

    createEffect(async () => {
        await clearFile(singularGamePath);
        invoke('stop_get_games_images');
    });

    // Function to apply random image background
    async function randomImageFinder() {
        const imageElements = document.querySelectorAll(".gamehub-container img");
        if (imageElements.length > 0) {
            const randomIndex = Math.floor(Math.random() * imageElements.length);
            const selectedImageSrc = imageElements[randomIndex].getAttribute('src');

            const fitgirlLauncher = document.querySelector('.gamehub-container');
            const scrollPosition = window.scrollY || document.documentElement.scrollTop;

            const docBlurOverlay = document.querySelector('.blur-overlay');
            if (docBlurOverlay != null) {
                docBlurOverlay.remove();
            }

            // const docColorFilterOverlay = document.querySelector('.color-blur-overlay');
            // if (docColorFilterOverlay === null) {
            //     const colorFilterOverlay = document.createElement('div');
            //     colorFilterOverlay.className = 'color-blur-overlay';
            //     fitgirlLauncher.appendChild(colorFilterOverlay);
            // }

            const blurOverlay = document.createElement('div');
            blurOverlay.className = 'blur-overlay';
            fitgirlLauncher.appendChild(blurOverlay);
            blurOverlay.style.backgroundColor = `rgba(0, 0, 0, 0.4)`;
            blurOverlay.style.backgroundImage = `url(${selectedImageSrc})`;
            blurOverlay.style.filter = 'blur(15px)';
            blurOverlay.style.top = `-${scrollPosition}px`;

            try {

                // let brightnessResult = await invoke('analyze_image_lightness', {imageUrl : selectedImageSrc} );
                // if (brightnessResult === 'light') {
                //     setBackgroundMainBrightness('light')
                //     console.log("light")
                // } else if (brightnessResult === 'dark') {
                //     setBackgroundMainBrightness("dark")
                //     console.log("dark")
                // } else {
                //     console.log("weird")
                // }
            } catch (error) {

}

        }
    }

    createEffect(() => {
        const title_category = document.querySelectorAll(".title-category h2");
        const title_category_svg = document.querySelectorAll(".filter-box svg")
        if (backgroundMainBrightness() === "dark") {
            title_category.forEach((el) => {
                el.setAttribute("text-color-theme", "light");
            });
            title_category_svg.forEach((el) => {
                el.setAttribute("text-color-theme", "light");
            })
        } else if (backgroundMainBrightness() === "light") {
            title_category.forEach((el) => {
                el.setAttribute("text-color-theme", "dark");
            })
            title_category_svg.forEach((el) => {
                el.setAttribute("text-color-theme", "dark");
            })
        }
    })

    // Effect to manage the random background based on background_image_path_64
    createEffect(() => {
        console.log("Gamehub: Memeriksa apakah background_image_path_64 sudah diatur...");

        if (!settings().background_image_path_64) {
            console.log('Gamehub: Tidak ditemukan gambar latar belakang khusus. Menjalankan randomImageFinder.');
            try {
                randomImageFinder();
            } catch (error) {

            }
            const timeOut = setTimeout(() => {
                const fitgirlLauncher = document.querySelector('.gamehub-container');
                if (!fitgirlLauncher.querySelector('.blur-overlay')) {
                try {
                    randomImageFinder();
                } catch (error) {

                }
                }
            }, 500);

            const interval = setInterval(() => {
                const fitgirlLauncher = document.querySelector('.gamehub-container');
                if (!fitgirlLauncher.querySelector('.blur-overlay')) {
                    try {
                        randomImageFinder();
                    } catch (error) {
                        
                    }
                }
            }, 5000);

            // Cleanup when effect is re-run or component unmounted
            onCleanup(() => {
                clearInterval(interval);
                clearTimeout(timeOut);
            });
        } else {
            console.log('Gamehub: Gambar latar belakang kustom ditemukan. Tidak menerapkan latar belakang acak.');
        }
    });

    return (
        <div className="gamehub-container">
            <div className="Popular-repacks">
                <Popularrepacks />
            </div>
            <div className="New-Games">
                <Newgames />
            </div>
            <div className="Recently-Updated">
                <UpdatedGames />
            </div>
    {/* Donation button script */}
    <script type='text/javascript' src='https://assets.trakteer.id/js/trbtn-overlay.min.js'></script>
    <script
        type='text/javascript'
        class='troverlay'
    >
        {`
            (function() {
                var trbtnId = trbtnOverlay.init('Donasi', '#be1e2d', 'https://trakteer.id/okkidwi/tip/embed/modal', 'https://cdn.trakteer.id/images/mix/cendol.png', '40', 'floating-left');
                trbtnOverlay.draw(trbtnId);
            })();
        `}
    </script>
</div>
    );
}

export default Gamehub;
