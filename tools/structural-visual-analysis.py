from pathlib import Path
import json

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REFERENCE_0817 = Path(r"C:\Users\20266\Desktop\海油\数智展厅\页面UI_0817")
REFERENCE_UPDATE = Path(r"C:\Users\20266\Desktop\海油\数智展厅\页面UI更新")

PAGES = {
    "01": (REFERENCE_UPDATE / "47025c81-207e-4bca-8a57-4f7e1b0c9a0d.png", []),
    "07": (REFERENCE_UPDATE / "dc8f8714-569f-4e80-9e47-aa21900d03f7.png", ["header"]),
    "10": (REFERENCE_UPDATE / "ef637f71-a1cb-4aee-b899-d73af0b9edd1.png", ["header", "sidebar"]),
    "26": (REFERENCE_0817 / "18-后台管理.png", ["header"]),
    "27": (REFERENCE_0817 / "19-数字化认证.png", ["header", "certification-copy"]),
}

# Full-width/full-height separators measured from the frozen and fresh images.
# The one-pixel border itself is reported as the content boundary.
GEOMETRY = {
    "01": {"reference_header": 69, "actual_header": 63, "reference_sidebar": 220, "actual_sidebar": 220},
    "07": {"reference_header": 59, "actual_header": 63, "reference_sidebar": 220, "actual_sidebar": 220},
    "10": {"reference_header": 58, "actual_header": 63, "reference_sidebar": 166, "actual_sidebar": 220},
    "26": {"reference_header": 75, "actual_header": 63, "reference_sidebar": 219, "actual_sidebar": 220},
    "27": {"reference_header": 90, "actual_header": 63, "reference_sidebar": 241, "actual_sidebar": 242},
}


def load(path):
    return np.asarray(Image.open(path).convert("RGB"), dtype=np.uint8)


def box_sum(channel, size=7):
    integral = np.pad(channel, ((1, 0), (1, 0)), mode="constant").cumsum(axis=0).cumsum(axis=1)
    return integral[size:, size:] - integral[:-size, size:] - integral[size:, :-size] + integral[:-size, :-size]


def raw_float_ssim(first, second, size=7):
    first = first.astype(np.float64)
    second = second.astype(np.float64)
    count = size * size
    covariance_norm = count / (count - 1)
    channel_scores = []
    for channel in range(first.shape[2]):
        x = first[:, :, channel]
        y = second[:, :, channel]
        ux = box_sum(x, size) / count
        uy = box_sum(y, size) / count
        vx = covariance_norm * (box_sum(x * x, size) / count - ux * ux)
        vy = covariance_norm * (box_sum(y * y, size) / count - uy * uy)
        vxy = covariance_norm * (box_sum(x * y, size) / count - ux * uy)
        c1 = (0.01 * 255) ** 2
        c2 = (0.03 * 255) ** 2
        score = ((2 * ux * uy + c1) * (2 * vxy + c2)) / ((ux * ux + uy * uy + c1) * (vx + vy + c2))
        channel_scores.append(float(score.mean()))
    return float(np.mean(channel_scores))


def strongest_horizontal_edge(image):
    values = np.abs(image[1:111].astype(np.int16) - image[:110].astype(np.int16)).mean(axis=(1, 2))
    return int(np.argmax(values) + 1), float(values.max())


def strongest_sidebar_edge(image, header_bottom):
    body = image[min(header_bottom + 8, image.shape[0] - 2):min(image.shape[0], 920), 120:301]
    values = np.abs(body[:, 1:].astype(np.int16) - body[:, :-1].astype(np.int16)).mean(axis=(0, 2))
    return int(np.argmax(values) + 121), float(values.max())


def first_main_ink(image, header_bottom, sidebar_edge):
    gray = image.astype(np.float32).mean(axis=2)
    for y in range(header_bottom + 1, min(image.shape[0], header_bottom + 150)):
        row = gray[y, min(sidebar_edge + 1, image.shape[1] - 1):]
        if row.size and float(np.mean(row < 155)) >= 0.004:
            return y
    return None


