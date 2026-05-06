<script setup lang="ts">
import { computed } from "vue";
import { useAsyncState } from "@vueuse/core";

const props = defineProps<{ id: string }>();

const fetchContent = async () => {
  const res = await fetch(`/api/subscriptions/${encodeURIComponent(props.id)}/readable`);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      //
    }
    throw new Error(msg);
  }
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();
  return { text, contentType };
};

const { state, isLoading, error } = useAsyncState<{ text: string; contentType: string } | null>(fetchContent, null, {
  throwError: false,
});

const display = computed(() => {
  if (!state.value) return "";
  const { text, contentType } = state.value;
  if (contentType.toLowerCase().includes("application/json")) {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }
  return text;
});
</script>

<template>
  <div>
    <p v-if="isLoading" class="text-sm text-zinc-400">加载中...</p>
    <p v-else-if="error" class="text-destructive text-sm">{{ (error as Error).message }}</p>
    <pre
      v-else
      class="bg-zinc-900 rounded p-3 overflow-auto max-h-[60vh] text-xs leading-relaxed"
    ><code class="font-mono whitespace-pre">{{ display }}</code></pre>
  </div>
</template>
