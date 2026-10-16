import path from "path-browserify";
import { isExternal } from "./validate";

/**
 * 解析菜单的完整路由地址。
 */
export function resolveRoutePath(basePath: string, routePath: string): string {
  if (isExternal(routePath)) return routePath;
  if (isExternal(basePath)) return basePath;

  return path.resolve(basePath || "/", routePath);
}
