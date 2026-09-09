export const FIXTURE_CLOCK = '2026-08-19T09:00:00+08:00';
export const FIXTURE_SEED = 817;

const BASE_STATES = ['normal', 'loading', 'error', 'disabled', 'permission-denied'];

const definePage = ({ empty = false, capture = 'canvas', ...page }) => ({
  ...page,
  empty,
  capture,
  fixture: `fx-${page.id}-ref`,
  states: empty ? [...BASE_STATES, 'empty'] : [...BASE_STATES]
});

export const PAGE_MATRIX = [
  definePage({ id: '01', reference: '01-首页工作台.png', route: '/workbench', role: '普通员工', title: '首页工作台', width: 1672, height: 941, sha256: 'B4AD50BCD55B3DCC0D3672A586D36664DAE5D886B1F5399E9396D121170B841B', empty: true }),
  definePage({ id: '02', reference: '02-消息中心.png', route: '/messages', role: '普通员工', title: '消息中心', width: 1672, height: 941, sha256: '8181F60BE17D8B4068A4B6432850FE5EB9489E954D379FD5B236A426F07B9F22', empty: true }),
  definePage({ id: '03', reference: '03-收藏.png', route: '/favorites', role: '普通员工', title: '我的收藏', width: 1671, height: 941, sha256: '9B259ED9F99029ECB68A1F2FB3EB8E745FF23692BC53CFFBD5D6A46008CEAE1A', empty: true }),
  definePage({ id: '04', reference: '04-个人中心.png', route: '/profile', role: '普通员工', title: '个人中心', width: 1920, height: 1080, sha256: 'F08DE51669B152D46224A0031945CFFF85969E40D7416D93849B6E1CDD35FA9A' }),
  definePage({ id: '05', reference: '05-公告通知.png', route: '/announcements', role: '普通员工', title: '公告通知', width: 1672, height: 941, sha256: '58A43229752CC4A5210A2846B88DB267A622543AA8F7F034CDA42BC2041F4F8C', empty: true }),
  definePage({ id: '06', reference: '06-公告通知-通知详情.png', route: '/announcements/notice-001', role: '普通员工', title: '通知详情', width: 1672, height: 941, sha256: 'A9827301EF6051E8B9B963B07F7073F6AB7AE4BFD21BAC97FDDA67A08FF3D78F' }),
  definePage({ id: '07', reference: '07-应用中心.png', route: '/apps', role: '普通员工', title: '应用中心', width: 1672, height: 941, sha256: 'E11BA453D013006EE96D19695AC3770A794DEF4DB32B71D993A4158F7BC23ADD', empty: true }),
  definePage({ id: '08', reference: '08-应用详情页-工具.png', route: '/apps/tool-001', role: '普通员工', title: '工具详情', width: 932, height: 1350, sha256: '35ACE981294AF359A243AFB1F53C29590BA124742F8EEF3BBE7152F4984F7A69', capture: 'fullPage' }),
  definePage({ id: '09', reference: '08-应用详情页-海能work应用.png', route: '/apps/haineng-work-001', role: '普通员工', title: '海能 Work 应用', width: 1548, height: 1016, sha256: '21D2FCC06638F323E7824176C53BB72DDE1050790E6B4E457D54CD2D7398431C' }),
  definePage({ id: '10', reference: '08-应用详情页-可视化报表.png', route: '/apps/report-001', role: '普通员工', title: '可视化报表', width: 845, height: 1862, sha256: 'A7A5B61527C5A2D7C83ACD2C769AA56FD038B252EDE4D1A46A91D1396F2113B1', capture: 'fullPage' }),
  definePage({ id: '11', reference: '08-应用详情页-可视化驾驶舱.png', route: '/apps/dashboard-001', role: '普通员工', title: '可视化驾驶舱', width: 869, height: 1810, sha256: '3D66270477C159EB9097CF74C904858A9158D9C9005A90C372B284AFB8980C43', capture: 'fullPage' }),
  definePage({ id: '12', reference: '08-应用详情页-数据集.png', route: '/apps/dataset-001', role: '普通员工', title: '数据集详情', width: 963, height: 1633, sha256: '7260427E1B5E85ECDFE37D52D6A88439178542503EC8E5E6FC5D679701633C97', capture: 'fullPage' }),
  definePage({ id: '13', reference: '08-应用详情页-指标.png', route: '/apps/metric-001', role: '普通员工', title: '指标详情', width: 1450, height: 1085, sha256: '48C41CBB2DF433C9680DD955A4777FA436BBFF6E094D56A3B5E6E0E48B01690B' }),
  definePage({ id: '14', reference: '08-应用详情页-AI.png', route: '/apps/ai-001', role: '普通员工', title: 'AI 应用详情', width: 1536, height: 1024, sha256: '2A55B1987EA239C0D5FB184B7CAECF9F39FFB5AB7C505FB669746356A2820EC7' }),
  definePage({ id: '15', reference: '08-应用详情页-EAD.png', route: '/apps/ead-001', role: '普通员工', title: 'EAD 应用详情', width: 1449, height: 1086, sha256: '8090BF0B8BFDCE7981D32F7C6B6335230D9F9508BF4549E716C10A2A4382D0CC' }),
  definePage({ id: '16', reference: '08-应用详情页-RPA.png', route: '/apps/rpa-001', role: '普通员工', title: 'RPA 应用详情', width: 1536, height: 1228, sha256: 'C66930E5C44E4ADAEB81872C7E64E8D41DC17A5BB46256314E404A9177C2923A', capture: 'fullPage' }),
  definePage({ id: '17', reference: '09-应用上架.png', route: '/apps/onboarding/status', role: '申请人', title: '应用上架', width: 1672, height: 941, sha256: 'FC7F33ED038DD52F20892D1C4A7F58FAFF57FB54658B06443A1A885B1EB86F68' }),
  definePage({ id: '18', reference: '10-积分中心.png', route: '/points', role: '普通员工', title: '积分中心', width: 1672, height: 941, sha256: 'A93E46949EBAF8861FFC6314A7AB2B05D6D7C99E60CC6B39FF8C925BF56A74E9', empty: true }),
  definePage({ id: '19', reference: '11-积分明细.png', route: '/points/details', role: '普通员工', title: '积分明细', width: 1672, height: 941, sha256: '82F80F3AB4A821165E6B14344C809B5E102CC7DD8013DD69B7F7F39BF9900F34', empty: true }),
  definePage({ id: '20', reference: '12-培训课堂.png', route: '/training', role: '普通员工', title: '培训课堂', width: 1672, height: 941, sha256: '68508151B1490F117074C44F464732A6986DAE68DDE5C23296DB0529C2C12E86', empty: true }),
  definePage({ id: '21', reference: '13-运营管理.png', route: '/operations', role: '运营人员', title: '运营管理', width: 1672, height: 941, sha256: '5F2DC6F56EF909A2EBADED1184353856CB105F2BA33B5BEFD7B8AF00AA342E11', empty: true }),
  definePage({ id: '22', reference: '14-运营管理-公告管理.png', route: '/operations/announcements', role: '运营人员', title: '公告管理', width: 1672, height: 941, sha256: '07B0623CB569C7829B490B85A65007D2773C4AE2ADB3ADE4B6089279F3D248FB', empty: true }),
  definePage({ id: '23', reference: '15-运营管理-公告发布与编辑.png', route: '/operations/announcements/notice-001/edit', role: '运营人员', title: '公告发布与编辑', width: 1672, height: 941, sha256: '5ADAECAADC46CCC242A570AEE5037A045FCECF39CBDA7D091283CE288DF9BE4F' }),
  definePage({ id: '24', reference: '16-运营管理-应用管理.png', route: '/operations/apps', role: '运营人员', title: '应用管理', width: 1672, height: 941, sha256: 'D3996593EAF90E612EA8874CDD41283565876ACDA3A9BD774343C0C469903795', empty: true }),
  definePage({ id: '25', reference: '17-运营管理-应用运营编辑.png', route: '/operations/apps/app-001/edit', role: '运营人员', title: '应用运营编辑', width: 1672, height: 941, sha256: 'A938145F4215B6AAC18DC370228DE182C9AAB531152746C6DA9EC27D82C3A864' }),
  definePage({ id: '26', reference: '18-后台管理.png', route: '/admin', role: '后台管理员', title: '后台管理', width: 1672, height: 941, sha256: '91D03978BB5A413EBF79A2CDC25E00EABBF79499F65B672A267BFAB19596FB39', empty: true }),
  definePage({ id: '27', reference: '19-数字化认证.png', route: '/certification', role: '普通员工', title: '数字化认证', width: 1672, height: 941, sha256: '3A6FE5F2761C9AF32A5759879FDBF1F27AEE4056EEE4006FD0297B6ECA5866D6' }),
  definePage({ id: '28', reference: '20-人才管理-人才库.png', route: '/talent/people', role: '人才管理', title: '人才库', width: 1672, height: 941, sha256: '3F38FEA2909904F070F5CFBF4FB110337856035CE5774519545689776FD4C558', empty: true, drawer: 'person-001' }),
  definePage({ id: '29', reference: '20-人才管理-人才项目管理.png', route: '/talent/projects', role: '人才管理', title: '人才项目管理', width: 1672, height: 941, sha256: '4EADBB9CAA596393D67C69CA4F446DBAD38856D2CFF2687E1530F9B8C9EC9E3D', empty: true, drawer: 'create' }),
  definePage({ id: '30', reference: '20-人才管理-项目进度管理.png', route: '/talent/progress', role: '人才管理', title: '项目进度管理', width: 1672, height: 941, sha256: '1C66525AC285F0825E52CEB928093EB0CA7A412C4B526B51E181A5A16BC732C3', empty: true })
];

