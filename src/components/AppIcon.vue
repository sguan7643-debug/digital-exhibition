<script setup>
import { computed } from 'vue';
import {
  Activity, Award, BadgeCheck, BarChart3, Bell, BookOpen, BookOpenCheck,
  Bot, Boxes, BrainCircuit, BriefcaseBusiness, CalendarDays, ChartColumnBig,
  ChartNoAxesCombined, ChartPie, CircleCheckBig, CircleUserRound, Clock3,
  Coins, Database, Download, Eye, FileSpreadsheet, FileText, FolderKanban,
  Gauge, Gift, GraduationCap, Heart, History, House, LayoutGrid, Layers3,
  List, Medal, Megaphone, MessageSquare, Monitor, MousePointerClick, PlayCircle,
  Search, Settings, ShieldCheck, Sparkles, Star, Target, TrendingUp, Trophy,
  UserRound, Users, UsersRound, Workflow, Wrench, Zap
} from '@lucide/vue';

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 24 },
  strokeWidth: { type: [Number, String], default: 1.8 },
  label: { type: String, default: '' }
});

const iconMap = {
  'nav-workbench': House, 'nav-materials': Boxes, 'nav-talent': UsersRound,
  'nav-apps': LayoutGrid, 'nav-training': BookOpenCheck, 'nav-points': Trophy,
  'nav-certification': BadgeCheck, 'nav-operations': ChartNoAxesCombined,
  'nav-announcements': Megaphone, 'nav-admin': ShieldCheck,
  'catalogue-materials': Boxes, 'catalogue-apps': LayoutGrid,
  'category-rpa': Bot, 'category-screen': Monitor, 'category-cockpit': Gauge,
  'category-report': ChartColumnBig, 'category-metric': Activity,
  'category-dataset': Database, 'category-ai': BrainCircuit,
  'category-work': BriefcaseBusiness,
  'app-rpa': Bot, 'rpa-logo': Bot, 'app-screen': Monitor,
  'dashboard-logo': Gauge, 'app-cockpit': Gauge, 'report-logo': ChartColumnBig,
  'app-report': ChartColumnBig, 'metric-logo': Activity, 'app-metric': Activity,
  'dataset-logo': Database, 'app-dataset': Database, 'ai-logo': BrainCircuit,
  'app-ai': BrainCircuit, 'work-logo': BriefcaseBusiness, 'app-work': BriefcaseBusiness,
  'ead-logo': Workflow, 'tool-logo': Wrench,
  'favorite-heart': Heart, 'favorite-title': Star, 'favorite-stat-total': Boxes,
  'favorite-stat-app': LayoutGrid, 'favorite-stat-material': Layers3,
  'favorite-card-app': LayoutGrid, 'favorite-card-material': FolderKanban,
  'msg-row-system': Bell, 'msg-row-comment': MessageSquare,
  'msg-row-application': CircleCheckBig, 'msg-row-training': GraduationCap,
  'msg-stat-total': MessageSquare, 'msg-stat-unread': Bell,
  'msg-stat-application': CircleCheckBig, 'msg-stat-training': GraduationCap,
  'notice-stat-unread': Bell, 'notice-stat-new': Megaphone,
  'overview-report': BarChart3, 'overview-dataset': Database, 'overview-rpa': Bot,
  'overview-ead': Workflow, 'overview-ai': BrainCircuit, 'overview-other': Boxes,
  'overview-user': Users, 'overview-visit': Eye,
  'overview-download': Download, 'usage-visits': MousePointerClick,
  'usage-users': Users, 'usage-apps': LayoutGrid, 'usage-duration': Clock3,
  'points-current': Coins, 'points-month': CalendarDays, 'points-use': Zap,
  'points-total': Trophy,
  'profile-stat-points': Coins, 'profile-stat-favorite': Star,
  'profile-stat-visits': Eye, 'profile-stat-use': MousePointerClick,
  'profile-quick-1': UserRound, 'profile-quick-2': Star,
  'profile-quick-3': History, 'profile-quick-4': Settings,
  'training-stat-total': BookOpen, 'training-stat-registered': GraduationCap,
  'training-stat-soon': Clock3, 'cert-tool': Wrench, 'cert-booking': CalendarDays,
  'hot-ai': BrainCircuit, 'hot-rpa': Bot, 'hot-dashboard': Gauge,
  'hot-report': ChartColumnBig, 'hot-dataset': Database, 'hot-metric': Activity,
  'award': Award, 'medal': Medal, 'gift': Gift, 'target': Target,
  'trend': TrendingUp, 'search': Search, 'list': List, 'grid': LayoutGrid,
  'favorite-stat-new': Star, 'favorite-stat-recent': History,
  'msg-stat-all': MessageSquare, 'msg-stat-read': CircleCheckBig,
  'msg-stat-new': Bell, 'msg-row-1': Bell, 'msg-row-2': MessageSquare,
  'msg-row-3': CircleCheckBig, 'msg-row-4': GraduationCap,
  'msg-row-5': Download, 'msg-row-6': UserRound,
  'training-course-01': BarChart3, 'training-course-02': Users,
  'training-course-03': BrainCircuit, 'training-course-04': TrendingUp,
  'training-course-05': BriefcaseBusiness, 'training-course-06': Bot,
  'training-ai': BrainCircuit, 'training-procurement': BriefcaseBusiness,
  'training-community': Users, 'hot-supplier': BarChart3,
  'hot-inventory': ChartColumnBig, 'hot-invoice': FileSpreadsheet,
  'favorite-card-1': ChartColumnBig, 'favorite-card-2': Database,
  'favorite-card-3': Bot, 'favorite-card-4': BrainCircuit,
  'favorite-card-5': Gauge, 'favorite-card-6': Activity,
  'favorite-card-7': Workflow, 'favorite-card-8': BriefcaseBusiness,
  'play': PlayCircle, 'file': FileText, 'spreadsheet': FileSpreadsheet,
  'user': CircleUserRound, 'star': Star, 'bell': Bell
};

