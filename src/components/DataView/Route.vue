<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import type { RouteLocationRaw } from "vue-router";

const props = defineProps<{ to?: RouteLocationRaw | null }>()
</script>

<template>
    <Badge as-child v-bind="$attrs" variant="link">
        <RouterLink :to="to ?? ''">
            <slot></slot>
        </RouterLink>
    </Badge>
</template>
