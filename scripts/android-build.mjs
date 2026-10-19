import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  copyFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const root = fileURLToPath(new URL("../", import.meta.url));
const windows = process.platform === "win32";
const env = { ...process.env };
const localJdk = join(root, ".tools/jdk");
if (!env.JAVA_HOME && existsSync(localJdk)) {
  const directory = readdirSync(localJdk).find((name) =>
    existsSync(join(localJdk, name, "bin/java.exe")),
  );
  if (directory) env.JAVA_HOME = join(localJdk, directory);
}
const sdk =
  env.ANDROID_HOME || env.ANDROID_SDK_ROOT || join(root, ".tools/android-sdk");
if (!existsSync(join(sdk, "platforms/android-36"))) {
  console.error(
    "SDK API 36 absent. Définissez ANDROID_HOME ; voir docs/ANDROID.md.",
  );
  process.exit(1);
}
env.ANDROID_HOME = sdk;
env.ANDROID_SDK_ROOT = sdk;
env.GRADLE_USER_HOME ||= join(root, ".tools/gradle");
const pathKey =
  Object.keys(env).find((key) => key.toLowerCase() === "path") || "PATH";
if (env.JAVA_HOME)
  env[pathKey] =
    `${join(env.JAVA_HOME, "bin")}${windows ? ";" : ":"}${env[pathKey] || ""}`;
function run(command, args, cwd = root) {
  const batch = windows && command.endsWith(".bat");
  if (batch && ![command, ...args].every((value) => /^[\w:.=-]+$/.test(value)))
    throw new Error("Argument de compilation Gradle invalide.");
  const result = spawnSync(
    batch ? env.ComSpec || "cmd.exe" : command,
    batch ? ["/d", "/s", "/c", [command, ...args].join(" ")] : args,
    {
      cwd,
      env,
      stdio: "inherit",
      shell: false,
    },
  );
  if (result.error || result.status !== 0) {
    console.error(result.error?.message || `Échec : ${command}`);
    process.exit(result.status || 1);
  }
}
const key = join(root, ".tools/keys/lifeos-debug.keystore");
mkdirSync(resolve(key, ".."), { recursive: true });
if (!existsSync(key))
  run("keytool", [
    "-genkeypair",
    "-noprompt",
    "-keystore",
    key,
    "-storepass",
    "android",
    "-alias",
    "androiddebugkey",
    "-keypass",
    "android",
    "-dname",
    "CN=LifeOS Debug,O=LifeOS,C=FR",
    "-keyalg",
    "RSA",
    "-keysize",
    "2048",
    "-validity",
    "10000",
  ]);
const npmCli =
  process.env.npm_execpath ||
  join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
run(process.execPath, [npmCli, "run", "build"]);
run(process.execPath, [
  join(root, "node_modules/@capacitor/cli/bin/capacitor"),
  "sync",
  "android",
]);
const tasks = [":app:assembleDebug"];
if (process.argv.includes("--verify"))
  tasks.push(
    ":app:lintDebug",
    ":app:testDebugUnitTest",
    ":app:assembleDebugAndroidTest",
  );
run(
  windows ? "gradlew.bat" : "./gradlew",
  ["--no-daemon", "--console=plain", ...tasks],
  join(root, "android"),
);
const version = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
).version;
const artifact = join(root, `artifacts/LifeOS-${version}-debug.apk`);
mkdirSync(join(root, "artifacts"), { recursive: true });
copyFileSync(
  join(root, "android/app/build/outputs/apk/debug/app-debug.apk"),
  artifact,
);
const hash = createHash("sha256").update(readFileSync(artifact)).digest("hex");
writeFileSync(`${artifact}.sha256`, `${hash}  LifeOS-${version}-debug.apk\n`);
console.log(`\nAPK de développement : ${artifact}\nSHA-256 : ${hash}`);
