# Piano Club website

A simple website for the school piano club.

- **Public pages:** home (next event and announcements), events and performances.
- **Students** sign in with the student PIN to download practice sheets.
- **Teachers** sign in with the teacher PIN to post announcements, add events and recitals, and upload practice sheets (PDF, PNG or JPEG up to 10 MB).

The frontend is plain HTML, CSS and JavaScript in `public/`. A small Node.js (Express) server in `server/` serves it and talks to MongoDB. Data lives in the `piano_club` database.

## Run it locally

Requires Node.js 18 or newer and a MongoDB database (MongoDB Atlas free tier works).

```bash
npm install
cp .env.example .env         # then fill in the values below
npm run hash-pin -- <student PIN>   # paste the output into STUDENT_PIN_HASH
npm run hash-pin -- <teacher PIN>   # paste the output into TEACHER_PIN_HASH
npm start                    # http://localhost:3000
```

### Environment variables

| Name | What it is |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string. Keep it secret. |
| `SESSION_SECRET` | Random string, 16 characters or more, used to sign session cookies. |
| `STUDENT_PIN_HASH` | bcrypt hash of the student PIN (`npm run hash-pin -- <PIN>`). |
| `TEACHER_PIN_HASH` | bcrypt hash of the teacher PIN. |
| `PORT` | Optional. Defaults to 3000. |
| `NODE_ENV` | Set to `production` when deployed so cookies are sent over HTTPS only. |

Never commit `.env`. It is listed in `.gitignore`.

To generate a random `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Changing a PIN

1. Run `npm run hash-pin -- <new PIN>`.
2. Replace the matching `*_PIN_HASH` value in your hosting dashboard.
3. Restart the server. Existing sessions expire after 12 hours.

## Security notes

- PINs are stored only as bcrypt hashes. The plain PINs are not in the repo.
- Failed PIN attempts are limited to 10 per 15 minutes per IP address.
- Session cookies are HttpOnly and SameSite=Strict, and expire after 12 hours.
- Uploads are checked for type and size on the server, and downloads are sent as attachments.
- Four-digit PINs are easy to guess given enough time. The rate limit slows that down, but change the PINs if they are shared widely.

## Running the tests

```bash
npm test
```

These are unit tests for the sign-in logic. The end-to-end API tests need a running MongoDB and are not included in the repo.

## Project layout

```
public/            static pages, CSS and browser JavaScript
server/            Express app, auth, MongoDB helpers and routes
scripts/           helper scripts (PIN hashing)
test/              unit tests
```

## Deploying

Any host that runs Node.js works, such as Render or Vercel. Use `npm start` as the start command, and set the environment variables above in the host's dashboard. Set `NODE_ENV=production`.
