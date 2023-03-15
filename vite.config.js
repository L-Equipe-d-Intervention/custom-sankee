import { defineConfig, loadEnv } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import dsv from "@rollup/plugin-dsv";
import { resolve } from "path";

export default ({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };
  const VIZ_NAME = env.VITE_VIZ_NAME;

  return defineConfig({
    build: {
      emptyOutDir: false,
      rollupOptions: {
        input: [resolve(__dirname, "./src/" + VIZ_NAME + "/index.ts")],
        output: {
          dir: resolve(__dirname, "./dist"),
          entryFileNames: `${VIZ_NAME}.js`,
          chunkFileNames: `[name].js`,
          assetFileNames: `[name].[ext]`,
        },
      },
    },
    plugins: [cssInjectedByJsPlugin(), dsv()],
  });
};
