# Music Streaming API 🎵

Full-stack music platform with user authentication, track uploads (local files, YouTube, external URLs), playlists, search, and playback tracking.

## ✨ Features

- 🔐 JWT-based user authentication & registration
- 📤 Upload local audio files with automatic ID3 metadata extraction
- 🎥 Add YouTube videos and external music links
- 🔍 Search tracks by title/artist (case-insensitive)
- 📱 Track recently listened songs
- 🎛️ Owner-only delete/update permissions
- 📁 File upload with multer (50MB limit)
- 🗂️ Playlists with public/private visibility
- 👥 User profile with avatar management

## 🛠️ Tech Stack

**Backend**: Node.js, Express, MongoDB, Mongoose  
**Auth**: JWT, bcryptjs  
**File Upload**: Multer, music-metadata (ID3 tags)  
**Base URL**: `/api`

## 🚀 Quick Start

### 1. Clone & Install
```
git clone <your-repo>
cd music-api
npm install
```

### 2. Environment Variables
```
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=30d
MONGODB_URI=mongodb://localhost:27017/musicdb
PORT=5000
```

### 3. Run Server
```
npm start
```

## 📋 Authentication Routes (`/api/auth`)

### Register New User
`POST /register`

**Body:**
``` json
{
"username": "john_doe",
"email": "john@example.com",
"password": "password123"
}
```

**Response (201):**
``` json
{
"_id": "507f1f77bcf86cd799439011",
"username": "john_doe",
"email": "john@example.com",
"profile_image": "/images/default_avatar.png",
"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login User
`POST /login`

**Body:**
``` json
{
"email": "john@example.com",
"password": "password123"
}
```

**Response (200):** Same as register

### Get Current User
`GET /me`

**Headers:** 
`Authorization: Bearer <token>`  
**Response (200):**
``` json
{
"_id": "507f1f77bcf86cd799439011",
"username": "john_doe",
"email": "john@example.com",
"profile_image": "/images/default_avatar.png"
}
```

### Update Profile
`PUT /profile`

**Headers:** `Authorization: Bearer <token>`  
**Body:**
``` json
{
"profile_image": "https://example.com/avatar.jpg"
}
```

## 🎵 Tracks Routes (`/api/tracks`)

### Get All Tracks (Recent First)
`GET /`

**Response:** Array of tracks with populated user data

### Search Tracks
`GET /search?q=beatles`

**Query:** `q` (min 2 chars)

### Sort Tracks
`GET /sorted?sortBy=recently_listened`

**Options:** `alphabetical`, `recently_added`, `recently_listened`

### Get User's Tracks
`GET /my-tracks`

**Auth:** `Required`

### Get Single Track
`GET /:id`

**Auth:** `Required`

### Upload/Create Track
`POST /`

**Auth:** `Required`
**Content-Type:** `multipart/form-data`

**Fields:**
- title (string, optional - auto-filled from metadata)
- artist (string, optional - auto-filled from metadata)
- sourceType (local/youtube/external_url)
- sourceUrl (string, for youtube/external)


**Files:**
- audioFile (audio/mp4, max 50MB)
- cover_photo (image, optional)


**Local Upload Features:**
- Auto-extracts title/artist from ID3 tags
- Extracts embedded cover art
- Stores in `uploads/` directory

### Mark as Listened
`PUT /:id/listen`

**Response:** 
``` json
{
  "msg": "Track listening timestamp updated.",
  "recently_listened": "2025-12-06T11:58:00.000Z"
}
```

### Update Track Metadata
`PUT /:id`

**Body:** `
``` json
{
  "title": "New Title",
  "artist": "New Artist",
  "cover_photo": "new.jpg"
}
```

### Delete Track
`DELETE /:id`

**Owner only** 
- deletes local files too

## 📂 Playlists Routes (`/api/playlists`)

### Create Playlist
`POST / `

**Body:**
``` json
{
"name": "My Favorites",
"description": "Best songs ever",
"is_public": true
}
```

### Get User's Playlists
`GET /my-playlists`


### Get Single Playlist
`GET /:id`

**Returns populated tracks array**

### Toggle Track in Playlist
`PUT /:id/tracks`

**Body:**
``` json
{
  "trackId": "507f1f77bcf86cd799439011"
}
```

**Toggles:** Add if missing, remove if present

### Update Playlist
`PUT /:id`

**Body:**
``` json
{
  "name": "Updated Name",
  "is_public": false
}
```

### Delete Playlist
`DELETE /:id`


## 🗃️ Data Models

### User Model
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `username` | String | ✅ | Unique, trimmed |
| `email` | String | ✅ | Unique, validated |
| `password` | String | ✅ | bcrypt hashed, min 6 chars |
| `profile_image` | String | ❌ | Default: `/images/default_avatar.png` |

### Track Model
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | String | ✅ | Track name |
| `artist` | String | ✅ | Artist name |
| `user` | ObjectId | ✅ | Owner ref |
| `sourceType` | String | ✅ | `local`/`youtube`/`external_url` |
| `filePath` | String | Conditional | Local files only |
| `sourceUrl` | String | Conditional | YouTube/External |
| `videoId` | String | Conditional | YouTube only |
| `recently_listened` | Date | ❌ | Last played |
| `cover_photo` | String | ❌ | Album art |

### Playlist Model
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | String | ✅ | Playlist title |
| `user` | ObjectId | ✅ | Owner ref |
| `tracks` | [ObjectId] | ❌ | Track references |
| `is_public` | Boolean | ❌ | Default: `false` |

## 📁 File Upload Config
- Directory: uploads/
- Max Size: 50MB
- Types: audio/, video/mp4, image/
- Naming: timestamp-basename.ext


## 🛡️ Error Responses
``` json
{
  "msg": "Error message"
}
```

**Codes:**
- `400`: Validation errors
- `401`: Unauthorized / Invalid token
- `404`: Not found
- `500`: Server error

## 🏗️ Project Structure
```
├── models/
│ ├── User.js
│ ├── Track.js
│ └── Playlist.js
├── routes/
│ ├── auth.js
│ ├── tracks.js
│ └── playlists.js
├── middleware/
│ └── auth.js
├── uploads/ # Generated
└── server.js
```

## 🔧 Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | ✅ | - | JWT signing key |
| `JWT_EXPIRE` | ❌ | `30d` | Token expiry |
| `MONGODB_URI` | ✅ | - | MongoDB connection |
| `PORT` | ❌ | `5000` | Server port |

## 📄 License
MIT License 
