<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { useClipboard } from '@vueuse/core'
import { Check, Copy, ExternalLink, Minus } from 'lucide-vue-next'
import { computed } from 'vue'

const { copy, copied } = useClipboard()
const props = defineProps<{ label?: string, href?: string | null }>()

const isEmpty = computed(() => !props.href)
</script>

<template>
    <Badge v-if="!isEmpty" v-bind="$attrs" class="max-w-full flex items-center gap-1" variant="link">
        <a :href="href ?? ''" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1">
            <ExternalLink class="size-3.5 shrink-0" />
            <code class="inline-block truncate min-w-0">{{ label ?? href }}</code>
        </a>
        <Separator orientation="vertical" />
        <Button variant="ghost" size="icon" class="size-3.5 cursor-pointer" @click="copy(href ?? '')">
            <Copy class="size-3.5 shrink-0" v-if="!copied" />
            <Check class="size-3.5 shrink-0" v-else />
        </Button>
    </Badge>
    <Badge v-else v-bind="$attrs" variant="link">
        <Minus class="size-3.5 shrink-0" />
    </Badge>
</template>
