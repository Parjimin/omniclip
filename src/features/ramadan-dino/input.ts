export class InputController {
  private jumpQueued = false;
  private crouchHeld = false;
  private holdTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private bound = false;
  private canvas: HTMLCanvasElement | null = null;

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.code === "Space") {
      event.preventDefault();
      this.jumpQueued = true;
    }
    if (event.code === "ArrowDown") {
      this.crouchHeld = true;
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    if (event.code === "ArrowDown") {
      this.crouchHeld = false;
    }
  };

  private onPointerDown = () => {
    this.jumpQueued = true;
    this.clearHoldTimer();
    this.holdTimeoutId = setTimeout(() => {
      this.crouchHeld = true;
    }, 160);
  };

  private onPointerUp = () => {
    this.clearHoldTimer();
    this.crouchHeld = false;
  };

  bind(canvas: HTMLCanvasElement) {
    if (this.bound) {
      return;
    }
    this.bound = true;
    this.canvas = canvas;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerUp);
  }

  unbind() {
    if (!this.bound) {
      return;
    }
    this.bound = false;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    if (this.canvas) {
      this.canvas.removeEventListener("pointerdown", this.onPointerDown);
      this.canvas.removeEventListener("pointerup", this.onPointerUp);
      this.canvas.removeEventListener("pointercancel", this.onPointerUp);
      this.canvas.removeEventListener("pointerleave", this.onPointerUp);
    }
    this.canvas = null;
    this.jumpQueued = false;
    this.crouchHeld = false;
    this.clearHoldTimer();
  }

  consumeJump() {
    const next = this.jumpQueued;
    this.jumpQueued = false;
    return next;
  }

  isCrouchHeld() {
    return this.crouchHeld;
  }

  private clearHoldTimer() {
    if (this.holdTimeoutId) {
      clearTimeout(this.holdTimeoutId);
      this.holdTimeoutId = null;
    }
  }
}
