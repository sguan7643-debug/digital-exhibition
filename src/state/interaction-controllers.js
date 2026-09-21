import { reactive } from "vue";

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLocaleLowerCase("zh-CN");

const createTalentDraft = () => ({
  name: "",
  age: "",
  inPool: "是",
  type: "",
  department: "",
  domain: "",
  office: "",
  tags: "",
  direction: "",
  start: "",
  end: "",
});

const ANNOUNCEMENT_VIEWER_ROLES = new Set(["运营人员", "后台管理员"]);

export function canViewAnnouncements(role) {
  return ANNOUNCEMENT_VIEWER_ROLES.has(String(role || ""));
}

export function retainViewerRole(currentRole, nextPageRole) {
  return canViewAnnouncements(nextPageRole) ? nextPageRole : currentRole;
}

const APP_CATEGORY_ALIASES = Object.freeze({
  可视化: Object.freeze(["可视化", "大屏", "驾驶舱"]),
  报表: Object.freeze(["报表", "可视化报表", "供应报表"]),
  RPA: Object.freeze(["RPA", "RPA机器人"]),
  数据集: Object.freeze(["数据集"]),
  指标: Object.freeze(["指标"]),
  AI: Object.freeze(["AI", "AI智能体"]),
  海能work应用: Object.freeze(["海能work应用", "海能 Work 应用"]),
  EAD: Object.freeze(["EAD", "EAD应用"]),
  其他工具: Object.freeze(["其他工具", "工具", "其他应用"]),
});

export function normalizeAppCategory(value) {
  const input = String(value ?? "").trim();
  if (!input) return "";
  return (
    Object.entries(APP_CATEGORY_ALIASES).find(([, aliases]) =>
      aliases.includes(input),
    )?.[0] || ""
  );
}

export function matchesAppCategory(app, value) {
  const category = normalizeAppCategory(value);
  return (
    !value ||
    Boolean(
      category &&
        (app?.categoryKey === category ||
          APP_CATEGORY_ALIASES[category].includes(app?.category)),
    )
  );
}

const MATERIAL_CATEGORY_ALIASES = Object.freeze({
  可视化: Object.freeze(["可视化", "可视化组件", "模板", "大屏", "驾驶舱"]),
  报表: Object.freeze(["报表", "可视化报表"]),
  RPA: Object.freeze(["RPA", "脚本", "流程"]),
  数据集: Object.freeze(["数据集"]),
  指标: Object.freeze(["指标"]),
  AI: Object.freeze(["AI"]),
  海能work应用: Object.freeze(["海能work应用"]),
  EAD: Object.freeze(["EAD"]),
  其他工具: Object.freeze(["其他工具", "文档", "API", "其他"]),
});

export function normalizeMaterialCategory(value) {
  const input = String(value ?? "").trim();
  if (!input) return "";
  return (
    Object.entries(MATERIAL_CATEGORY_ALIASES).find(([, aliases]) =>
      aliases.includes(input),
    )?.[0] || ""
  );
}

export function matchesMaterialCategory(material, value) {
  const category = normalizeMaterialCategory(value);
  return (
    !value ||
    Boolean(
      category && MATERIAL_CATEGORY_ALIASES[category].includes(material.type),
    )
  );
}

const CATEGORY_ICON_NAMES = Object.freeze({
  可视化: "visual",
  报表: "report",
  RPA: "rpa",
  数据集: "dataset",
  指标: "metric",
  AI: "ai",
  海能work应用: "work",
  EAD: "ead",
  其他工具: "tools",
});

const DIRECT_APPLICATION_ROUTES = new Set([
  "/apps/dashboard-001", "/apps/report-001", "/apps/metric-001",
  "/apps/haineng-work-001", "/apps/ead-001", "/apps/tool-001",
]);

export function applicationAccessMode(route) {
  return DIRECT_APPLICATION_ROUTES.has(String(route || "")) ? "direct" : "apply";
}

export function categoryIconName(value) {
  const input = String(value ?? "").trim();
  if (["素材中心", "全部素材"].includes(input)) return "materials";
  if (["应用中心", "全部应用"].includes(input)) return "apps";
  const category =
    normalizeAppCategory(input) || normalizeMaterialCategory(input);
  return CATEGORY_ICON_NAMES[category] || "tools";
}

