#!/usr/bin/env python3
"""Propitae · generador de páginas de la web.

Crea a partir de datos:
  - el catálogo   inmuebles/index.html y una ficha por inmueble (inmuebles/inmuebles.json)
  - el blog       blog/index.html y un artículo por archivo de tools/blog/*.md
  - sitemap.xml, llms.txt y llms-full.txt (para buscadores y asistentes de IA)

Uso:  python3 tools/generar.py      (necesita la librería «markdown»: pip install markdown)
Lo ejecuta solo la acción de GitHub al cambiar los datos. Las páginas generadas
no se editan a mano: se cambian los datos y se vuelve a generar.
"""
import json, re, html, datetime, pathlib, unicodedata
import markdown

RAIZ = pathlib.Path(__file__).resolve().parent.parent
WEB = 'https://propitae.es'
HOY = datetime.date.today().isoformat()
MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
WA = '34665288919'
E = lambda s: html.escape(str(s if s is not None else ''), quote=True)

AUTORES = {
    'wilson': {'nombre': 'Wilson Vásquez', 'url': '/equipo/wilson-vasquez/', 'foto': '/assets/img/wilson.webp',
               'cargo': 'Asesor inmobiliario en Propitae. Técnico Superior en Proyectos de Edificación.'},
    'alexandra': {'nombre': 'Alexandra Pilapanta', 'url': '/equipo/alexandra-pilapanta/', 'foto': '/assets/img/alexandra.webp',
                  'cargo': 'Asesora inmobiliaria en Propitae. Venta, compra y financiación hipotecaria.'},
}


def fecha_larga(iso):
    d = datetime.date.fromisoformat(iso)
    return f'{d.day} de {MESES[d.month - 1]} de {d.year}'


def eur(n):
    return f'{n:,.0f}'.replace(',', '.') + ' €'


def num(n):
    return f'{n:,.0f}'.replace(',', '.')


def slug(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def rel(depth):
    return '../' * depth


def ld(obj):
    return '<script type="application/ld+json">\n' + json.dumps(obj, ensure_ascii=False, indent=2) + '\n</script>'


def migas(items):
    """items: [(nombre, url o None)] → JSON-LD BreadcrumbList"""
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, **({'item': WEB + u} if u else {})} for i, (n, u) in enumerate(items)]}


def migas_html(items, depth, claro=False):
    lis = ''.join(f'<li><a href="{rel(depth)}{u.lstrip("/")}">{E(n)}</a></li>' if u else f'<li aria-current="page">{E(n)}</li>' for n, u in items)
    return f'<nav class="breadcrumbs{" breadcrumbs--claro" if claro else ""}" aria-label="Migas de pan"><ol>{lis}</ol></nav>'


# ---------------------------------------------------------------- piezas comunes
def cabeza(depth, titulo, desc, url, imagen='/assets/img/og-propitae.jpg', robots='index, follow, max-image-preview:large', datos=(), tipo='website', extra=''):
    r = rel(depth)
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://formsubmit.co; form-action 'self' https://formsubmit.co; base-uri 'self'; object-src 'none'; upgrade-insecure-requests">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>{E(titulo)}</title>
<meta name="description" content="{E(desc)}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{WEB}{url}">
<meta property="og:type" content="{tipo}">
<meta property="og:site_name" content="Propitae">
<meta property="og:locale" content="es_ES">
<meta property="og:title" content="{E(titulo)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{WEB}{url}">
<meta property="og:image" content="{WEB}{imagen}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0B0B0C">
<link rel="icon" type="image/png" sizes="32x32" href="{r}assets/img/favicon-32.png">
<link rel="apple-touch-icon" href="{r}assets/img/apple-touch-icon.png">
<link rel="manifest" href="{r}site.webmanifest">
<link rel="alternate" type="text/plain" title="Resumen para asistentes de IA" href="/llms.txt">
<link rel="preload" href="{r}assets/fonts/inter-tight-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{r}assets/css/marca.css">
<link rel="stylesheet" href="{r}assets/css/base.css">
<link rel="stylesheet" href="{r}assets/css/extras.css">
<script src="{r}assets/js/site.js" defer></script>{extra}
{chr(10).join(ld(d) for d in datos)}
</head>
<body>
<a class="sr-only" href="#contenido">Saltar al contenido</a>
'''


def cabecera(depth, actual=''):
    r = rel(depth)
    enl = [('Vender', '#vender', ''), ('Personal Shopper', '#personal-shopper', ''), ('Financiación', '#financiar', ''),
           ('Inmuebles', 'inmuebles/', 'inmuebles'), ('Blog', 'blog/', 'blog')]
    nav = ''.join(f'<a href="{r}{h}"{" aria-current=\"page\"" if k and k == actual else ""}>{n}</a>' for n, h, k in enl)
    return f'''<header class="site-header">
