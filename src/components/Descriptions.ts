import { type PropType, type VNode, defineComponent, h } from 'vue'
import Link from '@/components/DataView/Link.vue'

const row = (label: string, content: () => unknown) =>
  h('div', { class: 'flex gap-2 py-2 text-sm' }, [
    h('dt', { class: 'w-24 shrink-0 text-zinc-400' }, label),
    h('dd', { class: 'min-w-0 flex-1 text-zinc-200' }, [content() as VNode]),
  ])

export const Descriptions = defineComponent({
  name: 'Descriptions',
  setup(_, { slots }) {
    return () =>
      h('dl', { class: 'divide-y divide-zinc-800' }, slots.default?.())
  },
})

export const DescriptionsCode = defineComponent({
  name: 'DescriptionsCode',
  props: {
    label: { type: String, required: true },
    value: { type: String, default: '' },
  },
  setup(props) {
    return () =>
      row(props.label, () =>
        h('code', { class: 'text-sm break-all' }, props.value),
      )
  },
})

export const DescriptionsLink = defineComponent({
  name: 'DescriptionsLink',
  props: {
    label: { type: String, required: true },
    value: { type: String as PropType<string | null>, default: null },
    fallback: { type: String, default: '未设置' },
  },
  setup(props) {
    return () =>
      row(props.label, () =>
        h(Link, { href: props.value, fallback: props.fallback }),
      )
  },
})

export const DescriptionsDate = defineComponent({
  name: 'DescriptionsDate',
  props: {
    label: { type: String, required: true },
    value: { type: Date, required: true },
  },
  setup(props) {
    return () =>
      row(props.label, () => props.value.toLocaleString('zh-CN'))
  },
})

export const DescriptionsText = defineComponent({
  name: 'DescriptionsText',
  props: {
    label: { type: String, required: true },
    value: { type: String as PropType<string | null>, default: null },
    fallback: { type: String, default: '—' },
  },
  setup(props) {
    return () =>
      row(props.label, () =>
        (props.value?.trim())
          ? h('span', null, props.value.trim())
          : h('span', { class: 'text-zinc-500' }, props.fallback),
      )
  },
})
