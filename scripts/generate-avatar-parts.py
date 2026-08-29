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


def clean_label(name: str) -> str:
    """Strip the leading '-' the source uses to sort "none" options
    (e.g. "-Blank", "-No Hair") first in the Sketch layers panel."""
    return name.lstrip("-").strip() or name


# Russian labels, keyed by (category, id). Falls back to the English
# label if a translation is missing (should only happen if a part is
# added to the source without updating this dict).
RU_LABELS: dict[str, dict[str, str]] = {
    "skin": {
        "tanned": "🍊 Загорелая",
        "00-yellow": "👶 00 Жёлтая",
        "05-pale": "👶🏻 05 Бледная",
        "04-light": "👶🏼 04 Светлая",
        "03-brown": "👶🏽 03 Смуглая",
        "02-dark-brown": "👶🏾 02 Тёмно-смуглая",
        "01-black": "👶🏿 01 Тёмная",
    },
    "hairColor": {
        "auburn": "Каштановый",
        "black": "Чёрный",
        "blonde-golden": "Золотистый блонд",
        "blonde": "Блонд",
        "brown-dark": "Тёмно-русый",
        "brown": "Русый",
        "pastel-pink": "Пастельно-розовый",
        "platinum": "Платиновый",
        "red": "Рыжий",
        "silver-gray": "Серебристо-серый",
    },
    "palette": {
        "black": "Чёрный",
        "blue-01": "Синий 01",
        "blue-02": "Синий 02",
        "blue-03": "Синий 03",
        "gray-01": "Серый 01",
        "gray-02": "Серый 02",
        "heather": "Меланж",
        "pastel-blue": "Пастельно-голубой",
        "pastel-green": "Пастельно-зелёный",
        "pastel-orange": "Пастельно-оранжевый",
        "pastel-red": "Пастельно-красный",
        "pastel-yellow": "Пастельно-жёлтый",
        "pink": "Розовый",
        "red": "Красный",
        "white": "Белый",
    },
    "eyes": {
        "closed": "Закрытые 😌",
        "cry": "Плачущие 😢",
        "default": "Обычные 😀",
        "eye-roll": "Закатывает глаза 🙄",
        "happy": "Счастливые 😁",
        "hearts": "Влюблённые 😍",
        "side": "Смотрит вбок 😒",
        "squint": "Прищур 😊",
        "surprised": "Удивлённые 😳",
        "wink-wacky": "Подмигивание шальное 😜",
        "wink": "Подмигивание 😉",
        "x-dizzy": "В отключке 😵",
    },
    "mouth": {
        "concerned": "Обеспокоенный",
        "default": "Обычный",
        "disbelief": "Недоверие",
        "eating": "Ест",
        "grimace": "Гримаса",
        "sad": "Грустный",
        "scream-open": "Крик",
        "serious": "Серьёзный",
        "smile": "Улыбка",
        "tongue": "Язык",
        "twinkle": "Улыбка со звёздочкой",
        "vomit": "Тошнит",
    },
    "nose": {
        "default": "Обычный",
    },
    "eyebrow": {
        "angry-natural-natural": "Злые (натур.)",
        "default-natural-natural": "Обычные (натур.)",
        "flat-natural-natural": "Прямые (натур.)",
        "frown-natural-natural": "Нахмуренные (натур.)",
        "raised-excited-natural-natural": "Приподнятые (натур.)",
        "sad-concerned-natural-natural": "Грустные (натур.)",
        "unibrow-natural-natural": "Сросшиеся (натур.)",
        "up-down-natural-natural": "Разной высоты (натур.)",
        "angry-outline": "Злые (контур)",
        "default-outline": "Обычные (контур)",
        "raised-excited-outline": "Приподнятые (контур)",
        "sad-concerned-outline": "Грустные (контур)",
        "up-down-outline": "Разной высоты (контур)",
    },
    "accessory": {
        "blank": "Без очков",
        "kurt": "Курт",
        "prescription-01": "Оправа 01",
        "prescription-02": "Оправа 02",
        "round": "Круглые",
        "sunglasses": "Солнцезащитные",
        "wayfarers": "Wayfarer",
    },
    "facialHair": {
        "blank": "Без бороды",
        "beard-light": "Лёгкая борода",
        "beard-magestic": "Пышная борода",
        "beard-medium": "Средняя борода",
        "moustache-fancy": "Усы изящные",
        "moustache-magnum": "Усы Magnum",
    },
    "clothes": {
        "blazer-shirt": "Пиджак + рубашка",
        "blazer-sweater": "Пиджак + свитер",
        "collar-sweater": "Свитер с воротником",
        "graphic-shirt": "Футболка с принтом",
        "hoodie": "Худи",
        "overall": "Комбинезон",
        "shirt-crew-neck": "Футболка (круглый вырез)",
        "shirt-scoop-neck": "Футболка (глубокий вырез)",
        "shirt-v-neck": "Футболка (V-образный вырез)",
    },
    "top": {
        "no-hair": "Без волос",
        "big-hair": "Пышные волосы",
        "bob": "Каре",
        "bun": "Пучок",
        "curly": "Кудрявые",
        "curvy": "Волнистые",
        "dreads": "Дреды",
        "frida": "Причёска Фрида",
        "fro-band": "Афро с повязкой",
        "fro": "Афро",
        "long-but-not-too-long": "Длинные (в меру)",
        "mia-wallace": "Каре с чёлкой",
        "shaved-sides": "Выбритые виски",
        "straight-strand": "Прямые с прядью",
        "straight-2": "Прямые 2",
        "straight": "Прямые",
        "dreads-01": "Дреды 01",
        "dreads-02": "Дреды 02",
        "frizzle": "Мелкие кудри",
        "shaggy-mullet": "Шэгги-маллет",
        "shaggy": "Шэгги",
        "short-curly": "Короткие кудрявые",
        "short-flat": "Короткие прямые",
        "short-round": "Короткие округлые",
        "short-waved": "Короткие волнистые",
        "sides": "Виски",
        "the-caesar-side-part": "Цезарь с пробором",
        "the-caesar": "Цезарь",
        "eyepatch": "Повязка на глаз",
        "hat": "Шляпа",
        "hijab": "Хиджаб",
        "turban": "Тюрбан",
        "winter-hat-1": "Зимняя шапка 1",
        "winter-hat-2": "Зимняя шапка 2",
        "winter-hat-3": "Зимняя шапка 3",
        "winter-hat-4": "Зимняя шапка 4",
    },
}


