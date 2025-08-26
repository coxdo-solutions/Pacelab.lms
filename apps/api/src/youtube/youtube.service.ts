import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { google } from 'googleapis';
import * as fs from 'fs';
import { PassThrough } from 'stream';

// Use Express namespace for Multer file type
import type { Express } from 'express';
type MulterFile = Express.Multer.File;

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  publishedAt: string;
  channelTitle: string;
  viewCount: number;
}

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: any;
}
interface YouTubeVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: { high: { url: string } };
    publishedAt: string;
    channelTitle: string;
  };
  contentDetails: { duration: string };
  statistics: { viewCount: string };
}
interface YouTubePlaylistItem {
  id: string;
  snippet: { resourceId: { videoId: string } };
}
interface YouTubeSearchResponse { items: YouTubeSearchItem[] }
interface YouTubeVideosResponse { items: YouTubeVideoItem[] }
interface YouTubePlaylistResponse { items: YouTubePlaylistItem[] }

@Injectable()
export class YoutubeService {
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';
  private readonly apiKey = process.env.YOUTUBE_API_KEY;

  // OAuth client for uploads (API key cannot upload)
  private oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  constructor() {
    if (!this.apiKey) throw new Error('Missing YOUTUBE_API_KEY in .env file');
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      this.oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    }
  }

  /** Authenticated YouTube client (for upload/status/delete) */
  private yt() {
    return google.youtube({ version: 'v3', auth: this.oauth2 });
  }

  // =======================
  // Read-only: Search / Details / Playlists (API key)
  // =======================

  async searchVideos(query: string, maxResults = 10): Promise<YouTubeVideo[]> {
    try {
      const { data }: AxiosResponse<YouTubeSearchResponse> = await axios.get(
        `${this.baseUrl}/search`,
        { params: { key: this.apiKey, q: query, part: 'snippet', maxResults, type: 'video' } },
      );
      const ids = data.items.map((i) => i.id.videoId).join(',');
      if (!ids) return [];
      return this.getVideosDetails(ids);
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to search YouTube videos');
    }
  }

  async getVideosDetails(ids: string): Promise<YouTubeVideo[]> {
    try {
      const { data }: AxiosResponse<YouTubeVideosResponse> = await axios.get(
        `${this.baseUrl}/videos`,
        { params: { key: this.apiKey, id: ids, part: 'snippet,contentDetails,statistics' } },
      );
      return data.items.map((item) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.high?.url || '',
        duration: item.contentDetails.duration,
        publishedAt: item.snippet.publishedAt,
        channelTitle: item.snippet.channelTitle,
        viewCount: Number(item.statistics.viewCount),
      }));
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to fetch YouTube video details');
    }
  }

  async getPlaylistVideos(playlistId: string, maxResults = 10): Promise<YouTubeVideo[]> {
    try {
      const { data }: AxiosResponse<YouTubePlaylistResponse> = await axios.get(
        `${this.baseUrl}/playlistItems`,
        { params: { key: this.apiKey, playlistId, part: 'snippet', maxResults } },
      );
      const ids = data.items.map((i) => i.snippet.resourceId.videoId).join(',');
      if (!ids) return [];
      return this.getVideosDetails(ids);
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to fetch playlist videos');
    }
  }

  // =======================
  // Upload / Status / Delete (OAuth2)
  // =======================

  /** Upload a video from disk path (fallback path-based) */
  async uploadVideo(params: {
    path: string;
    title?: string;
    description?: string;
    privacyStatus?: 'public' | 'unlisted' | 'private';
  }) {
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      throw new InternalServerErrorException('Uploads disabled: missing GOOGLE_REFRESH_TOKEN');
    }

    const { path, title, description, privacyStatus = 'unlisted' } = params;
    const youtube = this.yt();

    try {
      const res = await youtube.videos.insert(
        {
          part: ['snippet', 'status'],
          requestBody: {
            snippet: { title: title || 'Lesson Upload', description: description || '' },
            status: { privacyStatus },
          },
          media: { body: fs.createReadStream(path) as any },
        },
        { onUploadProgress: () => {} }
      );

      const videoId = res.data.id!;
      return {
        videoId,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        title: res.data.snippet?.title ?? title ?? '',
        description: res.data.snippet?.description ?? description ?? '',
        privacyStatus: res.data.status?.privacyStatus ?? privacyStatus,
      };
    } catch (err: any) {
      console.error('YouTube upload failed:', err?.message || err);
      throw new InternalServerErrorException(err?.message || 'YouTube upload failed');
    } finally {
      try { fs.unlinkSync(path); } catch {}
    }
  }

  /** Streaming upload helper: returns a writable stream + a promise to await result */
  createUploadStream(params: {
    title?: string;
    description?: string;
    privacyStatus?: 'public' | 'unlisted' | 'private';
  }) {
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      throw new InternalServerErrorException('Uploads disabled: missing GOOGLE_REFRESH_TOKEN');
    }

    const { title, description, privacyStatus = 'unlisted' } = params;
    const youtube = this.yt();

    const pass = new PassThrough();

    const done = youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: { title: title || 'Lesson Upload', description: description || '' },
        status: { privacyStatus },
      },
      media: { body: pass as any },
    });

    return { stream: pass, done };
  }

  /** Check processing status + embeddability */
  async getUploadStatus(videoId: string) {
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      throw new InternalServerErrorException('Status check disabled: missing GOOGLE_REFRESH_TOKEN');
    }
    const youtube = this.yt();
    const res = await youtube.videos.list({
      id: [videoId],
      part: ['status', 'processingDetails'],
    });

    const v = res.data.items?.[0];
    return {
      uploadStatus: v?.status?.uploadStatus,                     // 'uploaded' | 'processed' | 'failed'
      processingStatus: v?.processingDetails?.processingStatus,  // 'processing' | 'succeeded' | 'failed'
      failureReason: v?.processingDetails?.processingFailureReason ?? null,
      privacyStatus: v?.status?.privacyStatus,
      embeddable: v?.status?.embeddable,
    };
  }

  /** Delete a YouTube video */
  async deleteVideo(videoId: string) {
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      throw new InternalServerErrorException('Delete disabled: missing GOOGLE_REFRESH_TOKEN');
    }
    const youtube = this.yt();
    await youtube.videos.delete({ id: videoId });
    return { ok: true };
  }

  // =======================
  // Multer (disk) — optional fallback
  // =======================

  getMulterConfig() {
    return {
      storage: diskStorage({
        destination: './uploads',
        filename: (
          _req: any,
          file: MulterFile,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10 GB
      fileFilter: (_req: any, file: MulterFile, cb: (error: Error | null, acceptFile: boolean) => void) => {
        if (!file.mimetype.startsWith('video/')) return cb(new Error('Only video files are allowed!'), false);
        cb(null, true);
      },
    };
  }
}
