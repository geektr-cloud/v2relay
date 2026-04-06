import { type PropType, defineComponent, h } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

const linkClass = 'text-cyan-400 underline-offset-2 hover:underline'

export const Link = defineComponent({
  name: 'Link',
  props: {
    href: { type: String as PropType<string | null>, default: null },
    fallback: { type: String, default: '—' },
  },
  inheritAttrs: false,
  setup(props, { attrs, slots }) {
    return () =>
      props.href
        ? h('a', {
            href: props.href,
            target: '_blank',
            rel: 'noopener noreferrer',
            class: `break-all ${linkClass}`,
            ...attrs,
          }, slots.default?.() ?? props.href)
        : h('span', { class: 'text-zinc-500' }, slots.default?.() ?? props.fallback)
  },
})

export const Route = defineComponent({
  name: 'Route',
  props: {
    to: { type: [String, Object] as unknown as () => RouteLocationRaw, required: true },
  },
  inheritAttrs: false,
  setup(props, { attrs, slots }) {
    return () =>
      h(RouterLink, { to: props.to, class: linkClass, ...attrs }, slots)
  },
})