def ru_label(category: str, item_id: str, fallback: str) -> str:
    return RU_LABELS.get(category, {}).get(item_id, fallback)


def load_root(path: Path) -> ET.Element:
    return ET.parse(path).getroot()


def namespace_ids(root: ET.Element, prefix: str) -> None:
    """Rewrite every id in the fragment to be prefix-unique, and every
    reference to one of those ids so it still resolves after the rename:
    xlink:href="#id", and any attribute of the form "url(#id)" — mask,
    clip-path, filter, fill="url(#gradient)", etc. A reference attribute
    whose id isn't found is left alone (nothing to rewrite it to)."""
    ids = {e.attrib["id"] for e in root.iter() if "id" in e.attrib}
    if not ids:
        return
    for e in root.iter():
        if e.attrib.get("id") in ids:
            e.attrib["id"] = f"{prefix}-{e.attrib['id']}"
        href = e.attrib.get(XLINK)
        if href and href.startswith("#") and href[1:] in ids:
            e.attrib[XLINK] = f"#{prefix}-{href[1:]}"
        for attr, value in list(e.attrib.items()):
            if attr in ("id", XLINK):
                continue
            m = re.match(r"url\(#(.+)\)$", value)
            if m and m.group(1) in ids:
                e.set(attr, f"url(#{prefix}-{m.group(1)})")


def strip_ghost_opacity(root: ET.Element) -> None:
    """The Sketch library exports some symbols (mainly Top/hair) with a
    stray opacity="0.3..." baked onto their root group — an artifact of
    how the symbol master looks dimmed in the design file's own page,
    not an intentional design property. Strip it so parts render at full
    opacity; fill-opacity (the deliberate soft-black look on eyes/mouth/
    eyebrows) is untouched.

    Only the root group carries the artifact. Nested opacity is deliberate
    art direction — the 0.44 shine on 'Long but not too long', the 0.6
    shadow under a blazer collar, the 0.9 folds on a hijab — so stripping
    it wholesale flattens those layers into hard, wrongly-coloured blocks."""
    for e in root:
        if "opacity" in e.attrib:
            del e.attrib["opacity"]


def pin_mask_opacity(root: ET.Element) -> None:
    """The app wraps each face-feature layer (mouth/eyes/eyebrows/nose)
    in its own <g fill-opacity="0.6..."> for the intentional soft-black
    look. fill-opacity is inherited in SVG, so without this fix that
    same reduced opacity leaks into any <mask> defined inside the part
    (e.g. Mouth/Tongue's teeth mask, Eyes/Squint's mask) — the mask's
    white fill becomes partially transparent, so whatever it clips
    renders only partially visible. Masks must stay fully opaque
    regardless of where the fragment ends up composited, so pin it
    explicitly on every mask and its descendants."""
    for e in root.iter():
        if e.tag.endswith("mask"):
            for descendant in e.findall(".//*"):
                if "fill-opacity" in descendant.attrib:
                    del descendant.attrib["fill-opacity"]
            e.set("fill-opacity", "1")


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
    strip_ghost_opacity(root)
    pin_mask_opacity(root)
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
    _id = slugify(stem)
    _label = clean_label(stem)
    skin_tones.append({"id": _id, "label": _label, "labelRu": ru_label("skin", _id, _label), "hex": swatch(path)})

