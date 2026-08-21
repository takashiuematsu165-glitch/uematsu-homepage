from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont

CANVAS = (1200, 630)
FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
BOLD_FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"


def font(size, bold=False):
    return ImageFont.truetype(BOLD_FONT if bold else FONT, size, index=0)


def wrap(draw, value, typeface, width, max_lines):
    words = list(value)
    lines, current = [], ""
    for char in words:
        candidate = current + char
        if draw.textbbox((0, 0), candidate, font=typeface)[2] <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = char
            if len(lines) == max_lines:
                break
    if current and len(lines) < max_lines:
        lines.append(current)
    if len(lines) == max_lines and "".join(lines) != value:
        last = lines[-1]
        while draw.textbbox((0, 0), last + "…", font=typeface)[2] > width and last:
            last = last[:-1]
        lines[-1] = last + "…"
    return lines


def draw_multiline(draw, lines, x, y, typeface, color, leading):
    for line in lines:
        draw.text((x, y), line, font=typeface, fill=color)
        y += leading


def main():
    output = Path(sys.argv[1])
    title = sys.argv[2]
    description = sys.argv[3]
    date = sys.argv[4]
    image = Image.new("RGB", CANVAS, "#F5F7FF")
    draw = ImageDraw.Draw(image, "RGBA")

    draw.ellipse((690, -180, 1320, 450), fill=(43, 194, 255, 72))
    draw.ellipse((-220, 345, 500, 980), fill=(255, 93, 177, 56))
    draw.ellipse((785, 405, 1180, 800), fill=(148, 225, 77, 50))
    draw.rounded_rectangle((52, 48, 1148, 582), radius=38, fill=(255, 255, 255, 208), outline=(56, 85, 255, 38), width=2)
    draw.rounded_rectangle((93, 91, 312, 133), radius=18, fill=(56, 85, 255, 28))
    draw.text((114, 99), "NEWS  /  KOKI UEMATSU", font=font(21, True), fill="#3855FF")
    draw.text((96, 160), date or "NEWS", font=font(23, False), fill="#59627D")
    title_lines = wrap(draw, title, font(62, True), 930, 3)
    draw_multiline(draw, title_lines, 94, 204, font(62, True), "#141827", 84)
    description_lines = wrap(draw, description, font(27, False), 820, 2)
    description_y = 204 + len(title_lines) * 84 + 22
    draw_multiline(draw, description_lines, 96, description_y, font(27, False), "#59627D", 42)
    draw.line((96, 538, 1104, 538), fill=(20, 24, 39, 30), width=2)
    draw.text((96, 550), "takashiuematsu165-glitch.github.io", font=font(18, False), fill="#59627D")
    draw.rounded_rectangle((1006, 526, 1104, 564), radius=18, fill=(56, 85, 255, 34))
    draw.text((1033, 533), "NEWS", font=font(18, True), fill="#3855FF")
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, "PNG", optimize=True)


if __name__ == "__main__":
    main()
