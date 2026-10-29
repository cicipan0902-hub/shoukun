// Compile tests against the exact same extension list as prepare-campus.mjs.
// This helper is imported only by tests, never by the player entry point.
import project from "../../stories/foundation/project.json";
import { mergeExtensions } from "./compile";
const files = import.meta.glob("../../stories/foundation/*.json", { eager: true, import: "default" });
export function foundationExtensions() {
  return mergeExtensions([project.extensionsFile, ...project.additionalExtensionsFiles].map((path) => {
    const data = files["../../" + path];
    if (!data) throw Error(`测试缺少项目配置的扩展文件: ${path}`);
    return data;
  }));
}

// Optional author notes exist only on the author's computer, not in public CI.
export function authorOnlyFixture<T>(name: string): T | undefined {
  return files["../../stories/foundation/" + name] as T | undefined;
}
