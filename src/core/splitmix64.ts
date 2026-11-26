const MASK_64 = 0xffff_ffff_ffff_ffffn;
const INCREMENT = 0x9e37_79b9_7f4a_7c15n;
const MUL_1 = 0xbf58_476d_1ce4_e5b9n;
const MUL_2 = 0x94d0_49bb_1331_11ebn;

/**
 * 64-bit SplitMix64 PRNG matching Swift's SplitMix64 bit-for-bit using BigInt.
 */
export class SplitMix64 {
  private state: bigint;

  constructor(seed: bigint | number) {
    this.state = BigInt.asUintN(64, BigInt(seed));
  }

  next(): bigint {
    this.state = BigInt.asUintN(64, this.state + INCREMENT);
    let z = this.state;
    z = BigInt.asUintN(64, (z ^ (z >> 30n)) * MUL_1);
    z = BigInt.asUintN(64, (z ^ (z >> 27n)) * MUL_2);
    return BigInt.asUintN(64, z ^ (z >> 31n));
  }

  /**
   * Lemire's bounded random matching Swift's RandomNumberGenerator.next(upperBound: UInt64).
   */
  nextUpperBound(upperBound: number): number {
    const bound = BigInt(upperBound);
    if (bound <= 1n) return 0;

    let value = this.next();
    let product = value * bound;
    let low = product & MASK_64;

    if (low < bound) {
      const threshold = (MASK_64 - bound + 1n) % bound;
      while (low < threshold) {
        value = this.next();
        product = value * bound;
        low = product & MASK_64;
      }
    }

    return Number(product >> 64n);
  }
}

/**
 * Fisher-Yates shuffle matching Swift's Collection.shuffled(using:) (forward pass).
 */
export function swiftShuffled<T>(items: readonly T[], rng: SplitMix64): T[] {
  const arr = [...items];
  for (let i = 0; i < arr.length - 1; i++) {
    const remaining = arr.length - i;
    const offset = rng.nextUpperBound(remaining);
    const j = i + offset;
    if (i !== j) {
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }
  return arr;
}
