"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  AlertTriangle,
  Gauge,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VideoPlayerProps {
  youtubeVideoId: string | null | undefined;
  lessonId: string;
  onProgress: (data: {
    currentTime: number;
    duration: number;
    completed: boolean;
  }) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
  interface Document {
    webkitExitFullscreen?: () => void;
    webkitFullscreenElement?: Element | null;
  }
}

function parseYouTubeId(input: string | undefined | null): string | null {
  if (!input) return null;
  const trimmed = String(input)
    .trim()
    .replace(/^"+|"+$/g, "");
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    const v = u.searchParams.get("v");
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    const segs = u.pathname.split("/").filter(Boolean);
    const ei = segs.indexOf("embed");
    if (ei !== -1 && /^[a-zA-Z0-9_-]{11}$/.test(segs[ei + 1] || ""))
      return segs[ei + 1]!;
    const si = segs.indexOf("shorts");
    if (si !== -1 && /^[a-zA-Z0-9_-]{11}$/.test(segs[si + 1] || ""))
      return segs[si + 1]!;
    const tail = segs[segs.length - 1];
    if (tail && /^[a-zA-Z0-9_-]{11}$/.test(tail)) return tail;
  } catch {}
  return null;
}

const SPEEDS = [1, 1.25, 1.5, 1.75, 2] as const;
const ALLOWED_HOSTS_FALLBACK = [
  "pacelab-lms-web.vercel.app",
  "pacelab.in",
  "pacelab-api.onrender.com",
  "localhost",
  "127.0.0.1",
];

function isAllowedHost(hostname: string) {
  if (!hostname) return false;
  if (hostname.endsWith(".vercel.app")) return true;
  return ALLOWED_HOSTS_FALLBACK.includes(hostname);
}

