# power7

| Folder | What | Port |
| --- | --- | --- |
| `client/` | Player site (Vite + React) | 5173 |
| `affiliate/` | Affiliate site (Vite + React) | 5174 |
| `admin/` | Admin panel (Vite + React) | 5175 |
| `server/` | API (Express + MongoDB) | 5000 |
| `scripts/` | Asset/data extraction scripts for the client |

Each app: `npm install` then `npm run dev`. Copy `.env.example` to `.env` (server) or `.env.local` (admin/affiliate) and fill in the values — env files are never committed.
