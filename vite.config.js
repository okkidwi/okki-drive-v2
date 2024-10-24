import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { viteStaticCopy } from "vite-plugin-static-copy";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
    solid(),
    viteStaticCopy({
      targets: [
        {
          src: './splashscreen.html',  
          dest: '.'                     
        },
        {
          src: './src-tauri/icons/Square310x310Logo.png', 
          dest: '.'  
        }
      ]
    })
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  clearScreen: false, // prevent vite from obscuring rust errors
  server: {
    port: 1420, // tauri expects a fixed port, fail if that port is not available
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"], // tell vite to ignore watching `src-tauri`
    }
  },
  build: {
    target: "esnext", // Modern JavaScript target for Tauri
    rollupOptions: {
      external: ['i18next', 'react-i18next'],
    },
  },
}));
