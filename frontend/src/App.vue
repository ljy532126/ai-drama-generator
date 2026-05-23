<template>
  <router-view />
</template>

<script setup>
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2d2d3a;
  background: #f5f4fa;
}

:root {
  --sidebar-width: 220px;
  --sidebar-collapse-width: 64px;
  --header-height: 60px;
  --purple-50: #f5f3ff;
  --purple-100: #ede9fe;
  --purple-200: #ddd6fe;
  --purple-300: #c4b5fd;
  --purple-400: #a78bfa;
  --purple-500: #7c3aed;
  --purple-600: #7c3aed;
  --purple-700: #6d28d9;
  --text-primary: #2d2d3a;
  --text-secondary: #6b6b80;
  --text-muted: #9d9db5;
  --border-color: #e8e5f0;
  --bg-page: #f5f4fa;
  --bg-card: #ffffff;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #d4d0e8; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #b8b2d8; }

/* Element Plus theme overrides */
:root {
  --el-color-primary: #7c3aed;
  --el-color-primary-light-3: #a78bfa;
  --el-color-primary-light-5: #c4b5fd;
  --el-color-primary-light-7: #ddd6fe;
  --el-color-primary-light-8: #ede9fe;
  --el-color-primary-light-9: #f5f3ff;
  --el-color-primary-dark-2: #6d28d9;
  --el-border-radius-base: 8px;
  --el-border-radius-small: 6px;
  --el-border-radius-round: 20px;
  --el-box-shadow-light: 0 2px 12px rgba(124, 58, 237, 0.06);
  --el-box-shadow: 0 4px 16px rgba(124, 58, 237, 0.08);
}

.el-button--primary {
  --el-button-bg-color: #7c3aed;
  --el-button-border-color: #7c3aed;
  --el-button-hover-bg-color: #6d28d9;
  --el-button-hover-border-color: #6d28d9;
  --el-button-active-bg-color: #5b21b6;
  --el-button-active-border-color: #5b21b6;
}

.el-tag--primary {
  --el-tag-bg-color: #f5f3ff;
  --el-tag-border-color: #ddd6fe;
  --el-tag-text-color: #7c3aed;
}

.el-tabs__active-bar {
  background-color: #7c3aed;
}
.el-tabs__item.is-active {
  color: #7c3aed;
}
.el-tabs__item:hover {
  color: #7c3aed;
}

.el-pagination .el-pager li.is-active {
  background-color: #7c3aed;
}

.el-switch.is-checked .el-switch__core {
  background-color: #7c3aed;
  border-color: #7c3aed;
}

.el-checkbox__input.is-checked .el-checkbox__inner {
  background-color: #7c3aed;
  border-color: #7c3aed;
}

.el-card {
  border-radius: 12px !important;
  box-shadow: 0 1px 3px rgba(124, 58, 237, 0.04) !important;
}

.el-menu {
  --el-menu-bg-color: transparent;
  --el-menu-hover-bg-color: #ede9fe;
}

/* 表格固定列按钮不换行 */
.el-table__fixed-right .cell,
.el-table__fixed-left .cell {
  white-space: nowrap;
}

.el-step__head.is-success {
  color: #7c3aed;
  border-color: #7c3aed;
}
.el-step__title.is-success {
  color: #7c3aed;
}

/* Mobile-friendly */
@media (max-width: 767px) {
  .el-table { font-size: 12px; }
  .el-pagination { justify-content: center; flex-wrap: wrap; }
  .el-pagination button, .el-pagination .el-pager li { min-width: 28px; height: 28px; font-size: 12px; }
  .el-dialog { width: calc(100vw - 32px) !important; margin: 16px !important; }
  .el-message-box { width: calc(100vw - 48px) !important; }
  .el-form-item__label { font-size: 13px; }
  .el-button { font-size: 13px; }
  /* 手机端表格操作列去掉按钮间距，节省水平空间 */
  .el-table .el-button + .el-button { margin-left: 0 !important; }
}
</style>
