interface YT {
  Player: {
    new (
      elementId: string,
      config: {
        height: string | number
        width: string | number
        playerVars?: {
          autoplay?: number
          controls?: number
          disablekb?: number
          enablejsapi?: number
          modestbranding?: number
          playsinline?: number
          rel?: number
        }
        events?: {
          onReady?: () => void
          onStateChange?: (event: { data: number }) => void
          onError?: (event: { data: number }) => void
        }
      },
    ): any
  }
  PlayerState: {
    UNSTARTED: number
    ENDED: number
    PLAYING: number
    PAUSED: number
    BUFFERING: number
    CUED: number
  }
}

interface Window {
  YT: YT
  onYouTubeIframeAPIReady: () => void
}