export function createShellController() {
  return reactive({
    materialsExpanded: true,
    appsExpanded: true,
    announcement: "",
    toggleGroup(group) {
      const field =
        group === "materials"
          ? "materialsExpanded"
          : group === "apps"
            ? "appsExpanded"
            : null;
      if (!field) return;
      this[field] = !this[field];
      const label = group === "materials" ? "素材中心" : "应用中心";
      this.announcement = `${label}子菜单已${this[field] ? "展开" : "收起"}`;
    },
  });
}

export function createAppsController(fixtures) {
  return reactive({
    fixtures: [...fixtures],
    filters: {
      category: "",
      query: "",
      tag: "",
      type: "",
      domain: "",
      scene: "",
    },
    queryDraft: "",
    sort: "default",
    view: "grid",
    page: 1,
    pageSize: 10,
    announcement: "",
    replaceFixtures(nextFixtures) {
      this.fixtures = Array.isArray(nextFixtures) ? [...nextFixtures] : [];
      this.page = 1;
      this.announcement = `已载入 ${this.fixtures.length} 个应用`;
    },
    get results() {
      const query = normalize(this.filters.query);
      const rows = this.fixtures.filter(
        (app) =>
          matchesAppCategory(app, this.filters.category) &&
          (!this.filters.tag || app.tag === this.filters.tag) &&
          matchesAppCategory(app, this.filters.type) &&
          (!this.filters.domain || app.domain === this.filters.domain) &&
          (!this.filters.scene || app.scene === this.filters.scene) &&
          (!query ||
            normalize(
              [app.name, app.description, app.owner, app.department].join(" "),
            ).includes(query)),
      );
      if (this.sort === "usage-desc")
        return [...rows].sort(
          (a, b) => b.usage - a.usage || a.id.localeCompare(b.id),
        );
      if (this.sort === "favorites-desc")
        return [...rows].sort(
          (a, b) => b.favorites - a.favorites || a.id.localeCompare(b.id),
        );
      if (this.sort === "name")
        return [...rows].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
      return rows;
    },
    get totalPages() {
      return Math.max(1, Math.ceil(this.results.length / this.pageSize));
    },
    get pagedResults() {
      const start = (this.page - 1) * this.pageSize;
      return this.results.slice(start, start + this.pageSize);
    },
    setFilter(key, value) {
      if (!(key in this.filters))
        throw new TypeError(`Unknown application filter: ${key}`);
      this.filters[key] = value;
      this.page = 1;
      this.announcement = `筛选完成，共 ${this.results.length} 个应用`;
    },
    setSort(value) {
      this.sort = value;
      this.page = 1;
      this.announcement = "应用排序已更新";
    },
    setView(value) {
      this.view = value;
      this.announcement = `已切换为${value === "list" ? "列表" : "卡片"}视图`;
    },
    setPage(value) {
      this.page = Math.min(this.totalPages, Math.max(1, Number(value) || 1));
      this.announcement = `已切换到第 ${this.page} 页`;
    },
    setPageSize(value) {
      this.pageSize = [10, 20, 50].includes(Number(value)) ? Number(value) : 10;
      this.page = 1;
      this.announcement = `已切换为每页 ${this.pageSize} 条`;
    },
    reset() {
      Object.assign(this.filters, {
        category: "",
        query: "",
        tag: "",
        type: "",
        domain: "",
        scene: "",
      });
      this.queryDraft = "";
      this.sort = "default";
      this.view = "grid";
      this.page = 1;
      this.announcement = `已重置筛选，共 ${this.results.length} 个应用`;
    },
  });
}

