"""Assemble lossless full-page PNGs from browser-captured scroll segments.

The browser captures the real fixed shell at a stable 1672px CSS width and
3x raster scale.  This script keeps the top bar and sidebar once, then joins
only the newly revealed portion of #main-content for each scroll position.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def px(value: float, scale: int) -> int:
    return int(round(value * scale))


def assemble_page(page: dict, scale: int, viewport: dict) -> tuple[int, int]:
    output = Path(page["output"])
    output.parent.mkdir(parents=True, exist_ok=True)

    main = page["main"]
    left = px(main["left"], scale)
    top = px(main["top"], scale)
    client = float(main["client"])
    scroll = float(main["scroll"])
    width = px(viewport["width"], scale)
    max_scroll = max(float(item["actualScrollTop"]) for item in page["segments"])

    segments = sorted(page["segments"], key=lambda item: float(item["actualScrollTop"]))
    first = Image.open(segments[0]["path"]).convert("RGB")
    # Chromium's half-scale in-app surface can report clientHeight one CSS px
    # taller than the painted viewport.  Use the actual lossless PNG boundary
    # so crops never extend past the bitmap and introduce a dark seam.
    painted_client = (first.height - top) / scale
    assembled_scroll = min(scroll, max_scroll + painted_client)
    height = px(main["top"] + assembled_scroll, scale)
    canvas = Image.new("RGB", (width, height), (245, 247, 250))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, top, left - 1, height), fill=(255, 255, 255))
    draw.line((left - 1, top, left - 1, height), fill=(217, 226, 236), width=max(1, scale))

    first_bottom = first.height
    canvas.paste(first.crop((0, 0, width, top)), (0, 0))
    canvas.paste(first.crop((0, top, left, first_bottom)), (0, top))
    canvas.paste(first.crop((left, top, width, first_bottom)), (left, top))

    covered = painted_client
    for segment in segments[1:]:
        start = float(segment["actualScrollTop"])
        end = min(assembled_scroll, start + painted_client)
        append_from = max(covered, start)
        if end <= append_from + 0.01:
            continue
        image = Image.open(segment["path"]).convert("RGB")
        source_top = px(main["top"] + append_from - start, scale)
        source_bottom = min(image.height, px(main["top"] + end - start, scale))
        dest_top = px(main["top"] + append_from, scale)
        canvas.paste(image.crop((left, source_top, width, source_bottom)), (left, dest_top))
        covered = end

    if covered + 0.5 < assembled_scroll:
        raise RuntimeError(f"{page['name']} only assembled {covered}px of {assembled_scroll}px")
    if not page.get("footerVisibleAtEnd"):
        raise RuntimeError(f"{page['name']} does not finish at the copyright footer")

    canvas.save(output, "PNG", optimize=False, compress_level=6)
    return canvas.size


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def contact_sheet(pages: list[dict], output_path: Path) -> tuple[int, int]:
    columns = 3
    tile_width = 920
    preview_height = 520
    label_height = 54
    gap = 22
    margin = 34
    rows = (len(pages) + columns - 1) // columns
    sheet_width = margin * 2 + columns * tile_width + (columns - 1) * gap
    sheet_height = margin * 2 + rows * (preview_height + label_height) + (rows - 1) * gap
    sheet = Image.new("RGB", (sheet_width, sheet_height), (238, 243, 248))
    draw = ImageDraw.Draw(sheet)
    font = load_font(24)

    for index, page in enumerate(pages):
        row, col = divmod(index, columns)
        x = margin + col * (tile_width + gap)
        y = margin + row * (preview_height + label_height + gap)
        source = Image.open(page["output"]).convert("RGB")
        source.thumbnail((tile_width, preview_height), Image.Resampling.LANCZOS)
        card = Image.new("RGB", (tile_width, preview_height), (255, 255, 255))
        card.paste(source, ((tile_width - source.width) // 2, 0))
        sheet.paste(card, (x, y))
        draw.rectangle((x, y, x + tile_width - 1, y + preview_height - 1), outline=(207, 220, 233), width=2)
        draw.text((x + 10, y + preview_height + 12), page["name"], fill=(18, 46, 80), font=font)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, "PNG", optimize=False, compress_level=6)
    return sheet.size


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: assemble-core-screenshots.py <capture-manifest.json>")
    manifest_path = Path(sys.argv[1])
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    scale = int(manifest["scale"])
    viewport = manifest["viewport"]
    dimensions: dict[str, list[int]] = {}

    for page in manifest["pages"]:
        dimensions[page["name"]] = list(assemble_page(page, scale, viewport))

    contact = Path(manifest["contactSheet"])
    dimensions[contact.name] = list(contact_sheet(manifest["pages"], contact))
    manifest["dimensions"] = dimensions
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