<div class="wrap">
<a class="brand" href="{r or './'}" aria-label="Propitae, inicio">
<img src="{r}assets/img/propitae-blanco-mark.svg" alt="Propitae" width="172" height="26">
<span class="by">By <img src="{r}assets/img/huspy-blanco.svg" alt="Huspy" width="54" height="14"></span>
</a>
<nav class="site-nav" aria-label="Principal">
{nav}<a class="cta" href="{r}#contacto">Contactar</a>
</nav>
</div>
</header>
'''


def pie(depth, scripts=()):
    r = rel(depth)
    sc = ''.join(f'\n<script src="{r}{s}" defer></script>' for s in scripts)
    return f'''<footer class="site-footer">
<div class="wrap">
<div class="footer-top">
<img class="logo" src="{r}assets/img/propitae-blanco.svg" alt="Propitae, la inmobiliaria de personas para personas" width="320" height="91">
<div class="footer-cols">
<nav aria-label="Servicios"><h2>Servicios</h2>
<a href="{r}#vender">Vender tu casa</a><a href="{r}#personal-shopper">Personal Shopper</a><a href="{r}#financiar">Financiación</a></nav>
<nav aria-label="Propitae"><h2>Propitae</h2>
<a href="{r}inmuebles/">Inmuebles</a><a href="{r}blog/">Blog</a><a href="{r}equipo/">Equipo</a><a href="{r}#contacto">Contacto</a></nav>
<nav aria-label="Legal"><h2>Legal</h2>
<a href="{r}aviso-legal/">Aviso legal</a><a href="{r}privacidad/">Privacidad</a><a href="{r}cookies/">Cookies</a></nav>
</div>
</div>
<div class="footer-bottom">
<span>© {datetime.date.today().year} Propitae · Asesores inmobiliarios independientes · Madrid</span>
<span class="huspy">Con el respaldo de <img src="{r}assets/img/huspy-blanco.svg" alt="Huspy" width="70" height="18"></span>
</div>
</div>
</footer>
<a class="wa-float" href="https://wa.me/{WA}?text=Hola%2C%20os%20escribo%20desde%20la%20web%20propitae.es%20y%20me%20gustar%C3%ADa%20recibir%20informaci%C3%B3n." target="_blank" rel="noopener noreferrer" aria-label="Escríbenos por WhatsApp">
{SVG_WA}
<span>WhatsApp</span>
</a>
<div class="aviso-cookies" role="region" aria-label="Aviso de cookies" hidden>
<p>Esta web <strong>no usa cookies</strong> de seguimiento ni de publicidad. <a href="{r}cookies/">Más información</a></p>
<button type="button" class="aviso-cookies-ok">Entendido</button>
</div>{sc}
</body>
</html>
'''


SVG_WA = '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.5-4.5a8.4 8.4 0 1 1 15.5-4.4Z"/><path d="M9 8.6c.2-.4.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.7l-.5.6c.6 1.2 1.6 2.2 2.8 2.8l.6-.5c.2-.2.5-.2.7-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3-.2.6-.5.8-.6.4-1.4.5-2.1.3-2.5-.8-4.5-2.8-5.3-5.3-.2-.7-.1-1.4.3-2Z"/></svg>'
ICO = {
    'm2': '<path d="M3 21V3h18v18z"/><path d="M3 9h6V3M15 21v-6h6"/>',
    'parcela': '<path d="M3 20l5-14 4 8 3-5 6 11z"/>',
    'hab': '<path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M3 18v2M21 18v2M6 10V6h12v4"/>',
    'bano': '<path d="M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM6 12V5a2 2 0 0 1 4 0"/>',
    'ano': '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    'tel': '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    'pdf': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14l3 3 3-3"/>',
}
svg = lambda k, w=20: f'<svg aria-hidden="true" width="{w}" height="{w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{ICO[k]}</svg>'


def escribir(ruta, texto):
    p = RAIZ / ruta
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(texto, encoding='utf-8')


# ---------------------------------------------------------------- catálogo
def pastillas(i):
    p = []
    if i.get('superficie'): p.append(f"{num(i['superficie'])} m²")
    if i.get('habitaciones'): p.append(f"{i['habitaciones']} hab.")
    if i.get('banos'): p.append(f"{i['banos']} baños")
    if i.get('parcela'): p.append(f"Parcela {num(i['parcela'])} m²")
    return p


def tarjeta_inmueble(i, depth):
    r = rel(depth)
    foto = i['fotos'][0]
    etiqueta = 'Exclusiva' if i.get('exclusiva') and i['estado'] == 'En venta' else i['estado']
    return f'''<a class="inm-card rv" href="{r}inmuebles/{i['slug']}/">
