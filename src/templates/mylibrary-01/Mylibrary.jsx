import { createSignal, onMount, createEffect, onCleanup } from "solid-js";
import { appDataDir } from "@tauri-apps/api/path";
import {
  writeFile,
  writeTextFile,
  readTextFile,
  exists,
  createDir,
} from "@tauri-apps/api/fs";
import { open } from "@tauri-apps/api/dialog";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { invoke } from "@tauri-apps/api";
import Swal from "sweetalert2";
import readFile from "../../components/functions/readFileRust";
import "./Mylibrary.css";

function Mylibrary() {
  const [imagesObject, setImagesObject] = createSignal([]);
  const [downlaodedGamesList, setDownloadedGamesList] = createSignal([]);
  const [downloadedGamePath, setDownloadedGamePath] = createSignal("");
  const [addedGame, setAddedGame] = createSignal({});
  const [removedGame, setRemovedGame] = createSignal({});
  const [isDataReady, setIsDataReady] = createSignal(false);
  const [gameContextMenuVisible, setGameContextMenuVisible] =
    createSignal(false);
  const [gameContextMenuPosition, setGameContextMenuPosition] = createSignal({
    x: 0,
    y: 0,
  });
  const [selectedGame, setSelectedGame] = createSignal(null);
  const [backgroundMainBrightness, setBackgroundMainBrightness] =
    createSignal("dark");

  const [searchTerm, setSearchTerm] = createSignal("");
  const [searchResults, setSearchResults] = createSignal([]);

  async function handleResultClick(result) {
    // Fetch the game information
    await invoke("get_singular_game_info", { gameLink: result });
    // Determine the path for downloaded_games.json
    const appDir = await appDataDir();
    const dirPath = appDir;
    const gameInfoPath = `${dirPath}tempGames/singular_game_temp.json`;
    const fileContentObj = await readFile(gameInfoPath);
    const gameInfo = JSON.parse(fileContentObj.content);
    console.log(gameInfo);

    // Ask for the executable path
    const executablePath = await open({
      multiple: false,
      filters: [
        {
          name: "Executable",
          extensions: ["exe"],
        },
      ],
    });

    if (executablePath) {
      // Determine the path for downloaded_games.json
      const appDir = await appDataDir();
      const dirPath = appDir;
      const filePath = `${dirPath}data/downloaded_games.json`;

      // Fetch and initialize game data
      let gameData;
      try {
        const fileContentObj = await readFile(filePath);
        gameData = JSON.parse(fileContentObj.content);
      } catch (error) {
        if (error.message.includes("ENOENT")) {
          console.log("Array Kosong");
          // If file doesn't exist, initialize it with an empty array
          gameData = [];
        } else {
          console.error("Gagal menulis ke downloaded_games.json:", error);
          return;
        }
      }

      // Add the new game data
      gameData.push({
        title: gameInfo[0].title,
        img: gameInfo[0].img,
        magnetlink: gameInfo[0].magnetlink,
        path: executablePath,
      });

      // Write back the updated game data
      try {
        await writeFile(filePath, JSON.stringify(gameData, null, 2));
        setAddedGame(gameData);
        console.log("Game berhasil ditambahkan:", gameInfo.title);
      } catch (error) {
        console.error("Gagal menulis ke downloaded_games.json:", error);
      }
    }
  }

  async function showResults(query) {
    let requests = [];
    const appDir = await appDataDir();
    const dirPath = appDir;

    for (let i = 1; i <= 6; i++) {
      let sitemapURL = `${dirPath}sitemaps/post-sitemap${i}.xml`;
      let convertedSitemapURL = convertFileSrc(sitemapURL);
      requests.push(fetch(convertedSitemapURL));
    }

    try {
      let responses = await Promise.all(requests);
      let postURLs = [];

      for (let response of responses) {
        if (response.ok) {
          let text = await response.text();
          let parser = new DOMParser();
          let xmlDoc = parser.parseFromString(text, "text/xml");
          let urls = xmlDoc.getElementsByTagName("url");

          for (let url of urls) {
            let loc = url.getElementsByTagName("loc")[0].textContent;
            postURLs.push(loc);
          }
        } else {
          console.error("Gagal mengambil sitemap:", response.statusText);
        }
      }

      let results = postURLs.filter((postURL) => {
        let title = getTitleFromUrl(postURL).toUpperCase().replace(/-/g, " ");
        return title.includes(query.toUpperCase().trim());
      });

      setSearchResults(results.slice(0, 5));
    } catch (error) {
      console.error("Gagal mengambil data sitemap:", error);
    }
  }

  function capitalizeTitle(title) {
    return title.replace(/-/g, " ").toUpperCase();
  }

  function getTitleFromUrl(url) {
    var parts = url.split("/");
    var title = parts[3];
    return title;
  }

  async function handleInputChange(event) {
    const value = event.target.value.toLowerCase();
    setSearchTerm(value);

    if (value !== "") {
      await showResults(value);

      // Render the results inside the Swal modal
      const resultsContainer = document.getElementById("search-results-box");
      resultsContainer.innerHTML = "";

      searchResults().forEach((result) => {
        const resultItem = document.createElement("div");
        resultItem.className = "search-result-item";
        resultItem.textContent = capitalizeTitle(getTitleFromUrl(result));
        resultItem.setAttribute("data-url", result);

        // Attach the click event listener
        resultItem.addEventListener("click", () => {
          // Update the search bar with the clicked result's text
          const searchBar = document.getElementById("search-bar");
          searchBar.value = capitalizeTitle(getTitleFromUrl(result));

          // Remove previous selection and highlight the clicked result
          document
            .querySelectorAll(".search-result-item")
            .forEach((item) => item.classList.remove("swal2-selected-result"));
          resultItem.classList.add("swal2-selected-result");
        });

        resultsContainer.appendChild(resultItem);
      });
    } else {
      setSearchResults([]);
      document.getElementById("search-results-box").innerHTML = "";
    }
  }

  async function handleAddDownloadedGames() {
    Swal.fire({
      title: "Tambahkan game?",
      html: `
                <input
                    type="text"
                    id="search-bar"
                    class="swal2-input"
                    placeholder="Cari game..."
                    autocomplete="off"
                />
                <div id="search-results-box" class="swal2-results-box"></div>
            `,
      showCancelButton: true,
      confirmButtonText: "Pilih",
      cancelButtonText: "Batal",
      preConfirm: () => {
        const selectedResult = document.querySelector(".swal2-selected-result");
        if (selectedResult) {
          return selectedResult.getAttribute("data-url");
        } else {
          Swal.showValidationMessage("Silakan pilih game.");
          return false;
        }
      },
      didOpen: () => {
        // Attach the event listener here
        document
          .getElementById("search-bar")
          .addEventListener("input", handleInputChange);
      },
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        const selectedGameUrl = result.value;
        await handleResultClick(selectedGameUrl);
      }
    });
  }

  onMount(async () => {
    let gamehubDiv = document.querySelectorAll(".gamehub-container");
    let libraryDiv = document.querySelectorAll(".launcher-container");
    let settingsDiv = document.querySelectorAll(".settings-page");

    if (gamehubDiv) {
      let gamehubLinkText = document.querySelector("#link-gamehub");
      gamehubLinkText.style.backgroundColor = "";
    }

    if (libraryDiv) {
      let libraryLinkText = document.querySelector("#link-library");
      libraryLinkText.style.backgroundColor = "#ffffff0d";
      libraryLinkText.style.borderRadius = "5px";
    }

    if (settingsDiv) {
      let gamehubLinkText = document.querySelector("#link-settings");
      gamehubLinkText.style.backgroundColor = "";
    }
  });

  async function updateGamePathInFile(gameTitle, newPath, filePath) {
    try {
      const data = await readFile(filePath);
      const gameData = JSON.parse(data.content);

      // Step 2: Find the game by title and update the path
      const game = gameData.find((g) => g.title === gameTitle);
      if (game) {
        game.path = newPath;
      } else {
        console.error("Game tidak ditemukan!");
        return;
      }

      // Step 3: Write the updated JSON back to the file
      const updatedJsonString = JSON.stringify(gameData, null, 2);
      await writeFile(filePath, updatedJsonString);
      console.log("Jalur game berhasil diperbarui dan disimpan!");
    } catch (error) {
      console.error("Terjadi kesalahan saat memperbarui jalur game:", error);
    }
  }

  async function randomImageFinder() {
    const imageElements = document.querySelectorAll(".launcher-container img");
    if (imageElements.length > 0) {
      const randomIndex = Math.floor(Math.random() * imageElements.length);
      const selectedImageSrc = imageElements[randomIndex].getAttribute("src");

      const fitgirlLauncher = document.querySelector(".launcher-container");
      const scrollPosition =
        window.scrollY || document.documentElement.scrollTop;

      const docBlurOverlay = document.querySelector(".blur-overlay");
      if (docBlurOverlay != null) {
        docBlurOverlay.remove();
      }

      // const docColorFilterOverlay = document.querySelector('.color-blur-overlay')
      // if (docColorFilterOverlay === null){
      //     const colorFilterOverlay = document.createElement('div');
      //     colorFilterOverlay.className = 'color-blur-overlay';
      //     fitgirlLauncher.appendChild(colorFilterOverlay)
      //     console.log("colroe")

      // }

      const blurOverlay = document.createElement("div");
      blurOverlay.className = "blur-overlay";

      fitgirlLauncher.appendChild(blurOverlay);
      blurOverlay.style.backgroundColor = `rgba(0, 0, 0, 0.4)`;
      blurOverlay.style.backgroundImage = `url(${selectedImageSrc})`;
      blurOverlay.style.filter = "blur(15px)";
      blurOverlay.style.top = `-${scrollPosition}px`;
      // let brightnessResult = await invoke('analyze_image_lightness', {imageUrl : selectedImageSrc} );
      // if (brightnessResult === 'light') {
      //     setBackgroundMainBrightness('light')
      //     console.log("light")
      // } else if (brightnessResult === 'dark') {
      //     setBackgroundMainBrightness("dark")
      //     console.log("dark")
      // } else {
      //     console.log("weirdo")
      // }
    }
  }
  async function favouriteGame() {
    const game = selectedGame();
    if (game) {
      const filePath = await downloadedGamePath();
      try {
        const fileContentObj = await readFile(filePath);
        let gameData = JSON.parse(fileContentObj.content);

        const gameIndex = gameData.findIndex((g) => g.title === game.title);
        if (gameIndex !== -1) {
          gameData[gameIndex].favourite = !gameData[gameIndex].favourite;
          await writeFile(filePath, JSON.stringify(gameData, null, 2));
          console.log(`Game ${game.title} favourited`);
        } else {
          console.error("Game tidak ditemukan dalam daftar");
        }
      } catch (error) {
        console.error("Error during game favouriting:", error);
        Swal.fire({
          title: "Error",
          text: "Failed to favourite the game. Please try again.",
          icon: "error",
        });
      }
    }
    // close the context menu
    setGameContextMenuVisible(false);
  }

  async function handleRemoveGame() {
    const game = selectedGame();
    if (game) {

      setGameContextMenuVisible(false); // close the context menu

      const result = await Swal.fire({
        title: `Hapus ${game.title}?`,
        html: "Tindakan ini tidak dapat dibatalkan!<br><strong>INI TIDAK AKAN MENGHAPUS FILE!</strong>",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Ya, hapus itu!",
        cancelButtonText: "Batal",
      });

      if (result.isConfirmed) {
        try {
          await removeGameFromFile(game);
          setGameContextMenuVisible(false);
          console.log(`Game ${game.title} dihapus`);
        } catch (error) {
          console.error("Kesalahan saat menghapus game:", error);
          Swal.fire({
            title: "Kesalahan",
            text: "Gagal menghapus game. Silakan coba lagi.",
            icon: "error",
          });
        }
      }
    }
  }

  async function removeGameFromFile(game) {
    const filePath = await downloadedGamePath();
    try {
      const fileContentObj = await readFile(filePath);
      let gameData = JSON.parse(fileContentObj.content);

      gameData = gameData.filter((g) => g.title !== game.title);

      await writeFile(filePath, JSON.stringify(gameData, null, 2));
      setRemovedGame(gameData);
    } catch (error) {
      throw new Error(
        `Gagal memperbarui downloaded_games.json: ${error.message}`
      );
    }
  }

  createEffect(async () => {
    await randomImageFinder();
    const timeOut = setTimeout(randomImageFinder, 500);
    const interval = setInterval(randomImageFinder, 5000);
    onCleanup(() => {
      clearInterval(interval);
      clearTimeout(timeOut);
    });
  });

  createEffect(async () => {
    console.log(addedGame());
    console.log(removedGame());
    // if(addedGame()) {
    //     let gameGrid = document.querySelector('.game-grid');
    //     gameGrid.innerHTML = ``;
    // }
    try {
      const appDir = await appDataDir();
      const dirPath = appDir.replace(/\\/g, "/");
      const filePath = `${dirPath}data/downloaded_games.json`;
      setDownloadedGamePath(filePath);
      const fileContent = await readFile(filePath);
      const gameData = JSON.parse(fileContent.content);
      setDownloadedGamesList(gameData);
    } catch (error) {
      console.error("Kesalahan saat mengurai data game:", error);
      throw error;
    }
  });

  onMount(() => {
    // It's a nodeList so you have to forEach.
    const libraryPage = document.querySelector(".game-container");

    libraryPage.addEventListener("click", (e) => {
      setGameContextMenuVisible(false);
    });
    libraryPage.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  });

  onMount(async () => {
    const gameData = [];

    const appDir = await appDataDir();
    const dirPath = `${appDir.replace(/\\/g, "/")}/data`;
    const filePath = `${dirPath}/downloaded_games.json`;
    try {
      // Check if the directory exists, and if not, create it
      const dirExists = await exists(dirPath);
      if (!dirExists) {
        await createDir(dirPath, { recursive: true });
        console.log("Direktori dibuat:", dirPath);
      }

      // Check if the settings file exists
      const fileExists = await exists(filePath);
      if (!fileExists) {
        // If the file does not exist, create it with default settings
        await writeTextFile(filePath, JSON.stringify(gameData, null, 2));
        console.log("File pengaturan dibuat dengan pengaturan default.");
        return gameData;
      }
    } catch (error) {
      console.error("Gagal memuat pengaturan:", error);
      return filePath;
    }
  });

  async function createGameCollectionFolder() {
    const { value: folderName } = await Swal.fire({
      title: "Buat koleksi baru",
      input: "text",
      inputPlaceholder: "Masukkan nama koleksi",
      showCancelButton: true,
      confirmButtonText: "Buat",
      cancelButtonText: "Batal",
    });

    if (folderName) {
      const appDir = await appDataDir();
      const dirPath = appDir.replace(/\\/g, "/");
      const filePath = `${dirPath}/data/game_collections.json`;

      try {
        const fileContent = await readFile(filePath);
        const collections = JSON.parse(fileContent.content);

        collections.push({
          name: folderName,
          games: [],
        });

        await writeFile(filePath, JSON.stringify(collections, null, 2));
        Swal.fire({
          title: "Koleksi dibuat!",
          text: `Koleksi "${folderName}" telah berhasil dibuat.`,
          icon: "success",
        });
      } catch (error) {
        console.error("Gagal membuat koleksi:", error);
        Swal.fire({
          title: "Kesalahan",
          text: "Gagal membuat koleksi. Silakan coba lagi.",
          icon: "error",
        });
      }
    }
  }

  async function handleGameFavourite() {
    const game = selectedGame();
    if (game) {
      const filePath = await downloadedGamePath();
      try {
        const fileContentObj = await readFile(filePath);
        let gameData = JSON.parse(fileContentObj.content);

        const gameIndex = gameData.findIndex((g) => g.title === game.title);
        if (gameIndex !== -1) {
          gameData[gameIndex].favourite = !gameData[gameIndex].favourite;
          await writeFile(filePath, JSON.stringify(gameData, null, 2));

          Swal.fire({
            title: "Game difavoritkan!",
            text: `Game "${game.title}" telah berhasil difavoritkan.`,
            timer: 3000,
            timerProgressBar: true,
            didOpen: () => {
                Swal.showLoading();
            }

            });
          console.log(`Game ${game.title} difavoritkan`);

         
        } else {
          console.error("Game tidak ditemukan dalam daftar");
        }
      } catch (error) {
        console.error("Kesalahan saat memfavoritkan game:", error);
        Swal.fire({
          title: "Kesalahan",
          text: "Gagal memfavoritkan game. Silakan coba lagi.",
          icon: "error",
        });
      } 

    }
  }

