import request from "@/utils/request";
import type { MenuForm, MenuItem, MenuQueryParams, RouteItem } from "./types.d";
import type { OptionItem } from "@/api/common";
import { MenuScopeEnum, MenuTypeEnum } from "@/enums";

const SYSTEM_BASE_PREFIX = "/lrcore-system";
const MENU_BASE_URL = SYSTEM_BASE_PREFIX + "/api/v1/menus";
const APP_BASE_URL = SYSTEM_BASE_PREFIX + "/sysApp";

/** SysPermissionController 返回的菜单/权限字段 */
interface RawMenuNode {
  id?: string | number;
  appId?: string | number;
  pid?: string | number;
  type?: number | string;
  name?: string;
  title?: string;
  permCode?: string;
  path?: string;
  component?: string;
  redirect?: string;
  icon?: string;
  sort?: number;
  status?: number | string;
  hidden?: boolean;
  keepLive?: boolean;
  alwaysShow?: boolean;
  children?: RawMenuNode[];
}

interface RawMenuPage {
  list?: RawMenuNode[];
  records?: RawMenuNode[];
}

/** 应用实体字段 */
interface RawAppNode {
  id?: string | number;
  appCode?: string;
  status?: number;
}

const enabledAppsPromise = new Map<MenuScopeEnum | undefined, Promise<string | undefined>>();

function toFrontendType(type?: number | string): MenuTypeEnum {
  if (type === "DIRECTORY") return MenuTypeEnum.CATALOG;
  if (type === "MENU") return MenuTypeEnum.MENU;
  if (type === "BUTTON") return MenuTypeEnum.BUTTON;
  if (type === "INTERFACE") return MenuTypeEnum.EXTERNAL;

  const typeCode = Number(type);
  if (typeCode === 0) return MenuTypeEnum.CATALOG;
  if (typeCode === 1) return MenuTypeEnum.MENU;
  if (typeCode === 2) return MenuTypeEnum.BUTTON;
  if (typeCode === 3) return MenuTypeEnum.EXTERNAL;

  return MenuTypeEnum.MENU;
}

function toBackendType(type?: MenuForm["type"]): number {
  if (type === MenuTypeEnum.CATALOG) return 0;
  if (type === MenuTypeEnum.BUTTON) return 2;
  if (type === MenuTypeEnum.EXTERNAL) return 3;
  return 1;
}

function isFrontendEnabled(status?: number | string): boolean {
  return status === 1 || status === "ACTIVATED";
}

function toMenuItem(item: RawMenuNode): MenuItem {
  const type = toFrontendType(item.type);

  return {
    appId: item.appId === undefined ? undefined : String(item.appId),
    id: item.id === undefined ? undefined : String(item.id),
    parentId: item.pid === undefined ? undefined : String(item.pid),
    name: item.title,
    type,
    routeName: item.name,
    routePath: item.path,
    path: item.path,
    component: item.component,
    externalUrl: type === MenuTypeEnum.EXTERNAL ? item.path : undefined,
    redirect: item.redirect,
    icon: item.icon,
    sort: item.sort,
    perm: item.permCode,
    visible: isFrontendEnabled(item.status) ? 1 : 0,
    keepAlive: item.keepLive ? 1 : 0,
    alwaysShow: item.alwaysShow ? 1 : 0,
    params: [],
  };
}

function buildMenuTree(items: MenuItem[]): MenuItem[] {
  const itemMap = new Map(items.map((item) => [String(item.id), item]));
  const roots: MenuItem[] = [];

  items.forEach((item) => {
    const parentId = String(item.parentId ?? "0");
    const parent = itemMap.get(parentId);
    if (parentId === "0" || !parent) {
      roots.push(item);
      return;
    }

    parent.children = parent.children ?? [];
    parent.children.push(item);
  });

  const sortTree = (menuItems: MenuItem[]): MenuItem[] => {
    menuItems.sort((first, second) => (first.sort ?? 0) - (second.sort ?? 0));
    menuItems.forEach((item) => {
      if (item.children) sortTree(item.children);
    });
    return menuItems;
  };

  return sortTree(roots);
}

function filterMenus(items: MenuItem[], queryParams?: MenuQueryParams): MenuItem[] {
  return items.filter((item) => {
    if (!queryParams?.keywords) return true;

    const keyword = queryParams.keywords.toLowerCase();
    const values = [item.name, item.routeName, item.routePath, item.perm];
    return values.some((value) => value?.toLowerCase().includes(keyword));
  });
}

async function getRawMenus(): Promise<MenuItem[]> {
  const page = await request<unknown, RawMenuPage>({
    url: `${MENU_BASE_URL}/page`,
    method: "get",
    params: { pageNumber: 1, pageSize: 10000 },
  });
  return (page?.records ?? page?.list ?? []).map(toMenuItem);
}

