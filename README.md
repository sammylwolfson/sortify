# ListLab - Modern Playlist Management

A beautiful, Spotify-inspired playlist management web application built with modern web technologies.

![ListLab Preview](https://img.shields.io/badge/Status-Active-brightgreen)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Latest-blue)
![Express](https://img.shields.io/badge/Express-Latest-green)

## ✨ Features

- **Modern UI**: Spotify-inspired dark theme with smooth animations
- **Playlist Management**: Create, edit, and delete playlists
- **Song Library**: Browse and search through a curated music collection
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Search**: Instant search results with dropdown suggestions
- **Artist Profiles**: Explore artist information and their music

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

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   Navigate to http://localhost:5000
   ```

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, TypeScript
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Build Tool**: Vite
- **Storage**: In-memory storage with sample data

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