export function VideoPlayer({
  youtubeVideoId,
  lessonId,
  onProgress,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const blockedToastTimer = useRef<NodeJS.Timeout | null>(null);

  const playerInitRef = useRef(false);
  const mountedRef = useRef(false);
  const cleanupRef = useRef(false); // Add cleanup flag

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoIdError, setVideoIdError] = useState<string | null>(null);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [blockedByDomain, setBlockedByDomain] = useState(false);
  const [showBlockedNotice, setShowBlockedNotice] = useState(false);

  const resolvedId = parseYouTubeId(youtubeVideoId ?? null);
  const thumbnailUrl = resolvedId
    ? `https://img.youtube.com/vi/${resolvedId}/hqdefault.jpg`
    : null;
  const storageKey = `vp:${lessonId}`;
  // Use a more stable hostId that changes only when necessary
  const hostId = useMemo(() => `yt-player-${lessonId}`, [lessonId]);

  useEffect(() => {
    try {
      const host = window.location.hostname;
      setBlockedByDomain(!isAllowedHost(host));
    } catch {
      setBlockedByDomain(false);
    }
  }, []);

  // Load YT API (idempotent)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.YT?.Player) return;
    if (
      document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
    )
      return;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    document.head.appendChild(tag);
    const prevCb = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCb?.();
    };
  }, []);

  // Track mount
  useEffect(() => {
    mountedRef.current = true;
    cleanupRef.current = false;
    return () => {
      mountedRef.current = false;
      cleanupRef.current = true;
    };
  }, []);

  // Improved cleanup function
  function destroyPlayer() {
    try {
      clearProgressInterval();
      if (playerRef.current) {
        // Check if player has iframe before destroying
        const iframe = playerRef.current.getIframe?.();
        if (iframe && iframe.parentNode) {
          playerRef.current.destroy?.();
        }
        playerRef.current = null;
      }
      playerInitRef.current = false;
    } catch (error) {
      console.warn("Error during player cleanup:", error);
      playerRef.current = null;
      playerInitRef.current = false;
    }
  }

  // Improved initialization with better error handling
  useEffect(() => {
    // Clean up previous player first
    destroyPlayer();
    setIsReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setVideoIdError(null);

    if (blockedByDomain || cleanupRef.current) return;
    if (youtubeVideoId == null) return;
    if (!resolvedId) {
      setVideoIdError("Invalid YouTube video link or ID.");
      return;
    }

    const initAttempts = {
      count: 0,
      maxAttempts: 20, // Reduced from infinite polling
    };

    const tryInit = () => {
      if (!mountedRef.current || cleanupRef.current) return false;
      if (playerInitRef.current) return false;
      
      const hostEl = document.getElementById(hostId);
      if (!hostEl) {
        console.warn(`Host element not found: ${hostId}`);
        return false;
      }
      
      if (!window.YT || !window.YT.Player) {
        return false;
      }

      // Ensure the host element is clean
      hostEl.innerHTML = '';
      
      playerInitRef.current = true;
      initPlayer(resolvedId);
      return true;
    };

    const poll = setInterval(() => {
      initAttempts.count++;
      
      if (tryInit() || initAttempts.count >= initAttempts.maxAttempts) {
        clearInterval(poll);
        if (initAttempts.count >= initAttempts.maxAttempts && !playerInitRef.current) {
          setVideoIdError("Failed to initialize YouTube player after multiple attempts.");
        }
      }
    }, 150); // Slightly longer interval

    return () => {
      clearInterval(poll);
      destroyPlayer();
    };
  }, [resolvedId, youtubeVideoId, blockedByDomain, hostId]);

  function initPlayer(id: string) {
    try {
      const hostEl = document.getElementById(hostId);
      if (!hostEl || !mountedRef.current || cleanupRef.current) {
        playerInitRef.current = false;
        return;
      }

      // Double-check the element is still in the DOM
      if (!document.contains(hostEl)) {
        console.warn("Host element no longer in DOM during init");
        playerInitRef.current = false;
        return;
      }

      playerRef.current = new window.YT.Player(hostId, {
        height: "100%",
        width: "100%",
        videoId: id,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          cc_load_policy: 0,
          iv_load_policy: 3,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError,
        },
      });
    } catch (e) {
      console.error("Player initialization error:", e);
      playerInitRef.current = false;
      setVideoIdError("Failed to initialize YouTube player.");
    }
  }

  function hardenIframe() {
    try {
      const iframe = playerHostRef.current?.querySelector(
        "iframe"
      ) as HTMLIFrameElement | null;
      if (!iframe) return;

      iframe.tabIndex = -1;
      iframe.setAttribute("aria-hidden", "true");
      iframe.setAttribute(
        "allow",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      );
      iframe.setAttribute("allowfullscreen", "true");
      iframe.setAttribute(
        "sandbox",
        "allow-scripts allow-same-origin allow-presentation allow-popups"
      );
      iframe.setAttribute("draggable", "false");
    } catch (error) {
      console.warn("Error hardening iframe:", error);
    }
  }

  function onPlayerReady(e: any) {
    if (!mountedRef.current || cleanupRef.current) return;
    
    try {
      setIsReady(true);
      const d = e.target.getDuration?.() ?? 0;
      const v = e.target.getVolume?.() ?? 100;
      setDuration(d);
      setVolume(v);
      setIsMuted(e.target.isMuted?.() ?? false);
      hardenIframe();

      // Restore progress
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const { t } = JSON.parse(saved) as { t: number; d: number; at: number };
          if (typeof t === "number" && t > 0 && t < d - 5) {
            e.target.seekTo?.(t, true);
            setCurrentTime(t);
          }
        }
      } catch (storageError) {
        console.warn("Error restoring progress:", storageError);
      }

      e.target.setPlaybackRate?.(SPEEDS[speedIndex]);
      startProgressInterval();
    } catch (error) {
      console.error("Error in onPlayerReady:", error);
    }
  }

  function onPlayerStateChange(e: any) {
    if (!mountedRef.current || cleanupRef.current) return;
    
    try {
      const playing = e?.data === window.YT.PlayerState.PLAYING;
      setIsPlaying(playing);
      if (playing) {
        setShowControls(false);
        startProgressInterval();
      } else {
        setShowControls(true);
      }
    } catch (error) {
      console.error("Error in onPlayerStateChange:", error);
    }
  }

  function onPlayerError(e: any) {
    if (!mountedRef.current) return;
    
    setVideoIdError(
      "Unable to load this YouTube video (invalid ID or restricted)."
    );
    console.error("YouTube Player Error:", e?.data);
  }

  function startProgressInterval() {
    clearProgressInterval();
    progressIntervalRef.current = setInterval(() => {
      if (!mountedRef.current || cleanupRef.current) {
        clearProgressInterval();
        return;
      }
      
      const p = playerRef.current;
      if (!p?.getCurrentTime || !p?.getDuration) return;
      
      try {
        const current = p.getCurrentTime() ?? 0;
        const total = p.getDuration() ?? 0;
        setCurrentTime(current);
        setDuration(total);
        
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({ t: current, d: total, at: Date.now() })
          );
        } catch (storageError) {
          console.warn("Error saving progress:", storageError);
        }
        
        const completed = total > 0 && current / total >= 0.95;
        onProgress({ currentTime: current, duration: total, completed });
      } catch (error) {
        console.warn("Error in progress interval:", error);
      }
    }, 1000);
  }

  function clearProgressInterval() {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p || !mountedRef.current) return;
    
    try {
      if (isPlaying) p.pauseVideo?.();
      else p.playVideo?.();
    } catch (error) {
      console.warn("Error toggling play:", error);
    }
  }, [isPlaying]);

  function handleSeek(value: number[]) {
    const p = playerRef.current;
    if (!p || !mountedRef.current) return;
    
    try {
      const t = value?.[0] ?? 0;
      p.seekTo?.(t, true);
      setCurrentTime(t);
    } catch (error) {
      console.warn("Error seeking:", error);
    }
  }

  function handleVolumeChange(value: number[]) {
    const p = playerRef.current;
    if (!p || !mountedRef.current) return;
    
    try {
      const vol = value?.[0] ?? 0;
      p.setVolume?.(vol);
      setVolume(vol);
      setIsMuted(vol === 0);
    } catch (error) {
      console.warn("Error changing volume:", error);
    }
  }

  function toggleMute() {
    const p = playerRef.current;
    if (!p || !mountedRef.current) return;
    
    try {
      if (isMuted) {
        p.unMute?.();
        setIsMuted(false);
        setVolume(p.getVolume?.() ?? 100);
      } else {
        p.mute?.();
        setIsMuted(true);
      }
    } catch (error) {
      console.warn("Error toggling mute:", error);
    }
  }

  function getFullscreenElement(): Element | null {
    return (
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      null
    );
  }
  
  function requestFullscreen(el: Element) {
    const anyEl = el as any;
    if (anyEl.requestFullscreen) return anyEl.requestFullscreen();
    if (anyEl.webkitRequestFullscreen) return anyEl.webkitRequestFullscreen();
  }
  
  function exitFullscreen() {
    const anyDoc = document as any;
    if (document.exitFullscreen) return document.exitFullscreen();
    if (anyDoc.webkitExitFullscreen) return anyDoc.webkitExitFullscreen();
  }
  
  function toggleFullscreen() {
    try {
      const container = containerRef.current;
      if (!container) return;
      if (!getFullscreenElement()) requestFullscreen(container);
      else exitFullscreen();
    } catch (error) {
      console.warn("Error toggling fullscreen:", error);
    }
  }

  function formatTime(time: number) {
    if (!isFinite(time)) return "0:00";
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function handleMouseMove() {
    setShowControls(true);
    if (hideControlsTimeoutRef.current)
      clearTimeout(hideControlsTimeoutRef.current);
    hideControlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }

  const handleShieldClick = useCallback((e: React.MouseEvent) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      
      showBlocked();
      
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
        toggleFullscreen();
      } else {
        clickTimeoutRef.current = setTimeout(() => {
          togglePlay();
          if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
          }
        }, 200);
      }
    } catch (error) {
      console.error("Shield click error:", error);
    }
  }, [togglePlay]);

  const handleShieldDoubleClick = useCallback((e: React.MouseEvent) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      
      showBlocked();
      
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      
      toggleFullscreen();
    } catch (error) {
      console.error("Shield double click error:", error);
    }
  }, []);

  const handleShieldContextMenu = useCallback((e: React.MouseEvent) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      showBlocked();
    } catch (error) {
      console.error("Shield context menu error:", error);
    }
  }, []);

  const handleShieldTouchStart = useCallback((e: React.TouchEvent) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      showBlocked();
    } catch (error) {
      console.error("Shield touch start error:", error);
    }
  }, []);

  function showBlocked() {
    try {
      setShowBlockedNotice(true);
      if (blockedToastTimer.current) clearTimeout(blockedToastTimer.current);
      blockedToastTimer.current = setTimeout(
        () => setShowBlockedNotice(false),
        1300
      );
    } catch (error) {
      console.error("Show blocked error:", error);
    }
  }

  // Keyboard handlers
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!containerRef.current || !mountedRef.current) return;
      const hasFocus = containerRef.current.contains(document.activeElement);
      if (!hasFocus) return;
      
      try {
        switch (e.key.toLowerCase()) {
          case " ":
          case "k":
            e.preventDefault();
            togglePlay();
            break;
          case "m":
            e.preventDefault();
            toggleMute();
            break;
          case "f":
            e.preventDefault();
            toggleFullscreen();
            break;
          case "arrowleft":
            e.preventDefault();
            playerRef.current?.seekTo?.(Math.max(0, currentTime - 5), true);
            break;
          case "arrowright":
            e.preventDefault();
            playerRef.current?.seekTo?.(
              Math.min(duration, currentTime + 5),
              true
            );
            break;
          case "arrowup":
            e.preventDefault();
            handleVolumeChange([Math.min(100, (volume ?? 0) + 5)]);
            break;
          case "arrowdown":
            e.preventDefault();
            handleVolumeChange([Math.max(0, (volume ?? 0) - 5)]);
            break;
        }
      } catch (error) {
        console.warn("Error in keyboard handler:", error);
      }
    };
    
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentTime, duration, volume, togglePlay]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current)
        clearTimeout(hideControlsTimeoutRef.current);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      if (blockedToastTimer.current) clearTimeout(blockedToastTimer.current);
      
      cleanupRef.current = true;
      destroyPlayer();
    };
  }, []);

  function cycleSpeed() {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    try {
      playerRef.current?.setPlaybackRate?.(SPEEDS[next]);
    } catch (error) {
      console.warn("Error changing speed:", error);
    }
  }

  const secureHandlers = {
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
    onCopy: (e: React.ClipboardEvent) => e.preventDefault(),
    onWheel: (e: React.WheelEvent) => e.preventDefault(),
  } as const;

  return (
    <Card className="relative bg-black rounded-xl shadow-lg overflow-hidden select-none">
      <div
        ref={containerRef}
        className="relative w-full aspect-video outline-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        onTouchStart={(e) => {
          e.preventDefault();
          handleMouseMove();
        }}
        tabIndex={0}
        role="region"
        aria-label="Video Player"
        style={{
          WebkitUserSelect: "none",
          userSelect: "none",
          WebkitTouchCallout: "none",
          touchAction: "none",
        }}
        suppressHydrationWarning
        {...secureHandlers}
      >
        {/* Transparent Shield */}
        <div
          className="absolute inset-0 z-30 bg-transparent cursor-pointer"
          onClick={handleShieldClick}
          onDoubleClick={handleShieldDoubleClick}
          onContextMenu={handleShieldContextMenu}
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={handleShieldTouchStart}
          style={{ pointerEvents: 'auto' }}
          role="button"
          tabIndex={-1}
          aria-label="Video interaction layer"
        />

        {/* Corner masks */}
        <div className="pointer-events-none absolute top-0 right-0 w-40 h-16 z-20 bg-gradient-to-l from-black/60 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-44 h-14 z-20 bg-gradient-to-l from-black/60 to-transparent" />

        {/* Blocked toast */}
        <AnimatePresence>
          {showBlockedNotice && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-3 right-3 z-40 px-3 py-2 rounded-md bg-black/80 text-white text-xs backdrop-blur-md flex items-center gap-2 shadow-lg"
            >
              <Shield className="w-4 h-4" />
              Interactions disabled. Use controls below.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Domain-lock overlay */}
        {blockedByDomain && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
            <div className="text-center text-red-200 flex items-center gap-3 p-4 rounded-lg bg-black/60 shadow-lg">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-medium">
                Playback blocked on this domain.
              </span>
            </div>
          </div>
        )}

        {/* Waiting state */}
        {youtubeVideoId == null && !videoIdError && !blockedByDomain && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <div className="text-white/90 text-sm">Waiting for video…</div>
          </div>
        )}

        {/* Bad ID */}
        {youtubeVideoId === "" && !videoIdError && !blockedByDomain && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="flex items-center gap-3 text-red-200">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-medium">
                No YouTube link/ID provided.
              </span>
            </div>
          </div>
        )}

        {/* Thumbnail */}
        {!isReady && thumbnailUrl && !videoIdError && !blockedByDomain && (
          <img
            src={thumbnailUrl}
            alt="Video thumbnail"
            className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none"
            draggable={false}
          />
        )}

        {/* Player host - Simplified and more stable */}
        <div 
          id={hostId} 
          ref={playerHostRef} 
          className="w-full h-full"
          style={{ minHeight: '100%', minWidth: '100%' }}
        />

        {/* Error */}
        {videoIdError && !blockedByDomain && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="flex items-center gap-3 text-red-200">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-medium">{videoIdError}</span>
            </div>
          </div>
        )}

        {/* Watermark */}
        {!videoIdError && !blockedByDomain && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center opacity-10">
            <div className="text-white text-xs font-semibold tracking-widest rotate-[-20deg]">
              LMS • Lesson #{lessonId}
            </div>
          </div>
        )}

        {/* Big play icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: !isPlaying && showControls && isReady ? 1 : 0,
            scale: !isPlaying && showControls && isReady ? 1 : 0.5,
          }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
        >
          <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: showControls ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 z-40"
        >
          {/* Progress bar */}
          <div className="mb-4">
            <Slider
              value={[Math.min(currentTime, duration || 0)]}
              max={duration || 0}
              step={1}
              onValueChange={handleSeek}
              className="w-full"
              disabled={!isReady || !!videoIdError || blockedByDomain}
              aria-label="Video progress"
            />
            <div className="flex justify-between text-xs text-white/80 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="text-white hover:bg-white/20 p-2 rounded-full"
                disabled={!isReady || !!videoIdError || blockedByDomain}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20 p-2 rounded-full"
                  disabled={!isReady || !!videoIdError || blockedByDomain}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
                <div className="w-24">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                    className="text-white"
                    disabled={!isReady || !!videoIdError || blockedByDomain}
                    aria-label="Volume"
                  />
                </div>
              </div>

              {/* Speed */}
              <Button
                variant="ghost"
                size="sm"
                onClick={cycleSpeed}
                className="text-white hover:bg-white/20 p-2 rounded-md"
                disabled={!isReady || !!videoIdError || blockedByDomain}
                aria-label="Playback speed"
              >
                <Gauge className="w-4 h-4" />
                <span className="ml-1 text-xs">{SPEEDS[speedIndex]}×</span>
              </Button>
            </div>

            {/* Right-side controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 p-2 rounded-md"
                disabled={!isReady || !!videoIdError || blockedByDomain}
                aria-label="Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20 p-2 rounded-md"
                disabled={!isReady || !!videoIdError || blockedByDomain}
                aria-label="Fullscreen"
              >
                <Maximize className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Loading overlay */}
        {!isReady &&
          !videoIdError &&
          youtubeVideoId != null &&
          !blockedByDomain && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-sm">Loading YouTube video…</p>
              </div>
            </div>
          )}
      </div>
    </Card>
  );
}
