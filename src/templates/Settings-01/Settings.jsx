import { createSignal, onMount } from 'solid-js'
import { appConfigDir } from '@tauri-apps/api/path'
import {
    readTextFile,
    writeTextFile,
    exists,
    createDir,
    writeFile,
    copyFile,
    removeFile,
} from '@tauri-apps/api/fs'
import { getVersion } from '@tauri-apps/api/app'
import { checkUpdate, installUpdate } from '@tauri-apps/api/updater'
import { open, message } from '@tauri-apps/api/dialog'
import { resolveResource } from '@tauri-apps/api/path'
import { resourceDir } from '@tauri-apps/api/path' // Use resourceDir for resolving the assets path
import { join, sep, appDir, appDataDir } from '@tauri-apps/api/path'
import { readBinaryFile } from '@tauri-apps/api/fs'

import './Settings.css'

// Default settings object
const defaultSettings = {
    defaultDownloadPath: '',
    autoClean: true,
    hoverTitle: true,
    autoInstall: true,
    importPath: '',
    two_gb_limit: true,
    hide_nsfw_content: false,
    background_image_path: '',
    background_image_64: '',
}
// Load settings
async function loadSettings() {
    const configDir = await appConfigDir()
    const dirPath = `${configDir.replace(/\\/g, '/')}/fitgirlConfig`
    const settingsPath = `${dirPath}/settings.json`

    try {
        // Create folder if it does not exist
        const dirExists = await exists(dirPath)
        if (!dirExists) {
            await createDir(dirPath, { recursive: true })
        }

        // Check if the settings file exists, and if not, create it
        const fileExists = await exists(settingsPath)
        if (!fileExists) {
            await writeTextFile(
                settingsPath,
                JSON.stringify(defaultSettings, null, 2)
            )
            return defaultSettings
        }

        // Read and parse the settings file
        const json = await readTextFile(settingsPath)
        let settings = JSON.parse(json)

        // Check if new settings have been added, and add them with default values
        if (!settings.hasOwnProperty('hide_nsfw_content')) {
            settings.hide_nsfw_content = defaultSettings.hide_nsfw_content
            await writeTextFile(settingsPath, JSON.stringify(settings, null, 2))
        }
        return settings
    } catch (error) {
        console.error('Failed to load settings:', error)
        return defaultSettings
    }
}

// Save settings to a JSON file
async function saveSettings(settings) {
    const configDir = await appConfigDir()
    const dirPath = `${configDir.replace(/\\/g, '/')}/fitgirlConfig`
    const settingsPath = `${dirPath}/settings.json`

    try {
        await writeTextFile(settingsPath, JSON.stringify(settings, null, 2))
        return true
    } catch (error) {
        console.error('Failed to save settings:', error)
        return false
    }
}

