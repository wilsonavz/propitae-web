// Propitae · formularios de /vender y /cita
// Los datos van al CRM por su puerta pública (alta.propitae.es, código en propitae-crm/src/captacion/publico.js):
//   POST /l/lead       → propietario: contacto + inmueble en captación + aviso al equipo + enlace de reserva
//   GET  /l/huecos?t=  → huecos libres para la llamada
//   POST /l/reservar   → { t, inicio } reserva la llamada en la agenda del CRM
// Si la puerta no responde, el formulario se manda por email (FormSubmit, el mismo de la portada) para no perder a nadie.
// Las consultas que no son de propietarios (comprar, financiar…) van solo por email: el CRM no tiene todavía puerta para ellas.
(function () {
  'use strict';
  var ALTA = document.body.getAttribute('data-alta') || 'https://alta.propitae.es';
  var EMAIL = 'https://formsubmit.co/ajax/hola@propitae.es';
  var WA = 'https://wa.me/34665288919?text=' + encodeURIComponent('Hola, os escribo desde la web propitae.es y me gustaría recibir información.');
  var inicio = Date.now();

  // ---------- utilidades ----------
  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }
  function normTel(t) {
    var d = String(t || '').replace(/\D/g, '');
    if (d.indexOf('00') === 0) d = d.slice(2);
    if (d.length === 11 && d.indexOf('34') === 0) d = d.slice(2);
    return d;
  }
  function telValido(t) { return /^[6789]\d{8}$/.test(normTel(t)); }
  function valor(form, nombre) {
    var el = form.elements[nombre];
    if (!el) return '';
    if (el.length && !el.tagName) { for (var i = 0; i < el.length; i++) if (el[i].checked) return el[i].value; return ''; }
    if (el.type === 'checkbox') return el.checked;
    return String(el.value || '').trim();
  }
  function marcas() {
    var q = new URLSearchParams(location.search), u = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'].forEach(function (k) { if (q.get(k)) u[k] = q.get(k).slice(0, 200); });
    return u;
  }
  function idEvento() { return 'web-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function aviso(el, texto, tipo) { el.textContent = texto; el.className = 'cap-estado ' + (tipo || 'error'); el.hidden = false; }
  var FECHA = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long' });
  var DIA_CORTO = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric' });
  function fechaLarga(ms) { return FECHA.format(new Date(ms)).replace(',', ''); }

  function postJSON(url, datos) {
    return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(datos) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j }; }); });
  }
  // Respaldo por email: aplana los datos para que lleguen legibles
  function porEmail(asunto, campos) {
    var f = new FormData();
    f.append('_subject', asunto);
    f.append('_template', 'table');
    f.append('_captcha', 'false');
    Object.keys(campos).forEach(function (k) { if (campos[k] !== '' && campos[k] != null) f.append(k, campos[k]); });
    return fetch(EMAIL, { method: 'POST', headers: { Accept: 'application/json' }, body: f })
      .then(function (r) { return r.json().then(function (j) { return r.ok && String(j.success) === 'true'; }); })
      .catch(function () { return false; });
  }

  // ---------- reserva de la llamada (huecos del CRM) ----------
  function reserva(caja, token, opciones) {
    opciones = opciones || {};
    var estado = $('.cap-estado', caja) || caja.appendChild(Object.assign(document.createElement('p'), { className: 'cap-estado', hidden: true }));
    var lista = $('.cap-dias', caja);
    var boton = $('.cap-confirmar', caja);
    var elegido = null;
    estado.setAttribute('role', 'status');
    function terminado(dia, ms, hora) {
      caja.innerHTML = '<h2>Hecho. <span class="serif">Te llamamos.</span></h2><p>El <strong></strong> a las <strong></strong>. Si te surge algo, escríbenos por WhatsApp y lo cambiamos.</p><div class="cap-acciones"><a class="btn btn-wa" target="_blank" rel="noopener noreferrer">WhatsApp</a></div>';
      var s = caja.querySelectorAll('strong');
      s[0].textContent = ms ? fechaLarga(ms) : dia; s[1].textContent = hora;
      $('a', caja).href = WA;
      caja.focus();
    }
    function caducado() {
      caja.innerHTML = '<h2>Este enlace <span class="serif">ya no vale.</span></h2><p>Los enlaces para elegir hora duran unos días. Pide la llamada de nuevo o escríbenos por WhatsApp.</p><div class="cap-acciones"><a class="btn btn-negro" href="/cita/">Pedir una llamada</a><a class="btn btn-wa" target="_blank" rel="noopener noreferrer">WhatsApp</a></div>';
      $('.btn-wa', caja).href = WA;
    }
    function pintar(r) {
      if (r.reservada) return terminado(r.dia, r.reservada, r.hora);
      var saludo = $('.cap-saludo', caja);
      if (saludo && r.nombre) saludo.textContent = 'Hola, ' + r.nombre + '.';
      var huecos = r.huecos || [];
      if (!huecos.length) { aviso(estado, 'Esta semana no nos quedan huecos libres. Escríbenos por WhatsApp y lo cuadramos.', 'error'); lista.innerHTML = ''; boton.hidden = true; return; }
      var dias = {}, orden = [];
      huecos.forEach(function (h) { if (!dias[h.dia]) { dias[h.dia] = []; orden.push(h.dia); } dias[h.dia].push(h); });
      lista.innerHTML = '<div class="cap-horas cap-selector" role="group" aria-label="Día"></div><div class="cap-horas cap-lista" role="group" aria-label="Hora"></div>';
      var sel = $('.cap-selector', lista), hs = $('.cap-lista', lista);
      function verDia(d) {
        $$('button', sel).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-dia') === d ? 'true' : 'false'); });
        hs.innerHTML = '';
        dias[d].forEach(function (h) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'cap-hora'; b.textContent = h.hora; b.setAttribute('aria-pressed', 'false');
          b.setAttribute('aria-label', fechaLarga(h.ms) + ', ' + h.hora);
          b.addEventListener('click', function () {
            $$('button', hs).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
            b.setAttribute('aria-pressed', 'true'); elegido = h;
            boton.hidden = false; boton.disabled = false;
            boton.textContent = 'Confirmar: ' + fechaLarga(h.ms) + ', ' + h.hora;
          });
          hs.appendChild(b);
        });
      }
      orden.forEach(function (d, i) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'cap-hora'; b.setAttribute('data-dia', d);
        b.textContent = DIA_CORTO.format(new Date(dias[d][0].ms));
        b.setAttribute('aria-label', fechaLarga(dias[d][0].ms));
        b.addEventListener('click', function () { elegido = null; boton.hidden = true; verDia(d); });
        sel.appendChild(b);
        if (i === 0) setTimeout(function () { verDia(d); });
      });
    }
    function cargar() {
      estado.hidden = true;
      lista.innerHTML = '<p class="cap-nota">Cargando horas libres…</p>';
      return fetch(ALTA + '/l/huecos?t=' + encodeURIComponent(token), { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
        .then(function (res) { if (res.status === 410 || res.j.error) return caducado(); pintar(res.j); })
        .catch(function () { lista.innerHTML = ''; aviso(estado, 'Ahora mismo no podemos enseñarte las horas. Escríbenos por WhatsApp y lo cuadramos.', 'error'); });
    }
    boton.addEventListener('click', function () {
      if (!elegido) return;
      boton.disabled = true; boton.textContent = 'Reservando…';
      postJSON(ALTA + '/l/reservar', { t: token, inicio: elegido.ms })
        .then(function (res) {
          if (res.j.ok) return terminado(res.j.dia, elegido.ms, res.j.hora);
          if (res.status === 410) return caducado();
          if (res.j.reservada) return terminado('', res.j.reservada, new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }).format(new Date(res.j.reservada)));
          aviso(estado, 'Esa hora se acaba de ocupar. Elige otra, por favor.', 'error');
          boton.hidden = true; elegido = null; cargar();
        })
        .catch(function () { boton.disabled = false; boton.textContent = 'Confirmar'; aviso(estado, 'No se ha podido reservar. Inténtalo otra vez o escríbenos por WhatsApp.', 'error'); });
    });
    caja.hidden = false;
    if (opciones.foco) caja.focus();
    return cargar();
  }

  function tokenDe(url) { try { return new URL(url).searchParams.get('t'); } catch (e) { return null; } }

  // Panel de respuesta común: mensaje + (si hay enlace) huecos para elegir hora
  function respuesta(form, nombre, r) {
    var hecho = $('#cap-hecho');
    var titulo = $('h2', hecho), texto = $('.cap-hecho-texto', hecho), caja = $('#cap-reserva');
    var n = nombre.split(/\s+/)[0];
    form.hidden = true; hecho.hidden = false;
    if (r.respaldo) {
      titulo.innerHTML = 'Gracias, <span class="serif"></span>'; $('.serif', titulo).textContent = n + '.';
      texto.textContent = 'Hemos recibido tus datos. Te llamamos en menos de 24 horas.';
    } else if (r.nivel === 'referido') {
      titulo.innerHTML = 'Gracias, <span class="serif"></span>'; $('.serif', titulo).textContent = n + '.';
      texto.textContent = 'Tu vivienda está fuera de la zona que trabajamos a diario. Te pondremos en contacto con un compañero de la red Huspy que la conozca bien.';
    } else if (r.enHorario) {
      titulo.innerHTML = 'Gracias, <span class="serif"></span>'; $('.serif', titulo).textContent = n + '.';
      texto.textContent = 'Te llamamos en breve para hablar de tu casa. Si ahora no te viene bien, elige otra hora:';
    } else {
      titulo.innerHTML = 'Gracias, <span class="serif"></span>'; $('.serif', titulo).textContent = n + '.';
      texto.textContent = 'Ahora estamos fuera de horario. Elige cuándo te viene bien que te llamemos:';
    }
    hecho.focus();
    var t = r.reserva && tokenDe(r.reserva);
    if (t && r.nivel !== 'referido' && caja) reserva(caja, t);
  }

  // ---------- /vender ----------
  var fv = $('#form-vender');
  if (fv) {
    var ev = $('.cap-estado', fv), bv = $('button[type="submit"]', fv);
    fv.addEventListener('submit', function (e) {
      e.preventDefault();
      ev.hidden = true;
      if (!fv.reportValidity()) return;
      var tel = valor(fv, 'tel');
      if (!telValido(tel)) { aviso(ev, 'Revisa el teléfono: tiene que ser un número español de 9 cifras.'); fv.elements.tel.focus(); return; }
      var cuando = valor(fv, 'cuando');
      var d = {
        nombre: valor(fv, 'nombre'), tel: normTel(tel), email: valor(fv, 'email'),
        cp: valor(fv, 'cp'), direccion: valor(fv, 'direccion'), tipo: valor(fv, 'tipo'),
        cuando: cuando, quiere: cuando === 'saber' ? 'valor' : 'vender', propietario: valor(fv, 'propietario') || 'si',
        consent: { privacidad: !!valor(fv, 'privacidad'), whatsapp: !!valor(fv, 'whatsapp'), comercial: !!valor(fv, 'comercial'), medicion: false },
        utm: marcas(), origen: marcas().utm_source || 'web', ad_id: marcas().utm_content || undefined,
        url: location.origin + location.pathname, pagina: 'vender', segundos: Math.round((Date.now() - inicio) / 1000),
        event_id: idEvento(), web: valor(fv, 'web')
      };
      bv.disabled = true; bv.textContent = 'Enviando…';
      postJSON(ALTA + '/l/lead', d)
        .then(function (res) {
          if (res.j.ok) return respuesta(fv, d.nombre, res.j);
          if (res.status >= 400 && res.status < 500) { aviso(ev, res.j.error || 'Revisa los datos, por favor.'); bv.disabled = false; bv.textContent = 'Quiero mi estudio de precio'; return; }
          throw new Error('puerta');
        })
        .catch(function () {
          var tipos = { ya: 'Cuanto antes', '3m': 'En unos 3 meses', '6m': 'Dentro de 6 meses o más', saber: 'Solo saber lo que vale' };
          return porEmail('Propietario desde propitae.es/vender', {
            nombre: d.nombre, telefono: d.tel, email: d.email, 'código postal': d.cp, dirección: d.direccion, tipo: d.tipo,
            cuándo: tipos[cuando] || cuando, 'es suya': d.propietario === 'familiar' ? 'Es de un familiar' : 'Sí',
            whatsapp: d.consent.whatsapp ? 'Acepta' : 'No', comercial: d.consent.comercial ? 'Acepta' : 'No', origen: d.origen,
            aviso: 'La puerta del CRM no respondió: dar de alta a mano en el CRM.'
          }).then(function (ok) {
            if (ok) return respuesta(fv, d.nombre, { respaldo: true });
            aviso(ev, 'No se ha podido enviar. Llámanos al 665 288 919 o escríbenos por WhatsApp.');
            bv.disabled = false; bv.textContent = 'Quiero mi estudio de precio';
          });
        });
    });
  }

  // ---------- /cita ----------
  var token = new URLSearchParams(location.search).get('t');
  var cajaEnlace = $('#cap-enlace');
  if (cajaEnlace && token) {
    $$('[data-sin-enlace]').forEach(function (el) { el.hidden = true; });
    reserva(cajaEnlace, token);
  }

  var fc = $('#form-cita');
  if (fc) {
    var ec = $('.cap-estado', fc), bc = $('button[type="submit"]', fc), cpCampo = $('#cita-cp-campo'), cp = fc.elements.cp;
    function motivo() { return valor(fc, 'motivo'); }
    function ajustar() { var v = motivo() === 'vender'; cpCampo.hidden = !v; cp.required = v; }
    $$('input[name="motivo"]', fc).forEach(function (r) { r.addEventListener('change', ajustar); });
    ajustar();
    fc.addEventListener('submit', function (e) {
      e.preventDefault();
      ec.hidden = true;
      if (!fc.reportValidity()) return;
      var tel = valor(fc, 'tel');
      if (!telValido(tel)) { aviso(ec, 'Revisa el teléfono: tiene que ser un número español de 9 cifras.'); fc.elements.tel.focus(); return; }
      var nombre = valor(fc, 'nombre'), m = motivo();
      var textos = { vender: 'Vender mi casa', comprar: 'Comprar', financiar: 'Financiar', otro: 'Otra consulta' };
      function reponer() { bc.disabled = false; bc.textContent = 'Pedir la llamada'; }
      function email() {
        return porEmail('Petición de llamada desde propitae.es/cita', {
          nombre: nombre, telefono: normTel(tel), motivo: textos[m] || m, 'código postal': valor(fc, 'cp'),
          'mejor momento': valor(fc, 'momento'), mensaje: valor(fc, 'mensaje'), whatsapp: valor(fc, 'whatsapp') ? 'Acepta' : 'No', origen: marcas().utm_source || 'web'
        }).then(function (ok) {
          if (ok) return respuesta(fc, nombre, { respaldo: true });
          aviso(ec, 'No se ha podido enviar. Llámanos al 665 288 919 o escríbenos por WhatsApp.'); reponer();
        });
      }
      if (valor(fc, 'web')) { return respuesta(fc, nombre, { respaldo: true }); }   // campo trampa: al robot se le dice que sí
      bc.disabled = true; bc.textContent = 'Enviando…';
      if (m !== 'vender') return email();
      postJSON(ALTA + '/l/lead', {
        nombre: nombre, tel: normTel(tel), cp: valor(fc, 'cp'), quiere: 'vender', propietario: 'si', mensaje: valor(fc, 'mensaje'), momento: valor(fc, 'momento'),
        consent: { privacidad: !!valor(fc, 'privacidad'), whatsapp: !!valor(fc, 'whatsapp'), comercial: false, medicion: false },
        utm: marcas(), origen: marcas().utm_source || 'web', url: location.origin + location.pathname, pagina: 'cita',
        segundos: Math.round((Date.now() - inicio) / 1000), event_id: idEvento(), web: ''
      }).then(function (res) {
        if (res.j.ok) return respuesta(fc, nombre, res.j);
        if (res.status >= 400 && res.status < 500) { aviso(ec, res.j.error || 'Revisa los datos, por favor.'); reponer(); return; }
        return email();
      }).catch(email);
    });
  }
})();
