# Usage: python3 tools/make-icons.py   (needs Pillow + numpy)
# Builds the app icons from quran-logo.png on a cream background (the cream of the logo's own disc).
# The logo has a ragged, shadowed notch at its upper right (left over from background removal);
# on cream that shadow would show, so it is painted over with the background colour first.
from PIL import Image, ImageFilter
import numpy as np

BG = (232, 218, 196)  # #e8dac4

def clean_logo():
    l = np.array(Image.open('quran-logo.png').convert('RGBA')).astype(float)
    rgb, a = l[..., :3], l[..., 3] / 255
    mx, mn = rgb.max(2), rgb.min(2)
    sat, lum = (mx - mn) / np.maximum(mx, 1), rgb.mean(2)
    H, W = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    # only touch the area right of the arch's gold outline, in the upper part of the logo
    gold = (sat > 0.35) & (a > 0.5)
    edge = np.full(H, 250)
    for y in range(50, H):
        xs = np.where(gold[y, 150:350])[0]
        if len(xs): edge[y] = 150 + xs.max() + 4
    zone = (xx > edge[:, None]) & (yy <= 340)
    shadow = zone & (sat < 0.35) & (lum < 205)
    mask = Image.fromarray((shadow * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(2))
    mk = np.array(mask) / 255.0 * np.clip((0.42 - sat) / 0.1, 0, 1)  # never cover the gold leaves and star
    comp = rgb * a[..., None] + np.array(BG) * (1 - a[..., None])
    comp = comp * (1 - mk[..., None]) + np.array(BG) * mk[..., None]
    return Image.fromarray(np.dstack([comp, np.maximum(a, mk) * 255]).clip(0, 255).astype(np.uint8), 'RGBA')

def icon(logo, size, scale):
    # scale = logo width as a share of the icon (0.78 matches the earlier green icons)
    big = 1024
    w = round(big * scale); h = round(logo.height * w / logo.width)
    c = Image.new('RGBA', (big, big), BG + (255,))
    c.alpha_composite(logo.resize((w, h), Image.LANCZOS), ((big - w) // 2, (big - h) // 2))
    return c.convert('RGB').resize((size, size), Image.LANCZOS)

logo = clean_logo()
for name, size, scale in [('icon-512.png', 512, 0.78), ('icon-192.png', 192, 0.78),
                          ('apple-touch-icon.png', 180, 0.78),
                          ('icon-maskable-512.png', 512, 0.64)]:  # maskable: logo inside the 80% safe circle
    icon(logo, size, scale).save(name, optimize=True)
    print(name)
