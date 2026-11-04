# 项目规则

## 数据精度

- 前端提交超过 16 位数字的主键 ID 时，必须以字符串形式传递，禁止转换为 `Number`。
- 后端接口返回 `Long` 类型的数据时，必须在字段上添加 `@JsonFormat(shape = JsonFormat.Shape.STRING)`，避免 JavaScript 侧精度丢失。

这两个规则配合使用，防止雪花 ID 等长整型主键在 JSON 序列化/前端计算过程中丢失精度。
