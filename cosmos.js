(() => {
  const sky = document.getElementById("cosmos");
  if (!sky) return;

  // Rasterize the sky once. The compositor moves the plates independently of the graph.
  const layers = document.createDocumentFragment();
  for (const name of [
    "nebula",
    "distant-stars",
    "near-stars",
    "moon",
    "meteor",
  ]) {
    const layer = document.createElement("div");
    layer.className = "sky-" + name;
    layers.append(layer);
  }
  sky.append(layers);

  // Small orthographic scenes share one light and one clock. Only the two
  // spacecraft tiles are redrawn, independently of the graph and its zoom.
  const tau = Math.PI * 2;
  function spacecraft(telescope) {
    const faces = [];
    function face(points, color) {
      faces.push({ points, color });
    }
    function drum(
      x,
      y,
      z,
      radius,
      depth,
      sides,
      shell,
      cap,
      slopeX = 0,
      slopeY = 0,
    ) {
      const rim = (d) =>
        Array.from({ length: sides }, (_, i) => [
          x + radius * Math.cos((tau * i) / sides),
          y + radius * Math.sin((tau * i) / sides),
          z +
            d +
            radius *
              (slopeX * Math.cos((tau * i) / sides) +
                slopeY * Math.sin((tau * i) / sides)),
        ]);
      const front = rim(depth / 2),
        back = rim(-depth / 2);
      face(front, cap);
      face(back.slice().reverse(), shell);
      front.forEach((p, i) => {
        const j = (i + 1) % sides;
        face([back[i], back[j], front[j], p], shell);
      });
    }
    function panel(x, y, w, h, z, color) {
      face(
        [
          [x, y, z],
          [x + w, y, z],
          [x + w, y + h, z],
          [x, y + h, z],
        ],
        color,
      );
    }
    if (telescope) {
      // Cryogenic observatory with a segmented, gold-coated primary mirror.
      drum(0, 0, -0.37, 0.65, 0.55, 8, [94, 90, 124], [137, 149, 165]);
      for (let i = 0; i < 4; i++) {
        const s = 1 - 0.055 * i,
          h = -0.85 + i * 0.082;
        face(
          [
            [-1.53 * s, h, -0.13],
            [0, h - 0.1, -1.05 * s],
            [1.53 * s, h, -0.13],
            [0, h + 0.12, 1.17 * s],
          ],
          [143 + i * 12, 143 + i * 10, 183 + i * 9],
        );
      }
      for (let q = -2; q <= 2; q++)
        for (let r = -2; r <= 2; r++) {
          if (Math.abs(q + r) > 2 || (!q && !r)) continue;
          const x = q * 0.36,
            y = 0.26 + (r + q / 2) * 0.416;
          drum(
            x,
            y,
            0.09 * (q * q + r * r + q * r),
            0.231,
            0.07,
            6,
            [115, 74, 51],
            [241 - 5 * Math.abs(q), 179 + 6 * r, 95 + 8 * q],
            0.55 * x,
            0.55 * (y - 0.26),
          );
        }
      drum(0, 0.26, 0.56, 0.15, 0.1, 6, [117, 98, 104], [196, 169, 133]);
      for (const [x, y] of [
        [-0.7, 0.68],
        [0.7, 0.68],
        [0, -0.56],
      ]) {
        face(
          [
            [x - 0.016, y, -0.11],
            [x + 0.016, y, -0.11],
            [0.017, 0.26, 0.56],
            [-0.017, 0.26, 0.56],
          ],
          [174, 165, 163],
        );
      }
    } else {
      // Communications satellite with twin photovoltaic wings and a faceted dish.
      panel(-1.9, -0.04, 3.8, 0.08, 0, [187, 164, 142]);
      for (const left of [-2.18, 0.62]) {
        panel(left, -0.43, 1.56, 0.86, 0.013, [155, 151, 165]);
        for (let i = 0; i < 8; i++)
          for (let j = 0; j < 4; j++)
            panel(
              left + 0.027 + i * 0.189,
              -0.403 + j * 0.204,
              0.176,
              0.19,
              0.019,
              [62 + j * 3, 85 + i * 2, 151 + j * 6],
            );
      }
      drum(0, 0, 0, 0.49, 0.79, 8, [191, 139, 84], [229, 191, 126]);
      drum(0, 0.18, 0.52, 0.23, 0.37, 8, [145, 151, 164], [221, 219, 202]);
      for (let i = 0; i < 18; i++) {
        const rim = (j) => [
          0.62 * Math.cos((tau * j) / 18),
          0.18 + 0.62 * Math.sin((tau * j) / 18),
          0.94,
        ];
        face([[0, 0.18, 0.66], rim(i), rim(i + 1)], [190, 200, 216]);
      }
      drum(0, 0.18, 0.92, 0.025, 0.47, 6, [138, 143, 155], [232, 226, 210]);
      drum(0, 0.18, 1.16, 0.068, 0.08, 6, [200, 156, 91], [244, 213, 157]);
    }
    const canvas = document.createElement("canvas");
    canvas.className = telescope ? "orbital-telescope" : "relay-satellite";
    sky.append(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = telescope ? 272 : 320;
    canvas.width = size;
    canvas.height = size;
    const scale = size / (telescope ? 3.6 : 4.8);
    return function draw(time) {
      if (!canvas.offsetWidth) return;
      const yaw = (telescope ? -0.45 : 0.48) + 0.32 * Math.sin(time * 0.15);
      const pitch = telescope ? 0.32 : -0.47,
        roll = telescope ? -0.21 : -0.31;
      const cy = Math.cos(yaw),
        sy = Math.sin(yaw),
        cp = Math.cos(pitch),
        sp = Math.sin(pitch),
        cr = Math.cos(roll),
        sr = Math.sin(roll);
      const polygons = faces
        .map(({ points, color }) => {
          const view = points.map(([x, y, z]) => {
            const u = cy * x + sy * z,
              v = cy * z - sy * x,
              w = y * cp - v * sp;
            return [u * cr - w * sr, u * sr + w * cr, y * sp + v * cp];
          });
          return {
            view,
            color,
            depth: view.reduce((s, p) => s + p[2], 0) / view.length,
          };
        })
        .sort((a, b) => a.depth - b.depth);
      ctx.clearRect(0, 0, size, size);
      for (const { view, color } of polygons) {
        const [a, b, c] = view;
        const ax = b[0] - a[0],
          ay = b[1] - a[1],
          az = b[2] - a[2],
          bx = c[0] - a[0],
          by = c[1] - a[1],
          bz = c[2] - a[2];
        const nx = ay * bz - az * by,
          ny = az * bx - ax * bz,
          nz = ax * by - ay * bx;
        const length = Math.hypot(nx, ny, nz) || 1;
        const light =
          0.46 + 0.54 * Math.abs((-0.49 * nx + 0.62 * ny + 0.61 * nz) / length);
        const glint =
          80 *
          Math.pow(
            Math.abs((-0.27 * nx + 0.35 * ny + 0.897 * nz) / length),
            28,
          );
        ctx.fillStyle =
          "rgb(" +
          color.map((v) => Math.round(v * light + glint)).join(",") +
          ")";
        ctx.beginPath();
        view.forEach(([x, y], i) =>
          ctx[i ? "lineTo" : "moveTo"](
            size / 2 + x * scale,
            size / 2 - y * scale,
          ),
        );
        ctx.closePath();
        ctx.fill();
      }
    };
  }
  const models = [spacecraft(false), spacecraft(true)].filter(Boolean);
  let timer,
    time = 0;
  function render() {
    for (const draw of models) draw(time);
  }
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = Boolean(navigator.connection?.saveData);
  function syncPlayback() {
    const paused = document.hidden || motion.matches || saveData;
    sky.classList.toggle("still", paused);
    clearInterval(timer);
    if (!document.hidden) render();
    if (!paused)
      timer = setInterval(() => {
        time += 0.125;
        render();
      }, 125);
  }
  motion.addEventListener("change", syncPlayback);
  document.addEventListener("visibilitychange", syncPlayback);
  syncPlayback();
})();