<div class="foto"><img src="{r}inmuebles/{i['slug']}/fotos/{foto[0]}-m.webp" alt="{E(foto[1])}" width="800" height="533" loading="lazy"><span class="tag">{E(etiqueta)}</span></div>
<div class="cuerpo"><span class="precio">{eur(i['precio'])}</span><h3>{E(i['titulo'])} {E(i.get('titulo_remate', ''))}</h3><span class="zona">{E(i['zona'])} · {E(i['municipio'])}</span>
<ul class="pastillas">{''.join(f'<li>{E(x)}</li>' for x in pastillas(i))}</ul></div>
</a>'''


def ficha_inmueble(i, todos):
    d = 2
    url = f"/inmuebles/{i['slug']}/"
    titulo = f"{i['titulo_seo']} | Propitae"
    fotos = i['fotos']
    base = f"fotos/"
    msg = f"Hola, me interesa la {i['titulo'].lower()} (ref. {i['ref']}) que he visto en propitae.es. ¿Podemos concertar una visita?"
    wa = f"https://wa.me/{WA}?text=" + re.sub(r'[^A-Za-z0-9\-_.~]', lambda m: ''.join(f'%{b:02X}' for b in m.group(0).encode()), msg)
    datos_tabla = [('Precio', eur(i['precio'])), ('Precio por m²', f"{num(round(i['precio'] / i['superficie']))} €/m²"),
                   ('Superficie construida', f"{num(i['superficie'])} m²"), ('Parcela', f"{num(i['parcela'])} m²" if i.get('parcela') else None),
                   ('Habitaciones', i.get('habitaciones')), ('Baños', i.get('banos')), ('Año de construcción', i.get('ano')),
                   ('Estado de conservación', i.get('conservacion')), ('Certificado energético', i.get('certificado')),
                   ('Orientación', i.get('orientacion')), ('IBI', f"{num(i['ibi_anual'])} €/año" if i.get('ibi_anual') else None),
                   ('Gastos de comunidad', i.get('comunidad')), ('Disponibilidad', i.get('disponibilidad')), ('Referencia', i['ref'])]
    tabla = ''.join(f'<tr><th scope="row">{E(k)}</th><td>{E(v)}</td></tr>' for k, v in datos_tabla if v)
    gal = ''.join(f'<button type="button" data-foto="{n}" aria-label="Ver foto: {E(f[1])}"><img src="{base}{f[0]}{"" if n == 0 else "-m"}.webp" alt="{E(f[1])}" width="{1600 if n == 0 else 800}" height="{1067 if n == 0 else 533}"{" fetchpriority=\"high\"" if n == 0 else " loading=\"lazy\""}>{f"<span class=\"mas\">Ver las {len(fotos)} fotos</span>" if n == 4 else ""}</button>' for n, f in enumerate(fotos[:5]))
    listado_fotos = json.dumps([[f'{base}{f[0]}.webp', f[1]] for f in fotos], ensure_ascii=False)
    otras = [o for o in todos if o['slug'] != i['slug'] and o['estado'] != 'Vendido']
    schema = {
        '@context': 'https://schema.org', '@type': 'RealEstateListing', '@id': WEB + url + '#anuncio', 'url': WEB + url,
        'name': i['titulo_seo'], 'description': i['descripcion_seo'], 'datePosted': i['fecha'], 'inLanguage': 'es-ES',
        'image': [f"{WEB}{url}{base}{f[0]}.webp" for f in fotos[:8]],
        'offers': {'@type': 'Offer', 'price': i['precio'], 'priceCurrency': 'EUR',
                   'availability': 'https://schema.org/' + ('InStock' if i['estado'] == 'En venta' else 'SoldOut'),
                   'seller': {'@id': WEB + '/#organizacion'}},
        'about': {'@type': i.get('tipo_schema', 'Residence'), 'name': i['titulo'],
                  'floorSize': {'@type': 'QuantitativeValue', 'value': i['superficie'], 'unitCode': 'MTK'},
                  'numberOfRooms': i.get('habitaciones'), 'numberOfBathroomsTotal': i.get('banos'), 'yearBuilt': i.get('ano'),
                  'address': {'@type': 'PostalAddress', 'addressLocality': i['municipio'], 'addressRegion': i['provincia'], 'addressCountry': 'ES'},
                  'amenityFeature': [{'@type': 'LocationFeatureSpecification', 'name': c, 'value': True} for c in i.get('comodidades', [])]},
        'provider': {'@id': WEB + '/#organizacion'}}
    mig = [('Inicio', '/'), ('Inmuebles', '/inmuebles/'), (i['titulo'], None)]
    robots = 'index, follow, max-image-preview:large' if i.get('indexar') else 'noindex, follow'
    h = cabeza(d, titulo, i['descripcion_seo'], url, f"{url}compartir.jpg", robots, [schema, migas(mig)], 'website')
    h += cabecera(d, 'inmuebles')
    h += f'''<main id="contenido">
