// Nach oben scrollen. Auf den Seiten mit Reiterleiste scrollt nur die Seite selbst (fester Rahmen),
// sonst das ganze Fenster.
export function nachOben() {
  window.scrollTo(0, 0);
  document.querySelectorAll('.hauptseite > .seite').forEach((e) => { e.scrollTop = 0; });
}
