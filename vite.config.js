import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const page = (file) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: page("./index.html"),
        privacy: page("./privacy.html"),
        notFound: page("./404.html"),
      },
    },
  },
});
