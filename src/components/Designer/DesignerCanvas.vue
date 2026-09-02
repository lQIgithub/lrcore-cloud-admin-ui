<template>
  <div class="flow-designer">
    <!-- 画布工具栏 -->
    <div class="canvas-toolbar">
      <div class="toolbar-section">
        <span class="toolbar-label">画布操作：</span>
        <el-button-group>
          <el-button :icon="FullScreen" size="small" @click="zoomToFit">适应画布</el-button>
          <el-button :icon="ZoomIn" size="small" @click="zoomIn">放大</el-button>
          <el-button :icon="ZoomOut" size="small" @click="zoomOut">缩小</el-button>
          <el-button :icon="MagicStick" size="small" @click="optimizeLayout">优化排版</el-button>
          <el-button :icon="Delete" size="small" @click="clearCanvas">清空</el-button>
        </el-button-group>
      </div>
      <div class="toolbar-section">
        <span class="toolbar-label">历史操作：</span>
        <el-button-group>
          <el-button :icon="ArrowLeft" size="small" :disabled="!canUndo" @click="undo">
            撤销
          </el-button>
          <el-button :icon="ArrowRight" size="small" :disabled="!canRedo" @click="redo">
            重做
          </el-button>
        </el-button-group>
      </div>
      <div class="toolbar-section">
        <span class="toolbar-label">模式：</span>
        <el-radio-group v-model="mode" size="small">
          <el-radio-button value="edit">编辑</el-radio-button>
          <el-radio-button value="preview">预览</el-radio-button>
        </el-radio-group>
      </div>
      <div class="toolbar-section">
        <span class="toolbar-label">连线样式：</span>
        <el-radio-group v-model="store.edgeType" size="small" @change="handleEdgeTypeChange">
          <el-radio-button value="bezier">曲线</el-radio-button>
          <el-radio-button value="polyline">折线</el-radio-button>
          <el-radio-button value="line">直线</el-radio-button>
        </el-radio-group>
      </div>
      <div class="toolbar-section">
        <el-button :icon="Picture" size="small" @click="showIconLibrary = true">图标库</el-button>
        <el-button :icon="View" size="small" @click="showBpmnDialog = true">查看BPMN</el-button>
      </div>
    </div>

    <!-- 主画布容器 -->
    <div ref="containerRef" class="lf-container">
      <LogicFlowCanvas ref="canvasRef" :graph-data="store.graphData" :mode="mode" />
    </div>

    <!-- 节点图标库（流程级类型默认图标配置） -->
    <NodeIconLibraryDialog v-model="showIconLibrary" />

    <!-- BPMN XML 预览对话框 -->
    <el-dialog v-model="showBpmnDialog" title="BPMN XML 预览" width="60%" :deep-destroy="true">
      <div class="bpmn-preview">
        <pre>{{ store.bpmnXml }}</pre>
      </div>
      <template #footer>
        <el-button @click="copyBpmn">复制到剪贴板</el-button>
        <el-button :icon="Download" @click="downloadBpmn">下载BPMN文件</el-button>
        <el-button type="primary" @click="showBpmnDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  FullScreen,
  ZoomIn,
  ZoomOut,
  Delete,
  View,
  Download,
  MagicStick,
  ArrowLeft,
  ArrowRight,
  Picture,
} from "@element-plus/icons-vue";
import { useFlowDesignerStore } from "@/stores/flow-designer";
import { layoutFlowGraph } from "@/utils/graphLayout";
import LogicFlowCanvas from "./LogicFlowCanvas.vue";
import NodeIconLibraryDialog from "./nodeIcon/NodeIconLibraryDialog.vue";

const store = useFlowDesignerStore();

const mode = ref<"edit" | "preview">("edit");
const showBpmnDialog = ref(false);
const showIconLibrary = ref(false);
const containerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<InstanceType<typeof LogicFlowCanvas> | null>(null);
let resizeObserver: ResizeObserver | null = null;

// 撤销/重做按钮状态：使用 computed 直接访问响应式源，确保响应式追踪
const canUndo = computed(() => store.historyIndex > 0);
const canRedo = computed(() => store.historyIndex < store.history.length - 1);

/** 撤销：恢复上一步操作（包括删除节点/连线等） */
function undo() {
  store.undo();
}

/** 重做：恢复已撤销的操作 */
function redo() {
  store.redo();
}

