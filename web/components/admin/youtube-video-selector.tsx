'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Play, Clock, Eye, Youtube } from 'lucide-react';
import { motion } from 'framer-motion';
import { YouTubeService, YouTubeVideo } from '@/lib/youtube';

interface YouTubeVideoSelectorProps {
  onVideoSelect: (video: YouTubeVideo) => void;
  selectedVideoId?: string;
}

export function YouTubeVideoSelector({ onVideoSelect, selectedVideoId }: YouTubeVideoSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const { data: searchResults = [], isLoading, refetch } = useQuery<YouTubeVideo[]>({
    queryKey: ['youtube-search', searchQuery],
    queryFn: () => YouTubeService.searchVideos(searchQuery),
    enabled: false,
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      refetch();
    }
  };

  const handleUrlSubmit = async () => {
    if (!youtubeUrl.trim()) return;

    const videoId = YouTubeService.extractVideoId(youtubeUrl);
    if (!videoId) {
      alert('Invalid YouTube URL');
      return;
    }

    try {
      const videoDetails = await YouTubeService.getVideoDetails(videoId);
      onVideoSelect(videoDetails);
      setYoutubeUrl('');
    } catch (error) {
      alert('Failed to fetch video details');
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatViewCount = (count: number) => {
    if (count === 0) return 'Unknown';
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    }
    return `${count} views`;
  };

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-600" />
          YouTube Video Selector
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Direct URL Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">YouTube URL</label>
          <div className="flex gap-2">
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="rounded-lg"
            />
            <Button
              onClick={handleUrlSubmit}
              className="rounded-lg primary-gradient"
            >
              Add Video
            </Button>
          </div>
        </div>

        {/* Search Videos */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search YouTube</label>
            <div className="flex gap-2">
              <Input
                placeholder="Search for videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="rounded-lg"
              />
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                variant="outline"
                className="rounded-lg"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <ScrollArea className="h-96 rounded-lg border">
              <div className="p-4 space-y-3">
                {searchResults.map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedVideoId === video.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => onVideoSelect(video)}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <div className="relative flex-shrink-0">
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-24 h-16 object-cover rounded"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Play className="w-6 h-6 text-white drop-shadow-lg" />
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm line-clamp-2 mb-1">
                              {video.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mb-2">
                              {video.channelTitle}
                            </p>
                            
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {video.duration > 0 && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatDuration(video.duration)}</span>
                                </div>
                              )}
                              {video.viewCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  <span>{formatViewCount(video.viewCount)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {selectedVideoId === video.id && (
                            <Badge className="rounded-lg bg-green-100 text-green-800">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}