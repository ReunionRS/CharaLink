import { collection, addDoc, doc, setDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export type CallType = 'voice' | 'video';

export interface Call {
  id: string;
  callerId: string;
  receiverId: string;
  type: CallType;
  status: 'ringing' | 'answered' | 'rejected' | 'ended';
  startedAt: number;
  endedAt?: number;
}

export const callService = {
  // Initiate a call
  async initiateCall(callerId: string, receiverId: string, type: CallType): Promise<string> {
    const callData = {
      callerId,
      receiverId,
      type,
      status: 'ringing' as const,
      startedAt: Date.now(),
    };

    const callRef = await addDoc(collection(db, 'calls'), callData);
    return callRef.id;
  },

  // Answer a call
  async answerCall(callId: string) {
    await setDoc(
      doc(db, 'calls', callId),
      { status: 'answered' },
      { merge: true }
    );
  },

  // Reject a call
  async rejectCall(callId: string) {
    await setDoc(
      doc(db, 'calls', callId),
      { status: 'rejected', endedAt: Date.now() },
      { merge: true }
    );
  },

  // End a call
  async endCall(callId: string) {
    await setDoc(
      doc(db, 'calls', callId),
      { status: 'ended', endedAt: Date.now() },
      { merge: true }
    );
  },

  // Subscribe to incoming calls
  subscribeToIncomingCalls(userId: string, callback: (call: Call | null) => void) {
    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', userId),
      where('status', '==', 'ringing')
    );

    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const callDoc = snapshot.docs[0];
        callback({
          id: callDoc.id,
          ...callDoc.data(),
        } as Call);
      } else {
        callback(null);
      }
    });
  },

  // Subscribe to active calls
  subscribeToActiveCall(userId: string, callback: (call: Call | null) => void) {
    const q = query(
      collection(db, 'calls'),
      where('status', 'in', ['ringing', 'answered'])
    );

    return onSnapshot(q, (snapshot) => {
      const activeCall = snapshot.docs.find((doc) => {
        const data = doc.data();
        return data.callerId === userId || data.receiverId === userId;
      });

      if (activeCall) {
        callback({
          id: activeCall.id,
          ...activeCall.data(),
        } as Call);
      } else {
        callback(null);
      }
    });
  },
};