// The source archive freezes a 30-page calibration matrix. Material Center is
// an additive route requested after that baseline, so it remains outside the
// legacy matrix while still receiving the same six-state page contract.
const MATERIALS_PAGE = definePage({
  id: '31',
  reference: '新增-素材中心.png',
  route: '/materials',
  role: '普通员工',
  title: '素材中心',
  width: 1672,
  height: 941,
  sha256: '43310F5E5705FE939EC5D99112A18304058E1FB3A9578841D18934A210BC44FB',
  empty: true
});

const ONBOARDING_APPLY_PAGE = definePage({
  id: '32',
  reference: '新增-应用上架申请.png',
  route: '/apps/onboarding/apply',
  role: '申请人',
  title: '应用上架申请',
  width: 1672,
  height: 941,
  sha256: 'LOCAL-ONBOARDING-APPLY-FX-817'
});

export function resolvePage(input, state = 'normal') {
  const pathname = new URL(input, 'http://127.0.0.1').pathname.replace(/\/$/, '') || '/';
  const additivePages = [MATERIALS_PAGE, ONBOARDING_APPLY_PAGE];
  const page = PAGE_MATRIX.find(candidate => candidate.route === pathname) || additivePages.find(candidate => candidate.route === pathname);
  if (!page) return undefined;
  const normalizedState=state==='empty'&&!page.empty?'normal':state;
  if (!page.states.includes(normalizedState)) return undefined;
  return { ...page, state:normalizedState };
}
