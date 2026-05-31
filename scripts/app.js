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
  document.querySelectorAll("[data-lyrics-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTrackId = button.dataset.lyricsId;
      renderLyrics(activeTrack());
      document.querySelector("#lyrics").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  setupAudioAutopause();
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
        <div class="track-list">
          ${album.tracks.length ? album.tracks.map((track) => renderTrack(track, album)).join("") : renderEmptyAlbum()}
        </div>
      </div>
    </article>
  `;
}

function renderEmptyAlbum() {
  return `
    <article class="track empty-track">
      <div>
        <h3>Archives à compléter</h3>
        <div class="track-meta">Les sons de cet album seront ajoutés après vérification des fichiers audio.</div>
      </div>
    </article>
  `;
}

function renderTrack(track, album) {
  const src = `${state.s3BaseUrl}/${track.audio}`;
  const meta = [album.title, displayTrackDate(track.date), track.duration].filter(Boolean).join(" • ");
  return `
    <article class="track">
      <div class="track-top">
        <div>
          <h3>${track.title}</h3>
          <div class="track-meta">${meta}</div>
        </div>
        ${track.price ? `<strong>${track.price}</strong>` : ""}
      </div>
      <audio controls preload="none" src="${src}"></audio>
      <div class="track-actions">
        <button class="small-button" data-lyrics-id="${track.id}" type="button">Voir paroles</button>
        <button class="small-button disabled" type="button" disabled>Wave indisponible</button>
        <button class="small-button disabled" type="button" disabled>Orange Money indisponible</button>
      </div>
    </article>
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
}

function formatDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

init();
