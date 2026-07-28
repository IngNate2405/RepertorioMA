export interface Song {
  id: string
  title: string
  titleNormalized: string
  artist?: string
  originalKey: string
  chordProText: string
  youtubeUrl?: string
  spotifyUrl?: string
  timesPlayed: number
  lastPlayedAt?: string
  createdAt: string
  updatedAt: string
}

export interface SongPhoto {
  id: string
  base64: string
  page: number
  uploadedAt: string
}

export type SetlistStatus = 'draft' | 'current' | 'played'

export interface SetlistSongRef {
  songId: string
  keyOverrideSemitones?: number
}

export interface Setlist {
  id: string
  name: string
  date: string
  songs: SetlistSongRef[]
  status: SetlistStatus
  playedAt?: string
  createdAt: string
}
