import { type Component, defineComponent, h } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { useRouter } from "vue-router";
import { NButton, NIcon, NPopconfirm, NTooltip } from "naive-ui";

export default defineComponent({
  name: "ActionButton",
  props: {
    icon: { type: Object as () => Component, default: undefined },
    label: { type: String, default: undefined },
    tooltip: { type: String, default: undefined },
    confirm: { type: String, default: undefined },
    route: { type: [String, Object] as unknown as () => RouteLocationRaw, default: undefined },
  },
  inheritAttrs: false,
  setup(props, { attrs }) {
    const router = useRouter();

    return () => {
      const { onClick: rawClick, ...rest } = attrs as Record<string, unknown>;
      const onClick = props.route ? () => void router.push(props.route!) : rawClick;
      const btnAttrs = props.confirm ? rest : { ...rest, onClick };

      const slots: Record<string, () => unknown> = {};
      if (props.icon) {
        slots.icon = () => h(NIcon, null, { default: () => h(props.icon!) });
      }
      if (props.label) {
        slots.default = () => props.label;
      }

      const btn = h(NButton, { size: "small", quaternary: true, ...btnAttrs }, slots);

      let node = btn;
      if (props.tooltip) {
        node = h(
          NTooltip,
          { trigger: "hover" },
          {
            trigger: () => btn,
            default: () => props.tooltip,
          },
        );
      }

      if (!props.confirm) return node;
      return h(
        NPopconfirm,
        { onPositiveClick: onClick as () => void },
        {
          trigger: () => node,
          default: () => props.confirm,
        },
      );
    };
  },
});
