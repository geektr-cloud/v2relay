<script setup lang="ts">
import DetailPage from "@/components/CMS/DetailPage.vue";
import { DataView, DataItem, CopyBtn, VSeparator } from "@/components/DataView";
import { useAsyncState } from "@vueuse/core";
import { useRouteParams } from "@vueuse/router";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import { useProviderStore } from "@/stores/providers";
import DeleteButton from "@/components/CMS/DeleteButton.vue";
import { Edit } from "lucide-vue-next";
import { Button } from "@/components/ui/button";

const id = useRouteParams<string>("idOrName");

const { get, remove } = useProviderStore();

const { state, error, isLoading, execute } = useAsyncState(() => get(id.value!), null, { throwError: false });
</script>

<template>
  <DetailPage :loading="isLoading" :error="error" @retry="execute">
    <template v-if="state">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">基本信息</CardTitle>
          <CardAction>
            <Button variant="secondary">
              <Edit />
            </Button>
            <DeleteButton :action="() => remove(id)" confirm="确定删除此提供商？不可恢复。" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <DataView>
            <DataItem label="ID">
              {{ state.id }}
              <VSeparator />
              <CopyBtn :value="state.id" />
            </DataItem>
            <DataItem label="名称">{{ state.name }}</DataItem>
            <DataItem label="地址">
              <a :href="state.url" target="_blank" rel="noopener noreferrer" class="max-w-[40ch]">{{ state.url }}</a>
              <VSeparator />
              <CopyBtn :value="state.url" />
            </DataItem>
          </DataView>
        </CardContent>
      </Card>
    </template>
  </DetailPage>
</template>
