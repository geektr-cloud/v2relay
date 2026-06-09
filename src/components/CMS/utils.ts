import type { Component, Reactive, Ref } from "vue";
import { defineComponent, h, nextTick, onUnmounted, ref } from "vue";
import type { ReferenceElement } from "reka-ui";
import type { useAsyncState } from "@vueuse/core";
import _RemovalPopover from "./RemovalPopover.vue";
import { VueFinalModal, useModal } from "vue-final-modal";
import { Card, CardContent } from "../ui/card";

type RefElement = MouseEvent | EventTarget | null;
const getTarget = (el: unknown) => (el instanceof MouseEvent ? el.target : el) as ReferenceElement;
type RemovalFunc = (id: Ref<string | undefined>) => Reactive<ReturnType<typeof useAsyncState>>;
export const useRemovalContext = (removalFunc: RemovalFunc) => {
  const id = ref<string>();
  const anchor = ref<ReferenceElement>();
  const isOpen = ref(false);

  const RemovalPopover = {
    setup() {
      const removal = removalFunc(id);

      return () =>
        h(_RemovalPopover, {
          anchor: anchor.value,
          open: isOpen.value,
          confirm: "确定删除该条目？",
          removal,
          "onUpdate:open": (v: boolean) => (isOpen.value = v),
        });
    },
  };

  const open = (el: RefElement, _id: string) => {
    anchor.value = getTarget(el);
    id.value = _id;
    isOpen.value = true;
  };

  const close = () => {
    isOpen.value = false;
    nextTick(() => {
      anchor.value = undefined;
      id.value = undefined;
    });
  };

  return { open, close, RemovalPopover };
};

export const useFormModel = (Form: Component) => {
  const id = ref<string>();

  const component = defineComponent({
    setup() {
      return () =>
        h(
          VueFinalModal,
          {
            class: "flex overflow-y-auto py-[10vh]",
            contentClass: "m-auto flex flex-col max-w-5xl px-4",
            focusTrap: false,
            zIndexFn: ({ index }) => 1000 + index,
          },
          {
            default: () =>
              h(Card, null, {
                default: () =>
                  h(CardContent, null, {
                    default: () =>
                      h(Form, {
                        id: id.value,
                        onClose: close,
                      }),
                  }),
              }),
          },
        );
    },
  });

  const { open, close, destroy } = useModal({ component });

  onUnmounted(destroy);

  const create = () => {
    close();
    nextTick(() => {
      id.value = undefined;
      open();
    });
  };

  const update = (_id: string) => {
    close();
    nextTick(() => {
      id.value = _id;
      open();
    });
  };

  return { create, update };
};
