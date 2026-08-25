#!/usr/bin/env python3
"""Render chart JSON as a dependency-free SVG wheel.

This tool consumes the same chart-input object routed by ``entry_commands.py``:
top-level ``{reading_type, chart_data}``, with placements, aspects, angles, and
house cusps already calculated by an external tool such as
``tools/birth_to_chart.py``. It only normalizes supplied geometry into drawing
coordinates; it does not calculate chart factors.

Run
---
    python3 tools/chart_diagram.py chart.json --output chart.svg
    python3 tools/chart_diagram.py chart.json --format html --output chart.html
"""

from __future__ import annotations

import argparse
import html
import json
import math
import sys
from pathlib import Path
from typing import Any


SIGN_ORDER = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
]
SIGN_INDEX = {sign: index for index, sign in enumerate(SIGN_ORDER)}

SIGN_GLYPHS = {
    "Aries": "♈",
    "Taurus": "♉",
    "Gemini": "♊",
    "Cancer": "♋",
    "Leo": "♌",
    "Virgo": "♍",
    "Libra": "♎",
    "Scorpio": "♏",
    "Sagittarius": "♐",
    "Capricorn": "♑",
    "Aquarius": "♒",
    "Pisces": "♓",
}

PLANET_ORDER = [
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
    "True Node",
    "North Node",
    "South Node",
    "Chiron",
    "Lilith",
]

PLANET_GLYPHS = {
    "Sun": "☉",
    "Moon": "☽",
    "Mercury": "☿",
    "Venus": "♀",
    "Mars": "♂",
    "Jupiter": "♃",
    "Saturn": "♄",
    "Uranus": "♅",
    "Neptune": "♆",
    "Pluto": "♇",
    "True Node": "☊",
    "North Node": "☊",
    "South Node": "☋",
    "Chiron": "⚷",
    "Lilith": "⚸",
}

ASPECT_COLORS = {
    "conjunction": "#f8f3e7",
    "opposition": "#d6a83c",
    "trine": "#4d9a63",
    "square": "#c75c56",
    "sextile": "#4f8fb9",
    "quincunx": "#9a73ad",
    "semisextile": "#6a8f8a",
    "semisquare": "#b7685d",
    "sesquisquare": "#b7685d",
}

THEMES = {
    "dark": {
        "background": "#101018",
        "rim": "#d1a44b",
        "rim_soft": "#8c7644",
        "text": "#eee3cf",
        "muted": "#958b78",
        "planet": "#ffffff",
        "angle": "#f0dca0",
        "mc": "#f8c85d",
    },
    "light": {
        "background": "#f7f4ed",
        "rim": "#a98227",
        "rim_soft": "#bda565",
        "text": "#292621",
        "muted": "#746b5f",
        "planet": "#151521",
        "angle": "#8b671c",
        "mc": "#a98227",
    },
}


class DiagramError(ValueError):
    """Raised for malformed chart input that cannot be rendered."""


def _escape(value: Any) -> str:
    return html.escape(str(value), quote=True)


def _read_json(source: str) -> Any:
    if source == "-":
        text = sys.stdin.read()
    else:
        stripped = source.lstrip()
        if stripped.startswith(("{", "[")):
            text = source
        else:
            path = Path(source)
            text = path.read_text(encoding="utf-8") if path.is_file() else source
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise DiagramError(f"could not parse JSON: {exc}") from exc


def _position_longitude(position: Any) -> float | None:
    """Return an absolute longitude from a supplied chart position."""
    if not isinstance(position, dict):
        return None
    for key in ("absolute_degree", "longitude"):
        value = position.get(key)
        if isinstance(value, (int, float)):
            return float(value) % 360
    sign = position.get("sign")
    degree = position.get("degree")
    if isinstance(sign, str) and sign in SIGN_INDEX and isinstance(degree, (int, float)):
        return (SIGN_INDEX[sign] * 30 + float(degree)) % 360
    return None


def _position_degree(position: dict[str, Any], longitude: float) -> float:
    value = position.get("degree")
    if isinstance(value, (int, float)):
        return float(value)
    return longitude % 30


