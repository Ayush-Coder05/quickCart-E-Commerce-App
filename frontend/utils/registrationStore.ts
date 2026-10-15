export interface PendingRegistration {
  name: string;
  email: string;
  password: string;
  mobile?: string;
}

let memoryRegistration: PendingRegistration | null = null;

export const registrationStore = {
  set(data: PendingRegistration) {
    memoryRegistration = data;
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        sessionStorage.setItem("quickcart_registration", JSON.stringify(data));
      } catch {
        // Ignore session storage errors
      }
    }
  },
  get(): PendingRegistration | null {
    if (memoryRegistration) return memoryRegistration;
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        const raw = sessionStorage.getItem("quickcart_registration");
        if (raw) return JSON.parse(raw);
      } catch {
        // Ignore session storage errors
      }
    }
    return null;
  },
  clear() {
    memoryRegistration = null;
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        sessionStorage.removeItem("quickcart_registration");
      } catch {
        // Ignore session storage errors
      }
    }
  },
};
