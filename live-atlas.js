(() => {
  if (!/^https?:$/.test(location.protocol)) return;
  const interval = 15000;
  const retryAfter = 45000;
  const attemptKey = "limbo-atlas-refresh";
  const loaded = window.LIMBO_PLACE_VERSION || 0;
  const mirrorBuild = window.LIMBO_MIRROR_BUILD;
  let busy = false;
  let pending = false;

  function latestAttempt() {
    try { return JSON.parse(sessionStorage.getItem(attemptKey)); }
    catch { return null; }
  }

  if (loaded) {
    const status = document.getElementById("footerStatus");
    if (status) status.textContent = "Live · v" + loaded + " · " + status.textContent.replace(/^Snapshot · /, "");
    const attempt = latestAttempt();
    if (attempt && (attempt.version < loaded || (attempt.version === loaded && (!mirrorBuild || attempt.build === mirrorBuild)))) {
      try { sessionStorage.removeItem(attemptKey); } catch { /* Storage may be disabled. */ }
    }
  }

  async function refresh() {
    if (busy || pending || document.hidden) return;
    busy = true;
    try {
      const endpoint = mirrorBuild ? "./version.json?t=" + Math.floor(Date.now() / interval) : "./api/atlas/version";
      const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!response.ok) return;
      const { placeVersion, placeId, frontendRevision } = await response.json();
      if (placeId !== 93992970569542 || !Number.isSafeInteger(placeVersion) || placeVersion < loaded) return;
      const nextBuild = mirrorBuild && /^[a-f0-9]{64}$/.test(frontendRevision) ? frontendRevision : "";
      if (placeVersion === loaded && (!nextBuild || nextBuild === mirrorBuild)) return;
      // A newer version can briefly be visible before data.js reaches this tab.
      const attempt = latestAttempt();
      if (attempt?.version === placeVersion && attempt.build === nextBuild && Date.now() - attempt.time < retryAfter) return;
      try { sessionStorage.setItem(attemptKey, JSON.stringify({ version: placeVersion, build: nextBuild, time: Date.now() })); }
      catch { /* Polling remains available when storage is disabled. */ }
      pending = true;
      if (nextBuild) {
        const next = new URL(location.href);
        next.searchParams.set("atlas", placeVersion + "-" + nextBuild.slice(0, 12));
        history.replaceState(history.state, "", next);
      }
      window.dispatchEvent(new Event("limbo:before-refresh"));
      location.reload();
    } catch {
      // Transient connectivity errors leave the graph and the current view intact.
    } finally {
      busy = false;
    }
  }

  window.setInterval(refresh, interval);
  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("online", refresh);
  refresh();
})();