function getAppList() {
  return request<unknown, RawAppNode[]>({ url: `${APP_BASE_URL}/list`, method: "get" });
}

function resolveAppId(scope?: MenuScopeEnum) {
  if (!enabledAppsPromise.has(scope)) {
    const appIdPromise = getAppList().then((apps) => {
      const appCode = scope === MenuScopeEnum.PLATFORM ? "system" : "business";
      const matchedApp = apps?.find((app) => app.appCode === appCode && app.status === 0);
      const enabledApp = apps?.find((app) => app.status === 0);
      const appId = matchedApp?.id ?? enabledApp?.id;
      return appId === undefined ? undefined : String(appId);
    });
    enabledAppsPromise.set(scope, appIdPromise);
    return appIdPromise;
  }

  return enabledAppsPromise.get(scope) as Promise<string | undefined>;
}

function toMenuForm(item: RawMenuNode): MenuForm {
  const menuItem = toMenuItem(item);

  return {
    appId: menuItem.appId,
    id: menuItem.id,
    parentId: menuItem.parentId,
    name: menuItem.name,
    type: menuItem.type,
    path: menuItem.path,
    routeName: menuItem.routeName,
    routePath: menuItem.routePath,
    redirect: menuItem.redirect,
    component: menuItem.component,
    externalUrl: menuItem.externalUrl,
    icon: menuItem.icon,
    sort: menuItem.sort,
    visible: menuItem.visible,
    perm: menuItem.perm,
    params: menuItem.params,
    alwaysShow: menuItem.alwaysShow,
    keepAlive: menuItem.keepAlive,
  };
}

function toBackendPayload(data: MenuForm, appId?: string) {
  return {
    appId: data.appId ?? appId,
    pid: data.parentId,
    type: toBackendType(data.type),
    name: data.routeName ?? data.name,
    title: data.name,
    permCode: data.perm ?? data.name,
    path: data.type === MenuTypeEnum.EXTERNAL ? data.externalUrl : (data.routePath ?? data.path),
    component: data.component,
    redirect: data.redirect,
    icon: data.icon,
    sort: data.sort,
    status: data.visible === 1 ? 1 : 0,
    hidden: data.visible !== 1,
    keepLive: data.keepAlive === 1 || data.keepAlive === true,
    alwaysShow: data.alwaysShow === 1 || data.alwaysShow === true,
  };
}

const MenuAPI = {
  /** 获取当前用户的路由列表 */
  getRoutes() {
    return request<unknown, RouteItem[]>({ url: `${MENU_BASE_URL}/routes`, method: "get" });
  },
  /** 获取菜单树形列表 */
  getList(queryParams: MenuQueryParams) {
    return getRawMenus().then((items) => buildMenuTree(filterMenus(items, queryParams)));
  },
  /** 获取菜单下拉数据源 */
  getOptions(onlyParent?: boolean, scope?: number) {
    return Promise.all([
      getRawMenus(),
      scope === undefined ? Promise.resolve(undefined) : resolveAppId(scope),
    ]).then(([items, appId]) => {
      const filteredItems = items.filter((item) => {
        if (onlyParent && item.type === MenuTypeEnum.BUTTON) return false;
        if (appId && item.appId !== appId) return false;
        return true;
      });

      return buildMenuTree(filteredItems).map(function toOption(item): OptionItem {
        return {
          value: String(item.id),
          label: item.name ?? "",
          children: item.children?.map(toOption),
        };
      });
    });
  },
  /** 获取菜单表单数据 */
  getFormData(id: string) {
    return request<unknown, RawMenuNode>({
      url: `${MENU_BASE_URL}/getInfo/${id}`,
      method: "get",
    }).then((item) => toMenuForm(item ?? {}));
  },
  /** 新增菜单 */
  create(data: MenuForm) {
    return resolveAppId(data.scope).then((appId) =>
      request({ url: `${MENU_BASE_URL}/save`, method: "post", data: toBackendPayload(data, appId) })
    );
  },
  /** 修改菜单 */
  update(id: string, data: MenuForm) {
    return request({
      url: `${MENU_BASE_URL}/update`,
      method: "put",
      data: { ...toBackendPayload(data, data.appId), id },
    });
  },
  /** 删除菜单 */
  deleteById(id: string) {
    return request({ url: `${MENU_BASE_URL}/remove/${id}`, method: "delete" });
  },
  /** 批量更新菜单排序 */
  updateSort(items: { id: string; sort: number }[]) {
    return request({
      url: `${MENU_BASE_URL}/sort`,
      method: "put",
      data: { items },
    });
  },
};

export default MenuAPI;

// 重导出类型
export * from "./types.d";
