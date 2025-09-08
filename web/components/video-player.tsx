// components/video-player.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
  onProgress: (data: { currentTime: number; duration: number; completed: boolean }) => void;
}

/* Global YT declarations */
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

/* Utilities */
function parseYouTubeId(input: string | undefined | null): string | null {
  if (!input) return null;
  const trimmed = String(input).trim().replace(/^"+|"+$/g, "");
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    const v = u.searchParams.get("v");
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    const segs = u.pathname.split("/").filter(Boolean);
    const ei = segs.indexOf("embed");
    if (ei !== -1 && /^[a-zA-Z0-9_-]{11}$/.test(segs[ei + 1] || "")) return segs[ei + 1]!;
    const si = segs.indexOf("shorts");
    if (si !== -1 && /^[a-zA-Z0-9_-]{11}$/.test(segs[si + 1] || "")) return segs[si + 1]!;
    const tail = segs[segs.length - 1];
    if (tail && /^[a-zA-Z0-9_-]{11}$/.test(tail)) return tail;
  } catch {}
  return null;
}

const SPEEDS = [1, 1.25, 1.5, 1.75, 2] as const;
const ALLOWED_HOSTS = new Set(["pacelab-lms-web.vercel.app", "lms.pacelab.in", "localhost", "127.0.0.1"]);

function isAllowedHost(hostname: string) {
  if (!hostname) return false;
  if (hostname.endsWith(".vercel.app")) return true;
  return ALLOWED_HOSTS.has(hostname);
}

