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
    return new Promise((resolve, reject) => {
      const tryAcquire = async () => {
        if (this.locked) {
          this.queue.push(tryAcquire);
          return;
        }
        this.locked = true;
        try {
          const live = await this.provider.getTransactionCount(this.wallet.address, "latest");
          if (this.nonce === null || live > this.nonce) {
            this.nonce = live;
          }
          const val = this.nonce;
          this.nonce++;
          resolve(val);
        } catch (err) {
          this.release();
          reject(err);
        }
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
    this.nonce = await this.provider.getTransactionCount(this.wallet.address, "latest");
  }
}
