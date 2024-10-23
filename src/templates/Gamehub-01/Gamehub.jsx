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
            console.log("Gamehub: Loaded settings on startup:", loadedSettings);
            setSettings(loadedSettings); // Update settings signal with loaded settings
        }).catch((error) => {
            console.error("Gamehub: Error loading settings on startup:", error);
        });

        let gamehubDiv = document.querySelector('.gamehub-container');
        if (gamehubDiv) {
            let gamehubLinkText = document.querySelector('#link-gamehub');
            gamehubLinkText.style.backgroundColor = '#ffffff0d';
            gamehubLinkText.style.borderRadius = '5px';
        }
    });

    async function loadSettings() {
        const configDir = await appDataDir();
        const dirPath = `${configDir.replace(/\\/g, '/')}/fitgirlConfig`; // Directory path
        const settingsPath = `${dirPath}/settings.json`; // Settings file path

        try {
            console.log("Gamehub: Loading settings from:", settingsPath);

            const dirExists = await exists(dirPath);
            if (!dirExists) {
                await createDir(dirPath, { recursive: true });
                console.log("Gamehub: Created directory:", dirPath);
            }

            const fileExists = await exists(settingsPath);
            if (!fileExists) {
                await writeTextFile(settingsPath, JSON.stringify(defaultSettings, null, 2));
                console.log("Gamehub: Created settings file with default settings:", defaultSettings);
                return defaultSettings;
            } else {
                console.log("Gamehub: Settings file exists:", settingsPath);
            }

            const json = await readTextFile(settingsPath);
            return JSON.parse(json);
        } catch (error) {
            console.error("Gamehub: Failed to load settings:", error);
            return defaultSettings;
        }
    }

    const singularGamePath = '../src/temp/singular_games.json';

    createEffect(async () => {
        await clearFile(singularGamePath);
        invoke('stop_get_games_images');
    });

    // Function to handle "View All" button clicks
    function handleViewAll(section) {
        if (section === 'popular-repacks') {
            console.log("Redirecting to Popular Repacks catalog");
            // Add your navigation or logic here
        } else if (section === 'new-games') {
            console.log("Redirecting to Newly Added Games catalog");
            // Add your navigation or logic here
        } else if (section === 'recently-updated') {
            console.log("Redirecting to Recently Updated Games catalog");
            // Add your navigation or logic here
        }
    }

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

            const blurOverlay = document.createElement('div');
            blurOverlay.className = 'blur-overlay';
            fitgirlLauncher.appendChild(blurOverlay);
            blurOverlay.style.backgroundColor = `rgba(0, 0, 0, 0.4)`;
            blurOverlay.style.backgroundImage = `url(${selectedImageSrc})`;
            blurOverlay.style.filter = 'blur(15px)';
            blurOverlay.style.top = `-${scrollPosition}px`;
        }
    }

    createEffect(() => {
        const title_category = document.querySelectorAll(".title-category h2");
        const title_category_svg = document.querySelectorAll(".filter-box svg")
        if (backgroundMainBrightness() === "dark") {
            title_category.forEach((el) => {
                el.setAttribute("text-color-theme", "light");
            })
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

    createEffect(() => {
        if (!settings().background_image_path_64) {
            try {
                randomImageFinder();
            } catch (error) {}

            const timeOut = setTimeout(() => {
                const fitgirlLauncher = document.querySelector('.gamehub-container');
                if (!fitgirlLauncher.querySelector('.blur-overlay')) {
                    try {
                        randomImageFinder();
                    } catch (error) {}
                }
            }, 500);

            const interval = setInterval(() => {
                const fitgirlLauncher = document.querySelector('.gamehub-container');
                if (!fitgirlLauncher.querySelector('.blur-overlay')) {
                    try {
                        randomImageFinder();
                    } catch (error) {}
                }
            }, 5000);

            onCleanup(() => {
                clearInterval(interval);
                clearTimeout(timeOut);
            });
        }
    });

    return (
        <div className="gamehub-container">
            <div className="Popular-repacks">
                <div className="section-header">
                    <h2>Popular Repacks</h2>
                    <button className="view-all-button" onClick={() => handleViewAll('popular-repacks')}>
                        View All
                    </button>
                </div>
                <Popularrepacks />
            </div>

            <div className="New-Games">
                <div className="section-header">
                    <h2>Newly Added Games</h2>
                    <button className="view-all-button" onClick={() => handleViewAll('new-games')}>
                        View All
                    </button>
                </div>
                <Newgames />
            </div>

            <div className="Recently-Updated">
                <div className="section-header">
                    <h2>Recently Updated Games</h2>
                    <button className="view-all-button" onClick={() => handleViewAll('recently-updated')}>
                        View All
                    </button>
                </div>
                <UpdatedGames />
            </div>
        </div>
    );
}

export default Gamehub;