onMounted(() => {
  // 容器尺寸监听
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      // 画布尺寸变化时可以调整LogicFlow
    });
    resizeObserver.observe(containerRef.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

function zoomIn() {
  store.setZoomLevel(store.zoomLevel + 0.1);
}

function zoomOut() {
  store.setZoomLevel(store.zoomLevel - 0.1);
}

function zoomToFit() {
  // 委托给画布实例：根据节点包围盒计算缩放并居中
  canvasRef.value?.zoomToFit?.();
}

/** 自动优化节点排版：按连线关系分层排布，并批量更新节点坐标 */
async function optimizeLayout() {
  if (!store.graphData.nodes.length) {
    ElMessage.warning("画布为空，暂无可优化的节点");
    return;
  }
  // 1. 在优化前保存当前状态到历史记录（作为优化前的快照）
  store.pushHistory();

  // 2. 执行优化排版（不记录历史，避免产生多余的撤销步骤）
  const positions = layoutFlowGraph(store.graphData);
  store.applyNodePositions(positions, false);

  // 3. 用优化后的状态覆盖刚才保存的历史记录
  //    这样撤销时会直接回到优化前的状态，而不是经过中间的排版状态
  store.overwriteLastHistory();

  // 4. 等节点位置同步到画布后，按新相对位置重新计算连线锚点，
  //    避免排版后连线从节点错误的一侧进出/交叉
  await nextTick();
  canvasRef.value?.refreshEdgeAnchors?.();
  // 5. 排版完成后自动适应画布，便于查看整体效果
  canvasRef.value?.zoomToFit?.();
}

function clearCanvas() {
  ElMessageBox.confirm("确定要清空画布吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      store.clearCanvas();
    })
    .catch(() => {});
}

// 说明：节点/连线的选中与添加已由 LogicFlowCanvas 内部同步到 store，
// 此处不再重复监听事件并调用 store 操作，避免重复添加/选中。

// 暴露给父组件（FlowDesigner）使用
defineExpose({
  zoomToFit,
});

/** 切换连线样式：将画布中所有连线转换为新样式，并自动优化排版 */
async function handleEdgeTypeChange(val: string | number | boolean | undefined) {
  const type = (val as "polyline" | "bezier" | "line") ?? store.edgeType;
  // 1. 更新全局边类型状态
  store.setEdgeType(type);

  // 2. 更新 store 中所有连线的类型
  const newEdges = store.graphData.edges.map((e) => ({
    ...e,
    type,
  }));
  store.updateAllEdges(newEdges);

  // 3. 更新 LogicFlow 图模型的默认连线类型（用户手动拖拽绘制新连线时使用），
  //    否则后续拉出的新连线仍是 LogicFlow 内置默认的折线
  // 4. 重新渲染画布（使用新类型的边）
  const lf = canvasRef.value?.getInstance?.();
  if (lf) {
    lf.setDefaultEdgeType(type);
    lf.render({
      nodes: store.graphData.nodes,
      edges: newEdges,
    });
  }

  // 5. 自动优化排版
  await nextTick();
  await optimizeLayout();
}

function copyBpmn() {
  navigator.clipboard.writeText(store.bpmnXml).then(() => {
    ElMessage.success("BPMN XML已复制到剪贴板");
  });
}

/** 下载标准 BPMN 2.0 XML 文件（.bpmn20.xml，可直接用于 Java 后端/Flowable 部署） */
function downloadBpmn() {
  // 画布没有任何节点时提示，避免下载空流程文件
  if (!store.graphData.nodes.length) {
    ElMessage.warning("当前画布为空，请先添加流程节点");
    return;
  }
  const xml = store.bpmnXml;
  // 已保存用流程定义 Key，未保存用标题栏草稿 Key
  const key = store.processDefinition?.key || store.draftProcessKey || "process";
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${key}.bpmn20.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
</script>

<style scoped lang="scss">
.flow-designer {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.canvas-toolbar {
  display: flex;
  gap: 24px;
  align-items: center;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;

  .toolbar-section {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .toolbar-label {
    font-size: 13px;
    color: #606266;
  }
}

.lf-container {
  position: relative;
  flex: 1;
  overflow: hidden;
  background: #f5f7fa;
  background-image: radial-gradient(circle, #dcdfe6 1px, transparent 1px);
  background-size: 20px 20px;
}

.bpmn-preview {
  max-height: 400px;
  overflow-y: auto;

  pre {
    padding: 16px;
    margin: 0;
    font-family: "Courier New", monospace;
    font-size: 12px;
    line-height: 1.5;
    background: #f5f5f5;
    border-radius: 4px;
  }
}
</style>