<div class="wrap">
<div class="ficha-cab">
<div>{migas_html(mig, d, True)}
<h1>{E(i['titulo'])} <span class="serif">{E(i.get('titulo_remate', ''))}</span></h1>
<p class="zona">{E(i['zona'])} · {E(i['municipio'])}, {E(i['provincia'])}</p></div>
<div class="precio">{eur(i['precio'])}<small>{'En exclusiva · ' if i.get('exclusiva') else ''}Ref. {E(i['ref'])}</small></div>
</div>
<div class="galeria" data-galeria='{E(listado_fotos)}'>{gal}</div>
<ul class="ficha-datos">
<li>{svg('m2')}<b>{num(i['superficie'])} m²</b> construidos</li>
{f"<li>{svg('parcela')}<b>{num(i['parcela'])} m²</b> de parcela</li>" if i.get('parcela') else ''}
<li>{svg('hab')}<b>{i['habitaciones']}</b> habitaciones</li>
<li>{svg('bano')}<b>{i['banos']}</b> baños</li>
{f"<li>{svg('ano')}Construida en <b>{i['ano']}</b></li>" if i.get('ano') else ''}
</ul>
<div class="ficha-cuerpo">
<div>
<section class="ficha-bloque rv"><h2>La casa</h2>
<p class="entrada">{E(i['entrada'])}</p>
{''.join(f'<p>{E(p)}</p>' for p in i['descripcion'])}
</section>
<section class="ficha-bloque rv"><h2>Lo que la hace <span class="serif">única</span></h2>
<ul class="rasgos">{''.join(f'<li><b>{E(a)}</b><span>{E(b)}</span></li>' for a, b in i['rasgos'])}</ul>
</section>
<section class="ficha-bloque rv"><h2>Ficha <span class="serif">técnica</span></h2>
<table class="tabla-ficha"><tbody>{tabla}</tbody></table>
<ul class="comodidades">{''.join(f'<li>{E(c)}</li>' for c in i.get('comodidades', []))}</ul>
</section>
{f"""<section class="ficha-bloque rv"><h2>Imagina tu vida <span class="serif">aquí</span></h2>
<ul class="rasgos">{''.join(f'<li><b>{E(a)}</b><span>{E(b)}</span></li>' for a, b in i['potencial'])}</ul>
</section>""" if i.get('potencial') else ''}
<section class="ficha-bloque rv"><h2>Cómo <span class="serif">trabajamos</span></h2>
<p>Cuando haya un acuerdo, comprador y propietario os sentáis en la misma mesa para hablar de la casa. Las arras y los pagos se hacen directamente al propietario: nunca cobramos dinero en nombre de nadie.</p>
<p>Si necesitas hipoteca, estudiamos tu caso a fondo y comparamos ofertas de varios bancos antes de que des el paso.</p>
</section>
</div>
<aside class="ficha-lateral" aria-label="Contacto">
<div class="caja-contacto">
<span class="precio">{eur(i['precio'])}</span>
<p class="ref">{E(i['tipo'])} · Ref. {E(i['ref'])}</p>
<a class="btn btn-wa btn-bloque" href="{E(wa)}" target="_blank" rel="noopener noreferrer">{SVG_WA.replace('width="26" height="26"', 'width="20" height="20"')}Pedir visita por WhatsApp</a>
<a class="btn btn-negro btn-bloque" href="tel:+{WA}">{svg('tel')}Llamar: 665 288 919</a>
{f'<a class="btn btn-borde btn-bloque" href="{E(i["dossier"])}" target="_blank" rel="noopener">{svg("pdf")}Descargar el dosier</a>' if i.get('dossier') else ''}
<div class="asesores"><img src="{rel(d)}assets/img/wilson.webp" alt="" width="48" height="48"><img src="{rel(d)}assets/img/alexandra.webp" alt="" width="48" height="48"><span><b>Wilson y Alexandra</b><br>Te la enseñamos cuando mejor te venga.</span></div>
</div>
<div class="caja-financiar"><b>¿Necesitas financiación?</b>Estudio gratuito de tu capacidad de compra y comparación de ofertas de varios bancos. <a href="{rel(d)}#financiar">Cómo te ayudamos</a></div>
</aside>
</div>
</div>
{f"""<section class="wrap otras"><h2 style="font-size:clamp(26px,2.6vw,34px);letter-spacing:-.02em;margin:0 0 24px">Otros inmuebles</h2><div class="inm-lista">{''.join(tarjeta_inmueble(o, d) for o in otras[:3])}</div></section>""" if otras else ''}
<div class="visor" hidden role="dialog" aria-modal="true" aria-label="Fotos del inmueble">
<div class="barra"><span data-cuenta></span><button type="button" data-cerrar aria-label="Cerrar">✕</button></div>
<div class="escena"><button type="button" class="flecha ant" data-ant aria-label="Foto anterior">‹</button><figure><img alt=""><figcaption></figcaption></figure><button type="button" class="flecha sig" data-sig aria-label="Foto siguiente">›</button></div>
</div>
</main>
'''
    h += pie(d, ['assets/js/inmueble.js'])
    escribir(f"inmuebles/{i['slug']}/index.html", h)


def catalogo():
    datos = json.loads((RAIZ / 'inmuebles/inmuebles.json').read_text(encoding='utf-8'))['inmuebles']
    visibles = [i for i in datos if i['estado'] != 'Vendido'] + [i for i in datos if i['estado'] == 'Vendido']
    for i in datos:
        ficha_inmueble(i, datos)
    indexar = any(i.get('indexar') for i in datos)
    d = 1
    mig = [('Inicio', '/'), ('Inmuebles', None)]
    lista = {'@context': 'https://schema.org', '@type': 'ItemList', 'name': 'Inmuebles en venta de Propitae',
             'itemListElement': [{'@type': 'ListItem', 'position': n + 1, 'url': f"{WEB}/inmuebles/{i['slug']}/", 'name': i['titulo_seo']}
                                 for n, i in enumerate(x for x in visibles if x.get('indexar'))]}
    h = cabeza(d, 'Inmuebles en venta en el Corredor del Henares y Madrid | Propitae',
               'Casas y pisos en venta que comercializa Propitae en el Corredor del Henares, Guadalajara y Madrid: fotos, ficha técnica, precio y visita con los asesores.',
               '/inmuebles/', robots='index, follow, max-image-preview:large' if indexar else 'noindex, follow', datos=[lista, migas(mig)])
    h += cabecera(d, 'inmuebles')
    h += f'''<main id="contenido">
