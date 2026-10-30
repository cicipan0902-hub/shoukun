import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { inspectPublicArtifact } from "./lib/public-artifact.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
console.log(await inspectPublicArtifact(resolve(root, "dist"), resolve(root, "dist-public")));
