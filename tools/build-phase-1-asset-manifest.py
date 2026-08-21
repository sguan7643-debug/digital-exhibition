import hashlib
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image
from skimage.feature import match_template

ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / 'public' / 'assets'
REFERENCE_ROOT = Path(r'C:\Users\20266\Desktop\海油\数智展厅\页面UI_0817')
CALIBRATION = json.loads((ROOT / 'src' / 'fixtures' / 'visual-calibration-results.json').read_text(encoding='utf-8'))
PAGE_BY_ID = {row['id']: row for row in CALIBRATION['rows']}

COMPONENT_PAGES = {
    'WorkbenchPage.vue': ['01'], 'MessagesPage.vue': ['02'], 'FavoritesPage.vue': ['03'],
    'ProfilePage.vue': ['04'], 'AnnouncementsPage.vue': ['05'], 'NoticeDetailPage.vue': ['06'],
    'AppsPage.vue': ['07'], 'ToolDetailPage.vue': ['08'], 'HainengWorkDetailPage.vue': ['09'],
    'ReportDetailPage.vue': ['10'], 'DashboardDetailPage.vue': ['11'], 'DatasetDetailPage.vue': ['12'],
    'MetricDetailPage.vue': ['13'], 'AiDetailPage.vue': ['14'], 'EadDetailPage.vue': ['15'],
    'RpaDetailPage.vue': ['16'], 'OnboardingPage.vue': ['17'], 'PointsPage.vue': ['18'],
    'PointsDetailsPage.vue': ['19'], 'TrainingPage.vue': ['20'], 'OperationsPage.vue': ['21'],
    'AnnouncementAdminPage.vue': ['22'], 'AnnouncementEditorPage.vue': ['23'], 'AppAdminPage.vue': ['24'],
    'AppEditorPage.vue': ['25'], 'AdminPage.vue': ['26'], 'CertificationPage.vue': ['27'],
    'TalentPeoplePage.vue': ['28'], 'TalentProjectsPage.vue': ['29'], 'TalentProgressPage.vue': ['30'],
}
CATALOGUE_PAGES = ['01', *[f'{value:02d}' for value in range(7, 18)]]
COMPOSITE_REVIEW = {'ai-training.png', 'dataset-training.png', 'rpa-video.png', 'work-video.png'}


