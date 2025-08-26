import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import { Request, Response } from 'express';
import Busboy from 'busboy';

// ✅ helper to stringify unknown errors
function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try { return JSON.stringify(e); } catch { return String(e); }
}

type Privacy = 'public' | 'unlisted' | 'private';
const PRIVACY_VALUES: Privacy[] = ['public', 'unlisted', 'private'];

@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  // 🔎 Search YouTube videos
  @Get('search')
  async search(@Query('q') q: string, @Query('maxResults') maxResults = 5) {
    if (!q?.trim()) throw new BadRequestException('Missing query "q"');
    return this.youtubeService.searchVideos(q, Number(maxResults));
  }

  // 📹 Get video details (comma-separated ids)
  @Get('videos')
  async getVideos(@Query('ids') ids: string) {
    if (!ids?.trim()) throw new BadRequestException('Missing "ids"');
    return this.youtubeService.getVideosDetails(ids);
  }

  // 📂 Get playlist videos
  @Get('playlist')
  async getPlaylist(@Query('id') id: string, @Query('maxResults') maxResults = 5) {
    if (!id?.trim()) throw new BadRequestException('Missing playlist "id"');
    return this.youtubeService.getPlaylistVideos(id, Number(maxResults));
  }

  // ✅ (Stream upload via Busboy only, no disk, no Multer)
  @Post('upload')
  async uploadStream(@Req() req: Request, @Res() res: Response) {
    const bb = Busboy({ headers: req.headers });
    let title = 'Lesson Upload';
    let description = '';
    let privacyStatus: Privacy = 'unlisted';
    let fileFound = false;

    const done = new Promise<void>((resolve, reject) => {
      bb.on('field', (name, val) => {
        if (name === 'title') title = val;
        else if (name === 'description') description = val;
        else if (name === 'privacyStatus' && PRIVACY_VALUES.includes(val as Privacy)) {
          privacyStatus = val as Privacy;
        }
      });

      bb.on('file', (_name, fileStream) => {
        fileFound = true;
        const { stream, done } = this.youtubeService.createUploadStream({
          title,
          description,
          privacyStatus,
        });
        fileStream.pipe(stream);

        done
          .then(({ data }) => {
            res.json({
              videoId: data.id,
              watchUrl: `https://www.youtube.com/watch?v=${data.id}`,
              embedUrl: `https://www.youtube.com/embed/${data.id}`,
              title: data.snippet?.title ?? title,
              description: data.snippet?.description ?? description,
              privacyStatus: (data.status?.privacyStatus as Privacy) ?? privacyStatus,
            });
            resolve();
          })
          .catch((err: unknown) => {
            if (!res.headersSent) {
              res.status(500).json({
                message: 'YouTube upload failed',
                error: getErrorMessage(err),
              });
            }
            reject(err);
          });
      });

      bb.on('close', () => {
        if (!fileFound) {
          if (!res.headersSent) {
            res.status(400).json({ message: 'No video file found in form-data' });
          }
          reject(new BadRequestException('No video file found'));
        }
      });

      bb.on('error', (err: unknown) => {
        if (!res.headersSent) {
          res.status(500).json({
            message: 'Upload stream error',
            error: getErrorMessage(err),
          });
        }
        reject(err);
      });
    });

    req.pipe(bb);
    return done;
  }

  // 🟢 Check processing/embeddable status
  @Get('videos/:id/status')
  async status(@Param('id') id: string) {
    if (!id?.trim()) throw new BadRequestException('Missing video id');
    return this.youtubeService.getUploadStatus(id);
  }

  // 🗑️ Delete a YouTube video
  @Delete('videos/:id')
  async remove(@Param('id') id: string) {
    if (!id?.trim()) throw new BadRequestException('Missing video id');
    return this.youtubeService.deleteVideo(id);
  }
}
