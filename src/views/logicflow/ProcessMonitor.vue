<template>
  <div class="process-monitor">
    <div class="page-header">
      <div class="page-title">
        <el-icon><DataAnalysis /></el-icon>
        <h2>流程监控</h2>
      </div>
    </div>

    <div class="page-content">
      <!-- 统计卡片 -->
      <div class="statistics-cards">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-card class="stat-card stat-card--blue">
              <div class="stat-card__content">
                <div class="stat-card__info">
                  <span class="stat-card__value">{{ statistics.activeInstances }}</span>
                  <span class="stat-card__label">活跃实例</span>
                </div>
                <el-icon class="stat-card__icon"><Loading /></el-icon>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card stat-card--green">
              <div class="stat-card__content">
                <div class="stat-card__info">
                  <span class="stat-card__value">{{ statistics.completedInstances }}</span>
                  <span class="stat-card__label">已完成实例</span>
                </div>
                <el-icon class="stat-card__icon"><CircleCheck /></el-icon>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card stat-card--orange">
              <div class="stat-card__content">
                <div class="stat-card__info">
                  <span class="stat-card__value">{{ statistics.pendingTasks }}</span>
                  <span class="stat-card__label">待办任务</span>
                </div>
                <el-icon class="stat-card__icon"><Clock /></el-icon>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card stat-card--red">
              <div class="stat-card__content">
                <div class="stat-card__info">
                  <span class="stat-card__value">{{ statistics.terminatedInstances }}</span>
                  <span class="stat-card__label">已终止实例</span>
                </div>
                <el-icon class="stat-card__icon"><CircleClose /></el-icon>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 图表区域 -->
      <el-row :gutter="16" class="chart-row">
        <el-col :span="12">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>流程实例趋势</span>
              </div>
            </template>
            <div ref="trendChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>任务类型分布</span>
              </div>
            </template>
            <div ref="taskChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 流程实例列表 -->
      <el-card class="instances-card">
        <template #header>
          <div class="card-header">
            <span>流程实例列表</span>
            <el-button size="small" @click="fetchInstances">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </template>

        <el-form :model="filterForm" inline class="filter-form">
          <el-form-item label="流程">
            <el-select v-model="filterForm.processKey" placeholder="全部流程" clearable>
              <el-option
                v-for="process in processOptions"
                :key="process.key"
                :label="process.name"
                :value="process.key"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" placeholder="全部状态" clearable>
              <el-option label="活跃" value="active" />
              <el-option label="已挂起" value="suspended" />
              <el-option label="已完成" value="completed" />
              <el-option label="已终止" value="terminated" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="fetchInstances">查询</el-button>
          </el-form-item>
        </el-form>

        <el-table v-loading="instancesLoading" :data="instanceList" stripe>
          <el-table-column prop="id" label="实例ID" width="200" show-overflow-tooltip />
          <el-table-column prop="processDefinitionName" label="流程名称" width="150" />
          <el-table-column prop="businessKey" label="业务Key" width="150" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="startTime" label="开始时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.startTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="endTime" label="结束时间" width="160">
            <template #default="{ row }">
              {{ row.endTime ? formatDate(row.endTime) : "-" }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="handleDetail(row as ProcessInstanceVO)">
                详情
              </el-button>
              <el-button
                v-if="row.status === 'active'"
                link
                type="warning"
                @click="handleSuspend(row as ProcessInstanceVO)"
              >
                挂起
              </el-button>
              <el-button
                v-if="row.status === 'active'"
                link
                type="danger"
                @click="handleTerminate(row as ProcessInstanceVO)"
              >
                终止
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
            @size-change="fetchInstances"
            @current-change="fetchInstances"
          />
        </div>
      </el-card>

      <!-- 实例详情对话框 -->
      <el-dialog v-model="showDetailDialog" title="实例详情" width="800px">
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
            <el-descriptions-item label="开始时间">
              {{ formatDate(currentInstance.startTime) }}
            </el-descriptions-item>
            <el-descriptions-item label="结束时间">
              {{ currentInstance.endTime ? formatDate(currentInstance.endTime) : "-" }}
            </el-descriptions-item>
          </el-descriptions>

          <h4 class="section-title">流程变量</h4>
          <el-table :data="variableList" size="small" border>
            <el-table-column prop="name" label="变量名" />
            <el-table-column prop="value" label="值" />
          </el-table>
        </div>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useWorkflowEvent } from "@/composables";
import {
  processInstanceApi,
  processDefinitionApi,
  monitorApi,
  type ProcessInstanceVO,
  type ProcessDefinitionVO,
} from "@/api/logicflow";

const statistics = reactive({
  activeInstances: 0,
  completedInstances: 0,
  pendingTasks: 0,
  terminatedInstances: 0,
});

const processOptions = ref<ProcessDefinitionVO[]>([]);
const instanceList = ref<ProcessInstanceVO[]>([]);
const instancesLoading = ref(false);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

const filterForm = reactive({
  processKey: "",
  status: "",
});

