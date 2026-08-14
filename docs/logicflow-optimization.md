# LogicFlow 模块优化说明文档与测试报告

## 一、优化概述

本次对 logicflow 模块进行了系统性梳理与优化，覆盖架构职责划分、单向数据流、拖拽闭环、历史记录、BPMN 转换器、死代码清理及单元测试等方面。

### 优化成果一览

| 优化项 | 类型 | 影响文件 |
|--------|------|----------|
| DesignerCanvas/LogicFlowCanvas 职责理清 | 架构重构 | DesignerCanvas.vue, LogicFlowCanvas.vue |
| PropertyPanel 单向数据流 | 架构重构 | PropertyPanel.vue |
| 拖拽闭环 | Bug 修复 | LogicFlowCanvas.vue |
| undo/redo 历史记录 Bug 修复 | Bug 修复 | flow-designer.ts |
| bpmnToGraph 命名空间解析 Bug 修复 | Bug 修复 | bpmnConverter.ts |
| bpmnConverter 死代码清理 | 代码清理 | bpmnConverter.ts |
| 节点配置集中化 | 架构优化 | nodeConfig.ts |
| 单元测试基础设施 | 测试 | vitest.config.ts, vitest.setup.ts |
| bpmnConverter 单元测试 | 测试 | bpmnConverter.test.ts |
| flow-designer store 单元测试 | 测试 | flow-designer.test.ts |

---

## 二、优化详情

### 2.1 DesignerCanvas / LogicFlowCanvas / FlowDesigner 职责理清

**问题**：DesignerCanvas 原先监听 LogicFlowCanvas 的 node-selected/edge-selected/node-added/edge-added 事件，并在回调中重复调用 store.setSelection/addNode/addEdge，导致节点/连线被重复添加、重复选中。

**优化**：
- LogicFlowCanvas 内部的事件监听器已直接同步到 store，DesignerCanvas 不再重复监听和调用 store 操作
- DesignerCanvas 添加 `onBeforeUnmount` 清理 ResizeObserver，防止内存泄漏
- 移除 DesignerCanvas 中所有冗余的事件处理回调

**涉及文件**：
- `src/components/Designer/DesignerCanvas.vue`
- `src/components/Designer/LogicFlowCanvas.vue`

### 2.2 PropertyPanel 单向数据流

**问题**：PropertyPanel 通过 `v-model` 直接绑定 `store.currentNode` 的属性，绕过 store action 直接修改 store 状态，违反单向数据流原则。`@change` 回调中的 `store.updateNode` 实际上是冗余操作（数据已被 v-model 修改）。

**优化**：
- 引入本地 `nodeForm` / `edgeForm` 响应式对象作为 v-model 绑定目标
- 通过 `watch` 监听 store 选中元素变化，单向同步到本地表单（store → 表单）
- 表单变更时通过 `commitNode()` / `commitEdge()` 调用 store action 提交修改（表单 → store action → store state）
- 所有状态变更现在都经过 store action，遵守单向数据流

**涉及文件**：
- `src/components/Designer/PropertyPanel.vue`

### 2.3 拖拽闭环

**问题**：NodePalette 的 `handleDragStart` 设置了 `application/logicflow-node` 数据，但 LogicFlowCanvas 没有对应的 `dragover` / `drop` 事件处理。画布中存在 `dragNode`、`dragPosition` 和 `drag-preview` 模板等死代码（从未被赋值），拖拽功能完全不工作。

**优化**：
- 在 LogicFlowCanvas 根元素添加 `@dragover.prevent` 和 `@drop` 事件处理
- `handleDrop` 通过 `lfInstance.getPointByClient()` 将客户端坐标转换为画布坐标
- 使用 `createFlowNode()` 工厂方法在落点创建节点，确保默认属性/尺寸一致
- 移除所有死代码：`dragNode`、`dragPosition`、`previewStyle`、`drag-preview` 模板及 CSS

**涉及文件**：
- `src/components/Designer/LogicFlowCanvas.vue`

### 2.4 undo/redo 历史记录 Bug 修复

**问题**：原实现存在两个 Bug：

1. **历史记录时机错误**：`pushHistory()` 在 mutation 之前调用（保存的是操作前状态），但 undo/redo 逻辑假设 history 存储的是操作后状态。导致 undo 跳过正确状态、redo 无法恢复。
2. **structuredClone 与 Vue 响应式不兼容**：`structuredClone` 无法克隆 Vue/Pinia 的响应式 Proxy 对象，会抛出 `DataCloneError`。

**优化**：
- 将所有 mutation 函数中的 `pushHistory()` 调用移至 mutation 之后（保存操作后状态）
- 在 store 初始化时调用 `pushHistory()` 保存初始空画布状态，使首次操作后可撤销回空画布
- 提取 `cloneGraphData()` 辅助函数，使用 `JSON.parse(JSON.stringify())` 进行深拷贝（自动穿透 Vue Proxy，对仅含 JSON 可序列化类型的 FlowGraphData 安全可靠）

**涉及文件**：
- `src/stores/flow-designer.ts`

### 2.5 bpmnToGraph 命名空间解析 Bug 修复

**问题**：`bpmnToGraph` 使用 `querySelector("bpmndi\\:BPMNShape[bpmnElement=...]")` 查找 BPMN DI 元素，但 `querySelector` 对 XML 命名空间前缀的支持在不同环境（浏览器 vs jsdom）中不一致，导致位置信息解析失败（节点回退到默认坐标 0,0）。同时，flowable 扩展属性解析逻辑有误——`querySelector` 仅返回首个匹配元素，`querySelectorAll("*")` 只遍历其子元素而非所有 flowable 属性。

