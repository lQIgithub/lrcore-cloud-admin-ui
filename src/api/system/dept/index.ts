import request from "@/utils/request";
import type { DeptForm, DeptItem, DeptQueryParams } from "./types.d";
import type { OptionItem } from "@/api/common";
import { CommonStatus } from "@/enums";

const SYSTEM_BASE_PREFIX = "/lrcore-system";

const DEPT_BASE_URL = SYSTEM_BASE_PREFIX + "/api/v1/depts";

/** SysDeptController 返回的部门实体字段 */
interface RawDeptItem {
  id?: string | number;
  enterpriseId?: string | number;
  deptName?: string;
  deptCode?: string;
  parentId?: string | number;
  status?: number;
  sortOrder?: number;
}

/** SysDeptController 返回的树形节点字段 */
interface RawDeptOptionNode {
  nodeId?: string | number;
  nodeName?: string;
  children?: RawDeptOptionNode[];
}

/** 将后端状态（0 启用、1 禁用）转换为前端状态 */
function toFrontendStatus(status?: number): number | undefined {
  if (status === undefined || status === null) return undefined;
  return status === 0 ? CommonStatus.ENABLED : CommonStatus.DISABLED;
}

/** 将前端状态转换为后端状态（0 启用、1 禁用） */
function toBackendStatus(status?: number): number {
  return status === CommonStatus.ENABLED ? 0 : 1;
}

function toDeptItem(item: RawDeptItem): DeptItem {
  return {
    id: item.id === undefined ? undefined : String(item.id),
    enterpriseId: item.enterpriseId === undefined ? undefined : String(item.enterpriseId),
    name: item.deptName,
    code: item.deptCode,
    parentId: item.parentId === undefined ? undefined : String(item.parentId),
    sort: item.sortOrder,
    status: toFrontendStatus(item.status),
  };
}

function buildDeptTree(deptItems: DeptItem[]): DeptItem[] {
  const itemMap = new Map(deptItems.map((item) => [String(item.id), item]));

  const roots: DeptItem[] = [];
  deptItems.forEach((item) => {
    const parentId = String(item.parentId ?? "0");
    const parent = itemMap.get(parentId);
    if (parentId === "0" || !parent) {
      roots.push(item);
      return;
    }
    parent.children = parent.children ?? [];
    parent.children.push(item);
  });

  const sortTree = (items: DeptItem[]): DeptItem[] => {
    items.sort((first, second) => (first.sort ?? 0) - (second.sort ?? 0));
    items.forEach((item) => {
      if (item.children) sortTree(item.children);
    });
    return items;
  };

  return sortTree(roots);
}

function toOptionItem(node: RawDeptOptionNode): OptionItem {
  return {
    value: String(node.nodeId),
    label: node.nodeName ?? "",
    children: node.children?.map(toOptionItem),
  };
}

const DeptAPI = {
  /** 获取部门树形列表 */
  getList(queryParams?: DeptQueryParams) {
    return request<unknown, DeptItem[]>({
      url: `${DEPT_BASE_URL}/list`,
      method: "get",
      params: {
        enterpriseId: queryParams?.enterpriseId,
      },
    }).then((items) => {
      const deptItems = (items ?? []).map(toDeptItem);
      const filteredItems = deptItems.filter((item) => {
        if (queryParams?.keywords) {
          const keyword = queryParams.keywords.toLowerCase();
          const name = item.name?.toLowerCase() ?? "";
          const code = item.code?.toLowerCase() ?? "";
          if (!name.includes(keyword) && !code.includes(keyword)) {
            return false;
          }
        }
        if (queryParams?.status !== undefined && item.status !== queryParams.status) {
          return false;
        }
        return true;
      });

      return buildDeptTree(filteredItems);
    });
  },
  /** 获取部门下拉数据源 */
  getOptions() {
    return request<unknown, RawDeptOptionNode[]>({
      url: `${DEPT_BASE_URL}/options`,
      method: "get",
    }).then((nodes) => (nodes ?? []).flatMap((node) => (node.children ?? []).map(toOptionItem)));
  },
  /** 获取部门表单数据 */
  getFormData(id: string) {
    return request<unknown, RawDeptItem>({
      url: `${DEPT_BASE_URL}/getInfo/${id}`,
      method: "get",
    }).then((item) => {
      const deptItem = toDeptItem(item ?? {});
      return {
        id: deptItem.id,
        enterpriseId: deptItem.enterpriseId,
        name: deptItem.name,
        code: deptItem.code,
        parentId: deptItem.parentId,
        sort: deptItem.sort,
        status: deptItem.status,
      } satisfies DeptForm;
    });
  },
  /** 新增部门 */
  create(data: DeptForm) {
    return request({
      url: `${DEPT_BASE_URL}/save`,
      method: "post",
      data: {
        deptName: data.name,
        deptCode: data.code,
        enterpriseId: data.enterpriseId,
        parentId: data.parentId,
        sortOrder: data.sort,
        status: toBackendStatus(data.status),
      },
    });
  },
  /** 修改部门 */
  update(id: string, data: DeptForm) {
    return request({
      url: `${DEPT_BASE_URL}/update`,
      method: "put",
      data: {
        id,
        deptName: data.name,
        deptCode: data.code,
        enterpriseId: data.enterpriseId,
        parentId: data.parentId,
        sortOrder: data.sort,
        status: toBackendStatus(data.status),
      },
    });
  },
  /** 批量删除部门，多个以英文逗号(,)分割 */
  deleteByIds(ids: string) {
    const idList = ids.split(",").filter(Boolean);
    return Promise.all(
      idList.map((id) => request({ url: `${DEPT_BASE_URL}/remove/${id}`, method: "delete" }))
    );
  },

  /** 批量更新部门排序 */
  updateSort(items: { id: string; sort: number }[]) {
    return request({
      url: `${DEPT_BASE_URL}/sort`,
      method: "put",
      data: { items },
    });
  },
};

export default DeptAPI;

// 重导出类型
export * from "./types.d";
