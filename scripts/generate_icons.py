#!/usr/bin/env python3
import os
import zlib
import struct
import math

def make_png(width, height, pixel_fn):
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    
    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    raw = bytearray()
    for y in range(height):
        raw.append(0) # filter None
        for x in range(width):
            r, g, b, a = pixel_fn(x, y, width, height)
            raw.extend([r, g, b, a])
    idat = chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

def avelux_grand_icon_shader(x, y, w, h):
    # Normalized coordinates (-1 to 1)
    nx = (x - w / 2) / (w / 2)
    ny = (y - h / 2) / (h / 2)
    dist = math.sqrt(nx * nx + ny * ny)
    
    # Outer squircle / rounded rect badge
    # x^4 + y^4 formula for smooth squircle
    squircle = math.pow(nx, 4) + math.pow(ny, 4)
    if squircle > 0.85:
        # Border glow
        if squircle <= 0.98:
            return (16, 185, 129, 180) # Emerald glow
        return (0, 0, 0, 0) # Transparent outside
    
    # Background gradient: Dark luxury slate to deep emerald
    bg_factor = (ny + 1) / 2 # 0 at top, 1 at bottom
    r = int(15 * (1 - bg_factor) + 6 * bg_factor)
    g = int(23 * (1 - bg_factor) + 78 * bg_factor)
    b = int(42 * (1 - bg_factor) + 59 * bg_factor)

    # Chess Knight silhouette inside
    # Head and mane coordinates
    # Center knight around (0, 0.05)
    kx = nx * 1.5
    ky = ny * 1.5 - 0.05
    
    # Knight base
    if 0.5 <= ky <= 0.75 and abs(kx) <= (0.75 - (ky - 0.5) * 0.4):
        return (248, 250, 252, 255) # White ivory base

    # Knight body & neck
    if -0.4 <= ky < 0.5 and (kx > -0.5 and kx < 0.4):
        # Mane on the right/back
        if kx > 0.1 and ky < 0.2:
            return (248, 250, 252, 255)
        # Snout / jaw on the left
        if -0.45 <= kx <= 0.2:
            return (248, 250, 252, 255)

    # Snout and nose
    if -0.55 <= kx <= -0.1 and -0.25 <= ky <= 0.05:
        return (248, 250, 252, 255)

    # Ears / crest
    if -0.2 <= kx <= 0.2 and -0.65 <= ky <= -0.35:
        return (248, 250, 252, 255)

    # Crown / Star accent at top right
    cx = nx - 0.4
    cy = ny + 0.45
    c_dist = math.sqrt(cx * cx + cy * cy)
    if c_dist <= 0.2:
        return (245, 158, 11, 255) # Gold crown star

    # Inner subtle border
    if 0.78 < squircle <= 0.84:
        return (52, 211, 153, 220) # Bright emerald rim

    return (r, g, b, 255)

def main():
    sizes = [48, 72, 96, 144, 192, 512]
    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public'))
    for s in sizes:
        png_data = make_png(s, s, avelux_grand_icon_shader)
        target = os.path.join(out_dir, f'icon-{s}.png' if s != 192 else 'icon.png')
        with open(target, 'wb') as f:
            f.write(png_data)
        print(f"Generated {target} ({s}x{s})")

if __name__ == '__main__':
    main()
