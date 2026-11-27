import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "/",
  build: {
    rollupOptions: {
      input: {
        app: resolve(process.cwd(), "index.html"),
        demo: resolve(process.cwd(), "demo.html")
      }
    }
  }
});
