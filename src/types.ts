export interface Venue {
  id: string;
  slug: string;
  url: string;
  name: string;
  image: string | null;
  online: boolean | null;
  lastChecked: number | null;
  tracking: boolean;
}

export interface SearchResult {
  slug: string;
  name: string;
  online: boolean;
  address: string;
  image: { url: string } | null;
  tags: string[];
  rating: { score: number } | null;
}
