// Propitae · ficha de inmueble: visor de fotos a pantalla completa
(function () {
  var gal = document.querySelector('.galeria');
  var visor = document.querySelector('.visor');
  if (!gal || !visor) return;
  var fotos = [];
  try { fotos = JSON.parse(gal.getAttribute('data-galeria')); } catch (e) { return; }
  var img = visor.querySelector('img'), pie = visor.querySelector('figcaption'), cuenta = visor.querySelector('[data-cuenta]');
  var n = 0, antes = null;

  function pinta() {
    img.src = fotos[n][0]; img.alt = fotos[n][1]; pie.textContent = fotos[n][1];
    cuenta.textContent = (n + 1) + ' / ' + fotos.length;
    var sig = new Image(); sig.src = fotos[(n + 1) % fotos.length][0];
  }
  function abre(i) { antes = document.activeElement; n = i; pinta(); visor.hidden = false; document.body.style.overflow = 'hidden'; visor.querySelector('[data-cerrar]').focus(); }
  function cierra() { visor.hidden = true; document.body.style.overflow = ''; if (antes) antes.focus(); }
  function mueve(d) { n = (n + d + fotos.length) % fotos.length; pinta(); }

  gal.addEventListener('click', function (e) { var b = e.target.closest('[data-foto]'); if (b) abre(+b.getAttribute('data-foto')); });
  visor.querySelector('[data-cerrar]').addEventListener('click', cierra);
  visor.querySelector('[data-ant]').addEventListener('click', function () { mueve(-1); });
  visor.querySelector('[data-sig]').addEventListener('click', function () { mueve(1); });
  visor.addEventListener('click', function (e) { if (e.target === visor || e.target.classList.contains('escena')) cierra(); });
  document.addEventListener('keydown', function (e) {
    if (visor.hidden) return;
    if (e.key === 'Escape') cierra();
    if (e.key === 'ArrowRight') mueve(1);
    if (e.key === 'ArrowLeft') mueve(-1);
  });
  var x0 = null;
  visor.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  visor.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) mueve(dx < 0 ? 1 : -1); x0 = null; });
})();