<section class="page-hero">
<div class="wrap">
{migas_html(mig, d)}
<p class="eyebrow">Inmuebles</p>
<h1>Casas en venta <span class="serif">con personas.</span></h1>
<p class="lead">Viviendas que comercializamos en el Corredor del Henares y alrededores. Te las enseñamos nosotros y te acompañamos hasta la notaría.</p>
</div>
</section>
<section class="wrap seccion">
{f'<div class="inm-lista">{"".join(tarjeta_inmueble(i, d) for i in visibles)}</div>' if visibles else '<div class="inm-vacio">Estamos preparando las próximas viviendas. Si buscas algo concreto, escríbenos y lo buscamos por ti.</div>'}
</section>
<section class="wrap" style="padding-bottom:var(--p-seccion)">
<div class="cta-bloque" style="margin-top:0"><strong>¿No encuentras lo que buscas?</strong><span>Con el Personal Shopper inmobiliario buscamos, visitamos y negociamos por ti. Y si vendes, valoramos tu casa gratis y sin compromiso.</span>
<div style="display:flex;flex-wrap:wrap;gap:10px"><a class="btn btn-azul" href="../#personal-shopper">Busco casa</a><a class="btn btn-borde" style="color:#FFF;border-color:rgba(255,255,255,.45)" href="../#contacto">Quiero vender</a></div></div>
</section>
</main>
'''
    h += pie(d)
    escribir('inmuebles/index.html', h)
    return datos


# ---------------------------------------------------------------- blog
def leer_articulos():
    arts = []
    for f in sorted((RAIZ / 'tools/blog').glob('*.md')):
        t = f.read_text(encoding='utf-8')
        cab, cuerpo = t.split('\n---\n', 1)
        a = json.loads(cab)
        a['cuerpo_md'] = cuerpo.strip()
        a.setdefault('slug', f.stem)
        a.setdefault('modificado', a['fecha'])
        a['palabras'] = len(re.findall(r'\w+', cuerpo))
        a['minutos'] = max(3, round(a['palabras'] / 220))
        if a.get('publicar', True):
            arts.append(a)
    arts.sort(key=lambda a: a.get('orden', 99))
    return sorted(arts, key=lambda a: a['fecha'], reverse=True)


def articulo(a, todos):
    d = 2
    url = f"/blog/{a['slug']}/"
    md = markdown.Markdown(extensions=['tables', 'attr_list', 'toc', 'sane_lists'], extension_configs={'toc': {'slugify': lambda v, s: slug(v)}})
    cuerpo = md.convert(a['cuerpo_md'])
    cuerpo = re.sub(r'<table>', '<div class="tabla"><table>', cuerpo).replace('</table>', '</table></div>')
    h2 = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', cuerpo)
    indice = '' if len(h2) < 3 else '<nav class="indice" aria-label="Índice"><strong>En este artículo</strong><ol>' + ''.join(f'<li><a href="#{i}">{re.sub("<[^>]+>", "", t)}</a></li>' for i, t in h2) + ('<li><a href="#preguntas-frecuentes">Preguntas frecuentes</a></li>' if a.get('faq') else '') + '</ol></nav>'
    faq = ''
    if a.get('faq'):
        faq = '<h2 id="preguntas-frecuentes">Preguntas frecuentes</h2><div class="faq">' + ''.join(f'<details><summary>{E(q)}</summary><p>{E(r)}</p></details>' for q, r in a['faq']) + '</div>'
    fuentes = ''
    if a.get('fuentes'):
        fuentes = '<section class="fuentes"><h2>Fuentes</h2><ul>' + ''.join(f'<li><a href="{E(u)}" rel="noopener" target="_blank">{E(n)}</a></li>' for n, u in a['fuentes']) + f'</ul><p>Datos consultados el {fecha_larga(a["modificado"])}. Si alguna cifra ha cambiado, avísanos y la actualizamos.</p></section>'
    au = AUTORES[a.get('autor', 'wilson')]
    cta = a.get('cta', ['¿Quieres saber cuánto vale tu casa?', 'Valoración gratuita y sin compromiso, con datos de ventas de tu zona.', 'Pedir valoración'])
    rel_arts = [x for x in todos if x['slug'] != a['slug'] and x['categoria'] == a['categoria']][:2] or [x for x in todos if x['slug'] != a['slug']][:2]
    mig = [('Inicio', '/'), ('Blog', '/blog/'), (a['titulo_corto'] if a.get('titulo_corto') else a['titulo'], None)]
    post = {'@context': 'https://schema.org', '@type': 'BlogPosting', 'headline': a['titulo'][:110], 'description': a['descripcion'],
            'image': WEB + a.get('imagen', '/assets/img/og-propitae.jpg'), 'datePublished': a['fecha'], 'dateModified': a['modificado'],
            'inLanguage': 'es-ES', 'mainEntityOfPage': WEB + url, 'wordCount': a['palabras'], 'articleSection': a['categoria'],
            'keywords': ', '.join(a.get('claves', [])),
            'author': {'@id': WEB + au['url'] + '#persona', '@type': 'Person', 'name': au['nombre'], 'url': WEB + au['url']},
            'publisher': {'@id': WEB + '/#organizacion'}, 'isPartOf': {'@id': WEB + '/blog/#blog'},
            **({'about': [{'@type': 'Place', 'name': p} for p in a['lugares']]} if a.get('lugares') else {}),
            **({'citation': [u for _, u in a['fuentes']]} if a.get('fuentes') else {})}
    datos = [post, migas(mig)]
    if a.get('faq'):
        datos.append({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
            {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': r}} for q, r in a['faq']]})
    h = cabeza(d, f"{a.get('titulo_seo', a['titulo'])} | Propitae", a['descripcion'], url, a.get('imagen', '/assets/img/og-propitae.jpg'), datos=datos, tipo='article',
               extra=f'\n<meta property="article:published_time" content="{a["fecha"]}">\n<meta property="article:modified_time" content="{a["modificado"]}">\n<meta name="author" content="{E(au["nombre"])}">')
    h += cabecera(d, 'blog')
    h += f'''<main id="contenido">
