export default class OverlapVideo {
  idlePlayer: HTMLVideoElement;
  activePlayer: null | HTMLVideoElement;
  isReady: boolean;

  constructor(
    public player1: HTMLVideoElement,
    public player2?: HTMLVideoElement
  ) {
    this.player1.style.position = "absolute";
    this.player1.autoplay = true;
    if (!player2) {
      const node = this.player1.cloneNode(true) as HTMLVideoElement;
      node.setAttribute("id", "overlap__clone-video");
      this.player2 = this.player1.parentNode?.insertBefore(node, this.player1);
    }

    if (player1 === player2) throw new Error("Cannot be the same video DOM");
    this.idlePlayer = player1;
    this.activePlayer = null;
    this.isReady = false;
  }

  append(url: string, cb?: (activePlayer: HTMLVideoElement) => void) {
    this.idlePlayer.src = url;
    this.player1.pause();
    this.player2!.pause();

    if (this.idlePlayer === this.player1) {
      this.player1.oncanplaythrough = () => {
        this.player1.oncanplaythrough = null;
        this.isReady = true;

        this.switchToPlayer1();
        cb && cb(this.player1);
      };
    } else {
      this.player2!.oncanplaythrough = () => {
        this.player2!.oncanplaythrough = null;
        this.isReady = true;

        this.switchToPlayer2();
        cb && cb(this.player2!);
      };
    }
  }

  switchToPlayer1() {
    this.activePlayer = this.player1;
    this.idlePlayer = this.player2!;
    this.player1.style.visibility = "visible";
    this.player2!.style.visibility = "hidden";
    this.player1.play();
  }

  switchToPlayer2() {
    this.activePlayer = this.player2!;
    this.idlePlayer = this.player1;
    this.player2!.style.visibility = "visible";
    this.player1.style.visibility = "hidden";
    this.player2!.play();
  }

  pause() {
    this.activePlayer?.pause();
  }

  getActivePlayer() {
    return this.activePlayer;
  }

  getIdlePlayer() {
    return this.idlePlayer;
  }

  getIsReady() {
    return this.isReady;
  }
}
