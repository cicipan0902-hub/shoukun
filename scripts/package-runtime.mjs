import { copyFile, rm } from "node:fs/promises";
for (const name of ["LICENSE", "THIRD_PARTY_LICENSES.txt", "BRAND_NOTICE.txt"])
  await copyFile(name, "dist/" + name);
console.log("Runtime license notices included.");

await copyFile("src/vendor/mymy/NOTICE.txt", "dist/MYMY_NOTICE.txt");

await copyFile("src/vendor/hoops88/LICENSE", "dist/HOOPS88_LICENSE.txt");

// Keep developer-only story previews out of the published player artifact.
for (const name of ["test-work.json", "blank-work.json"]) await rm("dist/" + name, { force: true });
