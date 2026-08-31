<template>
  <div class="designer-layout">
    <!-- 顶部工具栏 -->
    <div class="designer-layout__header">
      <div class="header-left">
        <el-menu mode="horizontal" :default-active="'designer'" class="header-menu">
          <el-menu-item index="designer">
            <el-icon><Connection /></el-icon>
            <span>流程设计器</span>
          </el-menu-item>
          <el-menu-item index="processes" @click="$router.push('/processes')">
            <el-icon><Document /></el-icon>
            <span>流程管理</span>
          </el-menu-item>
          <el-menu-item index="monitor" @click="$router.push('/monitor')">
            <el-icon><DataAnalysis /></el-icon>
            <span>流程监控</span>
          </el-menu-item>
        </el-menu>
      </div>
      <div class="header-center">
        <el-input v-model="processName" placeholder="请输入流程名称" class="process-name-input">
          <template #prepend>流程名称</template>
        </el-input>
        <el-input
          v-model="processKey"
          placeholder="请输入流程Key (英文标识)"
          class="process-key-input"
        >
          <template #prepend>流程Key</template>
        </el-input>
        <el-input
          v-model="processDescription"
          placeholder="请输入流程描述"
          class="process-key-input"
        >
          <template #prepend>流程描述</template>
        </el-input>
        <el-input
          v-model="processCategory"
          placeholder="请输入流程分类（如：人事类审批）"
          class="process-key-input"
          :maxlength="255"
        >
          <template #prepend>流程分类</template>
        </el-input>
      </div>
      <div class="header-right">
        <el-button @click="handleNew">
          <el-icon><Plus /></el-icon>
          新建
        </el-button>
        <el-button @click="handleSave">
          <el-icon><FolderAdd /></el-icon>
          保存
        </el-button>
        <el-button type="warning" @click="handleDeploy">
          <el-icon><Upload /></el-icon>
          部署
        </el-button>
        <el-dropdown @command="handleExport">
          <el-button type="primary">
            <el-icon><Download /></el-icon>
            导出
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="bpmn">导出BPMN XML</el-dropdown-item>
              <el-dropdown-item command="json">导出JSON</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 主体区域 -->
    <div class="designer-layout__body">
      <!-- 左侧节点面板 -->
      <NodePalette />

      <!-- 中间画布区域 -->
      <div class="designer-layout__center">
        <DesignerCanvas ref="designerCanvasRef" />
        <!-- 画布缩放控制 -->
        <div class="zoom-controls">
          <el-button :icon="Minus" circle @click="zoomOut" />
          <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
          <el-button :icon="Plus" circle @click="zoomIn" />
          <el-button :icon="FullScreen" circle @click="zoomToFit" />
        </div>
        <!-- 工具栏 -->
        <div class="canvas-toolbar">
          <el-button-group>
            <el-button :icon="ArrowLeft" :disabled="!canUndo" @click="undo">撤销</el-button>
            <el-button :icon="ArrowRight" :disabled="!canRedo" @click="redo">重做</el-button>
          </el-button-group>
          <el-divider direction="vertical" />
          <el-button :icon="Delete" :disabled="!hasSelection" @click="handleDelete">
            删除选中
          </el-button>
          <el-button :icon="CopyDocument" :disabled="!hasSelection" @click="handleCopy">
            复制
          </el-button>
          <el-divider direction="vertical" />
          <el-button :icon="Check" @click="handleValidate">验证流程</el-button>
        </div>
      </div>

      <!-- 右侧属性面板 -->
      <PropertyPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Connection,
  Document,
  DataAnalysis,
  Plus,
  FolderAdd,
  Upload,
  Download,
  ArrowDown,
  Minus,
  FullScreen,
  ArrowLeft,
  ArrowRight,
  Delete,
  CopyDocument,
  Check,
} from "@element-plus/icons-vue";
import { useFlowDesignerStore } from "@/stores/flow-designer";
import { processDefinitionApi } from "@/api/logicflow";
import { bpmnToGraph } from "@/utils/bpmnConverter";
import NodePalette from "@/components/Designer/NodePalette.vue";
import DesignerCanvas from "@/components/Designer/DesignerCanvas.vue";
import PropertyPanel from "@/components/Designer/PropertyPanel.vue";

