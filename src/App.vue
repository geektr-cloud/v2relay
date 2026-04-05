<script setup lang="ts">
import { NConfigProvider, darkTheme, zhCN, dateZhCN } from "naive-ui"
</script>

<template>
  <NConfigProvider :theme="darkTheme" :locale="zhCN" :date-locale="dateZhCN">
    <header></header>

    <RouterView />
  </NConfigProvider>
</template>