def load_rgb(path: Path) -> np.ndarray:
    image = Image.open(path)
    if image.mode in ('RGBA', 'LA') or 'transparency' in image.info:
        rgba = np.asarray(image.convert('RGBA'), dtype=np.uint16)
        alpha = rgba[:, :, 3:4]
        return ((rgba[:, :, :3] * alpha + 255 * (255 - alpha) + 127) // 255).astype(np.uint8)
    return np.asarray(image.convert('RGB'), dtype=np.uint8)


reference_cache = {}


def reference_rgb(page_id: str):
    if page_id not in reference_cache:
        path = Path(PAGE_BY_ID[page_id]['reference'])
        reference_cache[page_id] = (path, load_rgb(path))
    return reference_cache[page_id]


def locate(asset: np.ndarray, page_id: str):
    path, reference = reference_rgb(page_id)
    height, width = asset.shape[:2]
    ref_height, ref_width = reference.shape[:2]
    if height > ref_height or width > ref_width:
        return None
    out_height, out_width = ref_height - height + 1, ref_width - width + 1
    points = [(0, 0), (height - 1, width - 1), (height // 2, width // 2), (height // 3, width // 3), (height * 2 // 3, width * 2 // 3)]
    mask = np.ones((out_height, out_width), dtype=bool)
    for y, x in points:
        mask &= np.all(reference[y:y + out_height, x:x + out_width] == asset[y, x], axis=2)
        if not mask.any():
            return None
    for y, x in zip(*np.where(mask)):
        if np.array_equal(reference[y:y + height, x:x + width], asset):
            return {'reference': path.name, 'referenceSha256': PAGE_BY_ID[page_id]['referenceFileSha256'], 'rect': [int(x), int(y), int(width), int(height)]}
    return None


def locate_candidate(asset: np.ndarray, page_id: str):
    path, reference = reference_rgb(page_id)
    height, width = asset.shape[:2]
    if height > reference.shape[0] or width > reference.shape[1]:
        return None
    reference_gray = reference.astype(np.float32).mean(axis=2)
    asset_gray = asset.astype(np.float32).mean(axis=2)
    score_map = match_template(reference_gray, asset_gray, pad_input=False)
    y, x = np.unravel_index(np.argmax(score_map), score_map.shape)
    return {
        'reference': path.name, 'referenceSha256': PAGE_BY_ID[page_id]['referenceFileSha256'],
        'rect': [int(x), int(y), int(width), int(height)], 'method': 'normalized-template-match-candidate',
        'matchScore': float(score_map[y, x]),
    }


uses_by_asset = {}
for filename, page_ids in COMPONENT_PAGES.items():
    source = (ROOT / 'src' / 'pages' / filename).read_text(encoding='utf-8')
    for asset_name in re.findall(r"[A-Za-z0-9_-]+\.png", source):
        if (ASSET_ROOT / asset_name).exists():
            uses_by_asset.setdefault(asset_name, set()).update(page_ids)

shell_source = (ROOT / 'src' / 'components' / 'ExhibitionShell.vue').read_text(encoding='utf-8')
for asset_name in re.findall(r"[A-Za-z0-9_-]+\.png", shell_source):
    if not (ASSET_ROOT / asset_name).exists():
        continue
    page_ids = CATALOGUE_PAGES if asset_name.startswith(('category-', 'catalogue-')) else list(PAGE_BY_ID)
    uses_by_asset.setdefault(asset_name, set()).update(page_ids)

assets = []
uses = []
for index, asset_name in enumerate(sorted(uses_by_asset), 1):
    path = ASSET_ROOT / asset_name
    rgb = load_rgb(path)
    preferred_pages = list(sorted(uses_by_asset[asset_name]))
    search_pages = preferred_pages + [page_id for page_id in PAGE_BY_ID if page_id not in preferred_pages]
    source = next((match for page_id in search_pages if (match := locate(rgb, page_id))), None)
    if source is None:
        candidates = [locate_candidate(rgb, page_id) for page_id in preferred_pages]
        candidates = [candidate for candidate in candidates if candidate is not None]
        source = max(candidates, key=lambda candidate: candidate['matchScore']) if candidates else None
    disposition = 'pending-composite-review' if asset_name in COMPOSITE_REVIEW else (
        'pending-source-validation' if source and source.get('method') == 'normalized-template-match-candidate'
        else ('approved-source-atomic-crop' if source else 'pending-source-match')
    )
    asset_id = f'AS-{index:03d}'
    assets.append({
        'id': asset_id, 'file': f'public/assets/{asset_name}', 'width': int(rgb.shape[1]), 'height': int(rgb.shape[0]),
        'fileSha256': hashlib.sha256(path.read_bytes()).hexdigest().upper(),
        'rgbSha256': hashlib.sha256(rgb.tobytes()).hexdigest().upper(),
        'source': source, 'disposition': disposition, 'userConfirmation': 'pending',
    })
    for page_id in sorted(uses_by_asset[asset_name]):
        uses.append({'id': f'AU-{len(uses) + 1:04d}', 'pageId': f'MP-{page_id}', 'assetId': asset_id, 'visibleUse': 'runtime-reference'})

mapped = sum(asset['source'] is not None for asset in assets)
exact_mapped = sum(asset['source'] is not None and asset['source'].get('method') is None for asset in assets)
manifest = {
    'schema': 'xlt-mp-as-au-v1', 'result': 'failed', 'globalVisibleUnmapped': 'unknown_nonzero',
    'technicalMapping': {'referencedAssetCount': len(assets), 'sourceCoordinateMapped': mapped, 'exactSourceCoordinateMapped': exact_mapped, 'candidateSourceCoordinateMapped': mapped - exact_mapped, 'coverage': mapped / len(assets) if assets else 0},
    'pages': [
        {'id': f"MP-{row['id']}", 'route': row['route'], 'reference': row['reference'], 'referenceFileSha256': row['referenceFileSha256'], 'userConfirmation': 'pending'}
        for row in CALIBRATION['rows']
    ],
    'assets': assets, 'uses': uses,
    'risks': ['用户逐页有限清单与叠加预览确认尚未执行', 'pending-composite-review 项尚未完成 HTML 化判定', 'globalVisibleUnmapped 依 PRD 保持 unknown_nonzero'],
}
(ROOT / 'src' / 'fixtures' / 'asset-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(manifest['technicalMapping'], ensure_ascii=False))
print(f"assets={len(assets)} uses={len(uses)} compositePending={sum(asset['disposition'] == 'pending-composite-review' for asset in assets)}")