def _normalize_placements(chart_data: dict[str, Any]) -> list[dict[str, Any]]:
    """Normalize canonical placements or legacy ``planets`` maps."""
    placements: list[dict[str, Any]] = []
    raw_placements = chart_data.get("placements")
    if isinstance(raw_placements, list):
        for item in raw_placements:
            if not isinstance(item, dict):
                continue
            name = item.get("body") or item.get("name") or item.get("planet")
            longitude = _position_longitude(item)
            if not name or longitude is None:
                continue
            placements.append(
                {
                    "name": str(name),
                    "longitude": longitude,
                    "degree": _position_degree(item, longitude),
                    "sign": item.get("sign") or SIGN_ORDER[int(longitude // 30) % 12],
                }
            )

    legacy_planets = chart_data.get("planets")
    if isinstance(legacy_planets, dict):
        seen = {p["name"].casefold() for p in placements}
        for name, item in legacy_planets.items():
            if not isinstance(item, dict) or str(name).casefold() in seen:
                continue
            longitude = _position_longitude(item)
            if longitude is None:
                continue
            placements.append(
                {
                    "name": str(name),
                    "longitude": longitude,
                    "degree": _position_degree(item, longitude),
                    "sign": item.get("sign") or SIGN_ORDER[int(longitude // 30) % 12],
                }
            )

    order = {name: index for index, name in enumerate(PLANET_ORDER)}
    placements.sort(key=lambda p: (order.get(p["name"], len(order)), p["longitude"]))
    return placements


def _house_number(value: Any) -> int | None:
    if isinstance(value, int) and 1 <= value <= 12:
        return value
    if isinstance(value, str):
        digits = "".join(ch for ch in value if ch.isdigit())
        if digits:
            number = int(digits)
            if 1 <= number <= 12:
                return number
    return None


def _normalize_houses(chart_data: dict[str, Any]) -> list[dict[str, Any]]:
    houses: list[dict[str, Any]] = []
    raw_cusps = chart_data.get("house_cusps")
    if isinstance(raw_cusps, list):
        for item in raw_cusps:
            if not isinstance(item, dict):
                continue
            house = _house_number(item.get("house"))
            longitude = _position_longitude(item)
            if house is not None and longitude is not None:
                houses.append({"house": house, "longitude": longitude})

    legacy_houses = chart_data.get("houses")
    if isinstance(legacy_houses, dict):
        seen = {h["house"] for h in houses}
        for key, item in legacy_houses.items():
            if not isinstance(item, dict):
                continue
            house = _house_number(item.get("house", key))
            longitude = _position_longitude(item)
            if house is not None and longitude is not None and house not in seen:
                houses.append({"house": house, "longitude": longitude})

    houses.sort(key=lambda h: h["house"])
    return houses


def _normalize_aspects(chart_data: dict[str, Any]) -> list[dict[str, str]]:
    aspects: list[dict[str, str]] = []
    raw_aspects = chart_data.get("aspects")
    if not isinstance(raw_aspects, list):
        return aspects
    for item in raw_aspects:
        if not isinstance(item, dict):
            continue
        body_a = item.get("body_a") or item.get("planet1")
        body_b = item.get("body_b") or item.get("planet2")
        aspect = item.get("aspect")
        if isinstance(body_a, str) and isinstance(body_b, str) and isinstance(aspect, str):
            aspects.append({"body_a": body_a, "body_b": body_b, "aspect": aspect})
    return aspects


def _extract_chart_data(obj: Any) -> dict[str, Any]:
    if not isinstance(obj, dict):
        raise DiagramError("chart input must be a JSON object")
    chart_data = obj.get("chart_data", obj)
    if not isinstance(chart_data, dict):
        raise DiagramError("chart_data must be a JSON object")
    return chart_data


def _polar(cx: float, cy: float, angle: float, radius: float) -> tuple[float, float]:
    return (cx + radius * math.cos(angle), cy - radius * math.sin(angle))


def _svg_line(
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    stroke: str,
    width: float,
    opacity: float = 1.0,
    extra: str = "",
) -> str:
    return (
        f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" '
        f'stroke="{stroke}" stroke-width="{width}" opacity="{opacity}"{extra}/>'
    )


def _svg_text(
    x: float,
    y: float,
    text: str,
    fill: str,
    size: int,
    weight: int = 400,
    extra: str = "",
) -> str:
    return (
        f'<text x="{x:.2f}" y="{y:.2f}" text-anchor="middle" '
        f'dominant-baseline="central" fill="{fill}" font-size="{size}" '
        f'font-weight="{weight}"{extra}>{_escape(text)}</text>'
    )


def render_svg(
    chart: dict[str, Any],
    *,
    size: int = 720,
    theme: str = "dark",
    title: str | None = None,
    include_aspects: bool = True,
) -> str:
    """Return a complete SVG chart wheel."""
    if size < 360:
        raise DiagramError("--size must be at least 360")
    colors = THEMES[theme]
    chart_data = _extract_chart_data(chart)
    placements = _normalize_placements(chart_data)
    houses = _normalize_houses(chart_data)
    aspects = _normalize_aspects(chart_data) if include_aspects else []

    cx = cy = size / 2
    scale = size / 720
    outer_r = 330 * scale
    sign_outer_r = 302 * scale
    sign_inner_r = 252 * scale
    planet_r = 210 * scale
    aspect_r = 130 * scale

    asc_lon = _position_longitude(chart_data.get("ascendant"))
    mc_lon = _position_longitude(chart_data.get("midheaven"))
    first_house = next((h for h in houses if h["house"] == 1), None)
    anchor_lon = (
        first_house["longitude"]
        if first_house is not None
        else asc_lon
        if asc_lon is not None
        else 0.0
    )

    def lon_to_angle(lon: float) -> float:
        return math.radians((lon - anchor_lon) % 360) + math.pi

    lines: list[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" '
        f'role="img" aria-label="{_escape(title or "Astrology chart diagram")}">',
        "<style>"
        "text{font-family:'Segoe UI Symbol','Apple Symbols','Noto Sans Symbols',"
        "'DejaVu Sans',sans-serif;font-variant-emoji:text}"
        ".label{font-family:Arial,Helvetica,sans-serif}"
        "</style>",
        f'<rect width="{size}" height="{size}" fill="{colors["background"]}"/>',
        f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="{outer_r:.2f}" fill="none" '
        f'stroke="{colors["rim"]}" stroke-width="{2.2 * scale:.2f}"/>',
        f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="{sign_outer_r:.2f}" fill="none" '
        f'stroke="{colors["rim_soft"]}" stroke-width="{1.2 * scale:.2f}" opacity="0.8"/>',
        f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="{sign_inner_r:.2f}" fill="none" '
        f'stroke="{colors["rim_soft"]}" stroke-width="{1.2 * scale:.2f}" opacity="0.8"/>',
        f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="{aspect_r:.2f}" fill="none" '
        f'stroke="{colors["rim_soft"]}" stroke-width="{0.9 * scale:.2f}" '
        'opacity="0.45" stroke-dasharray="4 5"/>',
    ]
    if title:
        lines.append(
            _svg_text(cx, 28 * scale, title, colors["text"], max(12, int(17 * scale)), 700)
        )

    for index, sign in enumerate(SIGN_ORDER):
        boundary_angle = lon_to_angle(index * 30)
        x1, y1 = _polar(cx, cy, boundary_angle, sign_inner_r)
        x2, y2 = _polar(cx, cy, boundary_angle, outer_r)
        lines.append(
            _svg_line(x1, y1, x2, y2, colors["rim_soft"], 1.0 * scale, 0.72)
        )

        glyph_angle = lon_to_angle(index * 30 + 15)
        gx, gy = _polar(cx, cy, glyph_angle, (sign_inner_r + sign_outer_r) / 2)
        lines.append(
            _svg_text(
                gx,
                gy,
                SIGN_GLYPHS[sign],
                colors["text"],
                max(16, int(29 * scale)),
            )
        )

    for house in houses:
        angle = lon_to_angle(house["longitude"])
        x1, y1 = _polar(cx, cy, angle, 9 * scale)
        x2, y2 = _polar(cx, cy, angle, sign_inner_r)
        lines.append(_svg_line(x1, y1, x2, y2, colors["muted"], 0.9 * scale, 0.45))
        label_x, label_y = _polar(cx, cy, angle, sign_inner_r - 18 * scale)
        lines.append(
            _svg_text(
                label_x,
                label_y,
                str(house["house"]),
                colors["muted"],
                max(8, int(11 * scale)),
                700,
                ' class="label"',
            )
        )

    angle_markers: list[tuple[float, str, str]] = []
    if asc_lon is not None:
        angle_markers.extend(
            [
                (asc_lon, "Asc", colors["angle"]),
                ((asc_lon + 180) % 360, "Dsc", colors["angle"]),
            ]
        )
    if mc_lon is not None:
        angle_markers.extend(
            [
                (mc_lon, "MC", colors["mc"]),
                ((mc_lon + 180) % 360, "IC", colors["mc"]),
            ]
        )

    for lon, label, color in angle_markers:
        angle = lon_to_angle(lon)
        x1, y1 = _polar(cx, cy, angle, 8 * scale)
        x2, y2 = _polar(cx, cy, angle, sign_inner_r)
        lx, ly = _polar(cx, cy, angle, sign_inner_r - 38 * scale)
        lines.append(_svg_line(x1, y1, x2, y2, color, 2.0 * scale, 0.95))
        lines.append(
            _svg_text(lx, ly, label, color, max(10, int(13 * scale)), 700, ' class="label"')
        )

    placement_by_name = {p["name"]: p for p in placements}
    if aspects:
        for aspect in aspects:
            left = placement_by_name.get(aspect["body_a"])
            right = placement_by_name.get(aspect["body_b"])
            if left is None or right is None:
                continue
            a1 = lon_to_angle(left["longitude"])
            a2 = lon_to_angle(right["longitude"])
            x1, y1 = _polar(cx, cy, a1, aspect_r)
            x2, y2 = _polar(cx, cy, a2, aspect_r)
            aspect_name = aspect["aspect"]
            color = ASPECT_COLORS.get(aspect_name, colors["muted"])
            width = 1.45 * scale if aspect_name in {"conjunction", "square"} else 0.9 * scale
            opacity = 0.78 if aspect_name == "conjunction" else 0.58
            lines.append(_svg_line(x1, y1, x2, y2, color, width, opacity))

    positioned: list[dict[str, float]] = []
    by_longitude = sorted(placements, key=lambda p: p["longitude"])
    min_angular_distance = math.radians(12)
    radius_step = 24 * scale
    max_radius_level = 4
    for placement in by_longitude:
        angle = lon_to_angle(placement["longitude"])
        radius_level = 0
        index = 0
        while index < len(positioned):
            other = positioned[index]
            diff = abs(angle - other["angle"])
            if diff > math.pi:
                diff = 2 * math.pi - diff
            if diff < min_angular_distance and radius_level == other["radius_level"]:
                radius_level = min(radius_level + 1, max_radius_level)
                index = 0
                continue
            index += 1
        positioned.append({"angle": angle, "radius_level": radius_level})

        final_radius = planet_r - radius_level * radius_step
        x, y = _polar(cx, cy, angle, final_radius)
        inner_x, inner_y = _polar(cx, cy, angle, aspect_r)
        lines.append(_svg_line(inner_x, inner_y, x, y, colors["muted"], 0.7 * scale, 0.32))
        glyph = PLANET_GLYPHS.get(placement["name"], placement["name"][:1])
        degree = int(math.floor(placement["degree"]))
        lines.append(
            _svg_text(
                x,
                y - 7 * scale,
                glyph,
                colors["planet"],
                max(17, int(28 * scale)),
                500,
            )
        )
        lines.append(
            _svg_text(
                x,
                y + 16 * scale,
                f"{degree}°",
                colors["muted"],
                max(8, int(11 * scale)),
                400,
                ' class="label"',
            )
        )

    if not placements:
        lines.append(
            _svg_text(
                cx,
                cy,
                "No placements supplied",
                colors["muted"],
                max(12, int(16 * scale)),
                600,
                ' class="label"',
            )
        )

    lines.append("</svg>")
    return "\n".join(lines) + "\n"


def render_html(svg: str, *, title: str = "Astrology Chart Diagram", theme: str = "dark") -> str:
    colors = THEMES[theme]
    return (
        "<!doctype html>\n"
        '<html lang="en">\n'
        "<head>\n"
        '  <meta charset="utf-8">\n'
        '  <meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f"  <title>{_escape(title)}</title>\n"
        "  <style>\n"
        "    body{margin:0;min-height:100vh;display:grid;place-items:center;"
        f"background:{colors['background']};color:{colors['text']};"
        "font-family:Arial,Helvetica,sans-serif;}\n"
        "    main{width:min(96vw,920px);padding:24px;}\n"
        "    svg{display:block;width:100%;height:auto;}\n"
        "  </style>\n"
        "</head>\n"
        "<body><main>\n"
        f"{svg}"
        "</main></body>\n"
        "</html>\n"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Render supplied astrology chart JSON as an SVG wheel."
    )
    parser.add_argument(
        "chart",
        help="Chart JSON file, inline JSON object, or '-' for stdin.",
    )
    parser.add_argument(
        "--format",
        choices=("svg", "html"),
        default="svg",
        help="Output format. SVG is embeddable; HTML wraps it for browser viewing.",
    )
    parser.add_argument(
        "--output",
        "-o",
        help="Write output to a file instead of stdout.",
    )
    parser.add_argument(
        "--theme",
        choices=tuple(THEMES),
        default="dark",
        help="Color theme for the rendered diagram.",
    )
    parser.add_argument(
        "--size",
        type=int,
        default=720,
        help="SVG canvas size in pixels (minimum 360).",
    )
    parser.add_argument(
        "--title",
        help="Accessible title/label and, for HTML, browser title.",
    )
    parser.add_argument(
        "--no-aspects",
        action="store_true",
        help="Suppress aspect lines even when aspects are supplied.",
    )
    args = parser.parse_args(argv)

    try:
        chart = _read_json(args.chart)
        svg = render_svg(
            chart,
            size=args.size,
            theme=args.theme,
            title=args.title,
            include_aspects=not args.no_aspects,
        )
        output = (
            render_html(svg, title=args.title or "Astrology Chart Diagram", theme=args.theme)
            if args.format == "html"
            else svg
        )
    except DiagramError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 2

    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
    else:
        sys.stdout.write(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
