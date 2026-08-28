export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  uri: string;
  album: { name: string; images: { url: string }[] };
  is_playable?: boolean;
  external_urls?: { spotify?: string };
}

export interface RecommendedTrack {
  title: string;
  artist: string;
  id: string;
  uri: string;
  spotifyUrl: string;
  albumImage?: string;
  reason?: string;
}

export interface RecommendationSet {
  id: string;
  createdAt: string;
  basedOn: { title: string; artist: string }[];
  tracks: RecommendedTrack[];
}

export interface LastPlayedSong {
  title: string;
  artist: string;
  playedAt: string;
}

export interface PlayedSong {
  id: string;
  uri?: string;
  title: string;
  artist: string;
  playedAt: string;
  albumImage?: string;
}

export interface PlayedSongStat {
  song: PlayedSong;
  playCount: number;
}

export interface ExtractedSong {
  title: string;
  artist?: string;
  source?: 'llm' | 'input-fallback';
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SpotifyListener = (data: any) => void;

export interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, callback: SpotifyListener) => void;
  removeListener: (event: string) => void;
  getCurrentState: () => Promise<SpotifyPlaybackState | null>;
  setVolume: (volume: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  previousTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
  activateElement?: () => Promise<void>;
}

export interface SpotifyPlaybackState {
  track_window: {
    current_track: {
      id: string;
      name: string;
      artists: { name: string }[];
      album: { name: string };
    };
  };
  paused: boolean;
}