const store = useFlowDesignerStore();
const designerCanvasRef = ref<InstanceType<typeof DesignerCanvas> | null>(null);
const route = useRoute();

const processName = ref("新流程");
const processKey = ref("new_process");
const processDescription = ref("");
const processCategory = ref("");

const zoomLevel = computed(() => store.zoomLevel);
// 撤销/重做按钮状态：使用 computed 直接访问响应式源，确保响应式追踪
const canUndo = computed(() => store.historyIndex > 0);
const canRedo = computed(() => store.historyIndex < store.history.length - 1);
const hasSelection = computed(() => store.selectedElement !== null);

onMounted(async () => {
  // 编辑模式（流程管理列表「编辑」/ 版本「查看」跳转携带 ?id=）：
  // 加载原流程定义，后端返回部署的 BPMN XML，前端反向转换为 LogicFlow 图数据还原画布
  const id = typeof route.query.id === "string" ? route.query.id : "";
  if (id) {
    try {
      const definition = await store.loadProcessDefinition(id);
      if (definition) {
        if (definition.name) processName.value = definition.name;
        if (definition.key) processKey.value = definition.key;
        if (definition.description) processDescription.value = definition.description;
        if (definition.category) processCategory.value = definition.category;
        // 画布还原：优先主表保存的 LogicFlow 原始数据（无损）；
        // 缺失时退回用部署的 BPMN XML 反向转换
        if (!store.graphData.nodes.length) {
          if (definition.graphData?.nodes?.length) {
            store.graphData = definition.graphData;
            store.pushHistory();
          } else if (definition.bpmnXml) {
            store.graphData = bpmnToGraph(definition.bpmnXml);
            store.pushHistory();
          }
        }
        if (!store.graphData.nodes.length) {
          ElMessage.warning("该流程没有可还原的流程图数据，画布为空");
        }
      }
    } catch {
      // 请求失败（未登录/服务异常等）已由 request 拦截器统一提示
    }
    return;
  }

  // 新建模式：初始化空画布，并清空残留的流程定义状态，
  // 避免上次编辑的 id 残留导致「保存」误入更新分支
  store.clearCanvas();
  store.processDefinition = null;
  processName.value = "新流程";
  processKey.value = "new_process";
  processDescription.value = "";
  processCategory.value = "";
  store.setDraftProcessInfo(processKey.value, processName.value);
});

// 标题栏流程名/Key 变化时同步草稿信息，保证未保存时的 BPMN 预览/导出使用最新输入
watch(
  [processName, processKey],
  () => {
    store.setDraftProcessInfo(processKey.value, processName.value);
  },
  { immediate: true }
);

function undo() {
  store.undo();
}

function redo() {
  store.redo();
}

function zoomIn() {
  store.setZoomLevel(zoomLevel.value + 0.1);
}

function zoomOut() {
  store.setZoomLevel(zoomLevel.value - 0.1);
}

function zoomToFit() {
  // 委托给画布：根据节点包围盒自适应缩放并居中
  designerCanvasRef.value?.zoomToFit?.();
}

