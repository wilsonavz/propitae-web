// Propitae · común a todas las páginas

// Android: muestra la ayuda para abrir la tarjeta de contacto descargada
if (/Android/i.test(navigator.userAgent)) document.documentElement.classList.add('es-android');

// Aviso de cookies
(function () {
  var aviso = document.querySelector('.aviso-cookies');
  if (!aviso) return;
  var visto = false;
  try { visto = localStorage.getItem('avisoCookies') === '1'; } catch (e) {}
  if (!visto) aviso.hidden = false;
  var ok = aviso.querySelector('.aviso-cookies-ok');
  if (ok) ok.addEventListener('click', function () {
    aviso.hidden = true;
    try { localStorage.setItem('avisoCookies', '1'); } catch (e) {}
  });
})();
