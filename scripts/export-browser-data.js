/* NEDVI OS — Backup local del navegador
 * Ejecutar SOLO en la pestaña de NEDVI OS mediante DevTools > Console.
 * No transmite información. Guarda un JSON en Descargas del equipo.
 * ATENCION: el JSON puede contener sesiones, usuarios y datos sensibles.
 */
(() => {
  const data = {};
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key !== null) data[key] = window.localStorage.getItem(key);
  }
  const backup = {
    format: "nedvi-os-browser-localstorage-v1",
    savedAt: new Date().toISOString(),
    origin: window.location.origin,
    entries: data
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nedvi-os-navegador-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  console.log("Respaldo local descargado. Claves exportadas:", Object.keys(data).length);
})();