hair_colors = []
for stem, path in collect_parts(SRC / "Color" / "Hair"):
    _id = slugify(stem)
    _label = clean_label(stem)
    hair_colors.append(
        {"id": _id, "label": _label, "labelRu": ru_label("hairColor", _id, _label), "hex": swatch(path)}
    )

palette_colors = []
for stem, path in collect_parts(SRC / "Color" / "Palette"):
    _id = slugify(stem)
    _label = clean_label(stem)
    palette_colors.append(
        {"id": _id, "label": _label, "labelRu": ru_label("palette", _id, _label), "hex": swatch(path)}
    )

# --- simple (non-colorable) parts --------------------------------------


def build_simple(dir_path: Path, prefix: str, category: str):
    out = []
    for stem, path in collect_parts(dir_path):
        svg, _ = load_part(path, f"{prefix}-{next_ns()}")
        _id = slugify(stem)
        _label = clean_label(stem)
        out.append({"id": _id, "label": _label, "labelRu": ru_label(category, _id, _label), "svg": svg})
    return out


eyes = build_simple(SRC / "Eyes", "eyes", "eyes")
mouths = build_simple(SRC / "Mouth", "mouth", "mouth")
noses = build_simple(SRC / "Nose", "nose", "nose")

eyebrows = []
for sub, suffix_en, suffix_ru in (("Natural", None, "натур."), ("Outline", "Outline", "контур")):
    for stem, path in collect_parts(SRC / "Eyebrow" / sub):
        svg, _ = load_part(path, f"eyebrow-{next_ns()}")
        _id = slugify(f"{stem}-{sub}")
        # "Natural" filenames already end with "Natural" (e.g. "Default Natural.svg") —
        # don't double it up; "Outline" filenames don't, so the suffix disambiguates them.
        _label = stem if suffix_en is None else f"{stem} ({suffix_en})"
        _fallback_ru = f"{stem} ({suffix_ru})"
        eyebrows.append({"id": _id, "label": _label, "labelRu": ru_label("eyebrow", _id, _fallback_ru), "svg": svg})

accessories = build_simple(SRC / "Top" / "_Resources", "accessory", "accessory")

# --- colorable parts -----------------------------------------------------


def build_colorable(dir_path: Path, prefix: str, category: str, *, hairy: bool | None = None):
    out = []
    for stem, path in collect_parts(dir_path):
        svg, placeholder = load_part(path, f"{prefix}-{next_ns()}")
        _id = slugify(stem)
        _label = clean_label(stem)
        entry = {
            "id": _id,
            "label": _label,
            "labelRu": ru_label(category, _id, _label),
            "svg": svg,
            "placeholderHex": placeholder,
        }
        if hairy is not None:
            entry["hairy"] = hairy
        out.append(entry)
    return out


facial_hair = build_colorable(SRC / "Facial Hair", "facial-hair", "facialHair")

clothes = build_colorable(SRC / "Clothing", "clothes", "clothes")
# only top-level clothing shapes for now — the "Graphic" subfolder holds
# printable icons for the "Graphic Shirt" garment, not separate garments
clothes = [c for c in clothes if "/" not in c["id"]]

tops = []
tops += build_colorable(SRC / "Top", "top", "top", hairy=False)  # non-recursive glob: only "-No Hair.svg" lives directly in Top/
tops += build_colorable(SRC / "Top" / "Long Hair", "top-long", "top", hairy=True)
tops += build_colorable(SRC / "Top" / "Short Hair", "top-short", "top", hairy=True)
tops += build_colorable(SRC / "Top" / "Accesories", "top-hat", "top", hairy=False)
tops += build_colorable(SRC / "Top" / "Accessories", "top-hat2", "top", hairy=False)
# hats/eyepatch/no-hair have no colorable slot (placeholderHex is None) — fine, UI just won't show a hair-color picker for them

# --- body (fixed shape, skin-tone fill) ----------------------------------

default_avatar = load_root(SRC / "Avatar" / "Default.svg")
namespace_ids(default_avatar, "body")
pin_mask_opacity(default_avatar)
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
parts.append("  labelRu: string")
parts.append("  hex: string")
parts.append("}")
parts.append("")
parts.append("export interface PartOption {")
parts.append("  id: string")
parts.append("  label: string")
parts.append("  labelRu: string")
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