<article>
<header class="page-hero"><div class="wrap" style="max-width:960px">
{migas_html(mig, d)}
<p class="eyebrow">{E(a['categoria'])}</p>
<h1 style="text-transform:none;font-size:clamp(36px,5vw,62px);line-height:1.04;font-weight:700">{a['titulo_html'] if a.get('titulo_html') else E(a['titulo'])}</h1>
<p class="lead">{E(a['entradilla'])}</p>
<p class="meta">Por <a href="{rel(d)}{au['url'].lstrip('/')}">{E(au['nombre'])}</a> · <time datetime="{a['fecha']}">{fecha_larga(a['fecha'])}</time>{f' · actualizado el <time datetime="{a["modificado"]}">{fecha_larga(a["modificado"])}</time>' if a['modificado'] != a['fecha'] else ''} · {a['minutos']} min de lectura</p>
</div></header>
<div class="prose">
<div class="respuesta"><p>{a['respuesta']}</p></div>
{indice}
{cuerpo}
{faq}
<aside class="cta-bloque"><strong>{E(cta[0])}</strong><span>{E(cta[1])}</span><a class="btn btn-azul" href="{rel(d)}#contacto">{E(cta[2])}</a></aside>
<aside class="autor"><img src="{rel(d)}{au['foto'].lstrip('/')}" alt="" width="72" height="72"><div><strong>{E(au['nombre'])}</strong><br><span>{E(au['cargo'])} <a href="{rel(d)}{au['url'].lstrip('/')}">Ver perfil</a></span></div></aside>
{fuentes}
</div>
</article>
{f"""<section class="wrap" style="padding-bottom:var(--p-seccion)"><h2 style="font-size:clamp(26px,2.6vw,34px);letter-spacing:-.02em;margin:0 0 24px">Sigue leyendo</h2><div class="cards">{''.join(tarjeta_articulo(x, d) for x in rel_arts)}</div></section>""" if rel_arts else ''}
</main>
'''
    h += pie(d)
    escribir(f"blog/{a['slug']}/index.html", h)


def tarjeta_articulo(a, depth):
    return f'''<a class="card rv" href="{rel(depth)}blog/{a['slug']}/" data-cat="{slug(a['categoria'])}">
