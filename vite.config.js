import { resolve } from "path";

/** @type {import('vite').UserConfig} */
export default {
  build: {
    rollupOptions: {
      input: [resolve(__dirname, "./src/sankee/sankee.ts")],
      output: {
        dir: __dirname,
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`,
      },
    },
  },
};
