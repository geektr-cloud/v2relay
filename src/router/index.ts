import { createRouter, createWebHistory } from "vue-router";
import ProviderPage from "../views/provider/ProviderPage.vue";
import ProviderDetailPage from "../views/provider/ProviderDetailPage.vue";
import SubscriptionPage from "../views/subscription/SubscriptionPage.vue";
import SubscriptionDetailPage from "../views/subscription/SubscriptionDetailPage.vue";
import TagPage from "../views/tag/TagPage.vue";
import TagDetailPage from "../views/tag/TagDetailPage.vue";
import NodePage from "../views/node/NodePage.vue";
import NodeDetailPage from "../views/node/NodeDetailPage.vue";
import SystemNoticePage from "../views/system-notice/SystemNoticePage.vue";
import RulesetPage from "../views/ruleset/RulesetPage.vue";
import RulesetDetailPage from "../views/ruleset/RulesetDetailPage.vue";
import AppConfigPage from "../views/app-config/AppConfigPage.vue";
import AppConfigDetailPage from "../views/app-config/AppConfigDetailPage.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: ProviderPage,
    },
    {
      path: "/subscriptions",
      name: "subscriptions",
      component: SubscriptionPage,
    },
    {
      path: "/subscriptions/:id",
      name: "subscription-detail",
      component: SubscriptionDetailPage,
    },
    {
      path: "/providers/:idOrName",
      name: "provider-detail",
      component: ProviderDetailPage,
    },
    {
      path: "/tags",
      name: "tags",
      component: TagPage,
    },
    {
      path: "/tags/:idOrName",
      name: "tag-detail",
      component: TagDetailPage,
    },
    {
      path: "/nodes",
      name: "nodes",
      component: NodePage,
    },
    {
      path: "/nodes/:id",
      name: "node-detail",
      component: NodeDetailPage,
    },
    {
      path: "/system-notices",
      name: "system-notices",
      component: SystemNoticePage,
    },
    {
      path: "/rulesets",
      name: "rulesets",
      component: RulesetPage,
    },
    {
      path: "/rulesets/:idOrName",
      name: "ruleset-detail",
      component: RulesetDetailPage,
    },
    {
      path: "/app-configs",
      name: "app-configs",
      component: AppConfigPage,
    },
    {
      path: "/app-configs/:idOrName",
      name: "app-config-detail",
      component: AppConfigDetailPage,
    },
  ],
});

export default router;
