<template>
  <div class="leave-apply">
    <div class="page-header">
      <div class="page-title">
        <el-icon><EditPen /></el-icon>
        <h2>发起请假</h2>
      </div>
    </div>

    <div class="page-content">
      <el-card class="form-card">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="leave-form">
          <el-form-item label="请假类型" prop="leaveType">
            <el-select v-model="form.leaveType" placeholder="请选择请假类型" style="width: 100%">
              <el-option
                v-for="item in leaveTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="请假日期" prop="dateRange">
            <el-date-picker
              v-model="form.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="请假天数" prop="days">
            <el-input-number v-model="form.days" :min="0.5" :max="365" :step="0.5" :precision="1" />
          </el-form-item>

          <el-form-item label="审批人ID" prop="manager">
            <el-input
              v-model="form.manager"
              placeholder="请输入审批人用户ID（审批人登录后可在待办审批中处理）"
              clearable
            />
          </el-form-item>

          <el-form-item label="请假事由" prop="reason">
            <el-input
              v-model="form.reason"
              type="textarea"
              :rows="4"
              maxlength="500"
              show-word-limit
              placeholder="请填写请假事由"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="submitting" @click="handleSubmit">
              <el-icon><Promotion /></el-icon>
              提交申请
            </el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { processInstanceApi } from "@/api/logicflow";

const router = useRouter();

const leaveTypeOptions = [
  { value: 1, label: "事假" },
  { value: 2, label: "病假" },
  { value: 3, label: "年假" },
  { value: 4, label: "调休" },
  { value: 5, label: "其他" },
];

const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({
  leaveType: undefined as number | undefined,
  dateRange: [] as string[],
  days: 1,
  manager: "",
  reason: "",
});

const rules: FormRules = {
  leaveType: [{ required: true, message: "请选择请假类型", trigger: "change" }],
  dateRange: [{ required: true, message: "请选择请假日期", trigger: "change" }],
  days: [{ required: true, message: "请填写请假天数", trigger: "blur" }],
  manager: [{ required: true, message: "请填写审批人ID", trigger: "blur" }],
  reason: [{ required: true, message: "请填写请假事由", trigger: "blur" }],
};

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const [startDate, endDate] = form.dateRange;
    await processInstanceApi.start({
      key: "leave",
      variables: {
        leaveType: form.leaveType,
        startDate,
        endDate,
        days: form.days,
        reason: form.reason,
        manager: form.manager,
      },
    });
    ElMessage.success("请假申请已提交，请在「我的申请」中查看进度");
    router.push("/workflow/my-applications");
  } catch (e) {
    console.error("提交请假申请失败", e);
  } finally {
    submitting.value = false;
  }
}

function handleReset() {
  formRef.value?.resetFields();
  form.dateRange = [];
  form.days = 1;
}
</script>

<style scoped lang="scss">
.leave-apply {
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

.form-card {
  max-width: 720px;

  .leave-form {
    padding: 8px 24px 8px 0;
  }
}
</style>