const SettingsPage = () => {
    const [settings, setSettings] = createSignal(defaultSettings)
    const [loading, setLoading] = createSignal(true)
    const [version, setVersion] = createSignal('')
    const [notificationVisible, setNotificationVisible] = createSignal(false)
    const [notificationMessage, setNotificationMessage] = createSignal('')
    const [selectedDownloadPath, setSelectedDownloadPath] = createSignal(
        localStorage.getItem('LUP') || ''
    )
    const [selectedImportPath, setSelectedImportPath] = createSignal(
        localStorage.getItem('LIP') || ''
    )
    const [selectedBackgroundImagePath, setSelectedBackgroundImagePath] =
        createSignal(localStorage.getItem('LBIP') || '')

    // Show the selected background image path
    const [selectedBackgroundImagePath_1, setSelectedBackgroundImagePath_1] =
        createSignal(localStorage.getItem('LBIP_PATH_64') || '')

    onMount(async () => {
        try {
            let gamehubDiv = document.querySelectorAll('.gamehub-container')
            let libraryDiv = document.querySelectorAll('.launcher-container')
            let settingsDiv = document.querySelectorAll('.settings-page')

            if (gamehubDiv) {
                let gamehubLinkText = document.querySelector('#link-gamehub')
                gamehubLinkText.style.backgroundColor = ''
            }

            if (libraryDiv) {
                let libraryLinkText = document.querySelector('#link-library')
                libraryLinkText.style.backgroundColor = ''
            }

            if (settingsDiv) {
                let settingsLinkText = document.querySelector('#link-settings')
                settingsLinkText.style.backgroundColor = '#ffffff0d'
                settingsLinkText.style.borderRadius = '5px'
            }
            // Load settings from the JSON file
            const initialSettings = await loadSettings()
            setSettings(initialSettings)

            // Fetch the app version
            const appVersionValue = await getVersion()
            setVersion(appVersionValue)
        } catch (error) {
            console.error('Error during initialization:', error)
        } finally {
            setLoading(false)
        }
    })

    // Save settings and show notification
    const handleSave = async () => {
        const success = await saveSettings(settings())
        if (success) {
            setNotificationMessage('Settings saved successfully!')
            setNotificationVisible(true) // Show notification
            setTimeout(() => {
                setNotificationVisible(false) // Hide notification after 3 seconds
            }, 3000)
        }
    }

    const selectDownloadPath = async () => {
        try {
            const selectDownloadPath = await open({
                directory: true,
                multiple: false,
                defaultPath: settings().defaultDownloadPath,
            })

            if (selectDownloadPath) {
                const newSettings = {
                    ...settings(),
                    defaultDownloadPath: selectDownloadPath,
                }
                setSettings(newSettings)

                setSelectedDownloadPath(selectDownloadPath)
                localStorage.setItem('LUP', selectDownloadPath)
                await saveSettings(newSettings)
            }
        } catch (error) {
            console.error('Settings: Failed to select download path:', error)
        }
    }

    const clearDownloadPath = () => {
        setSelectedDownloadPath('')
        localStorage.setItem('LUP', '')

        // Remove from settings
        const newSettings = {
            ...settings(),
            defaultDownloadPath: ''
        };
        saveSettings(newSettings);
    }

    const selectImportPath = async () => {
        try {
            const selectImportPath = await open({
                directory: true,
                multiple: false,
            })

            if (selectImportPath) {
                const newSettings = {
                    ...settings(),
                    importPath: selectImportPath,
                }
                setSettings(newSettings)

                setSelectedImportPath(selectImportPath)
                localStorage.setItem('LIP', selectImportPath)
                await saveSettings(newSettings)
            }
        } catch (error) {
            console.error('Settings: Unable to select import path: ', error)
        }
    }

    const clearImportPath = () => {
        setSelectedImportPath('')
        localStorage.setItem('LIP', '')

        // Remove from settings
        const newSettings = {
            ...settings(),
            importPath: '',
        }
        saveSettings(newSettings);
    }

    const selectBackgroundImage = async () => {
        try {
            const selectedBackgroundImage = await open({
                multiple: false,
                filters: [
                    {
                        name: 'Image',
                        extensions: ['png', 'jpeg', 'jpg'],
                    },
                ],
            })

            if (selectedBackgroundImage) {
                // Read the binary data of the image file
                const imageData = await readBinaryFile(selectedBackgroundImage)

                // Convert the binary data to a base64 string
                const base64String = btoa(
                    new Uint8Array(imageData).reduce(
                        (data, byte) => data + String.fromCharCode(byte),
                        ''
                    )
                )

                // Create a data URL for the image
                const dataUrl = `data:image/jpeg;base64,${base64String}`

                // Save the data URL instead of the file path
                const newSettings = {
                    ...settings(),
                    background_image_path_64: dataUrl, // Store the base64 data URL
                    background_image_path: selectedBackgroundImage, // Store the file path
                }

                setSettings(newSettings)
                setSelectedBackgroundImagePath(selectedBackgroundImage)
                localStorage.setItem('LBIP_PATH_64', dataUrl)
                localStorage.setItem('LBIP', selectedBackgroundImage)
                await saveSettings(newSettings)

                // Notify the user that the background is being applied
                setNotificationMessage('Applying background, please wait...')
                setNotificationVisible(true)

                // Delay the reload slightly to allow the notification to appear (Not 1.5sec, too long, the user will click on save settings again and it will break)
                setTimeout(() => {
                    window.location.reload() 
                }, 200) 
            }
        } catch (error) {
            console.error(
                'Settings: There was an issue selecting the background image:',
                error
            )
        }
    }

    // Clear the background image path and set it to an empty string
    const clearBackgroundImagePath = async () => {
        
        setSelectedBackgroundImagePath('')
        localStorage.setItem('LBIP', '')
        localStorage.setItem('LBIP_PATH_64', '')

        // Remove from settings
        const newSettings = {
            ...settings(),
            background_image_path: '',
            background_image_path_64: '',
        }
        await saveSettings(newSettings)
        setSettings(newSettings)
        // Notify the user that the background is being removed
        setNotificationMessage('Removing background, please wait...')
        setNotificationVisible(true)
        
        // Delay the reload slightly to allow the notification to appear
        setTimeout(() => {
            window.location.reload() // Reload the app to remove the background
        }, 200)
    }


    // Check for updates function
    const handleCheckForUpdates = async () => {
        try {
            const { shouldUpdate } = await checkUpdate()
            if (shouldUpdate) {
                await installUpdate()
            } else {
                alert('You are already on the latest version.')
            }
        } catch (error) {
            alert('Failed to check for updates.')
        }
    }

    return (
        <div class="settings-page">
            <h1>Settings</h1>

            {/* Notification box */}
            {notificationVisible() && (
                <div
                    class={`notification ${
                        notificationVisible() ? 'show' : ''
                    }`}
                >
                    {notificationMessage()}
                </div>
            )}
            {/* Installation Settings start*/}
            <section>
                <h2>Installation Settings</h2>
                <div class="form-group">
                    <label>
                        <input
                            className="switch"
                            type="checkbox"
                            checked={settings().autoInstall}
                            onChange={(e) =>
                                setSettings({
                                    ...settings(),
                                    autoInstall: e.target.checked,
                                })
                            }
                        />
                        Automatic installation of games. (This will
                        automatically start the installation process after
                        downloading the game)
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input
                            class="switch"
                            type="checkbox"
                            checked={settings().autoClean}
                            onChange={(e) =>
                                setSettings({
                                    ...settings(),
                                    autoClean: e.target.checked,
                                })
                            }
                        />
                        Auto-clean game files after installation.{' '}
                        <strong>//Not working//</strong>
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input
                            class="switch"
                            type="checkbox"
                            checked={settings().hoverTitle}
                            onChange={(e) =>
                                setSettings({
                                    ...settings(),
                                    hoverTitle: e.target.checked,
                                })
                            }
                        />
                        Show hover title on game icons (useful for long game
                        names).
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input
                            class="switch"
                            type="checkbox"
                            checked={settings().two_gb_limit}
                            onChange={(e) =>
                                setSettings({
                                    ...settings(),
                                    two_gb_limit: e.target.checked,
                                })
                            }
                        />
                        Limit the installer to 2GB of RAM. (It will be
                        automatically on if you have 8GB or less)
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input
                            class="switch"
                            type="checkbox"
                            checked={settings().hide_nsfw_content}
                            onChange={(e) =>
                                setSettings({
                                    ...settings(),
                                    hide_nsfw_content: e.target.checked,
                                })
                            }
                        />
                        Hide NSFW content. (This will hide all NSFW content from
                        the launcher)
                    </label>
                </div>
            </section>
            {/* Installation Settings End*/}

            {/* Download Settings */}
            <section>
                <h2>Download Settings</h2>
                <div class="upload-container">
                    <div class="upload-btn-wrapper">
                        <button class="upload-btn" onClick={selectDownloadPath}>
                            Choose Download Path
                        </button>
                    </div>
                    <div class="path-box-inline">
                        <p class="path-output-inline">
                            {selectedDownloadPath()
                                ? selectedDownloadPath()
                                : 'No download path selected'}
                        </p>
                        {selectedDownloadPath() && (
                            <button
                                class="clear-btn"
                                onClick={clearDownloadPath}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* Import Settings */}
            <section>
                <h2>Import Settings</h2>
                <div class="upload-container">
                    <div class="upload-btn-wrapper">
                        <button class="upload-btn" onClick={selectImportPath}>
                            Choose Import File
                        </button>
                    </div>
                    <div class="path-box-inline">
                        <p class="path-output-inline">
                            {selectedImportPath()
                                ? selectedImportPath()
                                : 'No import path selected'}
                        </p>
                        {selectedImportPath() && (
                            <button class="clear-btn" onClick={clearImportPath}>
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* Background Image Settings */}
            <section>
                <h2>Background Image</h2>
                <div class="upload-container">
                    <div class="upload-btn-wrapper">
                        <button
                            class="upload-btn"
                            onClick={selectBackgroundImage}
                        >
                            Select Background Image
                        </button>
                    </div>
                    <div class="path-box-inline">
                        <p class="path-output-inline">
                            {selectedBackgroundImagePath()
                                ? selectedBackgroundImagePath()
                                : 'No background image selected'}
                        </p>
                        {selectedBackgroundImagePath() && (
                            <button
                                class="clear-btn"
                                onClick={clearBackgroundImagePath}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* Okki Drive Information */}
            <section>
                <h2>Okki Drive Information</h2>
                <div class="form-group">
                    <p>Application Version: {version()}</p>
                </div>
                <div class="form-group">
                    <button 
                        class="check-update-btn"
                        onClick={handleCheckForUpdates}
                        >
                        Check for Updates
                    </button>
                </div>
            </section>

            {/* Social Links */}
            <section class="social-links">
                <h2>Follow Us</h2>
                <div class="card">
                    <a
                        class="social-link1"
                        href="https://www.facebook.com/okkidwi27/"
                        target="_blank"
                    >
                        <svg
                            viewBox="0 0 320 512"
                            height="1em"
                            fill="#fff"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06H293V6.26S277.44 0 256.08 0c-73.22 0-121.1 44.38-121.1 124.72v70.62H85.33V288h49.65v224h100.17V288z"></path>
                        </svg>
                    </a>
                    <a
                        class="social-link2"
                        href="https://t.me/okkidwi"
                        target="_blank"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            fill="currentColor"
                            class="bi bi-discord"
                            viewBox="0 0 24 24"
                        >
                            <path
                                d="M22.285 1.745c-.783-.343-1.636-.156-2.186.477L3.876 18.942l3.21-8.755L16.633 3.25c.63-.348 1.418-.156 1.773.54.355.695.163 1.539-.467 1.887l-8.206 4.757c-.205.12-.353.32-.404.558l-1.2 6.435 5.197-4.652a.998.998 0 0 0 .314-.709V5.507c0-.553.448-1 1-1s1 .447 1 1v11.372c0 .75-.334 1.453-.928 1.93l-7.14 6.44c-.724.654-1.766.692-2.542.098a1.755 1.755 0 0 1-.602-1.777l1.409-7.576a.999.999 0 0 1 .616-.75l8.894-4.632c1.13-.591 1.596-1.876 1.051-3.009-.545-1.132-1.769-1.706-2.898-1.34L8.45 8.49l-.626-1.712a2.001 2.001 0 0 1 1.337-2.616l17.728-6.882z"
                                fill="white"
                            ></path>
                        </svg>
                    </a>
                </div>

            {/* Donation Buttons */}
            <section class="donation-links">
                <h2>Support Us</h2>
                <div class="card donation-buttons">
                    <a class="donation-btn trakteer-btn" href="https://trakteer.id/okkidwi/tip" target="_blank">
                        Donate via Trakteer
                    </a>
                    <a class="donation-btn saweria-btn" href="https://saweria.co/okkidwi" target="_blank">
                        Donate via Saweria
                    </a>
                </div>
            </section>

            .donation-buttons {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }

            .trakteer-btn,
            .saweria-btn {
                padding: 10px 20px;
                text-decoration: none;
                color: white;
                font-weight: bold;
                border-radius: 5px;
                font-size: 16px;
                transition: background-color 0.3s ease;
            }

            .trakteer-btn {
                background-color: #BE1E2D;
            }

            .saweria-btn {
                background-color: #F5A623;
            }

            .trakteer-btn:hover,
            .saweria-btn:hover {
                opacity: 0.8;
            }

                <button class="boton-elegante" style={"width: fit-content;"} onClick={handleSave}>
                    Save Settings
                </button>

            </section>


        </div>
    )
}

export default SettingsPage
