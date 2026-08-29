#!/usr/bin/env python3
"""
One-time codegen: reads the vendored avataaars SVG source
(design/avataaars-source/, exported from the original Sketch library —
https://avataaars.com, designed by Pablo Stanley) and emits a single
TypeScript module with every part normalized for runtime compositing:

  - every id inside each fragment is namespaced (avataaars ships every
    part with colliding ids like "path-1"/"mask-2"; combining fragments
    naively makes masks resolve to the wrong element)
  - the "colorable" fill (skin/hair/fabric swap slot) is detected per
    file and exposed as `placeholderHex` so the app can do a plain
    string replace at runtime instead of re-parsing SVG in the browser

Re-run after adding/removing exported parts:
  python3 scripts/generate-avatar-parts.py
"""
import json
import re
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "avataaars-source"
OUT = ROOT / "src" / "tools" / "random-avatar" / "parts.generated.ts"

XLINK = "{http://www.w3.org/1999/xlink}href"

_counter = 0


def next_ns() -> str:
    global _counter
    _counter += 1
    return f"n{_counter}"


def slugify(name: str) -> str:
    name = unicodedata.normalize("NFKD", name)
    name = name.encode("ascii", "ignore").decode("ascii")
    name = re.sub(r"[^a-zA-Z0-9]+", "-", name).strip("-")
    return name.lower() or "item"


def load_root(path: Path) -> ET.Element:
    return ET.parse(path).getroot()


def namespace_ids(root: ET.Element, prefix: str) -> None:
    ids = {e.attrib["id"] for e in root.iter() if "id" in e.attrib}
    if not ids:
        return
    for e in root.iter():
        if e.attrib.get("id") in ids:
            e.attrib["id"] = f"{prefix}-{e.attrib['id']}"
        href = e.attrib.get(XLINK)
        if href and href.startswith("#") and href[1:] in ids:
            e.attrib[XLINK] = f"#{prefix}-{href[1:]}"
        mask = e.attrib.get("mask")
        if mask:
            m = re.match(r"url\(#(.+)\)", mask)
            if m and m.group(1) in ids:
                e.set("mask", f"url(#{prefix}-{m.group(1)})")


def inner_svg(root: ET.Element) -> str:
    return "".join(ET.tostring(child, encoding="unicode") for child in root)


def find_colorable_fill(root: ET.Element) -> str | None:
    """Find the single masked <g fill="#hex"> group that represents the
    swappable color slot (id contains 'Color', per the source naming
    convention: '↳-Color-Fabric', '↳-💈Hair-Color', '↳-✂️-Facial-Hair-Color')."""
    for e in root.iter():
        eid = e.attrib.get("id", "")
        if "Color" in eid and e.attrib.get("mask") and e.attrib.get("fill", "").startswith("#"):
            return e.attrib["fill"]
    return None


def first_hex_fill(root: ET.Element) -> str:
    for e in root.iter():
        f = e.attrib.get("fill")
        if f and f.startswith("#"):
            return f
    raise ValueError("no fill found")


def load_part(path: Path, prefix: str):
    root = load_root(path)
    namespace_ids(root, prefix)
    placeholder = find_colorable_fill(root)
    return inner_svg(root), placeholder


def collect_parts(dir_path: Path, *, recursive: bool = False):
    """Return (stem, path) pairs for every .svg directly in dir_path."""
    pattern = "*.svg"
    files = sorted(dir_path.glob(pattern)) if not recursive else sorted(dir_path.rglob(pattern))
    return [(f.stem, f) for f in files]


def swatch(path: Path):
    root = load_root(path)
    return first_hex_fill(root)


# --- colors -----------------------------------------------------------

skin_tones = []
for stem, path in collect_parts(SRC / "Skin"):
    skin_tones.append({"id": slugify(stem), "label": stem, "hex": swatch(path)})

hair_colors = []
for stem, path in collect_parts(SRC / "Color" / "Hair"):
    hair_colors.append({"id": slugify(stem), "label": stem, "hex": swatch(path)})

palette_colors = []
for stem, path in collect_parts(SRC / "Color" / "Palette"):
    palette_colors.append({"id": slugify(stem), "label": stem, "hex": swatch(path)})

# --- simple (non-colorable) parts --------------------------------------


def build_simple(dir_path: Path, prefix: str):
    out = []
    for stem, path in collect_parts(dir_path):
        svg, _ = load_part(path, f"{prefix}-{next_ns()}")
        out.append({"id": slugify(stem), "label": stem, "svg": svg})
    return out


eyes = build_simple(SRC / "Eyes", "eyes")
mouths = build_simple(SRC / "Mouth", "mouth")
noses = build_simple(SRC / "Nose", "nose")

eyebrows = []
for sub, style_label in (("Natural", "Natural"), ("Outline", "Outline")):
    for stem, path in collect_parts(SRC / "Eyebrow" / sub):
        svg, _ = load_part(path, f"eyebrow-{next_ns()}")
        eyebrows.append({"id": slugify(f"{stem}-{sub}"), "label": f"{stem} ({style_label})", "svg": svg})

accessories = build_simple(SRC / "Top" / "_Resources", "accessory")

# --- colorable parts -----------------------------------------------------


