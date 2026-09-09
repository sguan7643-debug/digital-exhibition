import hashlib
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity

ROOT = Path(__file__).resolve().parents[1]
REFERENCE_ROOT = Path(r'C:\Users\20266\Desktop\海油\数智展厅\页面UI_0817')
EVIDENCE_ROOT = ROOT / 'evidence' / 'phase-1-visual'


def load_rgb(path: Path) -> np.ndarray:
    image = Image.open(path)
    if image.mode in ('RGBA', 'LA') or 'transparency' in image.info:
        rgba = np.asarray(image.convert('RGBA'), dtype=np.uint16)
        alpha = rgba[:, :, 3:4]
        return ((rgba[:, :, :3] * alpha + 255 * (255 - alpha) + 127) // 255).astype(np.uint8)
    return np.asarray(image.convert('RGB'), dtype=np.uint8)


source = (ROOT / 'src' / 'fixtures' / 'pages.js').read_text(encoding='utf-8')
pattern = re.compile(
    r"id: '(?P<id>\d{2})'.*?reference: '(?P<reference>[^']+)'.*?route: '(?P<route>[^']+)'.*?"
    r"width: (?P<width>\d+), height: (?P<height>\d+), sha256: '(?P<sha>[A-F0-9]{64})'"
)
pages = [match.groupdict() for match in pattern.finditer(source)]
capture_results = json.loads((EVIDENCE_ROOT / 'edge-capture-results.json').read_text(encoding='utf-8'))
captures = {row['id']: row for row in capture_results}
results = []

for page in pages:
    capture = captures[page['id']]
    reference_path = REFERENCE_ROOT / page['reference']
    actual_path = EVIDENCE_ROOT / f"{page['id']}.png"
    reference_rgb = load_rgb(reference_path)
    actual_rgb = load_rgb(actual_path)
    reference_size = [int(reference_rgb.shape[1]), int(reference_rgb.shape[0])]
    actual_size = [int(actual_rgb.shape[1]), int(actual_rgb.shape[0])]
    row = {
        'id': page['id'],
        'route': page['route'],
        'reference': str(reference_path),
        'actual': str(actual_path),
        'reference_file_sha256': page['sha'],
        'reference_size': reference_size,
        'actual_size': actual_size,
        'reference_rgb_sha256': hashlib.sha256(reference_rgb.tobytes()).hexdigest().upper(),
        'actual_file_sha256': hashlib.sha256(actual_path.read_bytes()).hexdigest().upper(),
        'actual_rgb_sha256': hashlib.sha256(actual_rgb.tobytes()).hexdigest().upper(),
    }
    if reference_size != actual_size:
        row.update({'ssim': None, 'passed': False, 'failure': 'dimension-mismatch'})
    else:
        score = float(structural_similarity(
            reference_rgb,
            actual_rgb,
            win_size=7,
            gradient=False,
            data_range=255,
            channel_axis=2,
            gaussian_weights=False,
            full=False,
            use_sample_covariance=True,
            K1=0.01,
            K2=0.03,
        ))
        row.update({'ssim': score, 'passed': score >= 0.95, 'failure': None if score >= 0.95 else 'below-threshold'})
    results.append(row)

report = {
    'browser': {'name': 'Microsoft Edge', 'version': '151.0.4129.93', 'deviceScaleFactor': 1, 'headless': True},
    'protocol': {
        'resize': False, 'crop': False, 'pad': False, 'mask': False, 'blur': False, 'ignoreRegion': False,
        'win_size': 7, 'gradient': False, 'data_range': 255, 'channel_axis': 2,
        'gaussian_weights': False, 'full': False, 'use_sample_covariance': True, 'K1': 0.01, 'K2': 0.03,
    },
    'runtime': {'numpy': np.__version__, 'Pillow': Image.__version__},
    'results': results,
    'passed': all(row['passed'] for row in results),
}
(EVIDENCE_ROOT / 'ssim-results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
calibration = {
    'schema': 'xlt-phase-1-visual-calibration-v1',
    'result': 'failed',
    'threshold': 0.95,
    'browser': report['browser'],
    'protocol': report['protocol'],
    'rows': [
        {
            'id': row['id'], 'route': row['route'], 'reference': row['reference'],
            'referenceFileSha256': row['reference_file_sha256'], 'referenceRgbSha256': row['reference_rgb_sha256'],
            'referenceSize': row['reference_size'], 'implementationScreenshot': row['actual'],
            'screenshotFileSha256': row['actual_file_sha256'], 'screenshotRgbSha256': row['actual_rgb_sha256'],
            'actualSize': row['actual_size'], 'rawFloatSsim': row['ssim'],
            'status': 'passed' if row['passed'] else 'failed', 'failure': row['failure'],
        }
        for row in results
    ],
}
(ROOT / 'src' / 'fixtures' / 'visual-calibration-results.json').write_text(
    json.dumps(calibration, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
)
for row in results:
    print(f"{row['id']} {row['route']} size={row['actual_size']} ssim={row['ssim']} {row['failure'] or 'PASS'}")
