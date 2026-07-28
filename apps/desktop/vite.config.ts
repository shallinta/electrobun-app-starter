import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: "src/mainview",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    // react/react-dom are deduped so the shared `@shallinta/ui` package and the
    // app resolve the same React copy (else hooks throw "invalid hook call").
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    // Keep warnings focused on genuinely new bloat rather than known,
    // intentionally split chunks.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Split the stable, heavy vendor libraries out of the app chunk. They
        // change far less often than app code, so isolating them means an
        // app-code update ships a small delta for the auto-updating desktop
        // shell, and the browser can parse the chunks in parallel on startup.
        manualChunks(id) {
          if (
            /[\\/]node_modules[\\/](\.bun[\\/])?(react|react-dom|scheduler)[@\\/]/.test(
              id
            )
          ) {
            return "react-vendor";
          }
          if (/[\\/](radix-ui|@radix-ui|@base-ui|@floating-ui)[\\/]/.test(id)) {
            return "ui-vendor";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
