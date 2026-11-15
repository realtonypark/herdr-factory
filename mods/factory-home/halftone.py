#!/usr/bin/env python3
"""Paint the factory home background: a dithered dusk, dot by dot.

The look: a square grid of dots whose size follows the light, over a warm
near-black. The plume rises from the bottom-right corner, a soft lobe sweeps
across the middle, and a faint glow sits at the top-left edge.

Regenerate after a change:

    python3 halftone.py

Writes halftone.png beside this script (2400x1400, dots at 12 px, so one dot
is 6 px at zoom 1 and stays crisp at 2x).
"""

import math

from PIL import Image, ImageDraw

WIDTH, HEIGHT = 2400, 1400
PITCH = 12          # dot grid, image px
BACKGROUND = "#070605"

# The colour ramp: light, then hex. Dots take the colour of their own light,
# so the field shades smoothly instead of stepping between bands.
RAMP = [
    (0.00, "#1b0d07"),
    (0.40, "#6f280c"),
    (0.72, "#c84911"),
    (0.90, "#e8661c"),
    (0.97, "#ff8a38"),
    (1.00, "#ffc07f"),
]

# Dot radius, as a fraction of the pitch, at no light and at full light.
SMALL, LARGE = 0.10, 0.44


def blob(x, y, cx, cy, sx, sy):
    return math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2))


def light(x, y):
    """Light at a point, 0 to 1."""
    value = (
        0.95 * blob(x, y, 1.02, 1.06, 0.28, 0.36)
        + 0.30 * blob(x, y, 0.92, 0.44, 0.50, 0.60)
        + 0.60 * blob(x, y, 0.96, 0.48, 0.14, 0.48)
        + 0.55 * blob(x, y, 0.68, 0.80, 0.31, 0.24)
        + 0.18 * blob(x, y, 0.55, 0.55, 0.22, 0.16)
        + 0.16 * blob(x, y, 0.80, 0.24, 0.10, 0.14)
        + 0.12 * blob(x, y, 0.62, 0.40, 0.09, 0.10)
        + 0.22 * blob(x, y, 0.06, 0.02, 0.16, 0.10)
    )
    # Leave the middle quiet: the question and the composer sit there.
    value *= 1 - 0.45 * blob(x, y, 0.50, 0.46, 0.24, 0.24)
    value = max(0.0, min(1.0, value))
    return value + 0.09           # a fine texture even in the dark


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def colour_of(value):
    """The ramp's colour at a light value, interpolated in RGB."""
    stops = [(light, tuple(int(h[i : i + 2], 16) for i in (1, 3, 5))) for light, h in RAMP]
    for (low, a), (high, b) in zip(stops, stops[1:]):
        if value <= high:
            return mix(a, b, 0 if high == low else (value - low) / (high - low))
    return stops[-1][1]


def grain(cx, cy):
    """A stable +/- nudge, so the field dithers instead of banding."""
    return (((cx * 7 + cy * 13) % 5) - 2)


def main():
    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)
    cols = WIDTH // PITCH
    rows = HEIGHT // PITCH
    for row in range(rows):
        y = (row + 0.5) * PITCH
        for col in range(cols):
            x = (col + 0.5) * PITCH
            value = light(x / WIDTH, y / HEIGHT) + grain(col, row) * 0.014
            if value <= 0.045:
                continue
            colour = colour_of(min(0.985, value))
            radius = max(0.9, (SMALL + (LARGE - SMALL) * value ** 1.2) * PITCH)
            radius *= 1 + grain(row, col) * 0.02
            draw.ellipse(
                (x - radius, y - radius, x + radius, y + radius),
                fill=colour,
            )
    image.save("halftone.png")
    print("wrote halftone.png", image.size)


if __name__ == "__main__":
    main()
