import { createSignal, onMount } from "solid-js";
import { appConfigDir } from "@tauri-apps/api/path";
import {
  readTextFile,
  writeTextFile,
  exists,
  createDir,
  writeFile,
  copyFile,
  removeFile,
} from "@tauri-apps/api/fs";
import { getVersion } from "@tauri-apps/api/app";
import { checkUpdate, installUpdate } from "@tauri-apps/api/updater";
import { open, message } from "@tauri-apps/api/dialog";
import { resolveResource } from "@tauri-apps/api/path";
import { resourceDir } from "@tauri-apps/api/path"; // Use resourceDir for resolving the assets path
import { join, sep, appDir, appDataDir } from "@tauri-apps/api/path";
import { readBinaryFile } from "@tauri-apps/api/fs";

import "./Settings.css";
import Swal from "sweetalert2";

// Default settings object
const defaultSettings = {
  defaultDownloadPath: "",
  autoClean: true,
  hoverTitle: true,
  autoInstall: true,
  importPath: "",
  two_gb_limit: true,
  hide_nsfw_content: false,
  background_image_path: "",
  background_image_64: "",
};
// Load settings
async function loadSettings() {
  const configDir = await appConfigDir();
  const dirPath = `${configDir.replace(/\\/g, "/")}/fitgirlConfig`;
  const settingsPath = `${dirPath}/settings.json`;

  try {
    // Create folder if it does not exist
    const dirExists = await exists(dirPath);
    if (!dirExists) {
      await createDir(dirPath, { recursive: true });
    }

    // Check if the settings file exists, and if not, create it
    const fileExists = await exists(settingsPath);
    if (!fileExists) {
      await writeTextFile(
        settingsPath,
        JSON.stringify(defaultSettings, null, 2)
      );
      return defaultSettings;
    }

    // Read and parse the settings file
    const json = await readTextFile(settingsPath);
    let settings = JSON.parse(json);

    // Check if new settings have been added, and add them with default values
    if (!settings.hasOwnProperty("hide_nsfw_content")) {
      settings.hide_nsfw_content = defaultSettings.hide_nsfw_content;
      await writeTextFile(settingsPath, JSON.stringify(settings, null, 2));
    }
    return settings;
  } catch (error) {
    console.error("Gagal memuat pengaturan:", error);
    return defaultSettings;
  }
}

