// Propitae · formulario de contacto de la portada
(function () {
  var form = document.getElementById('form-contacto');
  if (!form) return;

  // Motivo de la consulta (Vender, Comprar, Financiar, Personal Shopper)
  var btns = form.querySelectorAll('.motivo');
  var motivo = form.querySelector('input[name="motivo"]');
  function pick(id) {
    btns.forEach(function (b) {
      var on = b.getAttribute('data-motivo') === id;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on && motivo) motivo.value = b.textContent.trim();
    });
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { pick(b.getAttribute('data-motivo')); }); });
  document.querySelectorAll('[data-pick]').forEach(function (a) {
    a.addEventListener('click', function () { pick(a.getAttribute('data-pick')); });
  });

  // Pregunta antirrobots: una suma sencilla
  var a = 2 + Math.floor(Math.random() * 7), b = 1 + Math.floor(Math.random() * 8);
  var qa = document.getElementById('suma-a'), qb = document.getElementById('suma-b');
  if (qa && qb) { qa.textContent = a; qb.textContent = b; } else { a = 3; b = 4; }

  var estado = document.getElementById('form-estado');
  var boton = form.querySelector('button[type="submit"]');
  function aviso(texto, tipo) { estado.textContent = texto; estado.className = 'form-estado ' + tipo; estado.hidden = false; }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!form.reportValidity()) return;
    // Campo trampa: si un robot lo rellena, fingimos éxito y no enviamos nada
    var trampa = form.querySelector('input[name="_honey"]');
    if (trampa && trampa.value) { aviso('¡Gracias! Hemos recibido tu mensaje.', 'ok'); form.reset(); return; }
    var resp = form.querySelector('input[name="verificacion"]');
    if (parseInt(resp.value, 10) !== a + b) {
      aviso('La suma no es correcta. Revísala y vuelve a intentarlo.', 'error');
      resp.focus();
      return;
    }
    var datos = new FormData(form);
    datos.delete('verificacion');
    boton.disabled = true;
    aviso('Enviando…', 'ok');
    fetch('https://formsubmit.co/ajax/hola@propitae.es', { method: 'POST', headers: { 'Accept': 'application/json' }, body: datos })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && String(res.j.success) === 'true') {
          window.location.href = 'gracias/';
        } else {
          aviso('No se ha podido enviar. Escríbenos por WhatsApp o a hola@propitae.es.', 'error');
          boton.disabled = false;
        }
      })
      .catch(function () {
        aviso('No se ha podido enviar. Escríbenos por WhatsApp o a hola@propitae.es.', 'error');
        boton.disabled = false;
      });
  });
})();
