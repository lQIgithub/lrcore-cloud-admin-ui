<template>
  <div class="my-applications">
    <div class="page-header">
      <div class="page-title">
        <el-icon><Tickets /></el-icon>
        <h2>我的申请</h2>
      </div>
    </div>

    <div class="page-content">
      <el-card>
        <el-form :model="searchForm" inline class="filter-form">
          <el-form-item label="流程">
            <el-select v-model="searchForm.processDefinitionKey" placeholder="全部流程" clearable>
              <el-option label="公司请假流程" value="leave" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="全部状态" clearable>
              <el-option label="运行中" value="active" />
              <el-option label="已挂起" value="suspended" />
              <el-option label="已完成" value="completed" />
              <el-option label="已终止" value="terminated" />
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

        <el-table v-loading="loading" :data="list" stripe>
          <el-table-column prop="businessKey" label="业务Key" width="200" show-overflow-tooltip />
          <el-table-column prop="processDefinitionName" label="流程名称" width="160" />
          <el-table-column prop="status" label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="startTime" label="发起时间" width="170">
            <template #default="{ row }">
              {{ formatDate(row.startTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="endTime" label="结束时间" width="170">
            <template #default="{ row }">
              {{ row.endTime ? formatDate(row.endTime) : "-" }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="handleDetail(row as ProcessInstanceVO)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            @size-change="fetchList"
            @current-change="fetchList"
          />
        </div>
      </el-card>
    </div>

    <!-- 申请详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="申请详情" width="720px">
      <div v-if="currentInstance" class="instance-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="实例ID">{{ currentInstance.id }}</el-descriptions-item>
          <el-descriptions-item label="流程名称">
            {{ currentInstance.processDefinitionName }}
          </el-descriptions-item>
          <el-descriptions-item label="业务Key">
            {{ currentInstance.businessKey || "-" }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentInstance.status)">
              {{ getStatusText(currentInstance.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发起时间">
            {{ formatDate(currentInstance.startTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="结束时间">
            {{ currentInstance.endTime ? formatDate(currentInstance.endTime) : "-" }}
          </el-descriptions-item>
        </el-descriptions>

        <h4 class="section-title">请假信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="请假类型">
            {{ leaveTypeText(variables.leaveType) }}
          </el-descriptions-item>
          <el-descriptions-item label="请假天数">
            {{ variables.days ?? "-" }} 天
          </el-descriptions-item>
          <el-descriptions-item label="开始日期">
            {{ variables.startDate || "-" }}
          </el-descriptions-item>
          <el-descriptions-item label="结束日期">
            {{ variables.endDate || "-" }}
          </el-descriptions-item>
          <el-descriptions-item label="审批人ID">
            {{ variables.manager || "-" }}
          </el-descriptions-item>
          <el-descriptions-item label="事由" :span="2">
            {{ variables.reason || "-" }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { processInstanceApi, type ProcessInstanceVO } from "@/api/logicflow";

const loading = ref(false);
const list = ref<ProcessInstanceVO[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

const searchForm = reactive({
  processDefinitionKey: "",
  status: "",
});

const showDetailDialog = ref(false);
const currentInstance = ref<ProcessInstanceVO | null>(null);

const leaveTypeMap: Record<number, string> = {
  1: "事假",
  2: "病假",
  3: "年假",
  4: "调休",
  5: "其他",
};

function leaveTypeText(value: unknown): string {
  const num = Number(value);
  return leaveTypeMap[num] || (value ? String(value) : "-");
}

const variables = computed<Record<string, unknown>>(() => currentInstance.value?.variables ?? {});

onMounted(() => {
  fetchList();
});

async function fetchList() {
  loading.value = true;
  try {
    const page = await processInstanceApi.list({
      processDefinitionKey: searchForm.processDefinitionKey || undefined,
      status: searchForm.status || undefined,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
    });
    list.value = page?.list ?? [];
    total.value = page?.total ?? 0;
  } catch {
    ElMessage.error("获取我的申请列表失败");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  fetchList();
}

function handleReset() {
  searchForm.processDefinitionKey = "";
  searchForm.status = "";
  handleSearch();
}

function handleDetail(row: ProcessInstanceVO) {
  currentInstance.value = row;
  showDetailDialog.value = true;
}

function getStatusType(status: string): "primary" | "success" | "warning" | "info" | "danger" {
  const types: Record<string, "primary" | "success" | "warning" | "info" | "danger"> = {
    active: "success",
    suspended: "warning",
    completed: "info",
    terminated: "danger",
  };
  return types[status] || "info";
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    active: "运行中",
    suspended: "已挂起",
    completed: "已完成",
    terminated: "已终止",
  };
  return texts[status] || "未知";
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString("zh-CN");
}
</script>

<style scoped lang="scss">
.my-applications {
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
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

.filter-form {
  margin-bottom: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.instance-detail {
  .section-title {
    margin: 16px 0 8px;
    font-size: 14px;
    color: #303133;
  }
}
</style>
