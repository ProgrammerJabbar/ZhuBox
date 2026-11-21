import React, { useMemo, useState } from 'react';
import { useApp, dayKey, parseDay, dateStr } from '../lib.jsx';
import { Icon } from '../art.jsx';

function playerFor(value) {
  let url;
  try { url = new URL(value); } catch (e) { return null; }
  if (url.protocol !== 'https:' || url.username || url.password) return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const parts = url.pathname.split('/').filter(Boolean);
  if (host === 'open.spotify.com' && ['track', 'album', 'playlist'].includes(parts[0]) && parts[1]) {
    return { type: 'embed', src: `https://open.spotify.com/embed/${parts[0]}/${encodeURIComponent(parts[1])}`, label: 'Spotify player' };
  }
  if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(host)) {
    const id = host === 'youtu.be' ? parts[0] : url.searchParams.get('v') || (['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] : '');
    if (id && /^[\w-]{6,}$/.test(id)) {
      return { type: 'embed', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`, label: 'YouTube player' };
    }
  }
  if (host === 'music.apple.com' && parts.length) {
    return { type: 'embed', src: `https://embed.music.apple.com${url.pathname}${url.search}`, label: 'Apple Music player' };
  }
  if (host === 'soundcloud.com' && parts.length) {
    return { type: 'embed', src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.href)}`, label: 'SoundCloud player' };
  }
  return { type: 'link', href: url.href, label: host };
}

function SongPlayer({ song }) {
  const player = playerFor(song.url);
  if (!player) return <p className="song-error">This song link is invalid. Update it to a secure https link.</p>;
  if (player.type === 'link') {
    return <a className="song-open btn ghost" href={player.href} target="_blank" rel="noopener noreferrer">Play on {player.label} <Icon n="next" size={18} /></a>;
  }
  return <iframe className="song-player" src={player.src} title={`${song.title} — ${player.label}`} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; web-share" allowFullScreen />;
}

function SongForm({ editSong, onClose }) {
  const { data, uid, add, patch, toast } = useApp();
  const [date, setDate] = useState(editSong ? editSong.date : dayKey());
  const [title, setTitle] = useState(editSong ? editSong.title : '');
  const [artist, setArtist] = useState(editSong ? editSong.artist : '');
  const [url, setUrl] = useState(editSong ? editSong.url : '');
  const [note, setNote] = useState(editSong ? editSong.note || '' : '');
  const [busy, setBusy] = useState(false);
  const songs = data.songs || [];
  const duplicate = songs.find((song) => song.date === date && song.by === uid && song.id !== (editSong && editSong.id));

  async function save(e) {
    e.preventDefault();
    if (busy || !title.trim() || !artist.trim() || !date || !playerFor(url.trim())) return;
    if (duplicate) { toast('You already added a song for that day. Edit yours or choose a different date.'); return; }
    setBusy(true);
    const value = { date, title: title.trim().slice(0, 80), artist: artist.trim().slice(0, 80), url: url.trim(), note: note.trim().slice(0, 120) };
    const saved = editSong ? await patch('songs/' + editSong.id, value) : await add('songs', value);
    if (saved) {
      toast(editSong ? 'Song updated' : 'Your song was added');
      onClose();
      return;
    }
    setBusy(false);
  }

  return (
    <form className="song-form card" onSubmit={save}>
      <div className="song-form-title"><h2>{editSong ? 'Edit this song' : 'Add a song'}</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Close song form"><Icon n="x" /></button></div>
      <label className="lbl" htmlFor="song-title">Song</label>
      <input id="song-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Song title" required />
      <label className="lbl" htmlFor="song-artist">Artist</label>
      <input id="song-artist" className="input" value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={80} placeholder="Artist name" required />
      <label className="lbl" htmlFor="song-url">Song link</label>
      <input id="song-url" className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a Spotify, YouTube, Apple Music, or SoundCloud link" required />
      <label className="lbl" htmlFor="song-note">A little note</label>
      <textarea id="song-note" className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="A short thought to go with this song…" />
      <label className="lbl" htmlFor="song-date">Date</label>
      <input id="song-date" className="input" type="date" value={date} max={dayKey()} onChange={(e) => setDate(e.target.value)} required />
      {duplicate && <p className="song-error" role="status">You already added a song for this date. Edit yours or choose a different date.</p>}
      <button className="btn big" disabled={busy || !title.trim() || !artist.trim() || !playerFor(url.trim()) || !!duplicate}>{busy ? 'Saving…' : editSong ? 'Save changes' : 'Save song'}</button>
    </form>
  );
}

function SongCard({ song, today, nameOf, onEdit }) {
  return (
    <article className={'song-card card' + (today ? ' song-today' : '')}>
      <div className="song-card-head">
        <div><p className="eyebrow">{today ? 'Today' : dateStr(parseDay(song.date))}</p><h2>{song.title}</h2><p className="soft">{song.artist}</p>{song.by && <p className="song-byline soft small">Picked by {nameOf(song.by)}</p>}</div>
        <button className="icon-btn" onClick={() => onEdit(song)} aria-label={`Edit ${song.title}`}><Icon n="edit" size={20} /></button>
      </div>
      {song.note && <p className="song-note">{song.note}</p>}
      <SongPlayer song={song} />
    </article>
  );
}

export default function SongOfDay() {
  const { data, uid, nameOf } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const songs = useMemo(() => [...(data.songs || [])].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts), [data.songs]);
  const todaySongs = songs.filter((song) => song.date === dayKey());
  const myTodaySong = todaySongs.find((song) => song.by === uid);
  const history = songs.filter((song) => song.date !== dayKey());

  const edit = (song) => { setEditing(song); setFormOpen(true); };
  const closeForm = () => { setEditing(null); setFormOpen(false); };

  return (
    <div className="songs">
      <header className="head pad">
        <span className="song-heading-icon"><Icon n="music" size={25} /></span>
        <div className="head-t"><h1>Song of the day</h1><p>One pick each, every day</p></div>
        {!formOpen && <button className="btn song-add" onClick={() => { setEditing(null); setFormOpen(true); }}><Icon n="plus" size={18} /> Add</button>}
      </header>
      <div className="songs-content pad">
        {formOpen && <SongForm key={editing ? editing.id : 'new'} editSong={editing} onClose={closeForm} />}
        {todaySongs.length
          ? <section className="song-today-list" aria-label="Today's songs">
              {todaySongs.map((song) => <SongCard key={song.id} song={song} today nameOf={nameOf} onEdit={edit} />)}
              {!myTodaySong && !formOpen && <button className="btn song-own-add" onClick={() => setFormOpen(true)}>Add your song</button>}
            </section>
          : <div className="song-empty card"><span className="song-empty-icon"><Icon n="music" size={34} /></span><h2>No songs picked for today</h2><p>Each of you can add one song and a little thought for the date.</p>{!formOpen && <button className="btn" onClick={() => setFormOpen(true)}>Add your song</button>}</div>}
        <section className="song-history">
          <div className="song-history-title"><h2>History</h2><span className="soft small">{history.length} {history.length === 1 ? 'song' : 'songs'}</span></div>
          {history.length
            ? history.map((song) => <SongCard key={song.id} song={song} nameOf={nameOf} onEdit={edit} />)
            : <p className="song-history-empty">Your past picks will live here, with their dates.</p>}
        </section>
      </div>
    </div>
  );
}
