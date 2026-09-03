<template>
  <div class="todo-tasks">
    <div class="page-header">
      <div class="page-title">
        <el-icon><Bell /></el-icon>
        <h2>待办审批</h2>
      </div>
      <div class="page-actions">
        <el-button @click="fetchList">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <div class="page-content">
      <el-card>
        <el-form :model="searchForm" inline class="filter-form">
          <el-form-item label="流程实例ID">
            <el-input
              v-model="searchForm.processInstanceId"
              placeholder="按流程实例ID过滤"
              clearable
              style="width: 260px"
            />
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
          <el-table-column prop="name" label="任务名称" width="180" />
          <el-table-column
            prop="processInstanceId"
            label="流程实例ID"
            width="220"
            show-overflow-tooltip
          />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'claimed' ? 'warning' : 'success'">
                {{ row.status === "claimed" ? "已签收" : "待处理" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="170">
            <template #default="{ row }">
              {{ formatDate(row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openCompleteDialog(row as TaskVO)">
                通过
              </el-button>
              <el-button link type="danger" @click="openRejectDialog(row as TaskVO)">
                驳回
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

    <!-- 通过审批对话框 -->
    <el-dialog v-model="showCompleteDialog" title="审批通过" width="480px">
      <el-form label-width="80px">
        <el-form-item label="任务">
          <span>{{ currentTask?.name }}</span>
        </el-form-item>
        <el-form-item label="审批意见">
          <el-input
            v-model="completeComment"
            type="textarea"
            :rows="3"
            placeholder="填写审批意见（选填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCompleteDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleComplete">确认通过</el-button>
      </template>
    </el-dialog>

    <!-- 驳回审批对话框 -->
    <el-dialog v-model="showRejectDialog" title="审批驳回" width="480px">
      <el-form label-width="80px">
        <el-form-item label="任务">
          <span>{{ currentTask?.name }}</span>
        </el-form-item>
        <el-form-item label="驳回意见" required>
          <el-input
            v-model="rejectComment"
            type="textarea"
            :rows="3"
            placeholder="请填写驳回意见"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRejectDialog = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="handleReject">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from "vue";
import { ElMessage } from "element-plus";
import { useWorkflowEvent } from "@/composables";
import { processTaskApi, type TaskVO } from "@/api/logicflow";

const loading = ref(false);
const list = ref<TaskVO[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

const searchForm = reactive({
  processInstanceId: "",
});

const showCompleteDialog = ref(false);
const showRejectDialog = ref(false);
const currentTask = ref<TaskVO | null>(null);
const completeComment = ref("");
const rejectComment = ref("");
const submitting = ref(false);

/** 工作流 SSE 事件订阅（取消函数） */
let stopWorkflowEvents: (() => void) | null = null;

onMounted(() => {
  fetchList();
  // 新任务/回退到达时实时刷新待办列表
  stopWorkflowEvents = useWorkflowEvent().onWorkflowEvent(() => {
    fetchList();
  });
  useWorkflowEvent().markTasksRead();
});

onBeforeUnmount(() => {
  if (stopWorkflowEvents) {
    stopWorkflowEvents();
    stopWorkflowEvents = null;
  }
});

async function fetchList() {
  loading.value = true;
  try {
    const page = await processTaskApi.list({
      processInstanceId: searchForm.processInstanceId || undefined,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
    });
    list.value = page?.list ?? [];
    total.value = page?.total ?? 0;
  } catch {
    ElMessage.error("获取待办列表失败");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  fetchList();
}

function handleReset() {
  searchForm.processInstanceId = "";
  handleSearch();
}

function openCompleteDialog(row: TaskVO) {
  currentTask.value = row;
  completeComment.value = "";
  showCompleteDialog.value = true;
}

function openRejectDialog(row: TaskVO) {
  currentTask.value = row;
  rejectComment.value = "";
  showRejectDialog.value = true;
}

async function handleComplete() {
  if (!currentTask.value) return;
  submitting.value = true;
  try {
    await processTaskApi.complete(currentTask.value.id, {
      id: currentTask.value.id,
      variables: { approved: true, comment: completeComment.value },
    });
    ElMessage.success("审批通过");
    showCompleteDialog.value = false;
    fetchList();
  } catch (e) {
    console.error("审批通过失败", e);
  } finally {
    submitting.value = false;
  }
}

async function handleReject() {
  if (!currentTask.value) return;
  if (!rejectComment.value.trim()) {
    ElMessage.warning("请填写驳回意见");
    return;
  }
  submitting.value = true;
  try {
    await processTaskApi.reject(currentTask.value.id, { comment: rejectComment.value });
    ElMessage.success("已驳回");
    showRejectDialog.value = false;
    fetchList();
  } catch (e) {
    console.error("审批驳回失败", e);
  } finally {
    submitting.value = false;
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString("zh-CN");
}
</script>

<style scoped lang="scss">
.todo-tasks {
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

.filter-form {
  margin-bottom: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
