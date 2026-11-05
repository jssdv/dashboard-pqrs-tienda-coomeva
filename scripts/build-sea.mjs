// Builds dist-bin/pqr-<os>-<arch>/{pqr[.exe], data/}: one Node SEA executable with the client and csv defaults embedded.
// Run on the target OS: the Node binary and postject output are platform specific.
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { inject } from "postject";
import { build as vite } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = join(root, "dist-bin");
const work = join(outRoot, ".build");
const osName = { darwin: "macos", win32: "windows", linux: "linux" }[process.platform] ?? process.platform;
const folder = join(outRoot, `pqr-${osName}-${process.arch}`);
const exe = join(folder, process.platform === "win32" ? "pqr.exe" : "pqr");
const SENTINEL = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";

function filesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

// vite.config.ts sets root "client" relative to the cwd, so run from the repo root.
process.chdir(root);
await vite({ configFile: join(root, "vite.config.ts") });

const bundle = join(work, "main.cjs");
await esbuild({
  entryPoints: [join(root, "src/cli/main.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  outfile: bundle,
  logOverride: { "empty-import-meta": "silent" },
});

const clientDist = join(root, "client/dist");
const assets = {};
for (const file of filesUnder(clientDist)) {
  assets[relative(clientDist, file).split(sep).join("/")] = file;
}
for (const name of ["dictionary.csv", "holidays.csv"]) {
  assets[`defaults/${name}`] = join(root, "data", name);
}

const seaConfig = join(work, "sea-config.json");
const blob = join(work, "sea-prep.blob");
writeFileSync(
  seaConfig,
  JSON.stringify({
    main: bundle,
    output: blob,
    disableExperimentalSEAWarning: true,
    useSnapshot: false,
    useCodeCache: true,
    assets,
  }),
);
// PQR_NODE_BIN: an official Node build to package (Homebrew's node has no SEA fuse, so postject fails). Defaults to the one running this script.
const nodeBin = process.env.PQR_NODE_BIN ?? process.execPath;
execFileSync(nodeBin, ["--experimental-sea-config", seaConfig], { stdio: "inherit" });

mkdirSync(folder, { recursive: true });
// A universal (fat) macOS binary is thinned to the host arch so the injected Mach-O is a single slice.
const thin = { arm64: "arm64", x64: "x86_64" }[process.arch];
if (process.platform !== "darwin" || spawnSync("lipo", ["-thin", thin, nodeBin, "-output", exe]).status !== 0) {
  copyFileSync(nodeBin, exe);
}
chmodSync(exe, 0o755);
if (process.platform === "darwin") {
  execFileSync("codesign", ["--remove-signature", exe]);
}

await inject(exe, "NODE_SEA_BLOB", readFileSync(blob), {
  sentinelFuse: SENTINEL,
  ...(process.platform === "darwin" ? { machoSegmentName: "NODE_SEA" } : {}),
});

if (process.platform === "darwin") {
  execFileSync("codesign", ["--sign", "-", exe]);
}

mkdirSync(join(folder, "data"), { recursive: true });
// Acceso desde internet: CLOUDFLARED_BIN apunta al ejecutable cloudflared de esta plataforma (lo baja el workflow de CI).
// Sin él, la app se compila igual y la opción de internet aparece deshabilitada.
if (process.env.CLOUDFLARED_BIN) {
  mkdirSync(join(folder, "bin"), { recursive: true });
  const tunel = join(folder, "bin", process.platform === "win32" ? "cloudflared.exe" : "cloudflared");
  copyFileSync(process.env.CLOUDFLARED_BIN, tunel);
  chmodSync(tunel, 0o755);
} else {
  console.warn("CLOUDFLARED_BIN no definido: esta copia no tendrá acceso desde internet.");
}
copyFileSync(join(root, "scripts", "LEEME.txt"), join(folder, "LEEME.txt"));
rmSync(work, { recursive: true, force: true });
console.log(`built ${exe}`);
