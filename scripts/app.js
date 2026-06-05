const state = {
  albums: [],
  s3BaseUrl: "",
  activeTrackId: null
};

const els = {
  albumFilter: document.querySelector("#albumFilter"),
  searchInput: document.querySelector("#searchInput"),
  albumGrid: document.querySelector("#albumGrid"),
  lyricsPanel: document.querySelector("#lyricsPanel"),
  trackCount: document.querySelector("#trackCount"),
  albumCount: document.querySelector("#albumCount"),
  sidebarAlbumCount: document.querySelector("#sidebarAlbumCount"),
  featuredPlay: document.querySelector("[data-featured-audio]"),
  featuredAudioSlot: document.querySelector("#featuredAudioSlot")
};

async function init() {
  try {
    setupFeaturedAudio();
    const response = await fetch("data/tracks.json");
    const data = await response.json();
    state.albums = data.albums;
    state.s3BaseUrl = data.s3BaseUrl.replace(/\/$/, "");
    state.activeTrackId = firstTrack()?.id;
    populateFilters();
    renderCatalog();
    renderLyrics(activeTrack());
    renderStats();
  } catch (error) {
    els.albumGrid.innerHTML = `<p class="track">Le catalogue musical est momentanément indisponible.</p>`;
    els.lyricsPanel.innerHTML = `<h3>Paroles indisponibles</h3><p>Les informations du catalogue ne sont pas accessibles.</p>`;
  }
}

function setupFeaturedAudio() {
  if (!els.featuredPlay || !els.featuredAudioSlot) return;

  els.featuredPlay.addEventListener("click", () => {
    els.featuredAudioSlot.innerHTML = `
      <audio class="featured-audio" controls autoplay preload="metadata" src="${els.featuredPlay.dataset.featuredAudio}"></audio>
    `;
    els.featuredPlay.remove();
    setupAudioAutopause();
  });
}

function setupAudioAutopause() {
  document.querySelectorAll("audio").forEach((audio) => {
    if (audio.dataset.autopauseReady === "true") return;

    audio.dataset.autopauseReady = "true";
    audio.addEventListener("play", () => {
      document.querySelectorAll("audio").forEach((otherAudio) => {
        if (otherAudio !== audio) otherAudio.pause();
      });
    });
  });
}

function firstTrack() {
  return state.albums.flatMap((album) => album.tracks)[0];
}

function allTracks() {
  return state.albums.flatMap((album) =>
    album.tracks.map((track) => ({ ...track, album }))
  );
}

function activeTrack() {
  return allTracks().find((track) => track.id === state.activeTrackId) || allTracks()[0];
}

function populateFilters() {
  const options = [
    `<option value="all">Tous les albums</option>`,
    ...state.albums.map((album) => `<option value="${album.id}">${album.title}</option>`)
  ];
  els.albumFilter.innerHTML = options.join("");
  els.albumFilter.addEventListener("change", renderCatalog);
  els.searchInput.addEventListener("input", renderCatalog);
}

function renderCatalog() {
  const selectedAlbum = els.albumFilter.value || "all";
  const query = els.searchInput.value.trim().toLowerCase();
  const filteredAlbums = state.albums
    .filter((album) => selectedAlbum === "all" || album.id === selectedAlbum)
    .map((album) => {
      const tracks = album.tracks.filter((track) => {
        const searchable = `${track.title} ${track.date} ${album.title} ${album.year}`.toLowerCase();
        return searchable.includes(query);
      });
      return { ...album, tracks };
    })
    .filter((album) => {
      if (!query) return true;
      const albumText = `${album.title} ${album.year} ${album.description}`.toLowerCase();
      return album.tracks.length > 0 || albumText.includes(query);
    });

  if (!filteredAlbums.length) {
    els.albumGrid.innerHTML = `<p class="track">Aucun son ne correspond à cette recherche.</p>`;
    return;
  }

  els.albumGrid.innerHTML = filteredAlbums.map(renderAlbum).join("");
}

function renderAlbum(album) {
  return `
    <article class="album-card">
      <div class="album-cover">
        <span>${album.year}</span>
        <strong>${album.title}</strong>
        <p>${album.description}</p>
      </div>
      <div>
        <h3>${album.tracks.length} son${album.tracks.length > 1 ? "s" : ""}</h3>
        <a class="album-open" href="album.html?id=${album.id}">Ouvrir la page album</a>
        ${renderAlbumPreview(album)}
      </div>
    </article>
  `;
}

function renderAlbumPreview(album) {
  if (!album.tracks.length) {
    return `<p class="album-preview">Archives à compléter.</p>`;
  }

  const preview = album.tracks.slice(0, 3).map((track) => `<li>${track.title}</li>`).join("");
  const remaining = album.tracks.length > 3 ? `<li>+ ${album.tracks.length - 3} autre${album.tracks.length - 3 > 1 ? "s" : ""} son${album.tracks.length - 3 > 1 ? "s" : ""}</li>` : "";
  return `
    <ul class="album-preview-list">
      ${preview}
      ${remaining}
    </ul>
  `;
}

function displayTrackDate(value) {
  if (!value || value.endsWith("-01-01")) return "";
  return formatDate(value);
}

function renderLyrics(track) {
  if (!track) {
    els.lyricsPanel.innerHTML = `<h3>Aucun son sélectionné</h3><p>Choisis un son dans le catalogue.</p>`;
    return;
  }

  els.lyricsPanel.innerHTML = `
    <p class="eyebrow">${[track.album.title, displayTrackDate(track.date)].filter(Boolean).join(" • ")}</p>
    <h3>${track.title}</h3>
    <p>${[track.duration, "écoute en ligne", "achat indisponible"].filter(Boolean).join(" • ")}</p>
    <div class="lyrics-lines">
      ${track.lyrics.map((line) => `<span>${line}</span>`).join("")}
    </div>
  `;
}

function renderStats() {
  els.albumCount.textContent = state.albums.length;
  els.trackCount.textContent = allTracks().length;
  if (els.sidebarAlbumCount) {
    els.sidebarAlbumCount.textContent = `${state.albums.length} albums`;
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

init();