// Save settings to a JSON file
async function saveSettings(settings) {
  const configDir = await appConfigDir();
  const dirPath = `${configDir.replace(/\\/g, "/")}/fitgirlConfig`;
  const settingsPath = `${dirPath}/settings.json`;

  try {
    await writeTextFile(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error("Gagal menyimpan pengaturan:", error);
    return false;
  }
}

const SettingsPage = () => {
  const [settings, setSettings] = createSignal(defaultSettings);
  const [loading, setLoading] = createSignal(true);
  const [version, setVersion] = createSignal("");
  const [notificationVisible, setNotificationVisible] = createSignal(false);
  const [notificationMessage, setNotificationMessage] = createSignal("");
  const [selectedDownloadPath, setSelectedDownloadPath] = createSignal(
    localStorage.getItem("LUP") || ""
  );
  const [selectedImportPath, setSelectedImportPath] = createSignal(
    localStorage.getItem("LIP") || ""
  );
  const [selectedBackgroundImagePath, setSelectedBackgroundImagePath] =
    createSignal(localStorage.getItem("LBIP") || "");

  // Show the selected background image path
  const [selectedBackgroundImagePath_1, setSelectedBackgroundImagePath_1] =
    createSignal(localStorage.getItem("LBIP_PATH_64") || "");

  onMount(async () => {
    try {
      let gamehubDiv = document.querySelectorAll(".gamehub-container");
      let libraryDiv = document.querySelectorAll(".launcher-container");
      let settingsDiv = document.querySelectorAll(".settings-page");

      if (gamehubDiv) {
        let gamehubLinkText = document.querySelector("#link-gamehub");
        gamehubLinkText.style.backgroundColor = "";
      }

      if (libraryDiv) {
        let libraryLinkText = document.querySelector("#link-library");
        libraryLinkText.style.backgroundColor = "";
      }

      if (settingsDiv) {
        let settingsLinkText = document.querySelector("#link-settings");
        settingsLinkText.style.backgroundColor = "#ffffff0d";
        settingsLinkText.style.borderRadius = "5px";
      }
      // Load settings from the JSON file
      const initialSettings = await loadSettings();
      setSettings(initialSettings);

      // Fetch the app version
      const appVersionValue = await getVersion();
      setVersion(appVersionValue);
    } catch (error) {
      console.error("Kesalahan saat inisialisasi:", error);
    } finally {
      setLoading(false);
    }
  });

  // Save settings and show notification
  const handleSave = async () => {
    const success = await saveSettings(settings());
    if (success) {
      Swal.fire({
        title: "Pengaturan Disimpan",
        text: "Pengaturan Anda telah berhasil disimpan.",
        icon: "success",
        confirmButtonText: "OK",
      });
    } else {
      Swal.fire({
        title: "Kesalahan",
        text: "Terjadi kesalahan saat menyimpan pengaturan Anda. Silakan coba lagi nanti.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const selectDownloadPath = async () => {
    try {
      const selectDownloadPath = await open({
        directory: true,
        multiple: false,
        defaultPath: settings().defaultDownloadPath,
      });

      if (selectDownloadPath) {
        const newSettings = {
          ...settings(),
          defaultDownloadPath: selectDownloadPath,
        };
        setSettings(newSettings);

        setSelectedDownloadPath(selectDownloadPath);
        localStorage.setItem("LUP", selectDownloadPath);
        await saveSettings(newSettings);
      }
    } catch (error) {
      console.error("Pengaturan: Gagal memilih jalur unduhan:", error);
    }
  };

  const clearDownloadPath = () => {
    setSelectedDownloadPath("");
    localStorage.setItem("LUP", "");

    // Remove from settings
    const newSettings = {
      ...settings(),
      defaultDownloadPath: "",
    };
    saveSettings(newSettings);
  };

  const selectImportPath = async () => {
    try {
      const selectImportPath = await open({
        directory: true,
        multiple: false,
      });

      if (selectImportPath) {
        const newSettings = {
          ...settings(),
          importPath: selectImportPath,
        };
        setSettings(newSettings);

        setSelectedImportPath(selectImportPath);
        localStorage.setItem("LIP", selectImportPath);
        await saveSettings(newSettings);
      }
    } catch (error) {
      console.error("Pengaturan: Tidak dapat memilih jalur impor: ", error);

      swalMessages.error.text = "Terjadi kesalahan saat memilih jalur impor. Silakan coba lagi.";
    }
  };

  const clearImportPath = () => {
    setSelectedImportPath("");
    localStorage.setItem("LIP", "");

    // Remove from settings
    const newSettings = {
      ...settings(),
      importPath: "",
    };
    saveSettings(newSettings);
  };

  const selectBackgroundImage = async () => {
    try {
      const selectedBackgroundImage = await open({
        multiple: false,
        filters: [
          {
            name: "Gambar",
            extensions: ["png", "jpeg", "jpg"],
          },
        ],
      });

      if (selectedBackgroundImage) {
          // Notify the user that the background is being applied
          Swal.fire({
            title: "Gambar latar belakang",
            text: `Menerapkan gambar latar belakang, harap tunggu..`,
            timerProgressBar: true,
            didOpen: () => {
              Swal.showLoading();
            },
          });
  
        // Read the binary data of the image file
        const imageData = await readBinaryFile(selectedBackgroundImage);

        // Convert the binary data to a base64 string
        const base64String = btoa(
          new Uint8Array(imageData).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );

        // Create a data URL for the image
        const dataUrl = `data:image/jpeg;base64,${base64String}`;

        // Save the data URL instead of the file path
        const newSettings = {
          ...settings(),
          background_image_path_64: dataUrl, // Store the base64 data URL
          background_image_path: selectedBackgroundImage, // Store the file path
        };

        setSettings(newSettings);
        setSelectedBackgroundImagePath(selectedBackgroundImage);
        localStorage.setItem("LBIP_PATH_64", dataUrl);
        localStorage.setItem("LBIP", selectedBackgroundImage);
        await saveSettings(newSettings);

        // Delay the reload slightly to allow the notification to appear (Not 1.5sec, too long, the user will click on save settings again and it will break)
        setTimeout(() => {
            window.location.reload()
        }, 2000)
      }
    } catch (error) {
      console.error(
        "Pengaturan: Ada masalah saat memilih gambar latar belakang:",
        error
      );
      Swal.fire({
        title: "Kesalahan",
        text: "Terjadi kesalahan saat memilih gambar latar belakang. Silakan coba lagi.",
        timerProgressBar: true,
        timer: 2000,
        didOpen: () => {
          Swal.showLoading();
        }

      });
    }
  };

  // Clear the background image path and set it to an empty string
  const clearBackgroundImagePath = async () => {
    setSelectedBackgroundImagePath("");
    localStorage.setItem("LBIP", "");
    localStorage.setItem("LBIP_PATH_64", "");

    // Remove from settings
    const newSettings = {
      ...settings(),
      background_image_path: "",
      background_image_path_64: "",
    };
    await saveSettings(newSettings);
    setSettings(newSettings);

    // Notify the user that the background is being removed
    Swal.fire({
      title: "Gambar Latar Belakang",
      text: "Menghapus gambar latar belakang, harap tunggu..",
      timerProgressBar: true,
      timer: 2000,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    setTimeout(() => {
        window.location.reload()
    }, 2000);

  };
  
  const swalMessages = {
    error: {
      title: "Kesalahan",
      icon: "error",
      confirmButtonText: "OK",
    },
    success: {
      title: "Sukses",
      icon: "success",
      confirmButtonText: "OK",
    },
  };


  // Check for updates function
  const handleCheckForUpdates = async () => {
    try {
      const { shouldUpdate } = await checkUpdate();
      if (shouldUpdate) {
        await installUpdate();
      } else {
        Swal.fire({
          title: "Tidak ada pembaruan yang tersedia",
          text: "Anda sudah menggunakan Okki Drive versi terbaru.",
          timerProgressBar: true,
          timer: 2000,
          didOpen: () => {
            Swal.showLoading();
          },
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Kesalahan",
        text: "Terjadi kesalahan saat memeriksa pembaruan. Silakan coba lagi nanti.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  return (
    <div class="settings-page">
      <h1>Pengaturan</h1>

      {/* Notification box */}
      {notificationVisible() && (
        <div class={`notification ${notificationVisible() ? "show" : ""}`}>
          {notificationMessage()}
        </div>
      )}
      {/* Installation Settings start*/}
      <section>
        <h2>Pengaturan Instalasi</h2>
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
            Instalasi game secara otomatis. (Ini secara otomatis akan memulai
            proses instalasi setelah mengunduh game)
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
            Bersihkan file game secara otomatis setelah instalasi.{" "}
            <strong>//Belum berfungsi//</strong>
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
            Tampilkan judul hover pada ikon game (berguna untuk nama game yang panjang).
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
            Batasi penginstal hingga 2GB RAM. (Ini akan otomatis aktif jika
            Anda memiliki 8GB RAM atau kurang)
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
            Sembunyikan konten NSFW. (Ini akan menyembunyikan semua konten NSFW dari
            peluncur)
          </label>
        </div>
      </section>
      {/* Installation Settings End*/}

      {/* Download Settings */}
      <section>
        <h2>Pengaturan Unduh</h2>
        <div class="upload-container">
          <div class="upload-btn-wrapper">
            <button class="upload-btn" onClick={selectDownloadPath}>
              Pilih Jalur Unduhan
            </button>
          </div>
          <div class="path-box-inline">
            <p class="path-output-inline">
              {selectedDownloadPath()
                ? selectedDownloadPath()
                : "Tidak ada jalur unduhan yang dipilih"}
            </p>
            {selectedDownloadPath() && (
              <button class="clear-btn" onClick={clearDownloadPath}>
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Import Settings */}
      <section>
        <h2>Pengaturan Impor</h2>
        <div class="upload-container">
          <div class="upload-btn-wrapper">
            <button class="upload-btn" onClick={selectImportPath}>
              Pilih Impor File
            </button>
          </div>
          <div class="path-box-inline">
            <p class="path-output-inline">
              {selectedImportPath()
                ? selectedImportPath()
                : "Tidak ada jalur impor yang dipilih"}
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
        <h2>Gambar Latar Belakang</h2>
        <div class="upload-container">
          <div class="upload-btn-wrapper">
            <button class="upload-btn" onClick={selectBackgroundImage}>
              Pilih Gambar Latar Belakang
            </button>
          </div>
          <div class="path-box-inline">
            <p class="path-output-inline">
              {selectedBackgroundImagePath()
                ? selectedBackgroundImagePath()
                : "Tidak ada gambar latar belakang yang dipilih"}
            </p>
            {selectedBackgroundImagePath() && (
              <button class="clear-btn" onClick={clearBackgroundImagePath}>
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Okki Drive Information */}
      <section>
        <h2>Informasi Okki Drive</h2>
        <div class="form-group">
          <p>Versi Aplikasi: {version()}</p>
        </div>
        <div class="form-group">
          <button class="check-update-btn" onClick={handleCheckForUpdates}>
            Periksa Pembaruan
          </button>
        </div>
      </section>

            {/* Social Links */}
            <section class="social-links">
                <h2>Ikuti Kami</h2>
                <div class="card">
                    <a
                        class="social-link1"
                        href="https://www.facebook.com/okkidwi27"
                        target="_blank"
                    >
                        <svg
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            fill="currentColor"
                            class="bi bi-facebook"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951"
                                fill="white"
                            ></path>
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
                            class="bi bi-telegram"
                            viewBox="0 0 16 16"
                        >
                            <path
                                d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.287 5.906c-.778.324-2.334.994-4.666 2.01-.378.15-.577.298-.595.442-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294.26.006.549-.1.868-.32 2.179-1.471 3.304-2.214 3.374-2.23.05-.012.12-.026.166.016.047.041.042.12.037.141-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8.154 8.154 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629.093.06.183.125.27.187.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.426 1.426 0 0 0-.013-.315.337.337 0 0 0-.114-.217.526.526 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09z"
                                fill="white"
                            ></path>
                        </svg>
                    </a>
                </div>

            {/* Donation Buttons */}
            <section class="donation-links">
                <h2>Dukung Kami</h2>
                <div class="card donation-buttons">
                    <a class="donation-btn trakteer-btn" href="https://trakteer.id/okkidwi/tip" target="_blank">
                        Donasi melalui Trakteer
                    </a>
                    <a class="donation-btn saweria-btn" href="https://saweria.co/okkidwi" target="_blank">
                        Donasi melalui Saweria
                    </a>
                </div>
            </section>

        <button
          class="boton-elegante"
          style={"width: fit-content;"}
          onClick={handleSave}
        >
          Simpan Pengaturan
        </button>
      </section>
    </div>
  );
};

export default SettingsPage;