<span class="tag tag--azul">{E(a['categoria'])}</span>
<h3>{E(a['titulo'])}</h3>
<p>{E(a['descripcion'])}</p>
<p class="fecha">{fecha_larga(a['fecha'])} · {a['minutos']} min</p>
</a>'''


def blog():
    arts = leer_articulos()
    for a in arts:
        articulo(a, arts)
    d = 1
    cats = []
    for a in arts:
        if a['categoria'] not in cats: cats.append(a['categoria'])
    mig = [('Inicio', '/'), ('Blog', None)]
    blogld = {'@context': 'https://schema.org', '@type': 'Blog', '@id': WEB + '/blog/#blog', 'name': 'Blog de Propitae', 'url': WEB + '/blog/',
              'inLanguage': 'es-ES', 'publisher': {'@id': WEB + '/#organizacion'},
              'blogPost': [{'@type': 'BlogPosting', 'headline': a['titulo'], 'url': f"{WEB}/blog/{a['slug']}/", 'datePublished': a['fecha']} for a in arts]}
    h = cabeza(d, 'Blog inmobiliario de Torrejón y el Corredor del Henares | Propitae',
               'Guías claras para vender, comprar, financiar e invertir en vivienda en Torrejón de Ardoz, el Corredor del Henares y Madrid, con datos y fuentes.',
               '/blog/', datos=[blogld, migas(mig)])
    h += cabecera(d, 'blog')
    chips = '<ul class="chips" aria-label="Categorías"><li><a href="#" data-filtro="" aria-current="true">Todos</a></li>' + ''.join(f'<li><a href="#" data-filtro="{slug(c)}">{E(c)}</a></li>' for c in cats) + '</ul>'
    h += f'''<main id="contenido">
