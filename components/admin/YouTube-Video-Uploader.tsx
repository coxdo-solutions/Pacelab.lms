'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Upload, Youtube } from 'lucide-react';
import { motion } from 'framer-motion';

type UploadResult =
  | { filename: string; path: string; size: number } // legacy local-upload shape
  | { videoId: string; watchUrl: string; embedUrl: string; title: string; description: string; privacyStatus: string }; // new YouTube shape

interface Props {
  onUploadSuccess?: (video: UploadResult) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function YouTubeVideoUploader({ onUploadSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacyStatus, setPrivacyStatus] = useState<'public' | 'unlisted' | 'private'>('unlisted');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setFile(e.target.files[0]);
  };

  // Use XHR for real upload progress (fetch upload progress is not reliable cross-browser)
  const uploadWithProgress = (formData: FormData): Promise<UploadResult> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/youtube/upload/stream`);
      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        const pct = Math.round((evt.loaded / evt.total) * 100);
        setProgress(pct);
      };
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error(xhr.responseText || `HTTP ${xhr.status}`));
          }
        }
      };
      xhr.onerror = () => reject(new Error('Network error while uploading'));
      xhr.send(formData);
    });

  const handleUpload = async () => {
    if (!file) return alert('Please select a video file');

    try {
      setIsUploading(true);
      setProgress(1);

      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('privacyStatus', privacyStatus);

      // Preferred: direct stream endpoint (no disk on server)
      let result: UploadResult;
      try {
        result = await uploadWithProgress(formData);
      } catch {
        // Fallback: disk → YouTube route if stream endpoint not available
        const res = await fetch(`${API_BASE}/youtube/upload`, { method: 'POST', body: formData });
        if (!res.ok) throw new Error(await res.text());
        result = await res.json();
        setProgress(100);
      }

      onUploadSuccess?.(result);

      // reset form
      setFile(null);
      setTitle('');
      setDescription('');
      setPrivacyStatus('unlisted');
    } catch (err) {
      console.error(err);
      alert(`Failed to upload video: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
      }, 400);
    }
  };

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-600" />
          Upload Lesson Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Video File</label>
          <Input type="file" accept="video/*" onChange={handleFileChange} className="rounded-lg" />
          {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
        </div>

        <div className="grid gap-3">
          <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Privacy</label>
            <select
              className="border rounded-md px-2 py-1 text-sm bg-background"
              value={privacyStatus}
              onChange={(e) => setPrivacyStatus(e.target.value as any)}
            >
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>

        <Button
          onClick={handleUpload}
          disabled={isUploading || !file}
          className="rounded-lg primary-gradient flex text-white items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {isUploading ? 'Uploading…' : 'Upload'}
        </Button>

        {isUploading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <Progress value={progress} className="h-2 rounded-lg" />
            <div className="text-xs text-muted-foreground mt-1">{progress}%</div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

