const albumState = {
  album: null,
  s3BaseUrl: "",
  currentTrackId: null
};

const DATA_VERSION = "20260606-s3-2005";

const albumEls = {
  title: document.querySelector("#albumTitle"),
  description: document.querySelector("#albumDescription"),
  trackCount: document.querySelector("#albumTrackCount"),
  tracks: document.querySelector("#albumTracks"),
  lyricsPanel: document.querySelector("#albumLyricsPanel"),
  audio: document.querySelector("#globalAudio"),
  playerCover: document.querySelector("#playerCover"),
  playerTitle: document.querySelector("#playerTitle"),
  playerMeta: document.querySelector("#playerMeta"),
  playerToggle: document.querySelector("#playerToggle")
};

async function initAlbumPage() {
  try {
    const albumId = new URLSearchParams(window.location.search).get("id");
    const response = await fetch(`data/tracks.json?v=${DATA_VERSION}`);
    const data = await response.json();
    albumState.s3BaseUrl = data.s3BaseUrl.replace(/\/$/, "");
    albumState.album = data.albums.find((album) => album.id === albumId) || data.albums[0];
    renderAlbumPage();
    setupAlbumEvents();
  } catch (error) {
    renderAlbumError();
  }
}

function setupAlbumEvents() {
  document.addEventListener("click", (event) => {
    const playButton = event.target.closest("[data-play-track]");
    if (playButton) {
      event.preventDefault();
      playTrack(playButton.dataset.playTrack);
      return;
    }

    const lyricsButton = event.target.closest("[data-show-lyrics]");
    if (lyricsButton) {
      event.preventDefault();
      renderAlbumLyrics(findTrack(lyricsButton.dataset.showLyrics));
      albumEls.lyricsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  albumEls.playerToggle.addEventListener("click", () => {
    if (!albumState.currentTrackId) {
      const firstTrack = albumState.album?.tracks[0];
      if (firstTrack) playTrack(firstTrack.id);
      return;
    }

    if (albumEls.audio.paused) {
      albumEls.audio.play();
    } else {
      albumEls.audio.pause();
    }
  });

  albumEls.audio.addEventListener("play", () => {
    albumEls.playerToggle.textContent = "❚❚";
  });

  albumEls.audio.addEventListener("pause", () => {
    albumEls.playerToggle.textContent = "▶";
  });

  albumEls.audio.addEventListener("ended", () => {
    playNextTrack();
  });
}

function renderAlbumPage() {
  const album = albumState.album;
  document.title = `${album.title} | Ibrahima Diagne`;
  albumEls.title.textContent = album.title;
  albumEls.description.textContent = album.description;
  albumEls.trackCount.textContent = `${album.tracks.length} son${album.tracks.length > 1 ? "s" : ""} dans l'album`;

  if (!album.tracks.length) {
    albumEls.tracks.innerHTML = renderEmptyState("Les sons de cet album seront ajoutés après vérification des fichiers audio.");
    renderAlbumLyrics(null);
    return;
  }

  albumEls.tracks.innerHTML = album.tracks.map(renderAlbumTrack).join("");
  renderAlbumLyrics(album.tracks[0]);
}

function renderAlbumTrack(track) {
  return `
    <article class="track-row album-track-row">
      <span class="track-thumb" style="${albumPalette(albumState.album.year)}"></span>
      <span class="track-title">
        <h3>${escapeHtml(track.title)}</h3>
        <p>${escapeHtml(albumState.album.title)}</p>
      </span>
      <span class="album-actions">
        <button class="play-mini" data-play-track="${escapeHtml(track.id)}" type="button" aria-label="Écouter ${escapeHtml(track.title)}">▶</button>
        <button class="lyrics-button" data-show-lyrics="${escapeHtml(track.id)}" type="button">Paroles</button>
      </span>
    </article>
  `;
}

function playTrack(trackId) {
  const track = findTrack(trackId);
  if (!track) return;

  const src = `${albumState.s3BaseUrl}/${track.audio}`;
  albumState.currentTrackId = track.id;
  albumEls.playerTitle.textContent = track.title;
  albumEls.playerMeta.textContent = albumState.album.title;
  albumEls.playerCover.setAttribute("style", albumPalette(albumState.album.year));
  renderAlbumLyrics(track);

  if (albumEls.audio.src !== src) {
    albumEls.audio.src = src;
  }

  albumEls.audio.play().catch(() => {
    albumEls.playerMeta.textContent = "Lecture indisponible pour le moment";
  });
}

function playNextTrack() {
  const tracks = albumState.album?.tracks || [];
  const currentIndex = tracks.findIndex((track) => track.id === albumState.currentTrackId);
  const nextTrack = tracks[currentIndex + 1];

  if (nextTrack) {
    playTrack(nextTrack.id);
    return;
  }

  albumEls.playerToggle.textContent = "▶";
}

function renderAlbumLyrics(track) {
  if (!track) {
    albumEls.lyricsPanel.innerHTML = `<p>Les paroles apparaîtront dès qu'un son sera disponible dans cet album.</p>`;
    return;
  }

  albumEls.lyricsPanel.innerHTML = `
    <h3>${escapeHtml(track.title)}</h3>
    <p>${escapeHtml(albumState.album.title)}</p>
    <div class="lyrics-lines">
      ${track.lyrics.map((line) => `<span>${escapeHtml(line)}</span>`).join("")}
    </div>
  `;
}

function renderAlbumError() {
  albumEls.title.textContent = "Album indisponible";
  albumEls.description.textContent = "Les informations de cet album ne sont pas accessibles.";
  albumEls.tracks.innerHTML = renderEmptyState("Catalogue indisponible.");
}

function findTrack(trackId) {
  return albumState.album?.tracks.find((track) => track.id === trackId);
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

initAlbumPage();
