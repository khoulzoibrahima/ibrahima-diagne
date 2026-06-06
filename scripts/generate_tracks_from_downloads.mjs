import fs from "node:fs";
import path from "node:path";

const sourceDir = process.argv[2] || "/Users/ibrahimakhoule/Downloads/Ibrahima Diagne";
const maxYear = Number(process.env.MAX_YEAR || "9999");
const tracksPath = path.resolve("data/tracks.json");
const existing = JSON.parse(fs.readFileSync(tracksPath, "utf8"));

const existingAlbums = new Map(existing.albums.map((album) => [album.id, album]));
const localAlbumDirs = fs.readdirSync(sourceDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^Ibrahima Diagne \d{4}$/.test(entry.name))
  .sort((a, b) => a.name.localeCompare(b.name));

for (const entry of localAlbumDirs) {
  const year = entry.name.match(/(\d{4})$/)?.[1];
  if (!year) continue;
  if (Number(year) > maxYear) continue;

  const albumId = `ibrahima-diagne-${year}`;
  const albumDir = path.join(sourceDir, entry.name);
  const previousAlbum = existingAlbums.get(albumId);
  const previousTracks = new Map((previousAlbum?.tracks || []).map((track) => [track.id, track]));

  const tracks = fs.readdirSync(albumDir, { withFileTypes: true })
    .filter((file) => file.isFile() && file.name.toLowerCase().endsWith(".mp3"))
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }))
    .map((file) => {
      const title = titleFromFile(file.name);
      const id = slugify(`${year}-${title}`);
      const previousTrack = previousTracks.get(id);

      return {
        id,
        title,
        date: `${year}-01-01`,
        duration: previousTrack?.duration || "",
        audio: `${albumId}/${encodeURIComponent(file.name)}`,
        price: previousTrack?.price || "",
        lyrics: previousTrack?.lyrics || ["Paroles en cours de transcription."]
      };
    });

  existingAlbums.set(albumId, {
    id: albumId,
    title: `Ibrahima Diagne ${year}`,
    year,
    date: `${year}-01-01`,
    description: previousAlbum?.description || `Archives audio de l'année ${year}.`,
    tracks
  });
}

const albums = [...existingAlbums.values()]
  .filter((album) => Number(album.year) <= maxYear)
  .sort((a, b) => Number(a.year) - Number(b.year));

fs.writeFileSync(tracksPath, `${JSON.stringify({ ...existing, albums }, null, 2)}\n`);

function titleFromFile(fileName) {
  return fileName
    .replace(/\.mp3$/i, "")
    .replace(/^[0-9]{1,2}[-_ ]+/, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