const normalizedName = computed(() => String(props.name)
  .replace(/^.*\//, '')
  .replace(/\.(?:png|jpe?g|webp|svg)$/i, '')
  .toLowerCase());
function resolveByPattern(name) {
  if (/rpa|robot/.test(name)) return Bot;
  if (/dataset|data/.test(name)) return Database;
  if (/metric|activity/.test(name)) return Activity;
  if (/report|chart/.test(name)) return ChartColumnBig;
  if (/screen|dashboard|cockpit/.test(name)) return Gauge;
  if (/ai|brain/.test(name)) return BrainCircuit;
  if (/work|office/.test(name)) return BriefcaseBusiness;
  if (/favorite|heart/.test(name)) return Heart;
  if (/message|msg/.test(name)) return MessageSquare;
  if (/point|coin/.test(name)) return Coins;
  if (/training|course|book/.test(name)) return BookOpen;
  if (/user|talent/.test(name)) return UsersRound;
  return Sparkles;
}
const resolvedIcon = computed(() => iconMap[normalizedName.value] ?? resolveByPattern(normalizedName.value));
const tone = computed(() => {
  const name = normalizedName.value;
  if (/(?:rpa|report|month|notice|bell)/.test(name)) return 'orange';
  if (/(?:ai|favorite|star|cert|award|medal)/.test(name)) return 'purple';
  if (/(?:dataset|work|training|user)/.test(name)) return 'green';
  if (/(?:metric|usage|trend|visit)/.test(name)) return 'cyan';
  return 'blue';
});
</script>

<template>
  <i
    class="app-icon"
    :class="`app-icon--${tone}`"
    :style="{ '--app-icon-size': `${Number(size)}px` }"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
  >
    <component :is="resolvedIcon" :size="Number(size)" :stroke-width="Number(strokeWidth)" />
  </i>
</template>

<style scoped>
.app-icon{--icon-color:#176bf0;--icon-bg:#eaf2ff;width:var(--app-icon-size);height:var(--app-icon-size);display:inline-grid;place-items:center;flex:0 0 auto;color:var(--icon-color);background:var(--icon-bg);border-radius:24%;overflow:visible;box-sizing:border-box;font-style:normal}
.app-icon :deep(svg){width:68%;height:68%;display:block;overflow:visible;stroke:currentColor}
.app-icon--purple{--icon-color:#6c4fe8;--icon-bg:#f0edff}.app-icon--green{--icon-color:#18a76b;--icon-bg:#e8f8f0}.app-icon--cyan{--icon-color:#168fbd;--icon-bg:#e8f7fb}.app-icon--orange{--icon-color:#e87813;--icon-bg:#fff1e4}
</style>
