import { invoke } from '@tauri-apps/api';

async function clearFile(filePath) {
    try {
        await invoke('clear_file', { filePath });
        return;
    } catch (error) {
        console.error('Terjadi kesalahan saat membaca file:', error);
    }
}

export default clearFile;
