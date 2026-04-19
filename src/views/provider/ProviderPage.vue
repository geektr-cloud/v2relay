<script setup lang="ts">
import { onMounted } from "vue";
import { useEditorModal } from "@/components/EditorModal";
import { useProviderStore } from "@/stores/providers";
import ProviderList from "./ProviderList.vue";
import ProviderEditor from "./ProviderEditor.vue";
import PageEntry from "@/components/CMS/PageEntry.vue";

const store = useProviderStore();
const { showEditor } = useEditorModal(ProviderEditor, {
  title: "提供商",
  onSaved: () => void store.refresh(),
});

onMounted(() => void store.refresh());
</script>

<template>
  <PageEntry
    title="订阅服务提供商"
    description="永远怀念喵帕斯"
    :loading="store.loading"
    :error="store.error"
    :items="store.sorted"
    @retry="void store.refresh()"
    @create="showEditor({})"
  >
    <ProviderList />
  </PageEntry>
</template>
