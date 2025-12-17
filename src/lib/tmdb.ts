export interface TMDBMedia {
  id: number;
  title?: string;
  name?: string; // For TV
  poster_path: string | null;
  overview: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string; // For TV
  media_type: 'movie' | 'tv';
}

export interface TMDBResponse {
  results: TMDBMedia[];
  page: number;
  total_pages: number;
}

export const PROVIDERS = [
  { id: '8', name: 'Netflix', logo: '/providers/netflix.png' },
  { id: '337', name: 'Disney+', logo: '/providers/disney.png' },
  { id: '119', name: 'Amazon Prime', logo: '/providers/prime.png' },
  { id: '350', name: 'Apple TV+', logo: '/providers/apple.png' },
] as const;

export const GENRES_MOVIE = [
  { id: '28', name: 'Action' },
  { id: '12', name: 'Aventure' },
  { id: '35', name: 'Comédie' },
  { id: '18', name: 'Drame' },
  { id: '10749', name: 'Romance' },
  { id: '878', name: 'Science-Fiction' },
  { id: '27', name: 'Horreur' },
] as const;

export const GENRES_TV = [
  { id: '10759', name: 'Action & Adventure' },
  { id: '35', name: 'Comédie' },
  { id: '18', name: 'Drame' },
  { id: '10765', name: 'Sci-Fi & Fantastique' },
] as const;
