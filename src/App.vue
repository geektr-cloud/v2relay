<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import {
  NConfigProvider,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NMessageProvider,
  darkTheme,
  zhCN,
  dateZhCN,
} from 'naive-ui'
</script>

<template>
  <NConfigProvider :theme="darkTheme" :locale="zhCN" :date-locale="dateZhCN">
    <NMessageProvider>
      <NLayout class="min-h-screen bg-zinc-950 text-zinc-100">
        <NLayoutHeader
          bordered
          class="sticky top-0 z-10 flex h-14 items-center border-zinc-800/80 bg-zinc-950/95 px-4 backdrop-blur supports-backdrop-filter:bg-zinc-950/80"
        >
          <RouterLink
            to="/"
            class="text-lg font-semibold tracking-tight text-zinc-100 no-underline transition-colors hover:text-cyan-400"
          >
            V2Relay
          </RouterLink>
          <span class="ml-3 hidden text-sm text-zinc-500 sm:inline">
            I thought what I'd do was, I'd pretend I was one of those deaf-mutes.
          </span>
        </NLayoutHeader>
        <NLayoutContent class="bg-zinc-950">
          <RouterView />
        </NLayoutContent>
      </NLayout>
    </NMessageProvider>
  </NConfigProvider>
</template>
