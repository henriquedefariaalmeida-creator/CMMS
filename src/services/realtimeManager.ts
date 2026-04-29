import { 
  collection, 
  onSnapshot, 
  query, 
  where
} from 'firebase/firestore';
import { db } from '../firebase-init';
import { handleFirestoreError, OperationType } from './errorHandler';

type Callback<T> = (data: T[]) => void;

interface ListenerInfo<T> {
  unsubscribe: () => void;
  data: T[];
  subscribers: Set<Callback<T>>;
}

class RealtimeManager {
  private listeners: Map<string, ListenerInfo<any>> = new Map();

  /**
   * Subscribes to a collection in real-time.
   * If a listener for the collection already exists, it reuses it.
   * 
   * @param collectionName The name of the collection
   * @param setState The state setter function to receive updates
   * @param userId Optional user ID for filtered subscriptions
   */
  subscribe<T>(collectionName: string, setState: Callback<T>, userId?: string) {
    const key = userId ? `${collectionName}:${userId}` : collectionName;
    
    let info = this.listeners.get(key);

    if (!info) {
      let q = query(collection(db, collectionName));
      if (userId) {
        q = query(collection(db, collectionName), where('userId', '==', userId));
      }

      const subscribers = new Set<Callback<T>>();
      subscribers.add(setState);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as unknown as T));
        const currentInfo = this.listeners.get(key);
        if (currentInfo) {
          currentInfo.data = data;
          currentInfo.subscribers.forEach(cb => cb(data));
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, key);
      });

      info = { unsubscribe, data: [], subscribers };
      this.listeners.set(key, info);
    } else {
      info.subscribers.add(setState);
      // Immediately provide current data if available
      if (info.data.length > 0) {
        setState(info.data);
      }
    }

    // Return unsubscribe function for this specific subscriber
    return () => {
      const currentInfo = this.listeners.get(key);
      if (currentInfo) {
        currentInfo.subscribers.delete(setState);
        if (currentInfo.subscribers.size === 0) {
          currentInfo.unsubscribe();
          this.listeners.delete(key);
        }
      }
    };
  }
}

export const realtimeManager = new RealtimeManager();
