"""Genera los PNG y el .ico de MUD Control a partir de la geometria de logo.svg.

Uso:  python branding/build_icons.py
Salida: branding/png/*.png y branding/mud-control.ico
Los tamanos <= 32 px usan una version simplificada (sin pie, cabezas grandes)
para que siga leyendose en la bandeja y la barra de tareas.
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent
SS = 8  # supersampling

# El .ico es uno solo para tema claro y oscuro: tono medio que contrasta en ambos.
ICO_COLOR = (29, 158, 117, 255)     # #1D9E75
LIGHT = (15, 110, 86, 255)          # #0F6E56  (fondos claros)
DARK = (93, 202, 165, 255)          # #5DCAA5  (fondos oscuros)


def draw_full(size, color):
    s = size * SS / 96
    im = Image.new('RGBA', (size * SS, size * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    S = lambda *v: [round(x * s) for x in v]
    # PIL dibuja el borde hacia dentro: caja exterior = rect del SVG +/- media linea
    d.rounded_rectangle(S(5, 9, 91, 71), radius=round(11 * s), outline=color, width=round(6 * s))
    for cx in (30, 48, 66):
        d.ellipse(S(cx - 6, 28, cx + 6, 40), fill=color)
        d.pieslice(S(cx - 10, 44, cx + 10, 64), 180, 360, fill=color)
    d.rectangle(S(40, 68, 56, 78), fill=color)
    d.rounded_rectangle(S(30, 78, 66, 84), radius=round(3 * s), fill=color)
    return im.resize((size, size), Image.LANCZOS)


def draw_small(size, color):
    s = size * SS / 96
    im = Image.new('RGBA', (size * SS, size * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    S = lambda *v: [round(x * s) for x in v]
    d.rounded_rectangle(S(4, 14, 92, 82), radius=round(12 * s), outline=color, width=round(12 * s))
    if size <= 24:
        # a 16-24 px solo caben tres puntos: un usuario por punto
        for cx in (28, 48, 68):
            d.ellipse(S(cx - 9, 39, cx + 9, 57), fill=color)
    else:
        for cx in (29, 48, 67):
            d.ellipse(S(cx - 7, 30, cx + 7, 44), fill=color)
            d.pieslice(S(cx - 10, 48, cx + 10, 68), 180, 360, fill=color)
    return im.resize((size, size), Image.LANCZOS)


def icon(size, color):
    return draw_small(size, color) if size <= 32 else draw_full(size, color)


def main():
    png = OUT / 'png'
    png.mkdir(exist_ok=True)
    for size in (16, 24, 32, 48, 64, 128, 256, 512, 1024):
        icon(size, ICO_COLOR).save(png / f'icon-{size}.png')
        icon(size, LIGHT).save(png / f'icon-{size}-light.png')
        icon(size, DARK).save(png / f'icon-{size}-dark.png')
    sizes = (16, 20, 24, 32, 40, 48, 64, 128, 256)
    frames = [icon(n, ICO_COLOR) for n in sizes]
    frames[-1].save(OUT / 'mud-control.ico', format='ICO', sizes=[(n, n) for n in sizes],
                    append_images=frames[:-1])
    print('OK:', png, OUT / 'mud-control.ico')


if __name__ == '__main__':
    main()