async function handleNew() {
  try {
    await ElMessageBox.confirm("新建将清空当前画布，是否继续？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    store.clearCanvas();
    store.processDefinition = null;
    processName.value = "新流程";
    processKey.value = "new_process";
    processDescription.value = "";
    processCategory.value = "";
  } catch {
    // 用户取消
  }
}

async function handleSave() {
  try {
    // 先创建/更新流程定义（request 拦截器已拆壳，解析值即后端返回的 data 载荷）
    if (!store.processDefinition?.id) {
      const created = await processDefinitionApi.create({
        key: processKey.value,
        name: processName.value,
        description: processDescription.value,
        category: processCategory.value,
        graphData: store.graphData,
      });
      if (created) {
        store.processDefinition = created;
        ElMessage.success("流程保存成功");
      }
    } else {
      // await store.saveProcess();
      await processDefinitionApi.update({
        key: processKey.value,
        name: processName.value,
        description: processDescription.value,
        category: processCategory.value,
        graphData: store.graphData,
      });
      ElMessage.success("流程更新成功");
    }
  } catch (e) {
    ElMessage.error("保存失败：" + (e as Error).message);
  }
}

async function handleDeploy() {
  try {
    const validation = store.validateGraph();
    if (!validation.valid) {
      await ElMessageBox.alert(
        '<ul style="color: #f56c6c; padding-left: 20px;">' +
          validation.errors.map((e) => `<li>${e}</li>`).join("") +
          "</ul>",
        "流程验证失败",
        { dangerouslyUseHTMLString: true }
      );
      return;
    }

    if (!store.processDefinition?.id) {
      await handleSave();
    }

    if (store.processDefinition?.id) {
      // 生成BPMN XML并发送到后端
      const bpmnXml = store.exportBpmn();
      await processDefinitionApi.deploy({ id: store.processDefinition.id, bpmnXml });
      ElMessage.success("流程部署成功");
    }
  } catch (e) {
    ElMessage.error("部署失败：" + (e as Error).message);
  }
}

function handleExport(command: string) {
  if (command === "bpmn") {
    const xml = store.exportBpmn();
    downloadFile(xml, `${processKey.value}.bpmn20.xml`, "application/xml");
  } else if (command === "json") {
    const json = JSON.stringify(store.graphData, null, 2);
    downloadFile(json, `${processKey.value}.json`, "application/json");
  }
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function handleDelete() {
  if (store.selectedType === "node" && store.selectedElement) {
    store.removeNode((store.selectedElement as { id: string }).id);
  } else if (store.selectedType === "edge" && store.selectedElement) {
    store.removeEdge((store.selectedElement as { id: string }).id);
  }
}

function handleCopy() {
  // 简化实现：复制选中节点
  if (store.selectedType === "node" && store.selectedElement) {
    const node = store.selectedElement as import("@/api/logicflow").FlowNode;
    const newNode = {
      ...node,
      id: `node_${Date.now()}`,
      x: node.x + 50,
      y: node.y + 50,
    };
    // 复制节点不需要调用 hasNodeType 校验，因为复制的不是开始/结束节点类型
    // 但 addNode 内部仍会对 startEvent/endEvent 做唯一性保护
    const result = store.addNode(newNode);
    if (result.success) {
      store.setSelection(newNode, "node");
    }
  }
}

async function handleValidate() {
  // 这里做双重校验，一次是前端校验，一次是后端校验
  const validation = store.validateGraph();
  if (validation.valid) {
    // 前端校验通过，再校验后端（拦截器已拆壳，解析值即校验结果布尔值）
    const isValid = await processDefinitionApi.validate(store.graphData);
    if (isValid) {
      ElMessageBox.alert("流程验证通过！", "验证结果", { type: "success" });
    } else {
      ElMessageBox.alert("流程验证失败！", "验证结果", { type: "error" });
    }
  } else {
    await ElMessageBox.alert(
      '<ul style="color: #f56c6c; padding-left: 20px;">' +
        validation.errors.map((e) => `<li>${e}</li>`).join("") +
        "</ul>",
      "流程验证失败",
      { dangerouslyUseHTMLString: true }
    );
  }
}
</script>

<style scoped lang="scss">
.designer-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;

  &__header {
    display: flex;
    flex-shrink: 0;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #fff;
    border-bottom: 1px solid #e4e7ed;

    .header-left {
      display: flex;
      flex-shrink: 0;
      align-items: center;

      .header-menu {
        border: none;
      }
    }

    .header-center {
      display: flex;
      flex: 1;
      gap: 12px;
      align-items: center;
      justify-content: center;

      .el-input {
        width: 200px;
      }

      .process-key-input {
        width: 220px;
      }
    }

    .header-right {
      display: flex;
      flex-shrink: 0;
      gap: 8px;
      align-items: center;
    }
  }

  &__body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  &__center {
    position: relative;
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: #f5f7fa;
  }
}

.zoom-controls {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 10;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

  .zoom-level {
    min-width: 50px;
    font-size: 13px;
    color: #606266;
    text-align: center;
  }
}

.canvas-toolbar {
  position: absolute;
  right: 20px;
  bottom: 20px;
  z-index: 10;
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
</style>
