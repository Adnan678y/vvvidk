import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Volume2, Volume1, VolumeX, Play, Pause, Settings, Loader2, RotateCcw, RotateCw, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface VideoPlayerProps {
  url: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [qualities, setQualities] = useState<{ height: number; level: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const controlsTimeoutRef = useRef<number>();
  const hlsRef = useRef<Hls | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);

    if (Hls.isSupported()) {
      const hls = new Hls({
        startLevel: -1,
        capLevelToPlayerSize: true,
        debug: false,
      });
      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const availableQualities = data.levels.map((level, index) => ({
          height: level.height,
          level: index,
        }));
        setQualities(availableQualities);
        setLoading(false);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError('Failed to load video stream');
          setLoading(false);
        }
      });

      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('playing', handlePlaying);

      return () => {
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('playing', handlePlaying);
        hls.destroy();
      };
    }
  }, [url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    if (videoRef.current) {
      videoRef.current.volume = value;
    }
  };

  const handleTimeSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const offsetX = clientX - rect.left;
    const percentage = offsetX / rect.width;
    const newTime = percentage * duration;
    
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleTimePreview = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percentage = offsetX / rect.width;
    return formatTime(percentage * duration);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleQualityChange = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentQuality(level);
      setShowSettings(false);
    }
  };

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getProgressBarStyles = () => {
    const progress = (currentTime / duration) * 100;
    return {
      background: `linear-gradient(to right, #ea384c ${progress}%, #403E43 ${progress}%)`,
    };
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSettings(false);
      }
    }, 3000);
  };

  if (error) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center bg-black text-white">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full bg-black group transition-all duration-300",
        isFullscreen ? "h-screen" : "aspect-video"
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false);
          setShowSettings(false);
        }
      }}
      onTouchStart={() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
          window.clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = window.setTimeout(() => {
          if (isPlaying) {
            setShowControls(false);
            setShowSettings(false);
          }
        }, 3000);
      }}
    >
      {(loading || isBuffering) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <Loader2 className="w-12 h-12 text-[#ea384c] animate-spin" />
        </div>
      )}
      
      <video
        ref={videoRef}
        className="w-full h-full cursor-pointer"
        playsInline
        onClick={handlePlayPause}
      />

      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#1A1F2C]/90 via-[#1A1F2C]/50 to-transparent px-4 py-6 transition-all duration-300",
        showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}>
        <div className="flex flex-col gap-3 max-w-screen-lg mx-auto">
          <div className="relative group/progress">
            <div 
              className="w-full h-1.5 rounded-full cursor-pointer relative overflow-hidden transition-all group-hover/progress:h-2.5"
              onClick={handleTimeSeek}
              onTouchStart={handleTimeSeek}
              style={getProgressBarStyles()}
            >
              <div 
                className="absolute left-0 top-0 bottom-0 bg-[#ea384c] rounded-full transition-all"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform" />
              </div>
            </div>
            
            <div 
              className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/progress:opacity-100 transition-opacity bg-[#1A1F2C]/90 px-2 py-1 rounded text-xs text-white backdrop-blur-sm border border-white/10"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            >
              {formatTime(currentTime)}
            </div>

            {videoRef.current && (
              <div className="absolute top-0 left-0 h-full w-full">
                {Array.from(videoRef.current.buffered || []).map((_, index) => {
                  const start = videoRef.current?.buffered.start(index) || 0;
                  const end = videoRef.current?.buffered.end(index) || 0;
                  const width = ((end - start) / duration) * 100;
                  const left = (start / duration) * 100;
                  return (
                    <div
                      key={index}
                      className="absolute top-0 h-full bg-white/20"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div className={cn(
            "grid items-center gap-4",
            isMobile ? "grid-cols-[auto_1fr_auto]" : "grid-cols-[auto_auto_auto_1fr_auto_auto_auto]"
          )}>
            <button
              onClick={handlePlayPause}
              className="text-white hover:text-[#ea384c] transition-colors"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>

            {!isMobile && (
              <>
                <button
                  onClick={() => handleSkip(-10)}
                  className="text-white hover:text-[#ea384c] transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleSkip(10)}
                  className="text-white hover:text-[#ea384c] transition-colors"
                >
                  <RotateCw className="w-5 h-5" />
                </button>
              </>
            )}

            <div className={cn(
              "flex items-center gap-2 group/volume",
              isMobile ? "w-20" : "w-32"
            )}>
              <button 
                onClick={() => setVolume(volume === 0 ? 1 : 0)}
                className="text-white hover:text-[#ea384c] transition-colors"
              >
                {volume === 0 ? (
                  <VolumeX className="w-6 h-6" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-6 h-6" />
                ) : (
                  <Volume2 className="w-6 h-6" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-full h-1 accent-[#ea384c] bg-[#403E43] rounded-full appearance-none cursor-pointer opacity-0 group-hover/volume:opacity-100 transition-opacity"
              />
            </div>

            <span className="text-white/90 text-sm font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="relative ml-auto">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  "text-white transition-colors p-1.5 rounded-full",
                  showSettings ? "bg-[#ea384c] text-white hover:bg-[#ea384c]/90" : "hover:text-[#ea384c]"
                )}
              >
                <Settings className="w-5 h-5" />
              </button>
              {showSettings && (
                <div className="absolute right-0 bottom-full mb-2 bg-[#1A1F2C]/95 rounded-lg p-3 min-w-[200px] backdrop-blur-sm border border-white/10 animate-fade-in">
                  <div className="space-y-4">
                    <div>
                      <div className="text-white/80 text-sm mb-2 font-medium">Playback Speed</div>
                      <div className="grid grid-cols-3 gap-1">
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => handleSpeedChange(speed)}
                            className={cn(
                              "px-2 py-1.5 text-sm rounded transition-all",
                              playbackSpeed === speed 
                                ? "bg-[#ea384c] text-white" 
                                : "text-white hover:bg-white/10"
                            )}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {qualities.length > 0 && (
                      <div>
                        <div className="text-white/80 text-sm mb-2 font-medium">
                          Quality
                        </div>
                        <div className="space-y-1">
                          {qualities.map(({ height, level }) => (
                            <button
                              key={level}
                              onClick={() => handleQualityChange(level)}
                              className={cn(
                                "block w-full text-left px-3 py-2 text-sm rounded transition-all",
                                currentQuality === level 
                                  ? "bg-[#ea384c] text-white" 
                                  : "text-white hover:bg-white/10"
                              )}
                            >
                              {height}p
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-[#ea384c] transition-colors"
            >
              {isFullscreen ? (
                <Minimize2 className="w-6 h-6" />
              ) : (
                <Maximize2 className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isMobile && showControls && (
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between px-8 pointer-events-none">
          <button
            onClick={() => handleSkip(-10)}
            className="text-white/80 hover:text-white pointer-events-auto p-4"
          >
            <RotateCcw className="w-8 h-8" />
          </button>
          <button
            onClick={() => handleSkip(10)}
            className="text-white/80 hover:text-white pointer-events-auto p-4"
          >
            <RotateCw className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