**优化**：
- 使用 `getElementsByTagNameNS()` 替代 `querySelector` 查找 BPMNShape 和 Bounds 元素，跨环境兼容
- 构建 `shapeMap`（bpmnElement → Element 映射）提高查找效率
- flowable 属性解析改为遍历元素的直接子元素，通过 localName 匹配已知属性名
- sequenceFlow 的 conditionExpression 解析改用 `getElementsByTagName`

**涉及文件**：
- `src/utils/bpmnConverter.ts`

### 2.6 bpmnConverter 死代码清理

**清理内容**：
- 移除 `getNodeDefaultSize()` 函数：已导出但项目中无任何引用
- 移除 `previewBpmnXml()` 函数：已导出但项目中无任何引用
- 简化 `generateEdgeXml()` 的冗余分支：`isDefault` 和 `else` 分支产出完全相同的 XML，合并为单一 return

**涉及文件**：
- `src/utils/bpmnConverter.ts`

### 2.7 节点配置集中化

此优化在之前的迭代中已完成，通过 `src/api/logicflow/nodeConfig.ts` 集中管理所有节点类型的标签、尺寸、颜色、默认属性等配置，消除 NodePalette、PropertyPanel、customNodes 等多文件中的重复定义。

---

## 三、测试报告

### 3.1 测试环境

| 项目 | 版本 |
|------|------|
| 测试框架 | Vitest 4.1.10 |
| DOM 环境 | jsdom 30.0.1 |
| Vue 测试工具 | @vue/test-utils 2.4.11 |
| 运行时 | Node.js 22 |

### 3.2 测试配置

- `vitest.config.ts`：配置 jsdom 环境、`@` 路径别名、`__APP_INFO__` 全局定义
- `vitest.setup.ts`：polyfill jsdom 缺失的 `window.matchMedia` API

### 3.3 测试结果汇总

```
Test Files  2 passed (2)
     Tests  30 passed (30)
  Duration  ~2.1s
```

### 3.4 测试覆盖详情

#### bpmnConverter 测试（15 项，全部通过）

| 测试组 | 测试项 | 结果 |
|--------|--------|------|
| getBpmnElementType | 节点类型映射为 BPMN 元素名 | ✅ |
| getBpmnElementType | customNode 回退为 userTask | ✅ |
| graphToBpmn | 空图生成合法 BPMN XML 骨架 | ✅ |
| graphToBpmn | XML 包含 process 的 id 和 name | ✅ |
| graphToBpmn | 开始/结束节点生成自闭合标签 | ✅ |
| graphToBpmn | 用户任务包含 assignee/candidateUsers 等属性 | ✅ |
| graphToBpmn | 服务任务包含 delegateExpression/expression | ✅ |
| graphToBpmn | 脚本任务包含 scriptFormat 和 script | ✅ |
| graphToBpmn | 带条件连线生成 conditionExpression | ✅ |
| graphToBpmn | 无条件连线生成自闭合 sequenceFlow | ✅ |
| graphToBpmn | XML 特殊字符转义 | ✅ |
| graphToBpmn | 生成 BPMN DI 图形信息 | ✅ |
| bpmnToGraph | 从 BPMN XML 解析节点和连线 | ✅ |
| bpmnToGraph | 解析连线条件表达式 | ✅ |
| bpmnToGraph | 往返转换保持核心数据一致 | ✅ |

#### flow-designer store 测试（15 项，全部通过）

| 测试组 | 测试项 | 结果 |
|--------|--------|------|
| validateGraph | 空画布验证失败（缺开始/结束） | ✅ |
| validateGraph | 仅有开始节点验证失败 | ✅ |
| validateGraph | 孤立节点验证失败 | ✅ |
| validateGraph | 完整流程验证通过 | ✅ |
| validateGraph | 排他网关多出口缺条件验证失败 | ✅ |
| validateGraph | 排他网关出口带条件验证通过 | ✅ |
| validateGraph | 排他网关单出口无需条件 | ✅ |
| undo/redo | addNode 后 undo 撤销到空画布 | ✅ |
| undo/redo | undo 后 redo 恢复 | ✅ |
| undo/redo | 多次操作 undo 逐回退，新操作截断 redo 链 | ✅ |
| undo/redo | 深拷贝：操作后不引用历史快照 | ✅ |
| 增删改 | addNode/removeNode 正确维护数据 | ✅ |
| 增删改 | removeNode 同时删除关联连线 | ✅ |
| 增删改 | updateNode 同步更新选中元素 | ✅ |
| 增删改 | updateEdge 更新连线属性 | ✅ |

### 3.5 类型检查

```
npx vue-tsc --noEmit
```

结果：仅存在 2 个预先存在的错误（`permission.ts` 和 `user.ts`），与 logicflow 模块无关。本次优化未引入任何新的类型错误。

---

## 四、优化前后对比

### 4.1 代码质量

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 拖拽功能 | 完全不工作（死代码） | 完全可用 |
| PropertyPanel 数据流 | 双向直接修改 store | 单向：store → 表单 → action → store |
| undo/redo 正确性 | undo 跳过状态、redo 失效 | 完全正确 |
| bpmnToGraph 位置解析 | 浏览器环境不稳定 | 跨环境稳定 |
| 死代码 | 3 个未使用导出 + 1 组死状态 | 已全部清除 |
| 单元测试 | 0 项 | 30 项全部通过 |

### 4.2 架构改进

- **职责分离**：DesignerCanvas（工具栏/布局）、LogicFlowCanvas（画布/事件/store 同步）、PropertyPanel（属性编辑）三者职责清晰，无重复逻辑
- **单向数据流**：所有状态变更统一通过 store action，PropertyPanel 不再直接修改 store 状态
- **配置集中化**：节点类型配置统一在 nodeConfig.ts 管理，通过工厂函数 createFlowNode 创建节点
