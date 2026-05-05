<script setup lang="ts">
import { DetailPage, RemovalButton, useFormModel } from "@/components/CMS";
import { DataView, DataItem, CopyBtn, VSeparator } from "@/components/DataView";
import { useRouteParams } from "@vueuse/router";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import { useTagStore } from "@/stores/tags";
import { Edit } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TagEditor from "./TagEditor.vue";

const id = useRouteParams<string>("idOrName");
const { useOne, useRemoval } = useTagStore();
const { update } = useFormModel(TagEditor);

const tag = useOne(id);
const removal = useRemoval(id);
</script>

<template>
  <DetailPage :loading="tag.loading" :error="tag.error" @retry="tag.reload">
    <template v-if="tag.item">
      <Card>
        <CardHeader>
          <CardTitle class="text-base"> 标签信息 </CardTitle>
          <CardAction>
            <Button variant="secondary" @click="update(tag.item!.id)">
              <Edit />
            </Button>
            <RemovalButton :ctx="removal" confirm="确定删除此标签？不可恢复。" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <DataView>
            <DataItem label="ID">
              {{ tag.item.id }}
              <VSeparator />
              <CopyBtn :value="tag.item.id" />
            </DataItem>
            <DataItem label="名称">
              {{ tag.item.name }}
            </DataItem>
            <DataItem label="关键词">
              <div v-if="tag.item.keywords.length" class="flex flex-wrap gap-1">
                <Badge v-for="(kw, i) in tag.item.keywords" :key="i" variant="outline">
                  {{ kw }}
                </Badge>
              </div>
              <span v-else class="text-muted-foreground">—</span>
            </DataItem>
          </DataView>
        </CardContent>
      </Card>
    </template>
  </DetailPage>
</template>
