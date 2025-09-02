const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  publishedAt: string;
  channelTitle: string;
  viewCount: number;
}

export class YouTubeService {
  /** ✅ Safe fetch to your API */
  private static async fetchJson(url: string, options?: RequestInit) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Error: ${res.status} ${res.statusText} - ${errText}`);
    }
    return res.json();
  }

  /** ✅ Get details (via your Nest proxy) */
  static async getVideoDetails(videoId: string): Promise<YouTubeVideo> {
    const data = await this.fetchJson(`${API_BASE}/youtube/videos?ids=${encodeURIComponent(videoId)}`);
    if (!Array.isArray(data) || !data.length) throw new Error('Video not found');
    const v = data[0];

    return {
      id: v.id,
      title: v.title,
      description: v.description,
      thumbnail: v.thumbnail,
      duration: this.parseDuration(v.duration), // server returns ISO8601
      publishedAt: v.publishedAt,
      channelTitle: v.channelTitle,
      viewCount: Number(v.viewCount || 0),
    };
  }

  /** ✅ Search (via your Nest proxy) */
  static async searchVideos(query: string, maxResults = 10): Promise<YouTubeVideo[]> {
    const data = await this.fetchJson(
      `${API_BASE}/youtube/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`
    );

    // Server-side search returns ISO8601 duration only if you re-fetch details.
    // To keep it snappy, set duration/viewCount to 0; caller can hydrate a single item later with getVideoDetails.
    return (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      thumbnail: item.thumbnail,
      publishedAt: item.publishedAt,
      channelTitle: item.channelTitle,
      duration: 0,
      viewCount: 0,
    }));
  }

  /** ✅ Poll processing status */
  static async getStatus(videoId: string): Promise<{
    uploadStatus: string | undefined;
    processingStatus: string | undefined;
    embeddable: boolean | undefined;
    privacyStatus: string | undefined;
    failureReason: string | null | undefined;
  }> {
    return this.fetchJson(`${API_BASE}/youtube/videos/${encodeURIComponent(videoId)}/status`);
  }

  /** ✅ Extract ID */
  static extractVideoId(url: string): string {
    const regExp =
      /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\\?v=|&v=)([^#&?]{11}).*/i;
    const match = url.match(regExp);
    return match ? match[1] : '';
  }

  /** ✅ Embed URL */
  static generateEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
  }

  /** ✅ Thumbnail URL (fixed filenames) */
  static generateThumbnailUrl(
    videoId: string,
    quality: 'default' | 'mq' | 'hq' | 'sd' | 'maxres' = 'hq'
  ): string {
    const map: Record<string, string> = {
      default: 'default.jpg',
      mq: 'mqdefault.jpg',
      hq: 'hqdefault.jpg',
      sd: 'sddefault.jpg',
      maxres: 'maxresdefault.jpg',
    };
    return `https://img.youtube.com/vi/${videoId}/${map[quality]}`;
  }

  /** ✅ Parse ISO 8601 duration (e.g., PT1H2M3S → seconds) */
  private static parseDuration(duration: string | number): number {
    if (typeof duration === 'number') return duration;
    if (!duration) return 0;
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }
}
