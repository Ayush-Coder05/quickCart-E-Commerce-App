//  utils/stateStore.ts
//
//  Lightweight in-session state store.
//  Persists the detected / selected Indian state for the duration of the
//  current app session (cleared on full app restart - location re-detected
//  automatically, which is desirable for a location-aware app).

import AsyncStorage from '@react-native-async-storage/async-storage';

type StateStoreListener = (state: string | null) => void;

class StateStore {
  private _state: string | null = null;
  private _listeners: Set<StateStoreListener> = new Set();
  private _isHydrated = false;

  constructor() {
    this.hydrate();
  }

  private async hydrate() {
    if (typeof window === "undefined") {
      this._isHydrated = true;
      return;
    }

    try {
      const stored = await AsyncStorage.getItem('@quickcart_selected_state');
      if (stored) {
        this._state = stored;
        this.notify();
      }
    } catch (e) {
      console.log('Failed to hydrate stateStore:', e);
    } finally {
      this._isHydrated = true;
      this.notify();
    }
  }

  get isHydrated(): boolean {
    return this._isHydrated;
  }

  /** Currently selected/detected state. */
  get current(): string | null {
    return this._state;
  }

  /** Returns true if a state has already been set this session. */
  get isSet(): boolean {
    return this._state !== null;
  }

  /**
   * Set the active state and notify all listeners.
   * @param stateName  Canonical Firestore document name (e.g. "Bihar")
   */
  async set(stateName: string): Promise<void> {
    this._state = stateName;
    if (typeof window === "undefined") {
      this.notify();
      return;
    }

    try {
      await AsyncStorage.setItem('@quickcart_selected_state', stateName);
    } catch (e) {
      console.log('Failed to persist stateStore:', e);
    }
    this.notify();
  }

  /** Clear the selected state (e.g. on logout). */
  async clear(): Promise<void> {
    this._state = null;
    if (typeof window === "undefined") {
      this.notify();
      return;
    }

    try {
      await AsyncStorage.removeItem('@quickcart_selected_state');
    } catch (e) {
      console.log('Failed to clear stateStore:', e);
    }
    this.notify();
  }

  private notify() {
    this._listeners.forEach((fn) => fn(this._state));
  }

  /**
   * Subscribe to state changes.
   * @returns Unsubscribe function
   */
  subscribe(listener: StateStoreListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }
}

/** Singleton instance - import this anywhere in the app. */
export const stateStore = new StateStore();
