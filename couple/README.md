# Our Days

A private shared space for two people: a polaroid wall of daily updates, a song-of-the-day playlist
where each person can add one song per date, a museum-style photo gallery, old-fashioned letters,
live chat, a flower garden, critter friends and surprise gifts.

Built with React 18 and bundled with esbuild into one self-contained `index.html`.

## Structure

```
src/
  main.jsx          App shell, tab bar, hash routing, welcome screen, "More" hub
  lib.jsx           Data layer (db subscriptions, actions, image packing), shared UI (Sheet, Header), demo data
  art.jsx           All artwork as SVG: animals, flowers, gift box, icons, stickers, confetti
  styles.css        Every style, with light and dark themes through CSS variables
  views/            Days, SongOfDay, PinIt, Gallery, Letters, Chat, Garden, Critters, Gifts, Us
  shims/            Map `react` to the CDN global in the production build
scripts/
  build.mjs         Produces index.html (React loaded from cdnjs, CSS and JS inlined)
  dev.mjs           Local preview with live rebuilds
index.html          Built output. This is the file that gets published.
```

## Develop

Run these commands from the repository root:

```bash
npm install
npm run dev      # http://localhost:5173, preview mode with sample content
npm run build    # writes index.html
```

## Data and access

The app uses Claude's `db`, `user`, and `assets` runtime when opened as a Claude artifact. On Vercel,
it uses Supabase Auth and the `app_data` table for persistent shared data.

1. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor.
2. Create the two users in Supabase Auth. In the SQL Editor, add their account emails to
   `public.couple_members` (replace the example addresses):

   ```sql
   insert into public.couple_members (user_id)
   select id from auth.users
   where lower(email) in ('you@example.com', 'partner@example.com')
   on conflict (user_id) do nothing;
   ```

   Only those listed users can read or change shared data; each user's `seen` record and profile
   are restricted to that user by row-level security.
3. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` as Vercel environment variables and redeploy. The
   publishable/anon key is intended for browser use; never use a service-role key in the client.
4. Disable public sign-ups in Supabase Auth and add the deployed site URL to Supabase Auth's allowed
   redirect URLs for password resets.

Photos are compressed in the browser and stored inline with their records. Song links are embedded
for Spotify, YouTube, Apple Music and SoundCloud; other secure links open at their source. If the
schema or access policies are missing, the app reports the database error instead of showing unsaved
demo content.

## Publishing changes

After `npm run build`, publish `index.html` again from Claude with the same artifact URL, with the
capabilities `{"db": {}, "user": {}, "assets": {}}`.
