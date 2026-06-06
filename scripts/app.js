const state = {
  albums: [],
  s3BaseUrl: "",
  tracks: [],
  currentTrackId: null
};

const DATA_VERSION = "20260606-player";

const els = {
  featuredRail: document.querySelector("#featuredRail"),
  albumRail: document.querySelector("#albumRail"),
  trackList: document.querySelector("#trackList"),
  searchInput: document.querySelector("#searchInput"),
  searchResults: document.querySelector("#searchResults"),
  audio: document.querySelector("#globalAudio"),
  playerCover: document.querySelector("#playerCover"),
  playerTitle: document.querySelector("#playerTitle"),
  playerMeta: document.querySelector("#playerMeta"),
  playerToggle: document.querySelector("#playerToggle")
};

async function init() {
  try {
    const response = await fetch(`data/tracks.json?v=${DATA_VERSION}`);
    const data = await response.json();
    state.s3BaseUrl = data.s3BaseUrl.replace(/\/$/, "");
    state.albums = data.albums;
    state.tracks = flattenTracks(data.albums);

    renderFeatured();
    renderAlbums();
    renderTracks();
    renderSearchResults("");
    setupEvents();
  } catch (error) {
    renderError();
  }
}

function flattenTracks(albums) {
  return albums.flatMap((album) =>
    album.tracks.map((track) => ({
      ...track,
      albumId: album.id,
      albumTitle: album.title,
      albumYear: album.year,
      albumDescription: album.description
    }))
  );
}

function setupEvents() {
  document.addEventListener("click", (event) => {
    const playButton = event.target.closest("[data-play-track]");
    if (!playButton) return;
    event.preventDefault();
    playTrack(playButton.dataset.playTrack);
  });

  els.playerToggle.addEventListener("click", () => {
    if (!state.currentTrackId) {
      const firstTrack = state.tracks[0];
      if (firstTrack) playTrack(firstTrack.id);
      return;
    }

    if (els.audio.paused) {
      els.audio.play();
    } else {
      els.audio.pause();
    }
  });

  els.audio.addEventListener("play", () => {
    els.playerToggle.textContent = "❚❚";
  });

  els.audio.addEventListener("pause", () => {
    els.playerToggle.textContent = "▶";
  });

  els.audio.addEventListener("ended", () => {
    els.playerToggle.textContent = "▶";
  });

  els.searchInput.addEventListener("input", () => {
    renderSearchResults(els.searchInput.value.trim());
  });
}

function renderFeatured() {
  const featured = state.tracks.slice(0, 2);
  els.featuredRail.innerHTML = featured.map(renderFeaturedCard).join("") || renderEmptyState("Aucun son disponible.");
}

function renderFeaturedCard(track) {
  return `
    <a class="playlist-card" href="album.html?id=${encodeURIComponent(track.albumId)}">
      <div class="playlist-cover" style="${albumPalette(track.albumYear)}">
        <strong>${escapeHtml(track.albumYear)}</strong>
      </div>
      <h3>${escapeHtml(track.title)}</h3>
      <p>Par Ibrahima Diagne</p>
    </a>
  `;
}

function renderAlbums() {
  els.albumRail.innerHTML = state.albums.map((album) => `
    <a class="playlist-card" href="album.html?id=${encodeURIComponent(album.id)}">
      <div class="playlist-cover" style="${albumPalette(album.year)}">
        <strong>${escapeHtml(album.year)}</strong>
      </div>
      <h3>${escapeHtml(album.title)}</h3>
      <p>${album.tracks.length ? `${album.tracks.length} son${album.tracks.length > 1 ? "s" : ""}` : "Archives"}</p>
    </a>
  `).join("");
}

function renderTracks() {
  els.trackList.innerHTML = state.tracks.slice(0, 8).map(renderTrackRow).join("") || renderEmptyState("Aucun son disponible.");
}

function renderSearchResults(query) {
  if (!query) {
    els.searchResults.innerHTML = "";
    return;
  }

  const normalizedQuery = query.toLowerCase();
  const results = state.tracks.filter((track) => {
    const searchable = `${track.title} ${track.albumTitle} ${track.albumYear}`.toLowerCase();
    return searchable.includes(normalizedQuery);
  });

  els.searchResults.innerHTML = results.map(renderTrackRow).join("") || renderEmptyState("Aucun résultat trouvé.");
}

function renderTrackRow(track) {
  return `
    <a class="track-row" href="album.html?id=${encodeURIComponent(track.albumId)}">
      <span class="track-thumb" style="${albumPalette(track.albumYear)}"></span>
      <span class="track-title">
        <h3>${escapeHtml(track.title)}</h3>
        <p>${escapeHtml(track.albumTitle)}</p>
      </span>
      <button class="play-mini" data-play-track="${escapeHtml(track.id)}" type="button" aria-label="Écouter ${escapeHtml(track.title)}">▶</button>
    </a>
  `;
}

function playTrack(trackId) {
  const track = state.tracks.find((item) => item.id === trackId);
  if (!track) return;

  const src = `${state.s3BaseUrl}/${track.audio}`;
  state.currentTrackId = track.id;
  els.playerTitle.textContent = track.title;
  els.playerMeta.textContent = track.albumTitle;
  els.playerCover.setAttribute("style", albumPalette(track.albumYear));

  if (els.audio.src !== src) {
    els.audio.src = src;
  }

  els.audio.play().catch(() => {
    els.playerMeta.textContent = "Lecture indisponible pour le moment";
  });
}

function renderError() {
  const message = renderEmptyState("Le catalogue musical est momentanément indisponible.");
  els.featuredRail.innerHTML = message;
  els.albumRail.innerHTML = message;
  els.trackList.innerHTML = message;
}

function renderEmptyState(message) {
  return `<p class="empty-state">${escapeHtml(message)}</p>`;
}

function albumPalette(year) {
  const palettes = [
    ["#d8ad44", "#3b2607"],
    ["#191c1c", "#d8ad44"],
    ["#0d4d61", "#191c1c"],
    ["#86203a", "#2c1017"],
    ["#7c6b44", "#191c1c"],
    ["#a41432", "#191c1c"]
  ];
  const [a, b] = palettes[Number(year) % palettes.length];
  return `--a:${a};--b:${b};`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

init();
