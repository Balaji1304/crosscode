import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  outDir: "dist",
  clean: true,
  bundle: true,
  splitting: false,
  sourcemap: true,
  dts: false,
  minify: false,
  noExternal: [/@crosscode\/shared/],
})
