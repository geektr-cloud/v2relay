import { useModal } from "naive-ui";
import { h, type Component } from "vue";

export interface EditorOptions<T = any> {
  title?: string;
  id?: string;
  prefill?: Partial<T>;
  viewMode?: boolean;
  onSaved?: (id: string, data: T) => void | (() => void);
  onDeleted?: (id: string) => void | (() => void);
  onClose?: () => any;
}

export type EditorProps<T = any> = Omit<EditorOptions<T>, "onSaved" | "onDeleted" | "onClose">;
export type EditorEmits<T = any> = {
  saved: [id: string, data: T];
  deleted: [id: string];
  close: [];
};

const modeName = {
  create: "创建",
  view: "查看",
  edit: "编辑",
};

export const useEditorModal = <T = any>(el: Component, defaultOpts: EditorOptions<T>) => {
  const modal = useModal();

  const showEditor = (_opts: Partial<EditorOptions<T>> = {}) => {
    const opts = { ...defaultOpts, ..._opts };

    let mode: keyof typeof modeName = opts.viewMode ? "view" : opts.id ? "edit" : "create";

    const r = modal.create({
      title: `${modeName[mode]}${opts.title}`,
      class: "max-w-lg",
      preset: "card",
      onClose: () => {
        r.destroy();
        opts.onClose?.();
      },
      render: () =>
        h(
          el,
          {
            options: {
              ...opts,
              prefill: opts.prefill ?? {},
              onSaved: opts.onSaved ?? (() => {}),
              onDeleted: opts.onDeleted ?? (() => {}),
              onClose: () => {
                r.destroy();
                opts.onClose?.();
              },
            },
          },
          () => "关闭",
        ),
    });
    return r;
  };

  return { showEditor };
};
