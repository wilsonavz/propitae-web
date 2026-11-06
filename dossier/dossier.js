// Propitae · listado de dosieres (lee dossier/lista.json)
(function () {
  var cont = document.getElementById('lista-dossier');
  if (!cont) return;
  var base = 'https://propitae.es/dossier/';

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }

  function aviso(btn, texto) {
    var antes = btn.textContent;
    btn.textContent = texto;
    setTimeout(function () { btn.textContent = antes; }, 1800);
  }

  function copiar(url, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { aviso(btn, '¡Copiado!'); },
        function () { window.prompt('Copia el enlace:', url); });
    } else {
      window.prompt('Copia el enlace:', url);
    }
  }

  function tarjeta(d) {
    var url = base + encodeURIComponent(d.archivo);
    var card = el('article', { 'class': 'card dossier-card' });
    if (d.portada) {
      var a = el('a', { href: d.archivo, target: '_blank', rel: 'noopener' });
      a.appendChild(el('img', { src: d.portada, alt: 'Portada del dosier: ' + d.titulo, loading: 'lazy', width: '720', height: '405' }));
      card.appendChild(a);
    }
    card.appendChild(el('span', { 'class': 'tag' }, d.estado || 'En venta'));
    card.appendChild(el('h3', {}, d.titulo));
    var p = el('p', {}, (d.zona || '') + (d.precio ? ' · ' + d.precio : ''));
    card.appendChild(p);

    var acciones = el('div', { 'class': 'dossier-acciones' });
    var abrir = el('a', { 'class': 'btn btn-negro', href: d.archivo, target: '_blank', rel: 'noopener' }, 'Abrir PDF');
    var cop = el('button', { type: 'button', 'class': 'btn btn-borde' }, 'Copiar enlace');
    cop.addEventListener('click', function () { copiar(url, cop); });
    var wa = el('a', { 'class': 'btn btn-azul', target: '_blank', rel: 'noopener noreferrer',
      href: 'https://wa.me/?text=' + encodeURIComponent(d.titulo + '. Aquí tienes el dosier completo: ' + url) }, 'WhatsApp');
    acciones.appendChild(abrir); acciones.appendChild(cop); acciones.appendChild(wa);
    if (navigator.share) {
      var sh = el('button', { type: 'button', 'class': 'btn btn-borde' }, 'Compartir');
      sh.addEventListener('click', function () {
        navigator.share({ title: d.titulo, text: d.titulo + ' · PROPITAE', url: url }).catch(function () {});
      });
      acciones.appendChild(sh);
    }
    card.appendChild(acciones);
    return card;
  }

  fetch('lista.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (lista) {
      cont.textContent = '';
      if (!lista.length) { cont.appendChild(el('p', {}, 'Todavía no hay dosieres.')); return; }
      lista.sort(function (a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
      lista.forEach(function (d) { cont.appendChild(tarjeta(d)); });
    })
    .catch(function () {
      cont.textContent = 'No se ha podido cargar la lista. Recarga la página.';
    });
})();
