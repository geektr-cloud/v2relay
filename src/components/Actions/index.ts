import type { ReferenceElement } from "reka-ui";
import { computed, defineComponent, h, onMounted, onUnmounted, ref } from "vue";
import _ConfirmPopover from "./ConfirmPopover.vue";
import type { CMS } from "../CMS";

export interface ConfirmPopoverOptions<T extends CMS.BaseData> {
  message: string | ((src: T | undefined) => string);
  useRemoval: CMS.UseRemoval<T>;
}

export const useConfirmPopover = <T extends CMS.BaseData>(opts: ConfirmPopoverOptions<T>) => {
  const id = ref<CMS.Id>();
  const anchor = ref<ReferenceElement>();
  const isOpen = ref(false);

  const ConfirmPopover = defineComponent({
    setup() {
      const removal = opts.useRemoval(id);
      const message = computed(() => (typeof opts.message === "function" ? opts.message(removal.item) : opts.message));

      return () =>
        h(_ConfirmPopover, {
          anchor: anchor.value,
          message: message.value,
          ctx: removal,
          open: isOpen.value,
          "onUpdate:open": (v: boolean) => (isOpen.value = v),
        });
    },
  });

  const open = (event: Event, _id: CMS.Id) => {
    anchor.value = event.target as ReferenceElement;
    id.value = _id;
    isOpen.value = true;
  };

  const close = () => {
    isOpen.value = false;
    anchor.value = undefined;
    id.value = undefined;
  };

  const onGlobalClick = (event: Event) => {
    if (anchor.value && anchor.value instanceof Node && anchor.value.contains(event.target as Node)) return;
    close();
  };

  onMounted(() => window.addEventListener("click", onGlobalClick));
  onUnmounted(() => window.removeEventListener("click", onGlobalClick));

  return { open, close, ConfirmPopover };
};
