export enum STATUS {
  READING = 'reading',
  PAUSE = 'pause',
  STOP = 'stop',
  NONE = 'none',
}

export interface ExArrayBuffer extends ArrayBuffer {
  fileStart?: number
}

export interface ReaderOption {
  chunkStart?: number
  chunkSize?: number
  total?: number
  onChunk?: (e: { bytes: ExArrayBuffer; isEof: boolean; total: number }) => void
}

type SuccessCB = (end: number, bytes: ExArrayBuffer, total: number) => void

// TODO 是否做缓存
export class Reader {
  url: string
  status: string
  fetcher: AbortController | null

  constructor(public onChunk: Function, public chunkStart = 100 * 1024, public chunkSize = 300 * 1024, public total = 0) {
    this.status = STATUS.NONE
    this.fetcher = null
    this.url = ''
  }

  start(url: string) {
    this.url = url
    this.chunkStart = 0
    this.total = this.chunkStart + this.chunkSize - 1
    this.fetcher = null
    this.status = STATUS.READING
    this.loadchunk()
  }

  resume() {
    if (this.status === STATUS.READING) return
    this.status = STATUS.READING
    this.loadchunk()
  }

  stop() {
    this.status = STATUS.STOP
    if (!this.fetcher) return
    this.fetcher.abort()
    this.fetcher = null
  }

  loadchunk() {
    if (this.fetcher) return
    if (this.chunkStart === this.total - 1) return
    this.fetcher = new AbortController()
    this.read((end: number, bytes: ExArrayBuffer, total: number) => {
      const chunkStart_cache = this.chunkStart
      this.chunkStart = end
      this.total = total
      this.fetcher = null
      bytes.fileStart = chunkStart_cache
      const isEof = end === total - 1
      if (isEof) this.status = STATUS.STOP
      this.onChunk({ bytes, isEof, total })

      if (this.status === STATUS.READING) {
        this.loadchunk()
      }
    })
  }

  read(onSuccess: SuccessCB) {
    const end = this.chunkStart + this.chunkSize - 1 > this.total ? this.total : this.chunkStart + this.chunkSize - 1
    if (this.chunkStart === this.total) return
    fetch(this.url, {
      headers: { Range: `bytes=${this.chunkStart}-${end}` },
      signal: this.fetcher?.signal,
    })
      .then(async (res) => {
        const [, , end, total] = res.headers.get('Content-Range')?.match(/(\d+)-(\d+)\/(\d+)/) as RegExpMatchArray
        onSuccess(parseInt(end, 10), await res.arrayBuffer(), parseInt(total, 10))
      })
      .catch((e) => {
        console.log(e)
      })
  }
}
