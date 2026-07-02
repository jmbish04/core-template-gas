import { GasPlugin } from "npm:esbuild-gas-plugin@0.8.0";
import { denoPlugins } from "https://deno.land/x/esbuild_deno_loader@0.9.0/mod.ts";
import { parseArgs } from "https://deno.land/std@0.213.0/cli/parse_args.ts";
import { build, type Plugin } from "https://deno.land/x/esbuild@v0.20.0/mod.js";
import $ from "https://deno.land/x/dax@0.38.0/mod.ts";

const command = parseArgs(Deno.args, {})._[0] || "build";

switch (command) {
  case "build": {
    await Promise.all([
      build({
        bundle: true,
        charset: "utf8",
        entryPoints: ["main.ts"],
        outfile: "dist/deno-gas/Code.js",
        target: "es2017",
        plugins: [...denoPlugins(), GasPlugin as unknown as Plugin],
      }),
      (async () => {
        await Deno.mkdir("dist/deno-gas", { recursive: true });
        await Deno.copyFile("appsscript.deno.json", "dist/deno-gas/appsscript.json");
      })(),
    ]);
    Deno.exit();
    break;
  }

  case "deploy": {
    await $`deno task build`;
    await $`deno run --allow-env --allow-net --allow-read --allow-sys --allow-write npm:@google/clasp@2.4.2 push -f --rootDir dist/deno-gas`
      .stdinText("\n");
    break;
  }

  default: {
    console.error(`Error: Unknown command: ${command}`);
    Deno.exit(1);
  }
}
