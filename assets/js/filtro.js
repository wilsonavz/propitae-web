// Propitae · blog: filtro por categorías
(function () {
  var chips = document.querySelectorAll('[data-filtro]');
  var lista = document.querySelector('[data-lista]');
  if (!chips.length || !lista) return;
  chips.forEach(function (c) {
    c.addEventListener('click', function (e) {
      e.preventDefault();
      var f = c.getAttribute('data-filtro');
      chips.forEach(function (x) { x.setAttribute('aria-current', x === c ? 'true' : 'false'); });
      lista.querySelectorAll('[data-cat]').forEach(function (t) { t.hidden = !!f && t.getAttribute('data-cat') !== f; });
    });
  });
})();
