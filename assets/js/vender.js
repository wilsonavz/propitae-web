// Imán · propitae.es/vender (formulario por pasos) y propitae.es/cita (reserva de la llamada).
// Envía a alta.clickia.io (CRM). Si falla, guarda el lead en el navegador, lo reintenta y además lo manda por FormSubmit a hola@propitae.es.
(function () {
  'use strict';
  var API = 'https://alta.clickia.io';
  var PIXEL_ID = '';                 // id del píxel de Meta: al ponerlo, aparece el aviso de cookies y se mide (solo si se acepta)
  var FORMSUBMIT = 'https://formsubmit.co/ajax/hola@propitae.es';
  var T0 = Date.now();
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ls = { get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function enviar(url, datos, ms) {
    var ctl = window.AbortController ? new AbortController() : null;
    var t = ctl && setTimeout(function () { ctl.abort(); }, ms || 12000);
    return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(datos), signal: ctl && ctl.signal })
      .then(function (r) { clearTimeout(t); return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); });
  }

  /* ---------- medición (solo con consentimiento y con píxel configurado) ---------- */
  function consentimiento() { return ls.get('imanCookies', null); }
  function cargarPixel() {
    if (!PIXEL_ID || window.fbq) return;
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', PIXEL_ID); window.fbq('track', 'PageView');
  }
  function avisoCookies() {
    var box = $('[data-cookies]'); if (!box || !PIXEL_ID) return;
    var c = consentimiento();
    if (c === 'si') return cargarPixel();
    if (c === 'no') return;
    box.hidden = false;
    $('[data-cookies-si]', box).onclick = function () { ls.set('imanCookies', 'si'); box.hidden = true; cargarPixel(); };
    $('[data-cookies-no]', box).onclick = function () { ls.set('imanCookies', 'no'); box.hidden = true; };
  }
  function cookie(n) { var m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; }

  /* ---------- leads pendientes (si alta.clickia.io no respondió) ---------- */
  function reintentar() {
    var pend = ls.get('imanPend', []); if (!pend.length) return;
    var quedan = [];
    var cadena = Promise.resolve();
    pend.forEach(function (d) {
      cadena = cadena.then(function () { return enviar(API + '/l/lead', d, 10000).then(function (r) { if (!r.ok && r.status >= 500) quedan.push(d); }).catch(function () { if (Date.now() - (d.guardado || 0) < 86400000) quedan.push(d); }); });
    });
    cadena.then(function () { ls.set('imanPend', quedan); });
  }

  /* ---------- reserva de la llamada (en /vender y en /cita) ---------- */
  function reserva(box, token, alTerminar) {
    var st = { ms: null };
    var err = $('[data-error-reserva]', box.parentNode) || { textContent: '' };
    fetch(API + '/l/huecos?t=' + encodeURIComponent(token)).then(function (r) { return r.json(); }).then(function (j) {
      if (j.reservada) { alTerminar(j); return; }
      if (j.error || !j.huecos || !j.huecos.length) { err.textContent = j.error === 'enlace caducado' ? 'Este enlace ha caducado. Escríbenos por WhatsApp y te llamamos.' : 'Ahora mismo no hay huecos. Escríbenos por WhatsApp y te llamamos.'; return; }
      var porDia = {}; j.huecos.forEach(function (h) { (porDia[h.dia] = porDia[h.dia] || []).push(h); });
      var dias = Object.keys(porDia);
      var $d = $('[data-dias]', box), $h = $('[data-horas]', box), $b = $('[data-reservar]', box);
      function pintaDia(dia) {
        $$('.v-dia', $d).forEach(function (b) { b.classList.toggle('on', b.dataset.dia === dia); });
        $h.innerHTML = porDia[dia].map(function (h) { return '<button type="button" class="v-hora" data-ms="' + h.ms + '">' + h.hora + '</button>'; }).join('');
        st.ms = null; $b.disabled = true;
      }
      $d.innerHTML = dias.map(function (d) { var f = new Date(d + 'T12:00:00'); return '<button type="button" class="v-dia" data-dia="' + d + '">' + DIAS[f.getDay()].slice(0, 3) + '<small>' + f.getDate() + ' ' + MESES[f.getMonth()] + '</small></button>'; }).join('');
      $d.onclick = function (e) { var b = e.target.closest('.v-dia'); if (b) pintaDia(b.dataset.dia); };
      $h.onclick = function (e) { var b = e.target.closest('.v-hora'); if (!b) return; $$('.v-hora', $h).forEach(function (x) { x.classList.toggle('on', x === b); }); st.ms = +b.dataset.ms; $b.disabled = false; };
      $b.onclick = function () {
        if (!st.ms) return; $b.disabled = true; err.textContent = '';
        enviar(API + '/l/reservar', { t: token, inicio: st.ms }).then(function (r) {
          if (r.ok) alTerminar(r.j);
          else { err.textContent = r.j.error ? (r.j.error.charAt(0).toUpperCase() + r.j.error.slice(1) + '.') : 'No se pudo reservar. Prueba otra hora.'; $b.disabled = false; if (r.status === 409) setTimeout(function () { reserva(box, token, alTerminar); }, 800); }
        }).catch(function () { err.textContent = 'No se pudo reservar. Escríbenos por WhatsApp.'; $b.disabled = false; });
      };
      box.hidden = false; pintaDia(dias[0]);
    }).catch(function () { err.textContent = 'No se pudieron cargar los huecos. Escríbenos por WhatsApp y te llamamos.'; box.hidden = false; });
  }
  function textoReservada(j) { var f = new Date(j.dia + 'T12:00:00'); return DIAS[f.getDay()] + ' ' + f.getDate() + ' de ' + ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][f.getMonth()] + ' a las ' + j.hora; }

  /* ---------- formulario por pasos ---------- */
  function formulario(form) {
    var datos = {};
    var pasos = $$('.v-paso', form);
    var barras = $$('.v-avance i', form);
    var historial = ['1'];
    function ir(p) {
      pasos.forEach(function (x) { x.hidden = x.dataset.paso !== String(p); });
      var n = p === 'fin' ? 5 : +p; barras.forEach(function (b, i) { b.classList.toggle('on', i < n); });
      var f = $('[data-paso="' + p + '"] input:not([type=checkbox])', form); if (f && window.innerWidth > 900) f.focus();
      if (window.innerWidth <= 900) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function siguiente(desde) {
      var p = +desde + 1;
      if (p === 3 && datos.quiere === 'valor') { datos.cuando = 'saber'; p = 4; }
      if (p === 3 && datos.quiere === 'alquilar') p = 4;
      historial.push(String(p)); ir(p);
    }
    form.addEventListener('click', function (e) {
      var op = e.target.closest('.v-op');
      if (op) {
        var grupo = op.closest('[data-campo]'); datos[grupo.dataset.campo] = op.dataset.v;
        $$('.v-op', grupo).forEach(function (x) { x.classList.toggle('on', x === op); });
        setTimeout(function () { siguiente(op.closest('.v-paso').dataset.paso); }, 150);
        return;
      }
      if (e.target.closest('[data-atras]')) { historial.pop(); ir(historial[historial.length - 1] || '1'); return; }
      if (e.target.closest('[data-siguiente]')) {
        var err = $('[data-paso="2"] [data-error]', form);
        var cp = (form.cp.value || '').replace(/\D/g, '');
        if (!form.direccion.value.trim()) { err.textContent = 'Escribe la calle.'; return; }
        if (cp.length !== 5) { err.textContent = 'El código postal tiene 5 cifras.'; return; }
        err.textContent = ''; siguiente(2);
      }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('[data-paso="5"] [data-error]', form);
      var tel = (form.tel.value || '').replace(/\D/g, '').replace(/^0034|^34(?=\d{9}$)/, '');
      if (!form.nombre.value.trim()) { err.textContent = 'Escribe tu nombre.'; return; }
      if (!/^[6789]\d{8}$/.test(tel)) { err.textContent = 'Revisa el móvil: 9 cifras.'; return; }
      if (!form.privacidad.checked) { err.textContent = 'Para continuar, acepta la política de privacidad.'; return; }
      err.textContent = '';
      var q = new URLSearchParams(location.search), utm = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) { if (q.get(k)) utm[k] = q.get(k).slice(0, 120); });
      var fbclid = q.get('fbclid');
      var d = {
        quiere: datos.quiere || 'vender', cuando: datos.cuando || 'saber', propietario: datos.propietario || 'si',
        direccion: form.direccion.value.trim(), cp: (form.cp.value || '').replace(/\D/g, ''), tipo: form.tipo.value,
        nombre: form.nombre.value.trim(), tel: tel, web: form.web.value,
        consent: { privacidad: true, whatsapp: form.whatsapp.checked, comercial: form.comercial.checked, medicion: consentimiento() === 'si', texto: 'Política de privacidad de propitae.es (versión 22/11/2026)' },
        utm: utm, segundos: Math.round((Date.now() - T0) / 1000), url: location.href.split('#')[0], event_id: 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        fbp: cookie('_fbp'), fbc: cookie('_fbc') || (fbclid ? 'fb.1.' + Date.now() + '.' + fbclid : null)
      };
      var btn = $('[data-enviar]', form); btn.disabled = true; btn.textContent = 'Enviando…';
      enviar(API + '/l/lead', d).then(function (r) {
        if (r.ok) return gracias(d, r.j);
        if (r.status >= 400 && r.status < 500) { err.textContent = r.j.error || 'Revisa los datos.'; btn.disabled = false; btn.textContent = 'Quiero mi estudio'; return; }
        throw new Error('servidor');
      }).catch(function () {
        d.guardado = Date.now(); var pend = ls.get('imanPend', []); pend.push(d); ls.set('imanPend', pend);
        enviar(FORMSUBMIT, { _subject: 'Lead de propitae.es/vender (respaldo)', nombre: d.nombre, telefono: d.tel, direccion: d.direccion + ' ' + d.cp, tipo: d.tipo, quiere: d.quiere, cuando: d.cuando, propietario: d.propietario, whatsapp: d.consent.whatsapp ? 'sí' : 'no', _template: 'table' }, 10000).catch(function () {});
        gracias(d, { ok: true, enHorario: true });
      });
    });
    function gracias(d, j) {
      if (window.fbq && consentimiento() === 'si') window.fbq('track', 'Lead', {}, { eventID: d.event_id });
      var nombre = d.nombre.split(' ')[0];
      var fin = $('[data-paso="fin"]', form);
      historial.push('fin'); ir('fin');
      if (j.nivel === 'referido') { $('[data-titulo]', fin).textContent = 'Gracias, ' + nombre + '.'; $('[data-texto]', fin).textContent = 'Te llamamos para ponerte en contacto con el asesor de confianza de tu zona.'; return; }
      var token = j.reserva ? (j.reserva.split('t=')[1] || '') : '';
      if (j.enHorario || !token) {
        $('[data-titulo]', fin).textContent = 'Gracias, ' + nombre + '.';
        $('[data-texto]', fin).innerHTML = 'Te llamamos en unos minutos.' + (token ? ' <a href="#" data-elegir>¿Prefieres elegir tú la hora?</a>' : '');
        var el = $('[data-elegir]', fin); if (el) el.onclick = function (e) { e.preventDefault(); el.remove(); mostrarReserva(fin, token, nombre); };
      } else {
        $('[data-titulo]', fin).textContent = 'Gracias, ' + nombre + '. ¿Cuándo te llamamos?';
        $('[data-texto]', fin).textContent = 'Elige el día y la hora que mejor te vengan. Son 10 minutos.';
        mostrarReserva(fin, token, nombre);
      }
    }
    function mostrarReserva(fin, token, nombre) {
      reserva($('[data-reserva]', fin), token, function (r) {
        $('[data-reserva]', fin).hidden = true;
        $('[data-titulo]', fin).textContent = 'Hecho, ' + nombre + '.';
        $('[data-texto]', fin).textContent = 'Te llamamos el ' + textoReservada(r) + '.';
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    avisoCookies();
    reintentar();
    var form = $('#v-form'); if (form) formulario(form);
    var cita = $('#v-cita');
    if (cita) {
      var token = new URLSearchParams(location.search).get('t') || '';
      reserva($('[data-reserva]', cita), token, function (r) {
        $('[data-reserva]', cita).hidden = true;
        $('[data-titulo]', cita).textContent = 'Hecho.';
        $('[data-texto]', cita).textContent = 'Te llamamos el ' + textoReservada(r) + '.';
      });
    }
  });
})();
