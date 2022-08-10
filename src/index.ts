import { FetchFMp4 } from "./transform";
import OverlapVideo from "./overlap";

const wURL = window.URL || webkitURL;

export default class NSV {
  MS: MediaSource;
  MF: FetchFMp4 | null;

  constructor(
    public onComplete?: Function,
    public el = document.querySelector("video"),
    public mimeCodec = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
  ) {
    if (!this.el) throw new Error("You need to provide a DOM or id");
    this.MS = new MediaSource();
    this.el.src = wURL.createObjectURL(this.MS);
    this.MS.onsourceopen = () => this.onSourceOpen();
    this.MF = null;
  }

  static isSupport(mimeCodec?: string): boolean {
    if (!window.MediaSource) {
      console.error("The MSE is not supported in the current environment!");
      console.info(
        `You can try the alternate scheme by "import { OverlapVideo } from 'non-switch-video'" or "window.OverlapVideo"`
      );
      return false;
    }
    if (mimeCodec) return MediaSource.isTypeSupported(mimeCodec);
    return true;
  }

  onSourceOpen() {
    wURL.revokeObjectURL(this.el!.src);
    this.MS.onsourceopen = null;
    this.MF = new FetchFMp4(this.MS, this.el!, this.onComplete);
  }

  async append(file: string) {
    this.MF && this.MF.fetchFile(file);
  }
}

export { OverlapVideo };

window.NSV = NSV;
window.OverlapVideo = OverlapVideo;
