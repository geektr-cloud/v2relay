<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { ModalsContainer } from "vue-final-modal";
import { LogOut } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const navLinkClass = (active: boolean) =>
  ["no-underline transition-colors", active ? "text-cyan-400" : "text-zinc-400 hover:text-cyan-400"].join(" ");
const providersActive = computed(() => route.name === "home" || route.name === "provider-detail");
const subscriptionsActive = computed(() => route.name === "subscriptions" || route.name === "subscription-detail");
const tagsActive = computed(() => route.name === "tags" || route.name === "tag-detail");
const nodesActive = computed(() => route.name === "nodes" || route.name === "node-detail");
const systemNoticesActive = computed(() => route.name === "system-notices");
const rulesetsActive = computed(() => route.name === "rulesets" || route.name === "ruleset-detail");
const routesActive = computed(() => route.name === "routes" || route.name === "route-detail");
const appConfigsActive = computed(() => route.name === "app-configs" || route.name === "app-config-detail");

const onLogout = async () => {
  await auth.logout();
  router.push("/login");
};
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100">
    <ModalsContainer />
    <header
      v-if="auth.authenticated"
      class="sticky top-0 z-10 flex h-14 items-center gap-6 border-b border-zinc-800/80 bg-zinc-950/95 px-4 backdrop-blur supports-backdrop-filter:bg-zinc-950/80"
    >
      <RouterLink
        to="/"
        class="text-lg font-semibold tracking-tight text-zinc-100 no-underline transition-colors hover:text-cyan-400"
      >
        V2Relay
      </RouterLink>
      <nav class="flex items-center gap-4 text-sm">
        <RouterLink to="/" :class="navLinkClass(providersActive)"> 提供商 </RouterLink>
        <RouterLink to="/subscriptions" :class="navLinkClass(subscriptionsActive)"> 订阅 </RouterLink>
        <RouterLink to="/nodes" :class="navLinkClass(nodesActive)"> 节点 </RouterLink>
        <RouterLink to="/rulesets" :class="navLinkClass(rulesetsActive)"> 规则集 </RouterLink>
        <RouterLink to="/routes" :class="navLinkClass(routesActive)"> 路由 </RouterLink>
        <RouterLink to="/app-configs" :class="navLinkClass(appConfigsActive)"> 配置 </RouterLink>
        <RouterLink to="/tags" :class="navLinkClass(tagsActive)"> 标签 </RouterLink>
        <RouterLink to="/system-notices" :class="navLinkClass(systemNoticesActive)"> 通知 </RouterLink>
      </nav>
      <div class="ml-auto">
        <Button
          v-if="auth.authenticated && route.name !== 'login'"
          variant="ghost"
          size="icon"
          title="登出"
          @click="onLogout"
        >
          <LogOut />
        </Button>
      </div>
    </header>
    <main class="bg-zinc-950">
      <RouterView v-if="auth.authenticated || route.name === 'login'" />
    </main>
  </div>
</template>