def conflict_rectangles(page_id, actual, reference, labels, geometry):
    rectangles = []
    ref_header = geometry["reference_header"]
    act_header = geometry["actual_header"]
    if "header" in labels:
        rectangles.append((0, 0, actual.shape[1], max(ref_header, act_header)))
    if "sidebar" in labels:
        ref_sidebar = geometry["reference_sidebar"]
        act_sidebar = geometry["actual_sidebar"]
        rectangles.append((0, min(ref_header, act_header), max(ref_sidebar, act_sidebar), actual.shape[0]))
    if page_id in {"01", "26"}:
        rectangles.append((min(220, actual.shape[1]), min(act_header, 69), actual.shape[1], min(actual.shape[0], 156)))
    if "certification-copy" in labels:
        rectangles.append((min(242, actual.shape[1]), min(102, actual.shape[0]), min(958, actual.shape[1]), min(414, actual.shape[0])))
    return rectangles


def conflict_ceiling(actual, reference, rectangles):
    synthetic = reference.copy()
    for x1, y1, x2, y2 in rectangles:
        synthetic[y1:y2, x1:x2] = actual[y1:y2, x1:x2]
    return raw_float_ssim(reference, synthetic)


rows = []
for page_id, (reference_path, conflict_labels) in PAGES.items():
    actual_path = ROOT / "evidence" / "phase-1-visual" / f"{page_id}.png"
    reference = load(reference_path)
    actual = load(actual_path)
    geometry = GEOMETRY[page_id]
    if actual.shape != reference.shape:
        rows.append({"id": page_id, "failure": "dimension-mismatch", "reference": list(reference.shape[:2][::-1]), "actual": list(actual.shape[:2][::-1])})
        continue
    detected_ref_header, ref_header_strength = strongest_horizontal_edge(reference)
    detected_act_header, act_header_strength = strongest_horizontal_edge(actual)
    detected_ref_sidebar, ref_sidebar_strength = strongest_sidebar_edge(reference, geometry["reference_header"])
    detected_act_sidebar, act_sidebar_strength = strongest_sidebar_edge(actual, geometry["actual_header"])
    ref_header = geometry["reference_header"]
    act_header = geometry["actual_header"]
    ref_sidebar = geometry["reference_sidebar"]
    act_sidebar = geometry["actual_sidebar"]
    rectangles = conflict_rectangles(page_id, actual, reference, conflict_labels, geometry)
    rows.append({
        "id": page_id,
        "reference": str(reference_path),
        "actual": str(actual_path),
        "reference_header_edge": ref_header,
        "actual_header_edge": act_header,
        "reference_header_rgb": reference[10, 10].tolist(),
        "actual_header_rgb": actual[10, 10].tolist(),
        "reference_sidebar_edge": ref_sidebar,
        "actual_sidebar_edge": act_sidebar,
        "reference_first_main_ink": first_main_ink(reference, ref_header, ref_sidebar),
        "actual_first_main_ink": first_main_ink(actual, act_header, act_sidebar),
        "edge_strength": {
            "reference_header": ref_header_strength,
            "actual_header": act_header_strength,
            "reference_sidebar": ref_sidebar_strength,
            "actual_sidebar": act_sidebar_strength,
        },
        "automatic_edge_candidates": {
            "reference_header": detected_ref_header,
            "actual_header": detected_act_header,
            "reference_sidebar": detected_ref_sidebar,
            "actual_sidebar": detected_act_sidebar,
        },
        "policy_conflicts": conflict_labels + (["authentication-banner"] if page_id in {"01", "26"} else []),
        "conflict_rectangles": rectangles,
        "raw_ssim_ceiling_if_all_non_conflict_pixels_match": conflict_ceiling(actual, reference, rectangles),
    })

print(json.dumps(rows, ensure_ascii=False, indent=2))