/* Component */
export function VideoPlayer({ youtubeVideoId, lessonId, onProgress }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerHostRef = useRef<HTMLDivElement | null>(null); // THIS element is passed to YT.Player
  const playerRef = useRef<any>(null);

  // timers are browser numbers
  const progressIntervalRef = useRef<number | null>(null);
  const hideControlsTimeoutRef = useRef<number | null>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const blockedToastTimerRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  const playerInitRef = useRef(false); // prevent double-init
  const mountedRef = useRef(false);

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
  const thumbnailUrl = resolvedId ? `https://img.youtube.com/vi/${resolvedId}/hqdefault.jpg` : null;
  const storageKey = `vp:${lessonId}`;

  /* --- domain lock --- */
  useEffect(() => {
    try {
      const host = window.location.hostname;
      setBlockedByDomain(!isAllowedHost(host));
    } catch {
      setBlockedByDomain(false);
    }
  }, []);

  /* --- Load YouTube IFrame API (idempotent) --- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.YT?.Player) return;
    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) return;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    document.head.appendChild(tag);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => prev?.();
  }, []);

  /* --- mount tracking --- */
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* --- Init / re-init YT player (race-proof) --- */
  useEffect(() => {
    // reset states
    clearProgressInterval();
    setIsReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setVideoIdError(null);
    playerInitRef.current = false;

    if (blockedByDomain) return;
    if (youtubeVideoId == null) return;
    if (!resolvedId) {
      setVideoIdError("Invalid YouTube video link or ID.");
      return;
    }

    const tryInit = () => {
      if (!mountedRef.current) return;
      if (playerInitRef.current) return;
      const hostEl = playerHostRef.current;
      if (!hostEl) return;
      // ensure host is attached to live DOM
      if (!document.body.contains(hostEl)) return;
      if (!window.YT || !window.YT.Player) return;

      // schedule after paint to avoid concurrent commit issues
      requestAnimationFrame(() => {
        if (playerInitRef.current) return;
        const nowHost = playerHostRef.current;
        if (!nowHost) return;
        if (!document.body.contains(nowHost)) return;
        playerInitRef.current = true;
        initPlayer(resolvedId);
      });
    };

    // poll until ready
    pollIntervalRef.current = window.setInterval(() => {
      tryInit();
      if (playerInitRef.current && pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }, 100);

    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId, youtubeVideoId, blockedByDomain]);

  /* --- init player by passing DOM element (NOT id string) --- */
  function initPlayer(id: string) {
    try {
      const hostEl = playerHostRef.current;
      if (!hostEl) throw new Error("playerHostRef not available");

      // clear leftover children to start clean
      try {
        hostEl.innerHTML = "";
      } catch {}

      playerRef.current = new window.YT.Player(hostEl as HTMLElement, {
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
          enablejsapi: 1,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError,
        },
      });
    } catch (err) {
      playerInitRef.current = false;
      setVideoIdError("Failed to initialize YouTube player.");
      console.error("initPlayer error:", err);
    }
  }

  /* --- Harden iframe where possible (best-effort) --- */
  function hardenIframe() {
    try {
      const iframe = playerHostRef.current?.querySelector("iframe") as HTMLIFrameElement | null;
      if (!iframe) return;
      // keep iframe interactive so fullscreen/controls can work; if you want to fully block direct interaction, set pointerEvents = 'none'
      iframe.tabIndex = -1;
      iframe.setAttribute("aria-hidden", "true");
      iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen");
      iframe.setAttribute("allowfullscreen", "true");
      iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
      iframe.setAttribute("draggable", "false");
    } catch {}
  }

  /* --- YT event handlers --- */
  function onPlayerReady(e: any) {
    setIsReady(true);
    const d = e.target.getDuration?.() ?? 0;
    const v = e.target.getVolume?.() ?? 100;
    setDuration(d);
    setVolume(v);
    setIsMuted(e.target.isMuted?.() ?? false);
    hardenIframe();

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const { t } = JSON.parse(saved) as { t: number; d: number; at: number };
        if (typeof t === "number" && t > 0 && t < d - 5) {
          e.target.seekTo?.(t, true);
          setCurrentTime(t);
        }
      }
    } catch {}

    e.target.setPlaybackRate?.(SPEEDS[speedIndex]);
    startProgressInterval();
  }

  function onPlayerStateChange(e: any) {
    const playing = e?.data === window.YT.PlayerState.PLAYING;
    setIsPlaying(playing);
    if (playing) {
      setShowControls(false);
      startProgressInterval();
    } else {
      setShowControls(true);
    }
  }

  function onPlayerError(e: any) {
    setVideoIdError("Unable to load this YouTube video (invalid ID or restricted).");
    console.error("YouTube Player Error:", e?.data);
  }

  /* --- progress interval --- */
  function startProgressInterval() {
    clearProgressInterval();
    progressIntervalRef.current = window.setInterval(() => {
      const p = playerRef.current;
      if (!p?.getCurrentTime || !p?.getDuration) return;
      const current = p.getCurrentTime() ?? 0;
      const total = p.getDuration() ?? 0;
      setCurrentTime(current);
      setDuration(total);
      try {
        localStorage.setItem(storageKey, JSON.stringify({ t: current, d: total, at: Date.now() }));
      } catch {}
      const completed = total > 0 && current / total >= 0.95;
      onProgress({ currentTime: current, duration: total, completed });
    }, 1000);
  }

  function clearProgressInterval() {
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }

  /* --- destroy player safely --- */
  function destroyPlayer() {
    try {
      const p = playerRef.current;
      if (p?.destroy) {
        p.destroy();
      }
      const host = playerHostRef.current;
      if (host) {
        try {
          host.innerHTML = "";
        } catch {}
      }
    } catch (err) {
      console.error("destroyPlayer error:", err);
    } finally {
      playerRef.current = null;
      playerInitRef.current = false;
    }
  }

  /* --- controls / API wrappers --- */
  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.pauseVideo?.();
    else p.playVideo?.();
  }, [isPlaying]);

  function handleSeek(value: number[]) {
    const p = playerRef.current;
    if (!p) return;
    const t = value?.[0] ?? 0;
    p.seekTo?.(t, true);
    setCurrentTime(t);
  }

  function handleVolumeChange(value: number[]) {
    const p = playerRef.current;
    if (!p) return;
    const vol = value?.[0] ?? 0;
    p.setVolume?.(vol);
    setVolume(vol);
    setIsMuted(vol === 0);
  }

  function toggleMute() {
    const p = playerRef.current;
    if (!p) return;
    if (isMuted) {
      p.unMute?.();
      setIsMuted(false);
      setVolume(p.getVolume?.() ?? 100);
    } else {
      p.mute?.();
      setIsMuted(true);
    }
  }

  /* --- fullscreen helpers --- */
  function getFullscreenElement(): Element | null {
    return document.fullscreenElement || (document as any).webkitFullscreenElement || null;
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
    const container = containerRef.current;
    if (!container) return;
    if (!getFullscreenElement()) requestFullscreen(container);
    else exitFullscreen();
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
    if (hideControlsTimeoutRef.current) window.clearTimeout(hideControlsTimeoutRef.current);
    hideControlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }

  /* --- shield: single tap => play/pause, double tap => fullscreen --- */
  const lastTouchRef = useRef<number>(0);
  const safeCall = useCallback((fn: () => void) => {
    try {
      fn();
    } catch (err) {
      console.error("safeCall error:", err);
    }
  }, []);

  const handleShieldTap = useCallback(
    (isTouch = false) => {
      if (isTouch) lastTouchRef.current = Date.now();
      const now = Date.now();
      // ignore synthetic mouse that comes right after touch
      if (!isTouch && now - lastTouchRef.current < 700) return;

      if (clickTimeoutRef.current) {
        window.clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
        safeCall(() => {
          safeCall(() => setShowBlockedNotice(true));
          safeCall(toggleFullscreen);
        });
      } else {
        clickTimeoutRef.current = window.setTimeout(() => {
          clickTimeoutRef.current = null;
          safeCall(() => {
            safeCall(() => setShowBlockedNotice(true));
            safeCall(togglePlay);
          });
        }, 280);
      }
    },
    [safeCall, toggleFullscreen, togglePlay]
  );

  function handleShieldClick() {
    handleShieldTap(false);
  }
  function handleShieldTouchStart(e: React.TouchEvent) {
    e.preventDefault();
    setShowBlockedNotice(true);
    handleShieldTap(true);
  }

  useEffect(() => {
    if (showBlockedNotice) {
      if (blockedToastTimerRef.current) window.clearTimeout(blockedToastTimerRef.current);
      blockedToastTimerRef.current = window.setTimeout(() => setShowBlockedNotice(false), 1200);
    }
    return () => {
      if (blockedToastTimerRef.current) window.clearTimeout(blockedToastTimerRef.current);
      blockedToastTimerRef.current = null;
    };
  }, [showBlockedNotice]);

  /* --- keyboard handlers (local to container) --- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(document.activeElement)) return;

      // block some inspection combos but keep normal video shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
        e.preventDefault();
        setShowBlockedNotice(true);
        return;
      }
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
          playerRef.current?.seekTo?.(Math.min(duration, currentTime + 5), true);
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
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, duration, volume, togglePlay]);

  /* --- cleanup on unmount --- */
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) window.clearTimeout(hideControlsTimeoutRef.current);
      if (clickTimeoutRef.current) window.clearTimeout(clickTimeoutRef.current);
      if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
      if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
      destroyPlayer();
    };
  }, []);

  function cycleSpeed() {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    try {
      playerRef.current?.setPlaybackRate?.(SPEEDS[next]);
    } catch {}
  }

  const secureHandlers = {
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
    onCopy: (e: React.ClipboardEvent) => e.preventDefault(),
    onWheel: (e: React.WheelEvent) => e.preventDefault(),
  } as const;

  /* --- render --- */
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
        {/* Player host — keep mounted and stable; YT will insert iframe here (we pass the element ref) */}
        <div ref={playerHostRef} className="w-full h-full" />

        {/* Transparent shield captures interactions; touch/click handled safely */}
        <div
          className="absolute inset-0 z-30 bg-transparent cursor-not-allowed"
          onClick={handleShieldClick}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowBlockedNotice(true);
            toggleFullscreen();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowBlockedNotice(true);
          }}
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={handleShieldTouchStart}
          aria-hidden
        />

        {/* Corner masks */}
        <div className="pointer-events-none absolute top-0 right-0 w-40 h-16 z-20 bg-gradient-to-l from-black/60 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-44 h-14 z-20 bg-gradient-to-l from-black/60 to-transparent" />

        {/* Blocked toast */}
        <AnimatePresence>
          {showBlockedNotice && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute top-3 right-3 z-40 px-3 py-2 rounded-md bg-black/80 text-white text-xs backdrop-blur-md flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Interactions disabled. Use controls below.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Domain lock */}
        {blockedByDomain && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
            <div className="text-center text-red-200 flex items-center gap-3 p-4 rounded-lg bg-black/60 shadow-lg">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-medium">Playback blocked on this domain.</span>
            </div>
          </div>
        )}

        {/* Waiting/Error/Thumbnail overlays */}
        {youtubeVideoId == null && !videoIdError && !blockedByDomain && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <div className="text-white/90 text-sm">Waiting for video…</div>
          </div>
        )}

        {youtubeVideoId === "" && !videoIdError && !blockedByDomain && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="flex items-center gap-3 text-red-200">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-medium">No YouTube link/ID provided.</span>
            </div>
          </div>
        )}

        {!isReady && thumbnailUrl && !videoIdError && !blockedByDomain && (
          <img src={thumbnailUrl} alt="Video thumbnail" className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none" draggable={false} />
        )}

        {videoIdError && !blockedByDomain && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="flex items-center gap-3 text-red-200">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-medium">{videoIdError}</span>
            </div>
          </div>
        )}

        {!videoIdError && !blockedByDomain && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center opacity-10">
            <div className="text-white text-xs font-semibold tracking-widest rotate-[-20deg]">LMS • Lesson #{lessonId}</div>
          </div>
        )}

        {/* Big play icon */}
        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: !isPlaying && showControls && isReady ? 1 : 0, scale: !isPlaying && showControls && isReady ? 1 : 0.5 }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-md">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </motion.div>

        {/* Controls (above shield) */}
        <motion.div initial={{ opacity: 1 }} animate={{ opacity: showControls ? 1 : 0 }} transition={{ duration: 0.3 }} className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-40">
          <div className="mb-4">
            <Slider value={[Math.min(currentTime, duration || 0)]} max={duration || 0} step={1} onValueChange={handleSeek} className="w-full" disabled={!isReady || !!videoIdError || blockedByDomain} aria-label="Video progress" />
            <div className="flex justify-between text-xs text-white/80 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={togglePlay} className="text-white hover:bg-white/20 p-2 rounded-full" disabled={!isReady || !!videoIdError || blockedByDomain} aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={toggleMute} className="text-white hover:bg-white/20 p-2 rounded-full" disabled={!isReady || !!videoIdError || blockedByDomain} aria-label={isMuted ? "Unmute" : "Mute"}>
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <div className="w-24">
                  <Slider value={[isMuted ? 0 : volume]} max={100} step={1} onValueChange={handleVolumeChange} className="text-white" disabled={!isReady || !!videoIdError || blockedByDomain} aria-label="Volume" />
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={cycleSpeed} className="text-white hover:bg-white/20 p-2 rounded-md" disabled={!isReady || !!videoIdError || blockedByDomain} aria-label="Playback speed">
                <Gauge className="w-4 h-4" />
                <span className="ml-1 text-xs">{SPEEDS[speedIndex]}×</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 p-2 rounded-md" disabled={!isReady || !!videoIdError || blockedByDomain} aria-label="Settings">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="text-white hover:bg-white/20 p-2 rounded-md" disabled={!isReady || !!videoIdError || blockedByDomain} aria-label="Fullscreen">
                <Maximize className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Loading overlay */}
        {!isReady && !videoIdError && youtubeVideoId != null && !blockedByDomain && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p>Loading YouTube video…</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

