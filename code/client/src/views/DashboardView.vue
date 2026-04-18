<!-- ===================================================
     DashboardView — 仪表盘/笔记主界面

     功能：
     - 左侧边栏：笔记列表、新建按钮
     - 右侧编辑器：编辑笔记内容
     - 类似 Obsidian 的布局
     =================================================== -->

<script setup lang="ts">
import Sidebar from '@/components/sidebar/Sidebar.vue'
import PageEditor from '@/components/editor/PageEditor.vue'
</script>

<template>
  <div class="flex h-screen bg-gray-50">
    <!-- 左侧边栏 -->
    <Sidebar />

    <!-- 右侧编辑器 -->
    <PageEditor />
  </div>
</template>
