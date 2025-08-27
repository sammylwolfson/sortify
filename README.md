# ListLab - Modern Playlist Management

A beautiful, Spotify-inspired playlist management web application built with modern web technologies.

![ListLab Preview](https://img.shields.io/badge/Status-Active-brightgreen)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Latest-blue)
![Express](https://img.shields.io/badge/Express-Latest-green)

## ✨ Features

- **Modern UI**: Spotify-inspired dark theme with smooth animations
- **Spotify Integration**: Full Spotify Web API integration for music streaming
- **Playlist Management**: Create, edit, and delete playlists
- **Music Playback**: Control music playback with Spotify Web Player SDK
- **Personalized Events**: View upcoming concerts from your followed Spotify artists
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Smart Sidebar**: Custom scrollable navigation with playlist management
- **Real-time Search**: Instant search results with dropdown suggestions

## 🔄 Recent Updates

### UI/UX Improvements
- **Fixed App Launch**: Resolved critical syntax errors in Spotify authentication that prevented startup
- **Enhanced Sidebar**: Added custom scrollbar styling for smooth navigation through playlists
- **Music Player Fix**: Repositioned bottom player bar to prevent overlap with sidebar
- **Streamlined Navigation**: Removed redundant search button and duplicate scroll areas

### New Features  
- **Personalized Events**: 'Upcoming Events' now displays concerts from your followed Spotify artists
- **Rich Event Cards**: Shows artist images, genres, venues, and dates with playlist creation options
- **Spotify Integration**: Full Web API integration for authentication, playlists, and music data

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/listlab.git
   cd listlab
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Spotify API**
   - Create a Spotify App in the Spotify Developer Dashboard
   - Add your credentials to environment variables
   
4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   Navigate to http://localhost:5000
   ```

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, TypeScript
- **Music API**: Spotify Web API & Web Playback SDK
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter  
- **Build Tool**: Vite
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Spotify OAuth

## 📁 Project Structure

```
listlab/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utility functions
│   │   └── hooks/          # Custom React hooks
├── server/                 # Backend Express application
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API routes
│   └── storage.ts         # Data storage interface
├── shared/                 # Shared TypeScript types
└── components.json         # Shadcn/ui configuration
```

## 🎯 Available Scripts

- `npm run dev` - Start development server (frontend + backend)
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## 🎨 Design Features

- **Dark Theme**: Sleek dark interface with green accent colors
- **Responsive Layout**: Adaptive design for all screen sizes
- **Smooth Animations**: Hover effects and transitions
- **Modern Typography**: Clean, readable font hierarchy
- **Accessible Components**: Built with Radix UI primitives

## 📝 API Endpoints

- `GET /api/playlists` - Retrieve all playlists
- `POST /api/playlists` - Create a new playlist
- `GET /api/playlists/:id` - Get specific playlist
- `PATCH /api/playlists/:id` - Update playlist
- `DELETE /api/playlists/:id` - Delete playlist
- `GET /api/songs` - Get all songs
- `GET /api/songs/search` - Search songs
- `GET /api/artists` - Get all artists

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Design inspiration from Spotify
- Icons from Lucide React
- UI components from Radix UI and shadcn/ui