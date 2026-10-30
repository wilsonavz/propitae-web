# propitae.es

Web estática de Propitae. Se publica con GitHub Pages: no necesita instalar nada ni compilar.

## Estructura

```
/                          Portada (index.html)
/equipo/                   Equipo
/equipo/wilson-vasquez/    Tarjeta digital: index.html, .vcf (guardar contacto), qr.png y qr.svg
/equipo/alexandra-pilapanta/
/blog/                     Portada del blog
/blog/plantilla-articulo/  Plantilla para copiar (no se indexa)
/inmuebles/                Catálogo de inmuebles (próximamente, no se indexa todavía)
/herramientas/             Accesos internos del equipo (no se indexa; NO poner datos de clientes)
/aviso-legal/  /privacidad/  /cookies/   Páginas legales (borrador)
/gracias/                  Página tras enviar el formulario (no se indexa)
/404.html                  Página de error
/.well-known/security.txt  Contacto para avisar de fallos de seguridad
/assets/css/               fonts.css (tipografías) y base.css (estilos compartidos)
/assets/js/main.js         Formulario de contacto
/assets/img/               Imágenes, logos e iconos
/assets/fonts/             Tipografías Inter Tight e Instrument Serif (licencia OFL)
/robots.txt  /sitemap.xml  /llms.txt  /site.webmanifest
/.nojekyll                 Evita que GitHub procese la web con Jekyll
/CNAME                     Dominio propio para GitHub Pages (propitae.es)
```

Cada página vive en su carpeta como `index.html`, así las direcciones quedan limpias:
`propitae.es/equipo/wilson-vasquez/`.

## Publicar un artículo

1. Copia `blog/plantilla-articulo/` y renombra la carpeta con la URL (minúsculas, guiones, sin tildes).
2. Edita título, descripción, URL canónica, fechas y el bloque `application/ld+json`.
3. Cambia `robots` a `index, follow`.
4. Añade la tarjeta en `blog/index.html` y la URL en `sitemap.xml`.

## Añadir una persona al equipo

Copia una carpeta de `equipo/`, cambia los datos, el `.vcf` y genera su QR con la URL nueva.

## Pendiente

- Revisión de los textos legales por un profesional (recomendable).

## Formulario de contacto

Envía a hola@propitae.es mediante FormSubmit (formsubmit.co), sin servidor propio.
- La primera vez que alguien lo use, FormSubmit enviará un email de activación a hola@propitae.es: hay que pulsar el enlace.
- Antirrobots: suma sencilla + campo trampa oculto.
- Tras activarlo, FormSubmit ofrece un alias aleatorio para no mostrar el email en el código: se puede cambiar en `index.html` y `assets/js/main.js`.

## Seguridad

- Política de seguridad de contenidos (CSP) en cada página: solo se cargan recursos de la propia web y el envío a formsubmit.co.
- Sin cookies, sin scripts de terceros, tipografías en local.
- En GitHub: activa la verificación en dos pasos, marca "Enforce HTTPS" en Settings › Pages y verifica el dominio en Settings › Pages (o en la configuración de tu cuenta) para evitar que otro lo use.
- No subas nunca contraseñas, claves ni datos de clientes al repositorio: todo lo que hay aquí es público.
