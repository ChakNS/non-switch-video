<h2 align="left">non-switch-video</h2>

<p align="left">Switch video source without reload.</p>

## Usage

### Install

```
pnpm add non-switch-video
```

```js
const nsv = new NSV()
nsv.append('video.mp4')
```

## Options

```ts
export interface NSV {
  // complete event
  onComplete?: () => void
  // video element, document.querySelector('video') as default
  el?: HTMLVideoElement
  // video codec, 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"' as default
  mimeCodec?: string
}

// more options is comming
```

## License

MIT

## Reference
`https://github.com/hsiaosiyuan0/fmp4-demo`
