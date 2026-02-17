# IPTV Web Client

A modern web-based IPTV client compatible with Xtream Codes API. Browse live TV, movies, and series from your IPTV provider directly in the browser.

![React](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-7-purple) ![TailwindCSS](https://img.shields.io/badge/Tailwind-4-cyan) ![HLS.js](https://img.shields.io/badge/HLS.js-supported-green)

## Features

- **Live TV** - Browse categories, stream live channels via HLS
- **Movies (VOD)** - Browse and play movies with poster art and ratings
- **Series** - Browse series with season/episode navigation
- **EPG Guide** - Electronic Program Guide with now/next indicators
- **Favorites** - Save channels and movies, persisted across sessions
- **Search** - Context-aware search that filters the current section
- **Multi-audio & Subtitles** - Track selector for streams that support it
- **Dark Theme** - Modern dark UI inspired by popular streaming platforms

## Tech Stack

| | |
|---|---|
| **Framework** | React 18 |
| **Bundler** | Vite |
| **Styling** | Tailwind CSS |
| **Video** | HLS.js |
| **State** | Zustand |
| **Routing** | React Router v6 |

## Getting Started

### Prerequisites

- Node.js 18+
- An IPTV provider with Xtream Codes API support

### Install & Run

```bash
git clone https://github.com/ebrainte/iptv-web-client.git
cd iptv-web-client
npm install
npm run dev
```

Open `http://localhost:5173` and enter your server URL, username, and password.

### Build for Production

```bash
npm run build
npm run preview
```

## Deploy to Vercel

The project includes a Vercel serverless function for API proxying and a `vercel.json` for SPA routing.

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Deploy — Vercel auto-detects Vite

That's it. No configuration needed.

## Project Structure

```
├── api/
│   └── proxy.js              # Vercel serverless API proxy
├── src/
│   ├── api/
│   │   └── xtreamApi.js      # Xtream Codes API client
│   ├── components/
│   │   ├── Layout.jsx         # App shell (sidebar + content)
│   │   ├── Player.jsx         # HLS/native video player
│   │   ├── Sidebar.jsx        # Navigation sidebar
│   │   ├── SearchBar.jsx      # Context-aware search
│   │   ├── ChannelCard.jsx    # Live channel card
│   │   └── VodCard.jsx        # Movie/series card
│   ├── pages/
│   │   ├── LoginPage.jsx      # Authentication
│   │   ├── LiveTvPage.jsx     # Live TV categories & channels
│   │   ├── VodPage.jsx        # Movies categories & list
│   │   ├── SeriesPage.jsx     # Series categories & list
│   │   ├── SeriesDetailPage.jsx # Seasons & episodes
│   │   ├── PlayerPage.jsx     # Video player view
│   │   ├── EpgPage.jsx        # EPG program guide
│   │   └── FavoritesPage.jsx  # Saved favorites
│   ├── store/
│   │   ├── useAuthStore.js    # Auth & credentials
│   │   └── useFavoritesStore.js # Favorites (localStorage)
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── vercel.json
└── vite.config.js
```

## Xtream Codes API Compatibility

Supports the standard Xtream Codes player API:

| Endpoint | Status |
|---|---|
| Authentication | Supported |
| Live categories & streams | Supported |
| VOD categories & streams | Supported |
| Series categories, list & info | Supported |
| Short EPG | Supported |
| Full EPG | Supported |
| Live stream (HLS) | Supported |
| VOD stream (direct container) | Supported |
| Series stream (direct container) | Supported |

## License

MIT
