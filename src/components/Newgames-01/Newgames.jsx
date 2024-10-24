import './Newgames.css'
import { createEffect, createSignal, onMount } from 'solid-js'
import { appDataDir } from '@tauri-apps/api/path'
import readFile from '../functions/readFileRust'
import Slider from '../Slider-01/Slider'
import Swal from 'sweetalert2'

const appDir = await appDataDir()
const dirPath = appDir
const newlyAddedGamesPath = `${dirPath}tempGames/newly_added_games.json`

/**
 * Get newly added games into the GameHub.
 */
async function parseNewGameData() {
    try {
        const fileContent = await readFile(newlyAddedGamesPath)
        const gameData = JSON.parse(fileContent.content)

        // Load the user's settings to check if NSFW content should be hidden
        const settingsPath = `${dirPath}/fitgirlConfig/settings.json`
        const settingsContent = await readFile(settingsPath)
        const settings = JSON.parse(settingsContent.content)
        const hideNSFW = settings.hide_nsfw_content

        // Filter out NSFW games based on the "Adult" tag if the setting is enabled
        const filteredGameData = hideNSFW
            ? gameData.filter((game) => !game.tag.includes('Adult'))
            : gameData

        return filteredGameData
    } catch (error) {
        console.error('Kesalahan saat mengurai data game:', error)
        throw error
    }
}

function Newgames() {
    const [imagesObject, setImagesObject] = createSignal([])
    const [tags, setTags] = createSignal([]) // All unique tags
    const [selectedTags, setSelectedTags] = createSignal([]) // Selected tags
    const [filteredImages, setFilteredImages] = createSignal([]) // Images after filtering
    const [sliderComponent, setSliderComponent] = createSignal(null) // Hold slider component

    onMount(async () => {
        try {
            const data = await parseNewGameData()
            setImagesObject(data)

            const allTags = new Set()
            data.forEach((game) => {
                const tagsArray = game.tag.split(',').map((tag) => tag.trim())
                tagsArray.forEach((tag) => allTags.add(tag))
            })
            setTags(Array.from(allTags))

            // Initialize filtered images to show all initially
            setFilteredImages(data)
        } catch (error) {
            Swal.fire({
                title: 'Kesalahan',
                html: `
                    <p>Terjadi kesalahan saat mengurai data game, silakan tutup aplikasi dan buka lagi. Jika masih tidak berfungsi, coba gunakan VPN.</p>
                    <p>Ini adalah daftar negara dan/atau ISP yang diketahui memblokir akses ke fitgirl-repacks:</p>
                    <ul>
                        <li><strong>Italia</strong></li>
                        <li><strong>Verizon</strong></li>
                        <li><strong>Jerman</strong> (<em>SELALU GUNAKAN VPN DI JERMAN !</em>)</li>
                        <li><strong><em>VPN Proton Gratis Mungkin Memblokir P2P</em></strong></li>
                    </ul>
                    <p>Jika Anda mengetahui negara atau ISP lain yang memblokir situs web fitgirls repack atau P2P, silakan hubungi kami di Facebook atau Telegram, tautan di pengaturan.</p>
                `,
                footer: `Kesalahan: ${error}`,
                icon: 'error',
                confirmButtonText: 'Ok',
            })
        }
    })

    // Effect to filter images whenever selectedTags change
    createEffect(() => {
        const currentImages = imagesObject()
        const currentSelectedTags = selectedTags()

        // If no tags are selected, set filtered images to all images
        if (currentSelectedTags.length === 0) {
            setFilteredImages(currentImages)
        } else {
            // Filter images based on selected tags
            const newFilteredImages = currentImages.filter(
                (game) =>
                    currentSelectedTags.every((tag) => game.tag.includes(tag)) // Change here to use 'every'
            )
            setFilteredImages(newFilteredImages)
        }

        // Render Slider when filteredImages changes
        setSliderComponent(
            filteredImages().length > 0 ? (
                <Slider
                    containerClassName="newly-added"
                    imageContainerClassName="games-container"
                    slides={filteredImages()} // Pass the filtered images
                    filePath={newlyAddedGamesPath}
                    showPrevNextButtons={true}
                />
            ) : null
        )
    })

    const toggleTagSelection = (tag) => {
        setSelectedTags((prevTags) => {
            // If tag is already selected, remove it
            if (prevTags.includes(tag)) {
                return prevTags.filter((t) => t !== tag)
            }
            // If tag is not selected, add it
            return [...prevTags, tag]
        })
    }

    const resetFilters = () => {
        setSelectedTags([])
    }

    return (
        <>
            <div className="title-category newgames">
                <h2>Game yang Baru Ditambahkan</h2>
                <div className="filter-box">
                    <details className="filter-details newgames">
                        <summary
                            onClick={(e) => {
                                e.preventDefault()
                                const details = document.querySelector(
                                    '.filter-details.newgames'
                                )
                                if (details.open) {
                                    details.open = false;
                                    details.setAttribute('collapsed', 'true');
                                } else {
                                    details.open = true; // Open it if closed
                                    details.removeAttribute('collapsed'); 
                                }
                            }}
                        >
                            <svg className='filter-icon' xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-filter">
                                <path d="M3 6h18M7 12h10m-7 6h4"/>
                            </svg>
                            {selectedTags().length > 0 && (
                                <span>({selectedTags().length})</span>
                            )}
                        </summary>
                        <ul className="tags-list">
                            {tags().map((tag) => (
                                <li
                                    key={tag}
                                    onClick={() => toggleTagSelection(tag)}
                                >
                                    <div className="checkbox-wrapper">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={selectedTags().includes(
                                                    tag
                                                )}
                                                onChange={() =>
                                                    toggleTagSelection(tag)
                                                }
                                                className="custom-checkbox"
                                            />
                                            {tag}
                                        </label>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </details>
                    {/* <svg 
                        className='filter-reset-icon'
                        onClick={resetFilters}
                    >
                    </svg> */}
                </div>
            </div>
            {sliderComponent()} {/* Render Slider component here */}
        </>
    )
}

export default Newgames
