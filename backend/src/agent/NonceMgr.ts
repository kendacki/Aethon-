import { ethers } from "ethers";

export class NonceMgr {
  private nonce: number | null = null;
  private locked = false;
  private queue: Array<() => void> = [];

  constructor(
    private wallet: ethers.Wallet,
    private provider: ethers.JsonRpcProvider
  ) {}

  async acquireNonce(): Promise<number> {
    return new Promise((resolve) => {
      const tryAcquire = async () => {
        if (this.locked) {
          this.queue.push(tryAcquire);
          return;
        }
        this.locked = true;
        if (this.nonce === null) {
          this.nonce = await this.provider.getTransactionCount(this.wallet.address, "pending");
        }
        resolve(this.nonce++);
      };
      tryAcquire();
    });
  }

  release(): void {
    this.locked = false;
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    }
  }

  async resync(): Promise<void> {
    this.nonce = null;
    this.locked = false;
    this.queue = [];
    this.nonce = await this.provider.getTransactionCount(this.wallet.address, "pending");
  }
}
