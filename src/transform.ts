import MP4Box from 'mp4box'
import { Reader } from './reader'
import type { ExArrayBuffer } from './reader'

export class FetchFMp4 {
  MF: any
  Mp4Info: any
  reader: Reader
  SourceBuffers: Array<{ codec: string; sourceBuffer: SourceBuffer }>

  constructor(public MS: MediaSource, public el: HTMLVideoElement, public onComplete?: Function) {
    this.SourceBuffers = []
    this.Mp4Info = null
    this.reader = new Reader(this.onChunk.bind(this))
  }

  // 初始化MF 开始拉取文件
  fetchFile(url: string) {
    try {
      this.el.pause()
      this.SourceBuffers.forEach((s) => {
        s?.sourceBuffer.remove(0, this.el.duration)
      })
    } catch (error) {
      console.log('sourceBuffer is empty')
    }
    this.MF = MP4Box.createFile()

    this.MF.onReady = this.onReady.bind(this)

    this.MF.onSegment = this.onSegment.bind(this)

    this.MF.reader = this.reader

    this.MF.reader.start(url)
  }

  // 读取文件配置完毕，开始组装
  onReady(info: any) {
    this.Mp4Info = info
    this.MS.duration = info.duration / info.timescale

    this.initSourceBuffers()
    this.initTracks()
    this.initializeSegmentation()
  }

  // 每组装一个，触发该方法，装进MSE
  onSegment(id: string, ctx: any, buffer: ExArrayBuffer, sampleNum: number, isEnd: boolean) {
    ctx.pending.push({
      id: id,
      buffer: buffer,
      sampleNum: sampleNum,
      isEnd: isEnd,
    })
    this.updateEnd(ctx)
  }

  // 读取每一个chunk完毕，如果还未结束，则继续拉取
  onChunk(chunk: { bytes: ExArrayBuffer; isEof: boolean }) {
    const next = this.MF.appendBuffer(chunk.bytes, chunk.isEof)

    if (chunk.isEof) {
      this.MF.flush()
    } else {
      this.MF.reader.chunkStart = next
    }
  }

  // 初始化sourceBuffer，正常为视频和音频各一个
  initSourceBuffers() {
    if (!this.SourceBuffers.length) {
      this.Mp4Info.tracks.forEach((track: any) => {
        const mime = `video/mp4; codecs="${track.codec}"`
        if (!MediaSource.isTypeSupported(mime)) {
          throw new Error('MSE does not support: ' + mime)
        }
        const sourceBuffer = this.MS.addSourceBuffer(mime)

        this.SourceBuffers.push({
          codec: track.codec,
          sourceBuffer,
        })
      })
    }
  }

  // 初始化轨道
  initTracks() {
    const trackLen = this.Mp4Info.tracks.length
    const shared = {
      loading: false,
      notEndCnt: trackLen,
      pendingInitCnt: trackLen,
      reader: this.MF.reader,
      isMseEnd: false,
    }

    this.Mp4Info.tracks.forEach((track: any) => {
      this.setSegmentOptions(track, shared)
    })
  }

  // 初始化MF segment
  initializeSegmentation() {
    this.MF.initializeSegmentation().forEach((seg: any) => {
      const ctx = seg.user
      if (ctx.sourceBuffer.updating) {
        ctx.pending.push({ isInit: true, buffer: seg.buffer })
      } else {
        ctx.sourceBuffer.appendBuffer(seg.buffer)
        ctx.pending.push({ isInit: true })
      }
    })
  }

  // 设置轨道segment
  setSegmentOptions(track: any, shared: any) {
    const sourceBuffer = this.SourceBuffers.find((item) => item.codec === track.codec)!.sourceBuffer
    const ctx = {
      sourceBuffer,
      id: track.id,
      pending: [],
      shared,
    }
    sourceBuffer.onerror = (e) => console.error(e)
    sourceBuffer.onupdateend = () => this.updateEnd(ctx)
    this.MF.setSegmentOptions(track.id, ctx)
  }

  // 注入sourceBuffer完成
  updateEnd(ctx: any) {
    if (ctx.sourceBuffer.updating || this.MS.readyState !== 'open') return

    const seg = ctx.pending.shift()

    if (seg && seg.isInit) {
      ctx.shared.pendingInitCnt--
      if (seg.buffer) {
        ctx.sourceBuffer.appendBuffer(seg.buffer)
      }
    }

    if (ctx.shared.pendingInitCnt === 0 && !ctx.shared.loading) {
      ctx.shared.loading = true
      this.loadMediaData()
      return
    }

    if (ctx.isEof) {
      ctx.shared.notEndCnt--
    }

    if (ctx.shared.notEndCnt === 0 && !ctx.shared.isMSEnd) {
      if (ctx.sampleNum) {
        this.MF.releaseUsedSamples(ctx.id, ctx.sampleNum)
        ctx.sampleNum = null
      }

      ctx.shared.isMSEnd = true
      this.onComplete && this.onComplete()
      // if (this.SourceBuffers.every((item) => !item.sourceBuffer.updating)) {
      //   this.MS.endOfStream()
      //   this.onComplete && this.onComplete()
      // }

      this.el.currentTime = 0
      this.el.play()
    }

    if (seg && !seg.isInit) {
      ctx.sampleNum = seg.sampleNum
      ctx.isEof = seg.isEnd
      ctx.sourceBuffer.appendBuffer(seg.buffer)
    }
  }

  // 读取mp4文件配置
  loadMediaData() {
    this.MF.reader.chunkStart = this.MF.seek(0, true).offset
    this.MF.start()
    this.MF.reader.resume()
  }
}
