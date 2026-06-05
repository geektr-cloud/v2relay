<script setup lang="ts">
import { ref, watch } from "vue";
import { RefreshCw } from "lucide-vue-next";
import { client } from "@/utils/api";
import { useAsyncState, useHonoApi } from "@/lib/acrux";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Route from "@/components/DataView/Route.vue";

type Match = { id: string; name: string; subscriptionId: string };

const props = defineProps<{ id: string }>();

const previewFn = useHonoApi<Match[], Match[], [string]>((routeId: string) =>
  client.api.routes[":id"].preview.$get({ param: { id: routeId } }),
);

const [matches, status, reload] = useAsyncState<Match[]>(
  () => (props.id ? previewFn(props.id) : Promise.resolve([])),
  [],
  { throwError: false },
);

const refreshing = ref(false);
watch(
  () => props.id,
  (v) => v && reload(),
  { immediate: true },
);

const onRefresh = async () => {
  refreshing.value = true;
  try {
    await reload();
  } finally {
    refreshing.value = false;
  }
};
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-base">筛选结果</CardTitle>
      <CardAction>
        <Button variant="secondary" size="icon" :disabled="status.loading" title="刷新" @click="onRefresh">
          <RefreshCw :class="status.loading || refreshing ? 'animate-spin' : ''" />
        </Button>
      </CardAction>
    </CardHeader>
    <CardContent>
      <p v-if="status.loading" class="text-sm text-zinc-400">加载中...</p>
      <p v-else-if="status.error" class="text-destructive text-sm">{{ (status.error as Error).message }}</p>
      <template v-else>
        <p class="text-sm text-zinc-400 mb-2">共 {{ matches.length }} 个节点匹配</p>
        <div v-if="matches.length" class="flex flex-wrap gap-1">
          <Route
            v-for="n in matches"
            :key="n.id"
            :to="{ name: 'node-detail', params: { id: n.id } }"
            class="no-underline"
          >
            <Badge variant="outline">{{ n.name || n.id }}</Badge>
          </Route>
        </div>
        <p v-else class="text-zinc-500 text-sm">无匹配节点</p>
      </template>
    </CardContent>
  </Card>
</template>
