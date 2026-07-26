import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirestoreProduct } from '../services/firestoreService';

const canUseClientStorage = typeof window !== 'undefined';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  emoji?: string;
  imageUrl?: string;
  label?: string;
  quantity: number;
  updatedAt?: number;
}

type CartListener = (items: CartItem[]) => void;

class CartStore {
  private _items: CartItem[] = [];
  private _listeners: Set<CartListener> = new Set();
  private _isHydrated = false;

  constructor() {
    this.hydrate();
  }

  private async hydrate() {
    if (!canUseClientStorage) {
      this._isHydrated = true;
      return;
    }

    try {
      const stored = await AsyncStorage.getItem('@quickcart_cart');
      if (stored) {
        this._items = JSON.parse(stored);
        this.notify();
      }
    } catch (e) {
      console.log('Failed to hydrate cart:', e);
    } finally {
      this._isHydrated = true;
    }
  }

  get items(): CartItem[] {
    return this._items;
  }

  get totalItems(): number {
    return this._items.reduce((sum, item) => sum + item.quantity, 0);
  }

  get totalPrice(): number {
    return this._items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  getItemQuantity(id: string): number {
    return this._items.find(i => i.id === id)?.quantity || 0;
  }

  async add(product: FirestoreProduct) {
    const existing = this._items.find(i => i.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this._items.push({
        id: product.id,
        title: product.title,
        price: product.price ?? 0,
        emoji: product.emoji,
        imageUrl: product.imageUrl,
        label: product.label,
        quantity: 1,
        updatedAt: product.updatedAt
      });
    }
    await this.persist();
  }

  /**
   * Increase qty of an already-in-cart item by ID.
   * Used by CartItemRow so we don't need a full FirestoreProduct object.
   */
  async increaseQty(id: string) {
    const existing = this._items.find(i => i.id === id);
    if (existing) {
      existing.quantity += 1;
      await this.persist();
    }
  }

  async remove(id: string) {
    const existingIndex = this._items.findIndex(i => i.id === id);
    if (existingIndex > -1) {
      const existing = this._items[existingIndex];
      if (existing.quantity > 1) {
        existing.quantity -= 1;
      } else {
        this._items.splice(existingIndex, 1);
      }
      await this.persist();
    }
  }

  async clear() {
    this._items = [];
    await this.persist();
  }

  /** Fully remove an item from cart regardless of quantity (used by trash button). */
  async deleteItem(id: string) {
    this._items = this._items.filter(i => i.id !== id);
    await this.persist();
  }

  private async persist() {
    this.notify();
    if (!canUseClientStorage) return;

    try {
      await AsyncStorage.setItem('@quickcart_cart', JSON.stringify(this._items));
    } catch (e) {
      console.log('Failed to persist cart:', e);
    }
  }

  async syncWithProducts(liveProducts: FirestoreProduct[]) {
    let changed = false;
    const liveMap = new Map(liveProducts.map(p => [p.id, p]));

    const newItems = this._items.filter(item => {
      const liveProduct = liveMap.get(item.id);
      
      // If deleted from firestore, or became out of stock, remove from cart
      if (!liveProduct || liveProduct.availability === "out_of_stock") {
        changed = true;
        return false;
      }
      
      // If price or image or title changed, update it
      if (
        item.price !== (liveProduct.price ?? 0) ||
        item.imageUrl !== liveProduct.imageUrl ||
        item.title !== liveProduct.title ||
        item.updatedAt !== liveProduct.updatedAt
      ) {
        item.price = liveProduct.price ?? 0;
        item.imageUrl = liveProduct.imageUrl;
        item.title = liveProduct.title;
        item.updatedAt = liveProduct.updatedAt;
        changed = true;
      }
      
      return true;
    });

    if (changed) {
      this._items = newItems;
      await this.persist();
    }
  }

  private notify() {
    this._listeners.forEach((fn) => fn([...this._items]));
  }

  subscribe(listener: CartListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }
}

export const cartStore = new CartStore();



