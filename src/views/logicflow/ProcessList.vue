<template>
  <div class="process-list">
    <div class="page-header">
      <div class="page-title">
        <el-icon><Document /></el-icon>
        <h2>流程管理</h2>
      </div>
      <div class="page-actions">
        <el-button type="primary" @click="goToDesigner">
          <el-icon><Plus /></el-icon>
          新建流程
        </el-button>
      </div>
    </div>

    <div class="page-content">
      <!-- 搜索区域 -->
      <div class="search-bar">
        <el-form :model="searchForm" inline>
          <el-form-item label="关键字">
            <el-input v-model="searchForm.keyword" placeholder="搜索流程名称或Key" clearable />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="全部状态" clearable>
              <el-option label="草稿" value="draft" />
              <el-option label="已部署" value="deployed" />
              <el-option label="已归档" value="archived" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 流程列表 -->
      <div class="process-table">
        <el-table v-loading="loading" :data="processList" stripe>
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="key" label="流程Key" width="180" />
          <el-table-column prop="name" label="流程名称" width="200" />
          <el-table-column prop="description" label="描述" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="version" label="版本" width="80" />
          <el-table-column prop="updateTime" label="更新时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.updateTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="260" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="handleEdit(row as ProcessDefinitionVO)">
                编辑
              </el-button>
              <el-button
                v-if="row.status !== 'deployed'"
                link
                type="success"
                @click="handleDeploy(row as ProcessDefinitionVO)"
              >
                部署
              </el-button>
              <el-button link type="warning" @click="handleVersions(row as ProcessDefinitionVO)">
                版本
              </el-button>
              <el-button link type="danger" @click="handleDelete(row as ProcessDefinitionVO)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="fetchList"
            @current-change="fetchList"
          />
        </div>
      </div>
    </div>

    <!-- 版本历史对话框 -->
    <el-dialog v-model="showVersionsDialog" title="版本历史" width="600px">
      <el-table v-loading="versionLoading" :data="versionList">
        <el-table-column prop="version" label="版本" width="100" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button link @click="handleViewVersion(row as ProcessDefinitionVO)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { processDefinitionApi, type ProcessDefinitionVO } from "@/api/logicflow";

const router = useRouter();

const loading = ref(false);
const processList = ref<ProcessDefinitionVO[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

const searchForm = reactive({
  keyword: "",
  status: "",
});

const showVersionsDialog = ref(false);
const versionLoading = ref(false);
const versionList = ref<ProcessDefinitionVO[]>([]);
const currentProcessKey = ref("");

onMounted(() => {
  fetchList();
});

async function fetchList() {
  loading.value = true;
  try {
    const res = await processDefinitionApi.list({
      keyword: searchForm.keyword || undefined,
      status: searchForm.status || undefined,
    });
    if (res.success && res.data) {
      processList.value = res.data;
      total.value = res.data.length;
    }
  } catch {
    ElMessage.error("获取流程列表失败");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  fetchList();
}

function handleReset() {
  searchForm.keyword = "";
  searchForm.status = "";
  handleSearch();
}

function goToDesigner() {
  // 跳转地址必须是一级目录+二级目录，不能有其他路径
  router.push("/workflow/designer");
}

function handleEdit(row: ProcessDefinitionVO) {
  router.push({
    // 跳转地址必须是一级目录+二级目录，不能有其他路径
    path: "/workflow/designer",
    query: { id: row.id },
  });
}

async function handleDeploy(row: ProcessDefinitionVO) {
  try {
    await ElMessageBox.confirm(`确定部署流程 "${row.name}" 吗？`, "部署确认", {
      type: "warning",
    });
    await processDefinitionApi.deploy({ id: row.id! });
    ElMessage.success("部署成功");
    fetchList();
  } catch (e) {
    if (e !== "cancel") {
      ElMessage.error("部署失败");
    }
  }
}

async function handleDelete(row: ProcessDefinitionVO) {
  try {
    await ElMessageBox.confirm(`确定删除流程 "${row.name}" 吗？此操作不可恢复！`, "删除确认", {
      type: "error",
    });
    await processDefinitionApi.remove(row.id!);
    ElMessage.success("删除成功");
    fetchList();
  } catch (e) {
    if (e !== "cancel") {
      ElMessage.error("删除失败");
    }
  }
}

async function handleVersions(row: ProcessDefinitionVO) {
  currentProcessKey.value = row.key;
  versionLoading.value = true;
  showVersionsDialog.value = true;
  try {
    const res = await processDefinitionApi.versions(row.key);
    if (res.success && res.data) {
      versionList.value = res.data;
    }
  } catch {
    ElMessage.error("获取版本历史失败");
  } finally {
    versionLoading.value = false;
  }
}

function handleViewVersion(row: ProcessDefinitionVO) {
  router.push({
    path: "/designer",
    query: { id: row.id, mode: "preview" },
  });
}

function getStatusType(status?: string): "primary" | "success" | "warning" | "info" | "danger" {
  const types: Record<string, "primary" | "success" | "warning" | "info" | "danger"> = {
    draft: "info",
    deployed: "success",
    archived: "warning",
  };
  return types[status || ""] || "info";
}

function getStatusText(status?: string): string {
  const texts: Record<string, string> = {
    draft: "草稿",
    deployed: "已部署",
    archived: "已归档",
  };
  return texts[status || ""] || "未知";
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleString("zh-CN");
}
</script>

<style scoped lang="scss">
.process-list {
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-title {
  display: flex;
  gap: 8px;
  align-items: center;

  h2 {
    margin: 0;
    font-size: 20px;
    color: #303133;
  }

  .el-icon {
    font-size: 24px;
    color: #409eff;
  }
}

.search-bar {
  padding: 16px;
  margin-bottom: 20px;
  background: #fff;
  border-radius: 8px;
}

.process-table {
  padding: 16px;
  background: #fff;
  border-radius: 8px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