export function createTalentController(fixtures) {
  return reactive({
    fixtures: [...fixtures],
    filters: { query: "", department: "", domain: "", office: "", inPool: "" },
    selectedId: null,
    mode: null,
    draft: createTalentDraft(),
    errors: {},
    page: 1,
    pageSize: 10,
    announcement: "",
    get results() {
      const query = normalize(this.filters.query);
      return this.fixtures.filter(
        (person) =>
          (!this.filters.department ||
            person.department === this.filters.department) &&
          (!this.filters.domain || person.domain === this.filters.domain) &&
          (!this.filters.office || person.office === this.filters.office) &&
          (!this.filters.inPool || person.inPool === this.filters.inPool) &&
          (!query ||
            normalize(
              [person.name, person.id, person.tags, person.direction].join(" "),
            ).includes(query)),
      );
    },
    get selected() {
      return (
        this.fixtures.find((person) => person.id === this.selectedId) || null
      );
    },
    get creating() {
      return this.mode === "create";
    },
    get drawerOpen() {
      return this.creating || Boolean(this.selected);
    },
    get totalPages() {
      return Math.max(1, Math.ceil(this.results.length / this.pageSize));
    },
    get pagedResults() {
      const start = (this.page - 1) * this.pageSize;
      return this.results.slice(start, start + this.pageSize);
    },
    setFilter(key, value) {
      if (!(key in this.filters))
        throw new TypeError(`Unknown talent filter: ${key}`);
      this.filters[key] = value;
      this.page = 1;
      this.announcement = `查询完成，共 ${this.results.length} 位人才`;
    },
    open(id) {
      if (!this.fixtures.some((person) => person.id === id)) return;
      this.selectedId = id;
      this.mode = "detail";
      this.announcement = `已打开${this.selected.name}的人才详情`;
    },
    openCreate() {
      this.selectedId = null;
      this.mode = "create";
      this.draft = createTalentDraft();
      this.errors = {};
      this.announcement = "已打开新增人才填写区域";
    },
    setDraft(key, value) {
      if (!(key in this.draft))
        throw new TypeError(`Unknown talent field: ${key}`);
      this.draft[key] = value;
      delete this.errors[key];
    },
    validateDraft() {
      const required = [
        "name",
        "age",
        "type",
        "department",
        "domain",
        "office",
        "tags",
        "direction",
        "start",
        "end",
      ];
      const errors = {};
      for (const key of required)
        if (!String(this.draft[key] ?? "").trim()) errors[key] = "请填写此项";
      const age = Number(this.draft.age);
      if (this.draft.age && (!Number.isInteger(age) || age < 18 || age > 70))
        errors.age = "请输入 18—70 之间的整数";
      if (
        this.draft.start &&
        this.draft.end &&
        this.draft.end < this.draft.start
      )
        errors.end = "结束时间不能早于开始时间";
      this.errors = errors;
      return !Object.keys(errors).length;
    },
    saveNew() {
      if (!this.validateDraft()) {
        this.announcement = "新增人才信息未填写完整，请检查标注字段";
        return false;
      }
      const suffix = String(this.fixtures.length + 1).padStart(3, "0");
      const person = {
        ...this.draft,
        id: `person-local-${suffix}`,
        age: Number(this.draft.age),
      };
      this.fixtures.unshift(person);
      this.page = 1;
      this.mode = null;
      this.selectedId = null;
      this.draft = createTalentDraft();
      this.errors = {};
      this.announcement = `已在本地人才库新增${person.name}`;
      return person;
    },
    close() {
      this.selectedId = null;
      this.mode = null;
      this.errors = {};
      this.announcement = "人才填写区域已关闭";
    },
    setPage(value) {
      const next = Math.min(this.totalPages, Math.max(1, Number(value) || 1));
      this.page = next;
      if (
        this.selectedId &&
        !this.pagedResults.some((person) => person.id === this.selectedId)
      ) {
        this.selectedId = null;
        this.mode = null;
      }
      this.announcement = `已切换到第 ${this.page} 页`;
    },
    setPageSize(value) {
      this.pageSize = [10, 20, 50].includes(Number(value)) ? Number(value) : 10;
      this.page = 1;
      this.selectedId = null;
      this.mode = null;
      this.announcement = `已切换为每页 ${this.pageSize} 条`;
    },
    reset() {
      Object.assign(this.filters, {
        query: "",
        department: "",
        domain: "",
        office: "",
        inPool: "",
      });
      this.selectedId = null;
      this.mode = null;
      this.page = 1;
      this.announcement = `已重置筛选，共 ${this.results.length} 位人才`;
    },
  });
}

export function createSixStateController(
  initial = "normal",
  schedule = (callback, delay) => setTimeout(callback, delay),
) {
  return reactive({
    state: initial,
    announcement: "",
    retry() {
      if (this.state !== "error") return;
      this.state = "loading";
      this.announcement = "正在重新加载";
      schedule(() => {
        this.state = "normal";
        this.announcement = "内容加载完成";
      }, 800);
    },
  });
}
