"use strict";
(() => {
  const data = window.LIMBO_GRAPH;
  const $ = (id) => document.getElementById(id);
  const glyphs = {
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4 2.2c-1.4.8-1.5 1.3-1.5 2.7m0 3h.01"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    fit: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    links:
      '<circle cx="5" cy="12" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="m7 11 9-5m-9 7 9 5"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    hand: '<path d="m4 12 3 2V7a1.5 1.5 0 0 1 3 0v4-6a1.5 1.5 0 0 1 3 0v6-5a1.5 1.5 0 0 1 3 0v6-3a1.5 1.5 0 0 1 3 0v6c0 4-3 6-6 6h-1c-2 0-3-1-4-2l-5-5z"/>',
    zoom: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 5v4"/>',
    select: '<path d="m5 3 14 10-7 1-3 7z"/>',
    copy: '<path d="m9 15-1.5 1.5a3 3 0 0 1-4.2-4.2l4-4a3 3 0 0 1 4.2 0m1 7.4a3 3 0 0 0 4.2 0l4-4a3 3 0 0 0-4.2-4.2L15 9m-7 7 8-8"/>',
  };
  function icon(name) {
    return (
      '<svg aria-hidden="true" class="glyph" viewBox="0 0 24 24">' +
      glyphs[name] +
      "</svg>"
    );
  }
  document
    .querySelectorAll("[data-icon]")
    .forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[ch],
    );
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  const scripts = data.nodes.filter((n) => n.kind === "script");
  const sectors = data.nodes.filter((n) => n.parent === data.root);
  const edges = data.edges;
  const parents = new Map(),
    members = new Map(),
    scope = new Map(),
    adjacency = new Map(),
    bundles = new Map();
  function add(map, k, v) {
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(v);
  }
  for (const n of data.nodes) {
    let ancestor = n,
      chain = [];
    while (ancestor && ancestor.id !== data.root) {
      chain.unshift(ancestor.id);
      ancestor = byId.get(ancestor.parent);
    }
    parents.set(n.id, chain);
    scope.set(n.id, chain[0]);
    if (n.kind === "script")
      for (const group of chain.slice(0, -1)) add(members, group, n);
  }
  const placements = {
    Client: [0.23, 0.25, "#93c9ff"],
    Interface: [0.44, 0.16, "#deafff"],
    Character: [0.1, 0.49, "#8ee5da"],
    Shared: [0.36, 0.44, "#b7a0ff"],
    Server: [0.635, 0.485, "#a9afff"],
    Floors: [0.49, 0.72, "#efb4d6"],
    World: [0.75, 0.72, "#88c9ef"],
    NPC: [0.7, 0.9, "#e6ba8e"],
    Libraries: [0.32, 0.88, "#aac5ee"],
    Elevator: [0.17, 0.71, "#f5cc98"],
    Items: [0.52, 0.32, "#e9c79d"],
    Development: [0.895, 0.53, "#a6c9c1"],
    Archive: [0.085, 0.87, "#acaccb"],
  };
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++)
      h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  const points = new Map(),
    shapes = new Map(),
    offsets = new Map(),
    available = Object.values(placements);
  sectors.forEach((s, i) => {
    const [x, y, color] = placements[s.name] || available[i % available.length];
    const membersHere = members.get(s.id) || [];
    const center = {
      x: x * 1000,
      y: y * 650,
      color,
      r: 22 + Math.sqrt(membersHere.length) * 3.2,
      id: s.id,
    };
    shapes.set(s.id, center);
    const sorted = membersHere
      .slice()
      .sort(
        (a, b) => a.parent.localeCompare(b.parent) || hash(a.id) - hash(b.id),
      );
    // Each angle slice keeps siblings together. A golden-ratio radius keeps dense sectors legible.
    sorted.forEach((n, k) => {
      const f = (k + 0.5) / sorted.length,
        theta = f * Math.PI * 2 + (hash(s.id) % 10);
      const radius =
        center.r *
        (0.17 + 0.9 * Math.sqrt((k * 0.61803398875 + 0.28) % 1)) *
        (0.88 + 0.13 * Math.cos(3 * theta + 1));
      const dx = Math.cos(theta) * radius * 1.28,
        dy = Math.sin(theta) * radius * 0.92;
      offsets.set(n.id, [dx, dy]);
      points.set(n.id, { x: center.x + dx, y: center.y + dy, color, id: n.id });
    });
  });
  for (const edge of edges) {
    add(adjacency, edge[0], edge);
    add(adjacency, edge[1], edge);
    const a = scope.get(edge[0]),
      b = scope.get(edge[1]);
    if (!a || !b || a === b) continue;
    const k = [a, b].sort().join("|");
    if (!bundles.has(k))
      bundles.set(k, { a: shapes.get(a), b: shapes.get(b), n: 0 });
    bundles.get(k).n++;
  }
  const worlds = new Image();
  worlds.src = "./assets/script-worlds.webp";
  worlds.addEventListener("load", () => invalidate());
  const types = {
    ModuleScript: { title: "Module", variants: [2, 4, 5, 8, 10] },
    LocalScript: { title: "Local script", variants: [0, 3, 6] },
    Script: { title: "Script", variants: [1, 7] },
  };
  function sprite(id) {
    const node = byId.get(id);
    if (node?.parent === data.root)
      return (
        Math.max(
          0,
          sectors.findIndex((s) => s.id === id),
        ) % 12
      );
    const variants = types[node?.class]?.variants;
    return variants ? variants[hash(id) % variants.length] : hash(id) % 12;
  }
  // Keep a local route into each connected system at sector scale.
  const localRoutes = new Set();
  const candidates = edges
    .filter(([a, b]) => scope.get(a) === scope.get(b))
    .slice();
  candidates.sort((a, b) => {
    const distance = ([a, b]) =>
      Math.hypot(
        points.get(a).x - points.get(b).x,
        points.get(a).y - points.get(b).y,
      );
    return distance(a) / Math.sqrt(a[2]) - distance(b) / Math.sqrt(b[2]);
  });
  const branches = new Map();
  for (const edge of candidates) {
    const [a, b] = edge;
    if ((branches.get(a) || 0) >= 3 || (branches.get(b) || 0) >= 3) continue;
    localRoutes.add(edge);
    branches.set(a, (branches.get(a) || 0) + 1);
    branches.set(b, (branches.get(b) || 0) + 1);
  }
  const fmt = (n) => n.toLocaleString("en-US");
  $("statScripts").textContent = fmt(scripts.length);
  $("statEdges").textContent = fmt(edges.length);
  $("sectorCount").textContent = String(sectors.length).padStart(2, "0");
  $("footerStatus").textContent = data.snapshot
    ? "Snapshot · " +
      new Date(data.snapshot.slice(0, 10) + "T12:00:00Z").toLocaleDateString(
        "en-US",
        { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" },
      )
    : "Project snapshot";
  if (data.coverage) {
    const note = document.createElement("p");
    const { unresolvedRequires, optionalPaths } = data.coverage;
    note.textContent = `This snapshot covers ${fmt(scripts.length)} scripts. Unresolved targets include ${unresolvedRequires} dynamic or external imports and ${optionalPaths} optional path${optionalPaths === 1 ? "" : "s"}.`;
    $("guide").append(note);
  }
  const sectorRows = sectors
    .slice()
    .sort(
      (a, b) =>
        (members.get(b.id)?.length || 0) - (members.get(a.id)?.length || 0),
    );
  const swatch = (c) => '<i class="swatch" style="--c:' + c + '"></i>';
  $("sectors").innerHTML = sectorRows
    .map(
      (s) =>
        '<button class="sector-row" data-id="' +
        esc(s.id) +
        '">' +
        swatch(shapes.get(s.id).color) +
        "<span>" +
        esc(s.name) +
        '</span><span class="count">' +
        (members.get(s.id)?.length || 0) +
        "</span></button>",
    )
    .join("");
  const canvas = $("graph"),
    ctx = canvas.getContext("2d"),
    stage = $("stage");
  let W = 1000,
    H = 650;
  function measureSpacing() {
    for (const sector of sectors) {
      const stars = (members.get(sector.id) || []).map((n) => points.get(n.id));
      for (const point of stars) {
        let nearest = Infinity;
        for (const other of stars)
          if (other !== point)
            nearest = Math.min(
              nearest,
              Math.hypot(other.x - point.x, other.y - point.y),
            );
        point.spacing = nearest;
      }
    }
  }
  measureSpacing();
  const core = { x: 488, y: 344 };
  const portraitPlaces = {
    Client: [0.2, 0.22],
    Interface: [0.43, 0.085],
    Items: [0.68, 0.23],
    Character: [0.13, 0.395],
    Shared: [0.385, 0.42],
    Server: [0.78, 0.39],
    Floors: [0.52, 0.59],
    Elevator: [0.15, 0.59],
    World: [0.86, 0.59],
    Libraries: [0.38, 0.8],
    NPC: [0.72, 0.91],
    Development: [0.8, 0.75],
    Archive: [0.13, 0.9],
  };
  function positionMap(portrait) {
    W = portrait ? 650 : 1000;
    H = portrait ? 930 : 650;
    core.x = W * (portrait ? 0.56 : 0.488);
    core.y = H * (portrait ? 0.455 : 0.53);
    sectors.forEach((s, i) => {
      const fractions = portrait ? portraitPlaces[s.name] : placements[s.name],
        sh = shapes.get(s.id);
      const [x, y] = fractions || available[i % available.length];
      sh.x = x * W;
      sh.y = y * H;
      for (const n of members.get(s.id) || []) {
        const pt = points.get(n.id),
          [dx, dy] = offsets.get(n.id);
        pt.x = sh.x + dx * (portrait ? 0.71 : 1);
        pt.y = sh.y + dy * (portrait ? 0.8 : 1);
      }
    });
  }
  const cam = { x: W / 2, y: H / 2, k: 1 };
  let goal = { ...cam },
    width = 1,
    height = 1,
    base = 1,
    dpr = 1,
    selected = null,
    showLinks = true,
    hits = [],
    hover = null,
    drawn = 0,
    raf = 0,
    isMoving = false;
  let idleTimer = 0;
  document.addEventListener("visibilitychange", () => {
    clearTimeout(idleTimer);
    if (!document.hidden) invalidate();
  });
  let mini = matchMedia("(max-width:640px)").matches,
    reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  matchMedia("(prefers-reduced-motion:reduce)").addEventListener(
    "change",
    (e) => {
      reduce = e.matches;
      invalidate();
    },
  );
  const scale = () => base * cam.k;
  function toScreen(p) {
    return {
      x: (p.x - cam.x) * scale() + width / 2,
      y: (p.y - cam.y) * scale() + height / 2,
    };
  }
  function world(x, y) {
    return {
      x: (x - width / 2) / scale() + cam.x,
      y: (y - height / 2) / scale() + cam.y,
    };
  }
  function invalidate() {
    if (!raf) raf = requestAnimationFrame(render);
  }
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    if (!width || !height) return;
    const portrait = width < 540 && height > width,
      switched = portrait !== (W === 650);
    mini = width < 540;
    if (switched) {
      positionMap(portrait);
      measureSpacing();
      rebuildRoutes();
    }
    // Bound the backing store on 4K screens without sacrificing CSS-pixel hit testing.
    dpr = Math.min(
      devicePixelRatio || 1,
      2,
      Math.sqrt(4_000_000 / (width * height)),
    );
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    base = Math.min((width - 22) / W, (height - (mini ? 80 : 64)) / H);
    if (switched) {
      if (selected) select(selected, { url: false });
      else {
        goal = { k: 1, x: W / 2, y: H / 2 };
        Object.assign(cam, goal);
      }
    }
    invalidate();
  }
  new ResizeObserver(resize).observe(stage);
  const visible = (x, y, pad = 80) =>
    x > -pad && y > -pad && x < width + pad && y < height + pad;
  function dot(x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  function star(x, y, r, color) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + r * 0.12, y - r * 0.17, x + r * 0.88, y);
    ctx.quadraticCurveTo(x + r * 0.12, y + r * 0.16, x, y + r);
    ctx.quadraticCurveTo(x - r * 0.12, y + r * 0.16, x - r * 0.88, y);
    ctx.quadraticCurveTo(x - r * 0.12, y - r * 0.17, x, y - r);
    ctx.fillStyle = color;
    ctx.fill();
  }
  const glowSprites = new Map();
  function softGlow(x, y, r, color) {
    let image = glowSprites.get(color);
    if (!image) {
      image = document.createElement("canvas");
      image.width = image.height = 96;
      const buffer = image.getContext("2d");
      const glow = buffer.createRadialGradient(48, 48, 0, 48, 48, 48);
      glow.addColorStop(0, color);
      glow.addColorStop(1, color.slice(0, 7) + "00");
      buffer.fillStyle = glow;
      buffer.fillRect(0, 0, 96, 96);
      glowSprites.set(color, image);
    }
    ctx.drawImage(image, x - r, y - r, 2 * r, 2 * r);
  }
  // Paths remain in map coordinates. Zoom and pan change a single transform.
  // Keep the control point in the bounds: a curved path can enter the viewport
  // even when both of its endpoints are offscreen.
  function routeGeometry(a, b, bend) {
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const cx = (a.x + b.x) / 2 - dy * bend,
      cy = (a.y + b.y) / 2 + dx * bend;
    return {
      a,
      b,
      cx,
      cy,
      dx,
      dy,
      bend,
      left: Math.min(a.x, b.x, cx),
      right: Math.max(a.x, b.x, cx),
      top: Math.min(a.y, b.y, cy),
      bottom: Math.max(a.y, b.y, cy),
    };
  }
  function appendRoute(path, r) {
    path.moveTo(r.a.x, r.a.y);
    path.quadraticCurveTo(r.cx, r.cy, r.b.x, r.b.y);
  }
  let layers = [];
  const geometry = new Map();
  function rebuildRoutes() {
    const groups = new Map();
    geometry.clear();
    for (const edge of edges) {
      const [s, t] = edge,
        from = points.get(s),
        to = points.get(t);
      const local = scope.get(s) === scope.get(t);
      const r = routeGeometry(from, to, local ? 0.065 : 0.048);
      r.phase = (hash(s + "|" + t) % 997) / 997;
      geometry.set(edge, r);
      const level = localRoutes.has(edge)
        ? "branch"
        : local
          ? "local"
          : "remote";
      const key = scope.get(s) + "|" + scope.get(t) + "|" + level;
      let group = groups.get(key);
      if (!group) {
        group = {
          path: new Path2D(),
          level,
          color: from.color,
          from: scope.get(s),
          to: scope.get(t),
          left: Infinity,
          right: -Infinity,
          top: Infinity,
          bottom: -Infinity,
        };
        groups.set(key, group);
      }
      appendRoute(group.path, r);
      group.left = Math.min(group.left, r.left);
      group.right = Math.max(group.right, r.right);
      group.top = Math.min(group.top, r.top);
      group.bottom = Math.max(group.bottom, r.bottom);
    }
    layers = [...groups.values()];
    for (const bundle of bundles.values()) {
      bundle.route = routeGeometry(bundle.a, bundle.b, 0.07);
      bundle.path = new Path2D();
      appendRoute(bundle.path, bundle.route);
      bundle.phase = (hash(bundle.a.id + "|" + bundle.b.id) % 991) / 991;
    }
  }
  function smoothStep(t) {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }
  function drawConnections(time, focusScript, focusSector) {
    const unit = scale(),
      halfWidth = (width / 2 + 8) / unit,
      halfHeight = (height / 2 + 8) / unit;
    const left = cam.x - halfWidth,
      right = cam.x + halfWidth,
      top = cam.y - halfHeight,
      bottom = cam.y + halfHeight;
    const onScreen = (r) =>
      r.right >= left && r.left <= right && r.bottom >= top && r.top <= bottom;
    const detail = smoothStep((cam.k - 1.35) / 1.65);
    const overview = 1 - smoothStep((cam.k - 1.75) / 1.65);
    const accents = [];
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(unit, unit);
    ctx.translate(-cam.x, -cam.y);
    if (overview > 0) {
      for (const bundle of bundles.values()) {
        const r = bundle.route;
        if (!onScreen(r)) continue;
        const nearby =
          !focusSector || focusSector === r.a.id || focusSector === r.b.id;
        ctx.globalAlpha =
          overview *
          Math.min(0.52, 0.085 + Math.sqrt(bundle.n) * 0.049) *
          (nearby ? 1 : 0.38) *
          (focusScript ? 0.42 : 1);
        ctx.lineWidth =
          Math.min(1.32, 0.53 + Math.sqrt(bundle.n) * 0.08) / unit;
        ctx.strokeStyle = "#bcb1e1";
        ctx.stroke(bundle.path);
        if (
          bundle.n >= 13 &&
          nearby &&
          !reduce &&
          !focusScript &&
          overview > 0.15
        ) {
          accents.push({
            r,
            phase: (time * 0.000075 + bundle.phase) % 1,
            color: r.a.color,
            overview: true,
            alpha: overview,
          });
        }
      }
    }
    for (const layer of layers) {
      if (!onScreen(layer)) continue;
      let alpha = detail * 0.155;
      if (layer.level === "branch") alpha = 0.24 + detail * 0.19;
      else if (layer.level === "local") alpha = detail * 0.22;
      if (!alpha) continue;
      const nearby =
        !focusSector || layer.from === focusSector || layer.to === focusSector;
      ctx.globalAlpha = alpha * (focusScript ? 0.31 : nearby ? 1 : 0.53);
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = (layer.level === "branch" ? 0.91 : 0.75) / unit;
      ctx.stroke(layer.path);
    }
    if (focusScript) {
      // Keep the ambient network when inspecting; its lower contrast keeps orientation.
      // Pulse only a bounded handful of routes even on a highly connected hub.
      const focusEdges = adjacency.get(focusScript) || [];
      const stride = Math.max(1, Math.ceil(focusEdges.length / 14));
      let index = 0;
      for (const edge of focusEdges) {
        const r = geometry.get(edge);
        if (!onScreen(r)) continue;
        const color = edge[0] === focusScript ? "#ffd09a" : "#8fdfef";
        ctx.globalAlpha = 0.86;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.42 / unit;
        ctx.beginPath();
        appendRoute(ctx, r);
        ctx.stroke();
        const animate = !reduce && index % stride === 0;
        const phase = animate
          ? (time * 0.00015 + r.phase) % 1
          : 0.37 + r.phase * 0.26;
        accents.push({ r, phase, color, animate, alpha: 1 });
        index++;
      }
    }
    ctx.restore();
    for (const {
      r,
      phase,
      color,
      animate,
      overview: broad,
      alpha,
    } of accents) {
      const bulge = 2 * phase * (1 - phase) * r.bend;
      const x =
        (r.a.x + r.dx * phase - r.dy * bulge - cam.x) * unit + width / 2;
      const y =
        (r.a.y + r.dy * phase + r.dx * bulge - cam.y) * unit + height / 2;
      if (!visible(x, y, 12)) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (broad) {
        dot(x, y, 2.8, color + "32");
        dot(x, y, 1.0, "#ecddffca");
      } else {
        ctx.translate(x, y);
        const curvature = 2 * r.bend * (1 - 2 * phase);
        ctx.rotate(
          Math.atan2(r.dy + r.dx * curvature, r.dx - r.dy * curvature),
        );
        if (animate) {
          // A tapered luminous wake points from the sender to the receiver.
          ctx.fillStyle = color + "38";
          ctx.beginPath();
          ctx.moveTo(-13, 0);
          ctx.lineTo(0, -2.5);
          ctx.lineTo(0, 2.5);
          ctx.fill();
        }
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(-2.7, -2.1);
        ctx.lineTo(-1.5, 0);
        ctx.lineTo(-2.7, 2.1);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  function textLabel(name, x, y, color, size, center = true) {
    ctx.font = "500 " + size + 'px "DM Sans", sans-serif';
    ctx.textAlign = center ? "center" : "left";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0d0a19d9";
    ctx.strokeText(name, x, y);
    ctx.fillStyle = color;
    ctx.fillText(name, x, y);
  }
  function paintWorld(id, x, y, r, opacity = 1) {
    if (!worlds.complete || !worlds.naturalWidth) {
      dot(x, y, r * 0.62, shapes.get(scope.get(id))?.color || "#eddcff");
      return;
    }
    const tile = sprite(id);
    ctx.globalAlpha = opacity;
    ctx.drawImage(
      worlds,
      (tile % 4) * 160,
      Math.floor(tile / 4) * 160,
      160,
      160,
      x - r,
      y - r,
      r * 2,
      r * 2,
    );
    ctx.globalAlpha = 1;
  }
  function orbitalFocus(x, y, r, color, t, active) {
    ctx.save();
    ctx.translate(x, y);
    const phase = reduce ? 0 : t * 0.00019;
    ctx.lineWidth = 1;
    ctx.strokeStyle = color + "9a";
    for (let i = 0; i < 3; i++) {
      const angle = phase + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(0, 0, r, angle, angle + 0.97);
      ctx.stroke();
      dot(Math.cos(angle) * r, Math.sin(angle) * r, 1.4, "#f8f3ff");
    }
    if (active) {
      const f = reduce ? 0.42 : (t % 2600) / 2600;
      ctx.globalAlpha = (1 - f) * 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, r + f * 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  const labelWidths = new Map();
  function drawLabel(item, occupied, positions) {
    const { p, id, name, r, color, marked, neighbor, hovered, degree } = item;
    const hero = marked || hovered;
    const extra = hero || (cam.k > 7 && !mini && degree >= 3);
    const titleSize = hero ? 14 : mini ? 10.5 : 12;
    ctx.font = `550 ${titleSize}px "DM Sans", sans-serif`;
    const labelKey = titleSize + ":" + name;
    let w = labelWidths.get(labelKey);
    if (w === undefined) {
      w = ctx.measureText(name).width + 18;
      labelWidths.set(labelKey, w);
    }
    const h = extra ? 36 : 21;
    const gap = r * 0.76 + 5;
    const placements = [
      [p.x + gap, p.y - h / 2],
      [p.x - gap - w, p.y - h / 2],
      [p.x - w / 2, p.y + gap + 1],
      [p.x - w / 2, p.y - h - gap - 1],
    ];
    for (const [x, y] of placements) {
      if (x < 3 || y < 3 || x + w > width - 3 || y + h > height - 3) continue;
      const overlaps = (rect) =>
        x < rect.x + rect.w + 3 &&
        x + w + 3 > rect.x &&
        y < rect.y + rect.h + 2 &&
        y + h + 2 > rect.y;
      if (occupied.some(overlaps)) continue;
      if (
        !hero &&
        positions.some(
          (o) =>
            o.id !== id &&
            o.x > x - 3 &&
            o.x < x + w + 3 &&
            o.y > y - 4 &&
            o.y < y + h + 4,
        )
      )
        continue;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, hero ? 7 : 5);
      ctx.fillStyle = hero ? "#231f32f5" : neighbor ? "#151728ee" : "#10111dda";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = color + (hero ? "94" : neighbor ? "4a" : "29");
      ctx.stroke();
      ctx.textAlign = "left";
      ctx.fillStyle = hero ? "#fff8ec" : neighbor ? "#e6eeff" : "#dfdeed";
      ctx.fillText(name, x + 9, y + (extra ? 15.4 : 14.4));
      if (extra) {
        ctx.font = '8px "DM Sans", sans-serif';
        ctx.fillStyle = color;
        const type = types[byId.get(id).class]?.title || "Script";
        ctx.fillText(type.toUpperCase(), x + 9, y + 28.2);
      }
      occupied.push({ x, y, w, h });
      hits.push({ id, x: x + w / 2, y: y + h / 2, w: w / 2, h: h / 2 });
      return;
    }
  }
  function render(ts) {
    raf = 0;
    const dt = Math.min(52, ts - drawn || 16);
    drawn = ts;
    const delta =
      Math.abs(goal.x - cam.x) +
      Math.abs(goal.y - cam.y) +
      Math.abs(goal.k - cam.k) * 40;
    if (delta > 0.03) {
      const f = reduce ? 1 : 1 - Math.exp(-dt / 92);
      for (const k of ["x", "y", "k"]) cam[k] += (goal[k] - cam[k]) * f;
    } else Object.assign(cam, goal);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    hits = [];
    const zoom = cam.k,
      deep = zoom > 2.2,
      center = toScreen(core),
      focusSector = scope.get(selected),
      selectedNode = byId.get(selected),
      focusScript =
        selectedNode?.kind === "script"
          ? selected
          : deep && byId.get(hover)?.kind === "script"
            ? hover
            : null,
      focusGroup = selectedNode?.kind === "group";
    const related = focusScript
      ? new Set([
          focusScript,
          ...(adjacency.get(focusScript) || []).flatMap((e) => [e[0], e[1]]),
        ])
      : null;
    const selectedMembers = focusGroup
      ? new Set((members.get(selected) || []).map((n) => n.id))
      : null;
    // Fine celestial parallels supply a stable frame when panning through deep space.
    if (zoom < 2.1) {
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(-0.14);
      ctx.lineWidth = 0.75;
      for (let r of [123, 248, 390, 527]) {
        ctx.beginPath();
        ctx.ellipse(0, 0, r * scale(), r * 0.63 * scale(), 0, 0, Math.PI * 2);
        ctx.strokeStyle = "#c8b4ec17";
        ctx.stroke();
      }
      ctx.setLineDash([2, 7]);
      ctx.beginPath();
      ctx.ellipse(0, 0, 321 * scale(), 198 * scale(), 0, 0, Math.PI * 2);
      ctx.strokeStyle = "#d4b7ff24";
      ctx.stroke();
      ctx.restore();
    }
    if (showLinks) drawConnections(ts, focusScript, focusSector);
    for (const s of sectors) {
      const shape = shapes.get(s.id),
        p = toScreen(shape),
        dim = focusSector && focusSector !== s.id;
      if (!visible(p.x, p.y, shape.r * scale() + 100)) continue;
      if (zoom < 2.9)
        softGlow(
          p.x,
          p.y,
          Math.max(16, shape.r * scale() * 1.5),
          shape.color + (dim ? "08" : "1c"),
        );
    }
    const scriptLabels = [],
      screenPoints = [];
    const detailed = zoom > 1.55;
    const reveal = Math.min(1, Math.max(0, (zoom - 1.55) / 1.55));
    for (const script of scripts) {
      const q = points.get(script.id),
        p = toScreen(q);
      if (!visible(p.x, p.y, 30)) continue;
      const marked = selected === script.id,
        hovered = hover === script.id,
        neighbor = related?.has(script.id);
      const dim = related
        ? !neighbor
        : selectedMembers && !selectedMembers.has(script.id);
      const degree = adjacency.get(script.id)?.length || 0;
      const strength = Math.min(3.0, Math.log2(1 + degree) * 0.6);
      const farRadius = Math.max(
        0.9,
        Math.min(3.2, base * (1.1 + strength * 0.65)),
      );
      const nominalRadius =
        (mini ? 3.3 : 4.6) + Math.min(17, zoom * 1.48) + strength * 1.35;
      const nearRadius = Math.max(
        2.7,
        Math.min(nominalRadius, q.spacing * scale() * 0.64),
      );
      const r =
        marked || hovered
          ? Math.max(nearRadius * 1.45, 22)
          : (farRadius + (nearRadius - farRadius) * reveal) * (dim ? 0.62 : 1);
      if (detailed && reveal > 0.08) {
        if (!dim && (degree > 5 || marked || hovered))
          softGlow(
            p.x,
            p.y,
            r * 1.26,
            q.color + (marked || hovered ? "72" : "36"),
          );
        paintWorld(script.id, p.x, p.y, r, dim ? 0.35 : 1);
        if (marked || hovered)
          orbitalFocus(p.x, p.y, r * 0.95 + 2, q.color, ts, marked);
      } else {
        if (degree > 5 && !dim) {
          softGlow(p.x, p.y, farRadius * 3.0, q.color + "82");
          star(p.x, p.y, farRadius * 1.6, q.color);
        }
        dot(p.x, p.y, farRadius, q.color + (dim ? "4a" : "d7"));
      }
      if (detailed) {
        hits.push({ id: script.id, x: p.x, y: p.y, r: Math.max(8, r * 0.9) });
        screenPoints.push({ id: script.id, x: p.x, y: p.y });
        if (!dim && (deep || marked || hovered)) {
          const priority =
            (marked ? 5000 : 0) +
            (hovered ? 4000 : 0) +
            (neighbor ? 2000 : 0) +
            strength * 30 -
            Math.hypot(
              (p.x - width * 0.5) / width,
              (p.y - height * 0.5) / height,
            ) *
              10;
          scriptLabels.push({
            p,
            id: script.id,
            name: script.name,
            r,
            color: q.color,
            priority,
            marked,
            neighbor,
            hovered,
            degree,
          });
        }
      }
    }
    if (zoom < 2.1 && visible(center.x, center.y)) {
      softGlow(center.x, center.y, Math.max(24, 35 * base), "#ccb1ff79");
      ctx.beginPath();
      ctx.ellipse(
        center.x,
        center.y,
        Math.max(14, 21 * base),
        Math.max(3.5, 4.3 * base),
        -0.44,
        0,
        Math.PI * 2,
      );
      ctx.lineWidth = 0.85;
      ctx.strokeStyle = "#ddc5ffb5";
      ctx.stroke();
      star(center.x, center.y, Math.max(9, 14 * base), "#f5eaff");
      ctx.beginPath();
      ctx.arc(center.x, center.y, Math.max(7, 10 * base), 0, Math.PI * 2);
      ctx.strokeStyle = "#e8d7ff76";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      textLabel("LIMBO", center.x, center.y + 24, "#eee5ff", mini ? 9 : 11);
      hits.push({ id: data.root, x: center.x, y: center.y, r: 14 });
    }
    for (const s of sectors) {
      const sh = shapes.get(s.id),
        p = toScreen(sh),
        active = focusSector === s.id,
        dim = focusSector && !active;
      if (!visible(p.x, p.y) || zoom > 2.9) continue;
      const sz = mini ? 5 : 7;
      const portraitR = mini ? 9 : 14;
      softGlow(p.x, p.y, portraitR * 1.48, sh.color + "6c");
      paintWorld(s.id, p.x, p.y, portraitR, dim ? 0.48 : 1);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, sz + 5.5, sz + 3.6, -0.27, -1.85, 3.65);
      ctx.strokeStyle = sh.color + (dim ? "52" : "a3");
      ctx.lineWidth = 0.9;
      ctx.stroke();
      if (
        !mini ||
        W === 650 ||
        zoom > 1.4 ||
        active ||
        [
          "Client",
          "World",
          "Server",
          "Shared",
          "Floors",
          "Character",
          "Interface",
          "Items",
        ].includes(s.name)
      ) {
        const labelY = p.y + (zoom > 1.5 ? -17 : mini ? 17 : 22);
        textLabel(
          s.name,
          p.x,
          labelY,
          dim ? "#a69cb4" : sh.color,
          mini ? 10 : Math.min(14, 12 + base),
        );
        const tw = ctx.measureText(s.name).width;
        hits.push({ id: s.id, x: p.x, y: labelY - 4, w: tw / 2 + 3, h: 8 });
      }
      hits.push({ id: s.id, x: p.x, y: p.y, r: mini ? 12 : 14 });
    }
    scriptLabels.sort((a, b) => b.priority - a.priority);
    const occupied = [];
    const inspector = $("inspector");
    if (!inspector.hidden)
      occupied.push({
        x: inspector.offsetLeft - 4,
        y: inspector.offsetTop - 4,
        w: inspector.offsetWidth + 8,
        h: inspector.offsetHeight + 8,
      });
    const labelBudget = Math.min(
      scriptLabels.length,
      Math.ceil(
        ((width * height) / (mini ? 12500 : 14500)) * Math.min(1.4, zoom / 5),
      ),
    );
    const labelLimit = labelBudget + occupied.length;
    for (
      let i = 0;
      i < scriptLabels.length && occupied.length < labelLimit;
      i++
    )
      drawLabel(scriptLabels[i], occupied, screenPoints);
    const lensMode =
      focusScript && showLinks ? "routes" : deep ? "worlds" : "atlas";
    if (stage.dataset.lens !== lensMode) stage.dataset.lens = lensMode;
    const percent = Math.round(cam.k * 100) + "%";
    if ($("zoom").textContent !== percent) $("zoom").textContent = percent;
    if (delta > 0.03) invalidate();
    else if (
      !reduce &&
      !document.hidden &&
      ((showLinks && (!deep || focusScript)) || (focusScript && deep))
    ) {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(invalidate, focusScript ? 32 : 75);
    }
  }
  document.fonts.ready.then(() => {
    labelWidths.clear();
    invalidate();
  });
  function hit(x, y) {
    let best = null,
      dist = Infinity;
    for (const h of hits) {
      const dx = x - h.x,
        dy = y - h.y,
        d = dx * dx + dy * dy;
      if (h.w) {
        if (Math.abs(dx) < h.w && Math.abs(dy) < h.h && d < dist) {
          best = h.id;
          dist = d;
        }
      } else if (d < h.r * h.r && d < dist) {
        best = h.id;
        dist = d;
      }
    }
    if (!best && cam.k <= 2.2) {
      let shortest = 36;
      for (const q of points.values()) {
        const p = toScreen(q),
          d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < shortest) {
          shortest = d;
          best = q.id;
        }
      }
    }
    return best;
  }
  function zoomAt(k, x = width / 2, y = height / 2) {
    const pos = world(x, y);
    const next = Math.max(0.48, Math.min(20, k));
    goal = {
      k: next,
      x: pos.x - (x - width / 2) / (base * next),
      y: pos.y - (y - height / 2) / (base * next),
    };
    invalidate();
  }
  function home() {
    clearSelection();
    goal = { x: W / 2, y: H / 2, k: 1 };
    invalidate();
  }
  function setURL(id) {
    const url = new URL(location.href);
    if (id) url.searchParams.set("node", id);
    else url.searchParams.delete("node");
    try {
      history.replaceState(null, "", url);
    } catch {}
  }
  function clearSelection() {
    selected = null;
    $("inspector").hidden = true;
    $("crumb").textContent = "All sectors";
    document.querySelector(".sector-row.active")?.classList.remove("active");
    setURL(null);
    invalidate();
  }
  function detailItem(id, sub) {
    const n = byId.get(id);
    if (!n) return "";
    const color = shapes.get(scope.get(id))?.color || "#dec6ff";
    return (
      '<button class="neighbor" data-id="' +
      esc(id) +
      '">' +
      swatch(color) +
      '<span class="item"><strong>' +
      esc(n.name) +
      "</strong><small>" +
      esc(sub) +
      "</small></span>" +
      icon("arrow") +
      "</button>"
    );
  }
  function displayDetails(n) {
    const color = shapes.get(scope.get(n.id))?.color || "#d1aff9",
      script = n.kind === "script";
    const tile = sprite(n.id);
    let html =
      `<div class="detail-orb" aria-hidden="true" style="--col:${tile % 4};--row:${Math.floor(tile / 4)};--glow:${color}"></div>` +
      '<div class="detail-kicker">' +
      swatch(color) +
      esc(
        script
          ? n.class || "Script"
          : n.parent === data.root
            ? "Sector"
            : "Script group",
      ) +
      "</div><h2>" +
      esc(n.name) +
      '</h2><p class="path">' +
      esc(
        n.path ||
          parents
            .get(n.id)
            .map((id) => byId.get(id).name)
            .join(" / "),
      ) +
      "</p>";
    if (script) {
      const list = adjacency.get(n.id) || [];
      for (const [label, index] of [
        ["Outgoing", 0],
        ["Incoming", 1],
      ]) {
        const pairs = list
          .filter((e) => e[index] === n.id)
          .sort((a, b) =>
            byId
              .get(a[1 - index])
              .name.localeCompare(byId.get(b[1 - index]).name),
          );
        html +=
          '<div class="detail-head"><span>' +
          label +
          "</span><span>" +
          pairs.length +
          '</span></div><div class="inspect-list">' +
          (pairs.length
            ? pairs
                .map((e) =>
                  detailItem(e[1 - index], e[3]?.join(" · ") || "Dependency"),
                )
                .join("")
            : '<p class="empty">None recorded</p>') +
          "</div>";
      }
    } else {
      const list = (members.get(n.id) || [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name));
      html +=
        '<div class="detail-head"><span>Scripts</span><span>' +
        list.length +
        '</span></div><div class="inspect-list">' +
        list
          .map((s) => detailItem(s.id, byId.get(s.parent)?.name || s.class))
          .join("") +
        "</div>";
    }
    html +=
      '<button id="share" class="share">' +
      icon("copy") +
      "<span>Copy link</span></button>";
    $("inspectorBody").innerHTML = html;
    $("inspector").scrollTop = 0;
    $("inspector").hidden = false;
    $("share").onclick = async () => {
      const label = $("share").querySelector("span");
      try {
        await navigator.clipboard.writeText(location.href);
        label.textContent = "Link copied";
      } catch {
        const input = document.createElement("input");
        input.value = location.href;
        input.setAttribute("aria-label", "Link to selection");
        $("inspectorBody").append(input);
        input.select();
      }
    };
  }
  function select(id, { url = true } = {}) {
    if (id === data.root) {
      home();
      return;
    }
    const n = byId.get(id);
    if (!n) return;
    hover = null;
    selected = id;
    const sector = scope.get(id);
    const sh = shapes.get(sector);
    const p = points.get(id) || sh;
    if (!p) return;
    const k =
      n.kind === "script"
        ? mini
          ? 9.8
          : 6.9
        : mini
          ? Math.max(
              3.5,
              Math.min(
                11,
                Math.min(width * 0.85, height * 0.71) / (sh.r * base * 2),
              ),
            )
          : 3.45;
    goal = {
      x: p.x + (mini ? 0 : 48) / (base * k),
      y: p.y + (mini ? height * 0.22 : 0) / (base * k),
      k,
    };
    invalidate();
    document.querySelector(".sector-row.active")?.classList.remove("active");
    document
      .querySelector('.sector-row[data-id="' + CSS.escape(sector) + '"]')
      ?.classList.add("active");
    $("crumb").textContent = byId.get(sector).name;
    displayDetails(n);
    if (url) setURL(id);
  }
  let drag = null,
    pinch = null;
  const touches = new Map();
  function loc(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function hideTip() {
    if (hover) invalidate();
    hover = null;
    $("tooltip").hidden = true;
  }
  function lens() {
    if (touches.size !== 2) return null;
    const [a, b] = [...touches.values()];
    return {
      gap: Math.hypot(b.x - a.x, b.y - a.y),
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    };
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    hideTip();
    canvas.setPointerCapture(e.pointerId);
    const p = loc(e);
    touches.set(e.pointerId, p);
    goal = { ...cam };
    drag = { ...p, cx: cam.x, cy: cam.y, moved: false };
    canvas.classList.add("grab");
    if (touches.size === 2) {
      const l = lens();
      pinch = { ...l, k: cam.k, p: world(l.x, l.y) };
      drag.moved = true;
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = loc(e);
    if (touches.has(e.pointerId)) {
      touches.set(e.pointerId, p);
      if (pinch && touches.size === 2) {
        const l = lens(),
          k = Math.min(
            20,
            Math.max(0.48, (pinch.k * l.gap) / Math.max(1, pinch.gap)),
          );
        goal = {
          k,
          x: pinch.p.x - (l.x - width / 2) / (base * k),
          y: pinch.p.y - (l.y - height / 2) / (base * k),
        };
        Object.assign(cam, goal);
        invalidate();
        return;
      }
      if (drag) {
        const dx = p.x - drag.x,
          dy = p.y - drag.y;
        if (Math.hypot(dx, dy) > 4) drag.moved = true;
        goal = {
          k: cam.k,
          x: drag.cx - dx / scale(),
          y: drag.cy - dy / scale(),
        };
        Object.assign(cam, goal);
        invalidate();
      }
      return;
    }
    if (e.pointerType === "touch") return;
    const id = hit(p.x, p.y);
    canvas.style.cursor = id ? "pointer" : "grab";
    if (id) {
      const tip = $("tooltip");
      const hoveredNode = byId.get(id);
      tip.textContent = hoveredNode?.name || "Limbo";
      tip.hidden = cam.k > 2.2 && hoveredNode?.kind === "script";
      tip.style.left =
        Math.max(0, Math.min(width - tip.offsetWidth - 8, p.x + 14)) + "px";
      tip.style.top =
        Math.max(0, Math.min(height - tip.offsetHeight - 8, p.y + 14)) + "px";
      if (hover !== id) invalidate();
      hover = id;
    } else hideTip();
  });
  function pointerEnd(e) {
    if (!touches.has(e.pointerId)) return;
    const p = loc(e),
      didClick = e.type === "pointerup" && drag && !drag.moved && !pinch;
    touches.delete(e.pointerId);
    pinch = null;
    drag = null;
    if (touches.size) {
      const other = [...touches.values()][0];
      drag = { ...other, cx: cam.x, cy: cam.y, moved: true };
    } else canvas.classList.remove("grab");
    if (didClick) {
      const id = hit(p.x, p.y);
      if (id) select(id);
      else clearSelection();
    }
  }
  canvas.addEventListener("pointerup", pointerEnd);
  canvas.addEventListener("pointercancel", pointerEnd);
  canvas.addEventListener("pointerleave", hideTip);
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const p = loc(e);
      zoomAt(
        goal.k *
          Math.exp(
            -Math.max(
              -220,
              Math.min(220, e.deltaY * (e.deltaMode === 1 ? 16 : 1)),
            ) * 0.002,
          ),
        p.x,
        p.y,
      );
      hideTip();
    },
    { passive: false },
  );
  $("plus").onclick = () => zoomAt(goal.k * 1.38);
  $("minus").onclick = () => zoomAt(goal.k / 1.38);
  $("brand").onclick = home;
  $("atlasTab").onclick = home;
  $("fit").onclick = home;
  $("universe").onclick = home;
  $("inspectorClose").onclick = clearSelection;
  $("links").onclick = () => {
    showLinks = !showLinks;
    $("links").setAttribute("aria-pressed", showLinks);
    invalidate();
  };
  function onPick(e) {
    const b = e.target.closest("[data-id]");
    if (b) select(b.dataset.id);
  }
  $("sectors").onclick = onPick;
  $("inspectorBody").onclick = onPick;
  const input = $("query"),
    lib = $("library");
  let items = [],
    active = 0,
    listing = false;
  const searchable = data.nodes.filter((n) => n.id !== data.root);
  function syncActive(scroll = true) {
    for (const [i, b] of [...$("results").children].entries())
      b.classList.toggle("active", i === active);
    if (scroll)
      $("results").children[active]?.scrollIntoView({ block: "nearest" });
  }
  function results() {
    const q = input.value.trim().toLowerCase(),
      parts = q.split(/\s+/).filter(Boolean);
    const source = q ? searchable : listing ? scripts : sectorRows;
    const ranked = [];
    for (const n of source) {
      const name = n.name.toLowerCase(),
        path = (n.path || n.id).toLowerCase(),
        hay = name + " " + path + " " + n.id.toLowerCase();
      if (!parts.every((t) => hay.includes(t))) continue;
      const rank = q
        ? name === q
          ? 0
          : name.startsWith(q)
            ? 1
            : name.includes(q)
              ? 2
              : 3
        : 0;
      ranked.push({ n, rank });
    }
    ranked.sort(
      (a, b) =>
        a.rank - b.rank ||
        a.n.name.localeCompare(b.n.name) ||
        a.n.id.localeCompare(b.n.id),
    );
    items = ranked.map((r) => r.n);
    active = 0;
    $("resultsMeta").textContent = q
      ? fmt(items.length) +
        " matching " +
        (items.length === 1 ? "entry" : "entries")
      : listing
        ? fmt(items.length) + " scripts"
        : "Browse sectors";
    $("results").innerHTML = items.length
      ? items
          .map(
            (n) =>
              '<button class="result" data-id="' +
              esc(n.id) +
              '">' +
              swatch(shapes.get(scope.get(n.id))?.color || "#bfa4e6") +
              '<span class="item"><strong>' +
              esc(n.name) +
              "</strong><small>" +
              esc(
                n.path ||
                  parents
                    .get(n.id)
                    .map((k) => byId.get(k).name)
                    .join(" / "),
              ) +
              '</small></span><span class="rhs">' +
              esc(
                n.kind === "script"
                  ? n.class || "Script"
                  : n.parent === data.root
                    ? "Sector"
                    : "Group",
              ) +
              "</span></button>",
          )
          .join("")
      : '<div class="empty">No matches. Try a script name, a sector, or part of a Roblox path.</div>';
    $("results").scrollTop = 0;
    syncActive(false);
  }
  function openLibrary(all) {
    listing = all;
    $("libraryTitle").textContent = all ? "Script index" : "Search the atlas";
    input.value = "";
    results();
    if (!lib.open) lib.showModal();
    input.focus();
  }
  $("searchOpen").onclick = () => openLibrary(false);
  $("indexTab").onclick = () => openLibrary(true);
  $("railIndex").onclick = $("indexTab").onclick;
  $("closeLibrary").onclick = () => lib.close();
  input.addEventListener("input", results);
  $("results").onclick = (e) => {
    const b = e.target.closest("[data-id]");
    if (b) {
      lib.close();
      select(b.dataset.id);
    }
  };
  $("guideOpen").onclick = () => $("guide").showModal();
  $("closeGuide").onclick = () => $("guide").close();
  for (const dlg of [lib, $("guide")])
    dlg.addEventListener("click", (e) => {
      if (e.target !== dlg) return;
      const b = dlg.getBoundingClientRect();
      if (
        e.clientX < b.left ||
        e.clientX > b.right ||
        e.clientY < b.top ||
        e.clientY > b.bottom
      )
        dlg.close();
    });
  document.addEventListener("keydown", (e) => {
    if (lib.open) {
      if (e.key === "Escape") {
        e.preventDefault();
        lib.close();
        return;
      }
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && items.length) {
        e.preventDefault();
        active =
          (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
          items.length;
        syncActive();
      } else if (e.key === "Enter" && e.target === input && items[active]) {
        e.preventDefault();
        lib.close();
        select(items[active].id);
      }
      return;
    }
    if ($("guide").open || e.target.matches("input,textarea")) return;
    if (
      e.key === "/" ||
      (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey))
    ) {
      e.preventDefault();
      openLibrary(false);
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") clearSelection();
    else if (e.key === "0") home();
    else if (e.key === "+" || e.key === "=") zoomAt(goal.k * 1.35);
    else if (e.key === "-") zoomAt(goal.k / 1.35);
    else if (e.key.startsWith("Arrow") && e.target === canvas) {
      e.preventDefault();
      goal.x += (({ ArrowLeft: -1, ArrowRight: 1 }[e.key] || 0) * 60) / scale();
      goal.y += (({ ArrowUp: -1, ArrowDown: 1 }[e.key] || 0) * 60) / scale();
      invalidate();
    }
  });
  rebuildRoutes();
  resize();
  const initial =
    new URLSearchParams(location.search).get("node") || location.hash.slice(1);
  const reloadViewKey = "limbo-refresh-view";
  window.addEventListener("limbo:before-refresh", () => {
    try {
      sessionStorage.setItem(
        reloadViewKey,
        JSON.stringify({ url: location.href, width, height, goal }),
      );
    } catch {
      /* Browser settings can disable storage. */
    }
  });
  if (byId.has(initial)) select(initial, { url: false });
  else invalidate();
  try {
    const saved = JSON.parse(sessionStorage.getItem(reloadViewKey));
    sessionStorage.removeItem(reloadViewKey);
    if (
      saved &&
      saved.url === location.href &&
      (!initial || byId.has(initial)) &&
      Math.abs(saved.width - width) < 3 &&
      Math.abs(saved.height - height) < 3 &&
      [saved.goal?.x, saved.goal?.y, saved.goal?.k].every(Number.isFinite)
    ) {
      goal = saved.goal;
      Object.assign(cam, goal);
      invalidate();
    }
  } catch {
    /* The default view remains usable without storage. */
  }
})();
