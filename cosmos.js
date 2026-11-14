(() => {
  const sky = document.getElementById("cosmos");
  if (!sky) return;

  // Rasterize the sky once. The compositor moves the plates independently of the graph.
  const layers = document.createDocumentFragment();
  for (const name of ["nebula", "distant-stars", "near-stars", "moon", "meteor"]) {
    const layer = document.createElement("div");
    layer.className = "sky-" + name;
    layers.append(layer);
  }
  sky.append(layers);

  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = Boolean(navigator.connection?.saveData);
  function syncPlayback() {
    sky.classList.toggle("still", document.hidden || motion.matches || saveData);
  }
  motion.addEventListener("change", syncPlayback);
  document.addEventListener("visibilitychange", syncPlayback);
  syncPlayback();
})();