def build_colorable(dir_path: Path, prefix: str, *, hairy: bool | None = None):
    out = []
    for stem, path in collect_parts(dir_path):
        svg, placeholder = load_part(path, f"{prefix}-{next_ns()}")
        entry = {"id": slugify(stem), "label": stem, "svg": svg, "placeholderHex": placeholder}
        if hairy is not None:
            entry["hairy"] = hairy
        out.append(entry)
    return out


facial_hair = build_colorable(SRC / "Facial Hair", "facial-hair")

clothes = build_colorable(SRC / "Clothing", "clothes")
# only top-level clothing shapes for now — the "Graphic" subfolder holds
# printable icons for the "Graphic Shirt" garment, not separate garments
clothes = [c for c in clothes if "/" not in c["id"]]

tops = []
tops += build_colorable(SRC / "Top", "top", hairy=False)  # non-recursive glob: only "-No Hair.svg" lives directly in Top/
tops += build_colorable(SRC / "Top" / "Long Hair", "top-long", hairy=True)
tops += build_colorable(SRC / "Top" / "Short Hair", "top-short", hairy=True)
tops += build_colorable(SRC / "Top" / "Accesories", "top-hat", hairy=False)
tops += build_colorable(SRC / "Top" / "Accessories", "top-hat2", hairy=False)
# hats/eyepatch/no-hair have no colorable slot (placeholderHex is None) — fine, UI just won't show a hair-color picker for them

# --- body (fixed shape, skin-tone fill) ----------------------------------

default_avatar = load_root(SRC / "Avatar" / "Default.svg")
namespace_ids(default_avatar, "body")
body_path_def = next(e for e in default_avatar.iter() if e.attrib.get("id") == "body-path-1")
body_group = next(e for e in default_avatar.iter() if e.attrib.get("id") == "body-Body")
body_skin_placeholder = None
for e in body_group.iter():
    if e.attrib.get("fill", "").startswith("#") and e.tag.endswith("g"):
        body_skin_placeholder = e.attrib["fill"]
body_defs_svg = ET.tostring(body_path_def, encoding="unicode")
body_group_svg = ET.tostring(body_group, encoding="unicode")


# --- emit -----------------------------------------------------------------


def ts_str(s: str) -> str:
    return json.dumps(s)


def ts_array(items):
    return json.dumps(items, ensure_ascii=False, indent=2)


parts = []
parts.append("// GENERATED FILE — do not edit by hand.")
parts.append("// Source: design/avataaars-source/ (exported from https://avataaars.com, designed by Pablo Stanley).")
parts.append("// Regenerate with: python3 scripts/generate-avatar-parts.py")
parts.append("")
parts.append("export interface ColorSwatch {")
parts.append("  id: string")
parts.append("  label: string")
parts.append("  hex: string")
parts.append("}")
parts.append("")
parts.append("export interface PartOption {")
parts.append("  id: string")
parts.append("  label: string")
parts.append("  svg: string")
parts.append("}")
parts.append("")
parts.append("export interface ColorablePartOption extends PartOption {")
parts.append("  placeholderHex: string | null")
parts.append("}")
parts.append("")
parts.append("export interface TopOption extends ColorablePartOption {")
parts.append("  hairy: boolean")
parts.append("}")
parts.append("")

parts.append(f"export const SKIN_TONES: ColorSwatch[] = {ts_array(skin_tones)}")
parts.append("")
parts.append(f"export const HAIR_COLORS: ColorSwatch[] = {ts_array(hair_colors)}")
parts.append("")
parts.append(f"export const PALETTE_COLORS: ColorSwatch[] = {ts_array(palette_colors)}")
parts.append("")
parts.append(f"export const EYES: PartOption[] = {ts_array(eyes)}")
parts.append("")
parts.append(f"export const MOUTHS: PartOption[] = {ts_array(mouths)}")
parts.append("")
parts.append(f"export const NOSES: PartOption[] = {ts_array(noses)}")
parts.append("")
parts.append(f"export const EYEBROWS: PartOption[] = {ts_array(eyebrows)}")
parts.append("")
parts.append(f"export const ACCESSORIES: PartOption[] = {ts_array(accessories)}")
parts.append("")
parts.append(f"export const FACIAL_HAIR: ColorablePartOption[] = {ts_array(facial_hair)}")
parts.append("")
parts.append(f"export const CLOTHES: ColorablePartOption[] = {ts_array(clothes)}")
parts.append("")
parts.append(f"export const TOPS: TopOption[] = {ts_array(tops)}")
parts.append("")
parts.append(f"export const BODY_DEFS_SVG = {ts_str(body_defs_svg)}")
parts.append(f"export const BODY_GROUP_SVG = {ts_str(body_group_svg)}")
parts.append(f"export const BODY_SKIN_PLACEHOLDER = {ts_str(body_skin_placeholder)}")
parts.append("")

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text("\n".join(parts), encoding="utf-8")
print(f"wrote {OUT}")
print(f"  skin={len(skin_tones)} hairColors={len(hair_colors)} palette={len(palette_colors)}")
print(f"  eyes={len(eyes)} mouths={len(mouths)} noses={len(noses)} eyebrows={len(eyebrows)}")
print(f"  accessories={len(accessories)} facialHair={len(facial_hair)} clothes={len(clothes)} tops={len(tops)}")
