# ListLab - Playlist Management Web Application

## Overview

This is a modern playlist management web application called "ListLab" built with React, Express, and in-memory storage. The application maintains Spotify's visual interface and design aesthetics while being branded as ListLab, allowing users to create playlists, manage songs, and browse music content. It features a dark theme design with ListLab's green accent colors.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Radix UI primitives with shadcn/ui components
- **Styling**: Tailwind CSS with custom Spotify-inspired design tokens

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety
- **API Pattern**: RESTful API with conventional HTTP methods
- **Middleware**: Express middleware for JSON parsing, logging, and error handling

### Database Architecture
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management

## Key Components

### Database Schema
The application uses five main tables:
- **users**: User account information with username/password
- **playlists**: User-created playlists with metadata
- **songs**: Music tracks with artist, album, and duration info
- **artists**: Artist profiles with bio and images
- **playlist_songs**: Many-to-many relationship between playlists and songs

### API Endpoints
- `GET/POST /api/playlists` - List and create playlists
- `GET/PATCH/DELETE /api/playlists/:id` - Individual playlist operations
- `POST/DELETE /api/playlists/:id/songs/:songId` - Playlist song management
- `GET /api/songs` - Browse all songs
- `GET /api/songs/search` - Search functionality
- `GET /api/artists` - Browse artists

### UI Components
- **Sidebar**: Navigation with ListLab logo and menu items
- **PlaylistCard**: Grid display of playlists with hover effects
- **SongList**: Table view of songs with playback controls
- **SearchBar**: Real-time search with dropdown results
- **PlaybackControls**: Fixed bottom player interface
- **CreatePlaylistModal**: Form for creating new playlists

## Data Flow

1. **Client Requests**: React components use TanStack Query hooks to fetch data
2. **API Layer**: Express routes handle HTTP requests and validate input with Zod schemas
3. **Storage Layer**: Abstract storage interface allows for flexible data persistence
4. **Database Operations**: Drizzle ORM executes type-safe SQL queries
5. **Response**: JSON data flows back through the same layers to update UI

## External Dependencies

### Production Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL driver for serverless environments
- **drizzle-orm**: Type-safe ORM with PostgreSQL dialect
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Accessible UI primitives for components
- **react-hook-form**: Form state management with validation
- **date-fns**: Date manipulation utilities
- **wouter**: Lightweight routing library

### Development Dependencies
- **tsx**: TypeScript execution for development server
- **esbuild**: Fast JavaScript bundler for production builds
- **@types/***: TypeScript definitions for libraries

## Deployment Strategy

### Development
- **Command**: `npm run dev` starts both frontend (Vite) and backend (Express) servers
- **Hot Reload**: Vite provides instant updates for frontend changes
- **Development Middleware**: Vite middleware integrated with Express for seamless development

### Production Build
- **Frontend**: `vite build` creates optimized static assets
- **Backend**: `esbuild` bundles server code into single executable
- **Static Serving**: Express serves built frontend assets in production
- **Environment**: `NODE_ENV=production` enables production optimizations

### Database
- **Migrations**: `npm run db:push` applies schema changes to database
- **Connection**: Environment variable `DATABASE_URL` configures PostgreSQL connection
- **Hosting**: Designed for Neon serverless PostgreSQL deployment

## Changelog
```
Changelog:
- July 01, 2025. Initial setup
- August 18, 2025. Complete rebranding from "Spotify" to "ListLab" across all components, styling, and branding elements
- August 18, 2025. Application ready for GitHub repository migration
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```