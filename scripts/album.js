const albumState = {
  album: null,
  s3BaseUrl: "",
  activeTrackId: null
};

const albumEls = {
  title: document.querySelector("#albumTitle"),
  description: document.querySelector("#albumDescription"),
  trackCount: document.querySelector("#albumTrackCount"),
  tracks: document.querySelector("#albumTracks"),
  lyricsPanel: document.querySelector("#albumLyricsPanel")
};

async function initAlbumPage() {
  try {
    const albumId = new URLSearchParams(window.location.search).get("id");
    const response = await fetch("data/tracks.json");
    const data = await response.json();
    albumState.s3BaseUrl = data.s3BaseUrl.replace(/\/$/, "");
    albumState.album = data.albums.find((album) => album.id === albumId) || data.albums[0];
    albumState.activeTrackId = albumState.album.tracks[0]?.id || null;
    renderAlbumPage();
  } catch (error) {
    albumEls.title.textContent = "Album indisponible";
    albumEls.description.textContent = "Les informations de cet album ne sont pas accessibles.";
    albumEls.tracks.innerHTML = `<article class="track empty-track"><h3>Catalogue indisponible</h3></article>`;
  }
}

function renderAlbumPage() {
  const album = albumState.album;
  document.title = `${album.title} | Ibrahima Diagne`;
  albumEls.title.textContent = album.title;
  albumEls.description.textContent = album.description;
  albumEls.trackCount.textContent = `${album.tracks.length} son${album.tracks.length > 1 ? "s" : ""} dans l'album`;

  if (!album.tracks.length) {
    albumEls.tracks.innerHTML = renderEmptyAlbum();
    renderAlbumLyrics(null);
    return;
  }

  albumEls.tracks.innerHTML = album.tracks.map(renderAlbumTrack).join("");
  document.querySelectorAll("[data-album-lyrics-id]").forEach((button) => {
    button.addEventListener("click", () => {
      albumState.activeTrackId = button.dataset.albumLyricsId;
      renderAlbumLyrics(activeAlbumTrack());
      document.querySelector("#albumLyricsPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  setupAlbumAudioAutopause();
  renderAlbumLyrics(activeAlbumTrack());
}

function renderAlbumTrack(track) {
  const src = `${albumState.s3BaseUrl}/${track.audio}`;
  const meta = [albumState.album.title, displayAlbumTrackDate(track.date), track.duration].filter(Boolean).join(" • ");
  return `
    <article class="track">
      <div class="track-top">
        <div>
          <h3>${track.title}</h3>
          <div class="track-meta">${meta}</div>
        </div>
      </div>
      <audio controls preload="none" src="${src}"></audio>
      <div class="track-actions">
        <button class="small-button" data-album-lyrics-id="${track.id}" type="button">Voir paroles</button>
        <button class="small-button disabled" type="button" disabled>Wave indisponible</button>
        <button class="small-button disabled" type="button" disabled>Orange Money indisponible</button>
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

function activeAlbumTrack() {
  return albumState.album.tracks.find((track) => track.id === albumState.activeTrackId) || albumState.album.tracks[0];
}

function renderAlbumLyrics(track) {
  if (!track) {
    albumEls.lyricsPanel.innerHTML = `<h3>Aucun son sélectionné</h3><p>Les paroles apparaîtront dès qu'un son sera disponible dans cet album.</p>`;
    return;
  }

  albumEls.lyricsPanel.innerHTML = `
    <p class="eyebrow">${[albumState.album.title, displayAlbumTrackDate(track.date)].filter(Boolean).join(" • ")}</p>
    <h3>${track.title}</h3>
    <p>${[track.duration, "écoute en ligne", "achat indisponible"].filter(Boolean).join(" • ")}</p>
    <div class="lyrics-lines">
      ${track.lyrics.map((line) => `<span>${line}</span>`).join("")}
    </div>
  `;
}

function setupAlbumAudioAutopause() {
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

function displayAlbumTrackDate(value) {
  if (!value || value.endsWith("-01-01")) return "";
  return formatAlbumDate(value);
}

function formatAlbumDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

initAlbumPage();