const showDetailDialog = ref(false);
const currentInstance = ref<ProcessInstanceVO | null>(null);
const variableList = ref<Array<{ name: string; value: string }>>([]);

const trendChartRef = ref<HTMLElement | null>(null);
const taskChartRef = ref<HTMLElement | null>(null);

/** 工作流 SSE 事件订阅（取消函数） */
let stopWorkflowEvents: (() => void) | null = null;

onMounted(() => {
  fetchStatistics();
  fetchProcessOptions();
  fetchInstances();
  initCharts();
  // 工作流事件（任务/实例变更）到达时实时刷新统计与实例列表
  stopWorkflowEvents = useWorkflowEvent().onWorkflowEvent(() => {
    fetchStatistics();
    fetchInstances();
  });
});

onBeforeUnmount(() => {
  if (stopWorkflowEvents) {
    stopWorkflowEvents();
    stopWorkflowEvents = null;
  }
});

async function fetchStatistics() {
  try {
    // request 拦截器已拆壳，解析值即统计数据对象（后端未实现时可能为 null）
    const data = await monitorApi.getActiveInstances();
    if (data) {
      Object.assign(statistics, data);
    }
  } catch (e) {
    console.error("获取统计数据失败", e);
  }
}

async function fetchProcessOptions() {
  try {
    const list = await processDefinitionApi.list();
    processOptions.value = Array.isArray(list) ? list : [];
  } catch (e) {
    console.error("获取流程列表失败", e);
  }
}

async function fetchInstances() {
  instancesLoading.value = true;
  try {
    const page = await processInstanceApi.list({
      processDefinitionKey: filterForm.processKey || undefined,
      status: filterForm.status || undefined,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
    });
    instanceList.value = page?.list ?? [];
    total.value = page?.total ?? 0;
  } catch {
    ElMessage.error("获取实例列表失败");
  } finally {
    instancesLoading.value = false;
  }
}

async function handleDetail(row: ProcessInstanceVO) {
  currentInstance.value = row;
  showDetailDialog.value = true;
  try {
    // 拦截器已拆壳，解析值即变量键值对（后端未实现时可能为 null）
    const vars = await processInstanceApi.getVariables(row.id);
    variableList.value = vars
      ? Object.entries(vars).map(([name, value]) => ({
          name,
          value: String(value),
        }))
      : [];
  } catch (e) {
    console.error("获取变量失败", e);
  }
}

async function handleSuspend(row: ProcessInstanceVO) {
  try {
    await ElMessageBox.confirm(`确定挂起实例 "${row.id}" 吗？`, "挂起确认");
    await processInstanceApi.suspend(row.id);
    ElMessage.success("挂起成功");
    fetchInstances();
  } catch (e) {
    if (e !== "cancel") {
      ElMessage.error("挂起失败");
    }
  }
}

async function handleTerminate(row: ProcessInstanceVO) {
  try {
    await ElMessageBox.confirm(`确定终止实例 "${row.id}" 吗？此操作不可恢复！`, "终止确认", {
      type: "error",
    });
    await processInstanceApi.delete(row.id);
    ElMessage.success("终止成功");
    fetchInstances();
    fetchStatistics();
  } catch (e) {
    if (e !== "cancel") {
      ElMessage.error("终止失败");
    }
  }
}

function initCharts() {
  nextTick(() => {
    // 使用简单的CSS图表作为占位符
    // 实际项目中可引入 ECharts 等图表库
    if (trendChartRef.value) {
      trendChartRef.value.innerHTML =
        '<div style="height:200px;display:flex;align-items:center;justify-content:center;color:#909399;">图表组件占位 - 可集成 ECharts</div>';
    }
    if (taskChartRef.value) {
      taskChartRef.value.innerHTML =
        '<div style="height:200px;display:flex;align-items:center;justify-content:center;color:#909399;">图表组件占位 - 可集成 ECharts</div>';
    }
  });
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
    active: "活跃",
    suspended: "已挂起",
    completed: "已完成",
    terminated: "已终止",
  };
  return texts[status] || "未知";
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleString("zh-CN");
}
</script>

<style scoped lang="scss">
.process-monitor {
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

.stat-card {
  .stat-card__content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .stat-card__info {
    display: flex;
    flex-direction: column;

    .stat-card__value {
      font-size: 28px;
      font-weight: bold;
      color: #303133;
    }

    .stat-card__label {
      margin-top: 4px;
      font-size: 13px;
      color: #909399;
    }
  }

  .stat-card__icon {
    font-size: 36px;
    opacity: 0.3;
  }

  &--blue .stat-card__icon {
    color: #409eff;
  }
  &--green .stat-card__icon {
    color: #67c23a;
  }
  &--orange .stat-card__icon {
    color: #e6a23c;
  }
  &--red .stat-card__icon {
    color: #f56c6c;
  }
}

.chart-row {
  margin-bottom: 24px;
}

.chart-container {
  height: 200px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.instances-card {
  .filter-form {
    margin-bottom: 16px;
  }
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
