import { computed, reactive, ref, shallowRef, toValue, watch, type Reactive, type Ref } from "vue";
import type { StandardSchemaV1 } from "@standard-schema/spec";

type AsyncState<T, R = unknown> = {
  state: Ref<T>;
  error: Ref<unknown>;
  isLoading: Ref<boolean>;
  execute: () => Promise<R>;
};

export type Id = string;
export type BaseData = { id: Id };

// All
export type ListItems<T> = Reactive<{
  items: Ref<T[]>;
  error: Ref<unknown>;
  loading: Ref<boolean>;
  reload: () => Promise<unknown>;
}>;
export const toAllItems = <T>(as: AsyncState<T[]>): ListItems<T> =>
  reactive({ items: as.state, error: as.error, loading: as.isLoading, reload: as.execute });
export type UseAll<T> = () => ListItems<T>;

// Filtered
export type Filter<T> = ((item: T) => boolean) | undefined;
export const toFilteredItems = <T extends BaseData>(
  as: AsyncState<T[]>,
  filter: Filter<T> | Ref<Filter<T>>,
): ListItems<T> => {
  const fn = computed(() => {
    const _filter = toValue(filter);
    if (typeof _filter === "function") return _filter as (item: T) => boolean;
    return () => true;
  });
  const filtered = computed(() => as.state.value?.filter(fn.value) ?? []);
  return reactive({ items: filtered, error: as.error, loading: as.isLoading, reload: as.execute });
};
export type UseFiltered<T> = (filter: Filter<T> | Ref<Filter<T>>) => ListItems<T>;

// One
export type OneItem<T> = Reactive<{
  item: Ref<T | undefined>;
  error: Ref<unknown>;
  loading: Ref<boolean>;
  reload: () => Promise<unknown>;
}>;
export const toOneItem = <T>(as: AsyncState<T | undefined>): OneItem<T> =>
  reactive({ item: as.state, error: as.error, loading: as.isLoading, reload: as.execute });
export type UseOne<T extends BaseData> = (id: Ref<T["id"] | undefined>) => OneItem<T>;

// Validation
export type Issues = readonly StandardSchemaV1.Issue[] | undefined;

// CreateOrUpdate
export type Upsert<T extends BaseData> = [
  T,
  UseIssues,
  Reactive<{
    error: Ref<unknown>;
    issues: Ref<Issues>;
    loading: Ref<boolean>;
    submit: () => Promise<unknown>;
  }>,
];
export const toUpsert = <T extends BaseData>(
  form: T,
  issues: Ref<Issues>,
  as: AsyncState<T | undefined>,
): Upsert<T> => [
  form,
  useIssues(form, issues),
  reactive({
    error: as.error,
    loading: as.isLoading,
    submit: () => as.execute(),
    issues: issues,
  }),
];
export type UseUpsert<T extends BaseData> = (id: Ref<T["id"] | undefined>) => Upsert<T>;

// Removal
export type Removal<T> = Reactive<{
  item: Ref<T | undefined>;
  error: Ref<unknown>;
  loading: Ref<boolean>;
  submit: () => Promise<unknown>;
}>;
export const toRemoval = <T>(item: Ref<T | undefined>, as: AsyncState<T | undefined>): Removal<T> =>
  reactive({ item, error: as.error, loading: as.isLoading, submit: () => as.execute() });
export type UseRemoval<T extends BaseData> = (id: Ref<T["id"] | undefined>) => Removal<T>;

// Selector
export type SelectorContext<T extends BaseData> = Reactive<{
  options: AsyncState<{ label: string; value: Id; data: T }[]>;
  selected: Id | undefined;
}>;

// Issues
const issuesToMap = (issues: Issues, skiped: PropertyKey[]) => {
  const result: Record<PropertyKey, StandardSchemaV1.Issue[]> = {};
  for (const issue of issues ?? []) {
    for (const path of issue.path ?? []) {
      if (skiped.includes(path as PropertyKey)) continue;

      const key = (path as { key: PropertyKey })?.key || (path as PropertyKey);
      result[key] = result[key] ?? [];
      result[key]!.push(issue);
    }
  }
  return result;
};

export const useIssues = (form: Reactive<unknown>, issues: Ref<Issues>) => {
  const skiped = shallowRef<PropertyKey[]>(Object.keys(form));
  const map = computed(() => issuesToMap(issues.value, skiped.value));

  watch(issues, () => {
    skiped.value = [];
  });

  const ingore = (key: PropertyKey) => {
    if (skiped.value.includes(key)) return;
    skiped.value = [...skiped.value, key];
  };

  const errors = (key: PropertyKey) => map.value[key] ?? [];
  const useErrors = (key: PropertyKey) => computed(() => errors(key));
  const valid = (key: PropertyKey) => errors(key).length === 0;

  return {
    ingore,
    valid,
    errors,
    useErrors,
  };
};
export type UseIssues = ReturnType<typeof useIssues>;

export const fork = <T>(form: Ref<T>) => {
  const cloned = ref({}) as Ref<T>;
  watch(
    form,
    (cur) => {
      try {
        cloned.value = JSON.parse(JSON.stringify(cur));
      } catch {
        cloned.value = structuredClone(cur);
      }
    },
    { immediate: true, deep: true },
  );

  return cloned;
};