async function filterSelectionTitle() {
  // show selected

}


  return (
    <>
      <div class="launcher-container">
        <div class="game-container">
          {backgroundMainBrightness() === "dark" ? (
            // <div class="game-container-heading">
              <div class="game-container-title">
                <h1 className="title-category-element light">Library</h1>
              {/* </div> */}
              {/* <div class="icon-container">
                <svg
                  className="icon-heart"
                  onClick={handleGameFavourite}
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="lucide lucide-book-heart"
                >
                  <path d="M16 8.2A2.22 2.22 0 0 0 13.8 6c-.8 0-1.4.3-1.8.9-.4-.6-1-.9-1.8-.9A2.22 2.22 0 0 0 8 8.2c0 .6.3 1.2.7 1.6A226.652 226.652 0 0 0 12 13a404 404 0 0 0 3.3-3.1 2.413 2.413 0 0 0 .7-1.7" />
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
                </svg>
                <svg
                  className="icon-create"
                  onClick={createGameCollectionFolder}
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="lucide lucide-circle-plus"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 12h8" />
                  <path d="M12 8v8" />
                </svg>
              </div> */}
            </div>
          ) : (
            <div class="game-container-title">
              <h1 className="title-category-element dark">Library</h1>
            </div>
          )}

          {/* <div class="filter-selection-display">
            <div class="filter-selection">
                <div class="filter-selection-text">`Filter by: ${filterSelectionTitle}`</div>
                <div class="filter-selection-icon">
                    <svg
                        class="svgIcon"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <g stroke-width="0"/>
                        <g stroke-linecap="round" stroke-linejoin="round"/>
                        <path fill="none" d="M0 0h24v24H0z"/>
                        <path d="M12 21.35l-1.45-1.32C5.4 16.45 2 13.25 2 9.5 2 7.5 3.5 6 5.5 6c1.34 0 2.61.99 3.5 2 .89-1.01 2.16-2 3.5-2 2 0 3.5 1.5 3.5 3.5 0 3.75-3.4 6.95-8.55 10.54L12 21.35z"/>
                    </svg>
                    </div>  
                    </div>

          </div> */}


          <div class="game-grid">
            {/* Iterate over gameData to dynamically create game elements */}
            {downlaodedGamesList().map((game, i) => (
              <div
                class="image-option"
                key={i}
                onClick={async () => {
                  if (!game.path) {
                    let game_executable_path = await open({
                      multiple: false,
                      filters: [
                        {
                          name: "Executable",
                          extensions: ["exe"],
                        },
                      ],
                    });
                    if (game_executable_path) {
                      // Update game path and remove warning icon
                      updateGamePathInFile(
                        game.title,
                        game_executable_path,
                        downloadedGamePath()
                      );
                    }
                  } else {
                    let correctTitle = game.title.replace(/\s*\+.*$/, "");
                    Swal.fire({
                      title: `Luncurkan ${correctTitle}`,
                      text: `Apakah Anda ingin meluncurkan game ${correctTitle}?`,
                      icon: "info",
                      showCancelButton: true,
                      confirmButtonText: "Ya, luncurkan itu!",
                      cancelButtonText: "Batal",
                    }).then(async (result) => {
                      if (result.isConfirmed) {
                        await invoke("start_executable", { path: game.path });
                      }
                    });
                  }
                }}
                onContextMenu={() => {
                  setGameContextMenuPosition({
                    x: event.clientX,
                    y: event.clientY,
                  });
                  setSelectedGame(game);
                  setGameContextMenuVisible(true);
                }}
              >
                <img src={game.img} alt={game.title} />

                {/* {game.favourite && (
                                    <div class="favourite-icon">
                                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#de4005">
                                            <g stroke-width="0"/>
                                            <g stroke-linecap="round" stroke-linejoin="round"/>
                                            <path fill="none" d="M0 0h24v24H0z"/>
                                            <path d="M12 21.35l-1.45-1.32C5.4 16.45 2 13.25 2 9.5 2 7.5 3.5 6 5.5 6c1.34 0 2.61.99 3.5 2 .89-1.01 2.16-2 3.5-2 2 0 3.5 1.5 3.5 3.5 0 3.75-3.4 6.95-8.55 10.54L12 21.35z"/>
                                        </svg>
                                    </div>
                                )} */}

                {!game.path && (
                  <div class="warning-icon">
                    <svg
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="#de4005"
                    >
                      <g stroke-width="0" />
                      <g stroke-linecap="round" stroke-linejoin="round" />
                      <path fill="none" d="M0 0h24v24H0z" />
                      <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10m-1-7v2h2v-2zm0-8v6h2V7z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}

            <div class="add-game-container">
              <button class="button" onClick={handleAddDownloadedGames}>
                <svg
                  class="svgIcon"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g stroke-width="0" />
                  <g stroke-linecap="round" stroke-linejoin="round" />
                  <path
                    d="M4 12h16m-8-8v16"
                    stroke="#ccc"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {gameContextMenuVisible() && (
        <div
          class="custom-context-menu"
          style={{
            top: `${gameContextMenuPosition().y}px`,
            left: `${gameContextMenuPosition().x}px`,
            position: "absolute",
            backgroundColor: "#444",
            color: "#fff",
            textShadow: "-3px 1px 11px black",
            padding: "10px",
            borderRadius: "5px",
            zIndex: "1010",
          }}
        >
          {/* <div class="context-menu-item" onClick={favouriteGame}>
            Favourite Game
          </div> */}
          <div class="context-menu-item" onClick={handleRemoveGame}>
            Hapus Game
          </div>
        </div>
      )}
    </>
  );
}

export default Mylibrary;
