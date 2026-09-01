import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

try:
    from skimage.metrics import structural_similarity
    SSIM_ENGINE = "scikit-image"
except ModuleNotFoundError:
    SSIM_ENGINE = "numpy-compatible"

    def _uniform_filter(image, size):
        pad = size // 2
        padded = np.pad(image, ((pad, pad), (pad, pad), (0, 0)), mode="symmetric")
        integral = np.pad(padded, ((1, 0), (1, 0), (0, 0)), mode="constant")
        integral = integral.cumsum(axis=0).cumsum(axis=1)
        total = (
            integral[size:, size:]
            - integral[:-size, size:]
            - integral[size:, :-size]
            + integral[:-size, :-size]
        )
        return total / float(size * size)

    def structural_similarity(
        reference,
        actual,
        *,
        win_size,
        data_range,
        channel_axis,
        use_sample_covariance,
        **_,
    ):
        if channel_axis != 2:
            raise ValueError("The local SSIM fallback supports RGB channel_axis=2 only")
        x = reference.astype(np.float64)
        y = actual.astype(np.float64)
        ux = _uniform_filter(x, win_size)
        uy = _uniform_filter(y, win_size)
        uxx = _uniform_filter(x * x, win_size)
        uyy = _uniform_filter(y * y, win_size)
        uxy = _uniform_filter(x * y, win_size)
        covariance_normalization = (win_size * win_size) / (win_size * win_size - 1) if use_sample_covariance else 1.0
        vx = covariance_normalization * (uxx - ux * ux)
        vy = covariance_normalization * (uyy - uy * uy)
        vxy = covariance_normalization * (uxy - ux * uy)
        c1 = (0.01 * data_range) ** 2
        c2 = (0.03 * data_range) ** 2
        score_map = ((2 * ux * uy + c1) * (2 * vxy + c2)) / ((ux * ux + uy * uy + c1) * (vx + vy + c2))
        border = (win_size - 1) // 2
        cropped = score_map[border:-border, border:-border]
        return float(np.mean(np.mean(cropped, axis=(0, 1)), dtype=np.float64))

ROOT = Path(__file__).resolve().parents[1]
REFERENCE_ROOT = Path(r"C:\Users\20266\Desktop\海油\数智展厅\页面UI更新")
SCREENSHOT_ROOT = ROOT / "evidence" / "visual-update-0831" / "screenshots"
MATRIX = [
    ("workbench", "47025c81-207e-4bca-8a57-4f7e1b0c9a0d.png", 1672, 941),
    ("apps", "dc8f8714-569f-4e80-9e47-aa21900d03f7.png", 1672, 941),
    ("report", "ef637f71-a1cb-4aee-b899-d73af0b9edd1.png", 1054, 1492),
]


def rgb(path: Path):
    with Image.open(path) as image:
        rgba = np.asarray(image.convert("RGBA"), dtype=np.uint16)
    alpha = rgba[:, :, 3:4]
    colors = rgba[:, :, :3]
    return ((alpha * colors + (255 - alpha) * 255 + 127) // 255).astype(np.uint8)


def digest(array):
    return hashlib.sha256(array.tobytes()).hexdigest().upper()


results = []
for page_id, reference_name, width, height in MATRIX:
    reference_path = REFERENCE_ROOT / reference_name
    actual_path = SCREENSHOT_ROOT / f"{page_id}.png"
    reference = rgb(reference_path)
    actual = rgb(actual_path)
    item = {
        "id": page_id,
        "reference": str(reference_path),
        "actual": str(actual_path),
        "expected": [width, height],
        "referenceSize": [reference.shape[1], reference.shape[0]],
        "actualSize": [actual.shape[1], actual.shape[0]],
        "referenceRgbSha256": digest(reference),
        "actualRgbSha256": digest(actual),
        "engine": SSIM_ENGINE,
    }
    if reference.shape != actual.shape:
        item.update({"ssim": None, "passed": False, "reason": "dimension-mismatch"})
    else:
        score = structural_similarity(
            reference,
            actual,
            win_size=7,
            gradient=False,
            data_range=255,
            channel_axis=2,
            gaussian_weights=False,
            full=False,
            use_sample_covariance=True,
            K1=0.01,
            K2=0.03,
        )
        item.update({"ssim": float(score), "passed": bool(score >= 0.95)})
    results.append(item)

output = ROOT / "evidence" / "visual-update-0831" / "ssim-results.json"
output.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(results, ensure_ascii=False, indent=2))
