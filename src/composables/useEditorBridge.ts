import { computed, ref, watch } from 'vue'
import type { EditorOptions } from '@/components/EditorModal'

export type InjectedEditorOptions<T> = EditorOptions<T> & {
  prefill: Partial<T>
  onSaved: (id: string, data: T) => void
  onClose: () => void
}

export type EditorMode = 'view' | 'edit' | 'create'

export interface EditorBridgeProps<T> {
  options?: InjectedEditorOptions<T>
  id?: string
  mode?: EditorMode
}

export function useEditorBridge<T>(
  props: EditorBridgeProps<T>,
  emit: (...args: any[]) => void,
) {
  const initialMode = computed<EditorMode>(() => {
    if (props.options) {
      return props.options.viewMode ? 'view' : props.options.id ? 'edit' : 'create'
    }
    return props.mode ?? 'view'
  })

  const editorId = computed(() => props.options?.id ?? props.id)

  const mode = ref<EditorMode>(initialMode.value)
  watch([initialMode, editorId], () => { mode.value = initialMode.value })

  const isCreate = computed(() => mode.value === 'create')
  const isEdit = computed(() => mode.value === 'edit')
  const isView = computed(() => mode.value === 'view')
  const isEditing = computed(() => mode.value !== 'view')

  function switchMode(m: EditorMode) { mode.value = m }

  function notifySaved(id: string, data: T) {
    if (isEdit.value) mode.value = 'view'
    props.options?.onSaved(id, data)
    emit('saved', id, data)
  }

  function notifyClose() {
    if (isEdit.value) mode.value = 'view'
    props.options?.onClose()
    emit('close')
  }

  return {
    mode, editorId,
    isCreate, isEdit, isView, isEditing,
    switchMode, notifySaved, notifyClose,
  }
}
