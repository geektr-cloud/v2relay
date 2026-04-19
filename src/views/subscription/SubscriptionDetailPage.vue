<script setup lang="ts">
import DetailPage from "@/components/CMS/DetailPage.vue";
import CopyTag from "@/components/DataView/CopyTag.vue";
import DeleteButton from "@/components/CMS/DeleteButton.vue";
import { useSubscriptionStore } from "@/stores/subscriptions";
import { DataView, DataItem, CopyBtn, VSeparator, Multiline, Date } from "@/components/DataView";
import { useAsyncState } from "@vueuse/core";
import { Edit } from "lucide-vue-next";
import Button from "@/components/ui/button/Button.vue";
import { useRouteParams } from "@vueuse/router";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";

const id = useRouteParams<string>("id");

const { get, remove } = useSubscriptionStore();

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
            <DeleteButton :action="() => remove(id)" confirm="确定删除此订阅？不可恢复。" />
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
            <DataItem label="备注">
              <Multiline :value="state.remark" />
            </DataItem>
            <DataItem label="创建时间">
              <Date :value="state.createdAt" format="datetime" />
            </DataItem>
            <DataItem label="更新时间">
              <Date :value="state.updatedAt" format="datetime" />
            </DataItem>
          </DataView>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">订阅链接</CardTitle>
        </CardHeader>
        <CardContent>
          <CopyTag variant="ghost" v-for="(url, i) in state.urls" :key="i" :value="url" />
        </CardContent>
      </Card>
    </template>
  </DetailPage>
</template>