<section class="page-hero">
<div class="wrap">
{migas_html(mig, d)}
<p class="eyebrow">Blog</p>
<h1>Guías para decidir <span class="serif">con datos.</span></h1>
<p class="lead">Vender, comprar, hipotecas e inversión en Torrejón, el Corredor del Henares y Madrid. Respuestas claras, con cifras y fuentes.</p>
</div>
</section>
<section class="wrap seccion" style="display:flex;flex-direction:column;gap:32px">
{chips if arts else ''}
<div class="cards" data-lista>{''.join(tarjeta_articulo(a, d) for a in arts) or '<div class="card" style="border-style:dashed">Los primeros artículos están en camino.</div>'}</div>
</section>
</main>
'''
    h += pie(d, ['assets/js/filtro.js'])
    escribir('blog/index.html', h)
    return arts


# ---------------------------------------------------------------- mapas para buscadores e IA
ESTATICAS = [('/', None), ('/inmuebles/', 'cat'), ('/blog/', None), ('/equipo/', None), ('/equipo/wilson-vasquez/', None), ('/equipo/alexandra-pilapanta/', None),
             ('/aviso-legal/', None), ('/privacidad/', None), ('/cookies/', None)]


def mapas(inms, arts):
    hay_cat = any(i.get('indexar') for i in inms)
    urls = [(u, HOY) for u, k in ESTATICAS if not (k == 'cat' and not hay_cat)]
    urls += [(f"/blog/{a['slug']}/", a['modificado']) for a in arts]
    urls += [(f"/inmuebles/{i['slug']}/", HOY) for i in inms if i.get('indexar')]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generado por tools/generar.py: no editar a mano. -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    sm += ''.join(f'  <url><loc>{WEB}{u}</loc><lastmod>{l}</lastmod></url>\n' for u, l in urls) + '</urlset>\n'
    escribir('sitemap.xml', sm)

    plantilla = (RAIZ / 'tools/llms-base.md').read_text(encoding='utf-8')
    lineas_blog = '\n'.join(f"- [{a['titulo']}]({WEB}/blog/{a['slug']}/): {a['descripcion']}" for a in arts)
    lineas_inm = '\n'.join(f"- [{i['titulo_seo']}]({WEB}/inmuebles/{i['slug']}/): {i['descripcion_seo']} Estado: {i['estado'].lower()}." for i in inms if i.get('indexar') and i['estado'] != 'Vendido')
    llms = plantilla.replace('{{BLOG}}', lineas_blog or '- Próximamente.').replace('{{INMUEBLES}}', lineas_inm or '- Catálogo en preparación. Para buscar vivienda, contactar con el equipo.')
    escribir('llms.txt', llms)
    completo = llms + '\n\n---\n\n# Artículos completos\n'
    for a in arts:
        texto = re.sub(r'\{[^}]*\}', '', a['cuerpo_md'])
        completo += f"\n\n## {a['titulo']}\n\nURL: {WEB}/blog/{a['slug']}/ · Autor: {AUTORES[a.get('autor', 'wilson')]['nombre']} · Publicado: {a['fecha']} · Actualizado: {a['modificado']}\n\n"
        completo += re.sub('<[^>]+>', '', a['respuesta']) + '\n\n' + texto
        if a.get('faq'): completo += '\n\n### Preguntas frecuentes\n' + ''.join(f'\n**{q}** {r}\n' for q, r in a['faq'])
        if a.get('fuentes'): completo += '\n\nFuentes: ' + '; '.join(f'{n} ({u})' for n, u in a['fuentes'])
    escribir('llms-full.txt', completo + '\n')


if __name__ == '__main__':
    inms = catalogo()
    arts = blog()
    mapas(inms, arts)
    print(f'Generado: {len(inms)} inmuebles, {len(arts)} artículos, sitemap.xml, llms.txt y llms-full.txt')
