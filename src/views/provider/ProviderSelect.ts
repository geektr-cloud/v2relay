import { computed, defineComponent, h, onMounted } from 'vue'
import { NSelect } from 'naive-ui'
import { useProviderStore } from '@/stores/providers'

export default defineComponent({
  name: 'ProviderSelect',
  inheritAttrs: false,
  setup(_, { attrs }) {
    const store = useProviderStore()

    onMounted(() => {
      if (!store.items.length) void store.refresh()
    })

    const options = computed(() =>
      store.sorted.map((p) => ({ label: p.name, value: p.id })),
    )

    return () =>
      h(NSelect, {
        placeholder: '选择提供商',
        filterable: true,
        ...attrs,
        options: options.value,
        loading: store.loading || (attrs.loading as boolean),
      })
  },
})
