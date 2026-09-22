// 테스트에서 `@/` 경로 별칭을 프로젝트 루트로 해석하고, 확장자 없는 .ts import를 보완한다.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(
  `data:text/javascript,${encodeURIComponent(`
    import { existsSync } from "node:fs";
    import { fileURLToPath } from "node:url";
    const root = ${JSON.stringify(pathToFileURL(process.cwd() + "/").href)};
    function withExt(url) {
      if (!url.startsWith("file:") || /\\.[a-z]+$/i.test(url)) return url;
      for (const ext of [".ts", ".tsx", ".mts", ".js"]) if (existsSync(fileURLToPath(url + ext))) return url + ext;
      return url;
    }
    export async function resolve(specifier, context, next) {
      if (specifier.startsWith("@/")) return next(withExt(new URL(specifier.slice(2), root).href), context);
      if (specifier.startsWith("./") || specifier.startsWith("../")) {
        if (context.parentURL) return next(withExt(new URL(specifier, context.parentURL).href), context);
      }
      return next(specifier, context);
    }
  `)}`,
);
