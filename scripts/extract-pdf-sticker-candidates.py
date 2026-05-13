import argparse
import io
import json
from pathlib import Path

from PIL import Image, ImageStat
from pypdf import PdfReader


def is_blank(image: Image.Image) -> bool:
    sample = image.convert("RGB").resize((16, 16))
    stats = ImageStat.Stat(sample)
    mean = sum(stats.mean) / 3
    variance = sum(stats.var) / 3
    return mean > 245 and variance < 25


def save_candidate(image: Image.Image, rows: list[dict], out_dir: Path, source: dict) -> None:
    image = image.convert("RGB")

    if image.width < 150 or image.height < 150 or is_blank(image):
        return

    if abs(image.width - 511) <= 8 and abs(image.height - 385) <= 8:
        image = image.rotate(90, expand=True)
        source = {**source, "rotated": True}

    image.thumbnail((520, 700))
    index = len(rows)
    out_path = out_dir / f"candidate-{index:04d}.webp"
    image.save(out_path, "WEBP", quality=82, method=6)
    rows.append({**source, "id": index, "path": str(out_path), "width": image.width, "height": image.height})


def split_or_save(image: Image.Image, rows: list[dict], out_dir: Path, source: dict) -> None:
    width, height = image.size
    columns = max(1, round(width / 385))
    row_count = max(1, round(height / 511))

    if columns > 1 or row_count > 1:
        cell_width = width / columns
        cell_height = height / row_count
        if abs(cell_width - 385) <= 12 and abs(cell_height - 511) <= 12:
            for row in range(row_count):
                for column in range(columns):
                    left = round(column * cell_width)
                    top = round(row * cell_height)
                    right = round((column + 1) * cell_width)
                    bottom = round((row + 1) * cell_height)
                    save_candidate(
                        image.crop((left, top, right, bottom)),
                        rows,
                        out_dir,
                        {**source, "cell": f"{column + 1},{row + 1}"},
                    )
            return

    save_candidate(image, rows, out_dir, source)


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract sticker-like images from the source PDF.")
    parser.add_argument("pdf", help="Path to the Panini sticker PDF")
    parser.add_argument("--out", default="tmp/sticker-candidates", help="Output directory for candidates")
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    for existing in out_dir.glob("candidate-*.webp"):
        existing.unlink()

    reader = PdfReader(str(pdf_path))
    rows: list[dict] = []

    for page_index, page in enumerate(reader.pages):
        for image_index, pdf_image in enumerate(page.images):
            try:
                image = Image.open(io.BytesIO(pdf_image.data)).convert("RGB")
            except Exception:
                continue

            split_or_save(
                image,
                rows,
                out_dir,
                {
                    "page": page_index + 1,
                    "image": pdf_image.name,
                    "imageIndex": image_index,
                    "sourceWidth": image.width,
                    "sourceHeight": image.height,
                },
            )

    manifest_path = out_dir / "candidates.json"
    manifest_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Extracted {len(rows)} candidates")
    print(manifest_path)


if __name__ == "__main__":
    main()
