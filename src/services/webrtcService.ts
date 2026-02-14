import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface WebRTCOffer {
  type: 'offer';
  sdp: string;
}

export interface WebRTCAnswer {
  type: 'answer';
  sdp: string;
}

export interface WebRTCIceCandidate {
  type: 'candidate';
  candidate: RTCIceCandidateInit;
}

export const webrtcService = {
  // Create peer connection
  createPeerConnection(
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onTrack: (stream: MediaStream) => void
  ): RTCPeerConnection {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 10,
    };

    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Local ICE candidate generated');
        onIceCandidate(event.candidate);
      } else {
        console.log('ICE candidate gathering completed');
      }
    };

    pc.ontrack = (event) => {
      console.log('Track received:', event.track.kind);
      if (event.streams && event.streams[0]) {
        onTrack(event.streams[0]);
      } else if (event.track) {
        // Create a new stream from the track
        const stream = new MediaStream([event.track]);
        onTrack(stream);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
    };

    return pc;
  },

  // Create offer
  async createOffer(pc: RTCPeerConnection, localStream: MediaStream): Promise<RTCSessionDescriptionInit> {
    // Проверяем, не добавлены ли уже треки
    const existingTracks = pc.getSenders().map(sender => sender.track);
    localStream.getTracks().forEach((track) => {
      if (!existingTracks.includes(track)) {
        pc.addTrack(track, localStream);
      }
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  },

  // Create answer
  async createAnswer(
    pc: RTCPeerConnection,
    localStream: MediaStream,
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    // Проверяем, не добавлены ли уже треки
    const existingTracks = pc.getSenders().map(sender => sender.track);
    localStream.getTracks().forEach((track) => {
      if (!existingTracks.includes(track)) {
        pc.addTrack(track, localStream);
      }
    });

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  },

  // Set remote description
  async setRemoteDescription(pc: RTCPeerConnection, description: RTCSessionDescriptionInit) {
    await pc.setRemoteDescription(new RTCSessionDescription(description));
  },

  // Add ice candidate
  async addIceCandidate(pc: RTCPeerConnection, candidate: RTCIceCandidateInit): Promise<boolean> {
    try {
      // Check if candidate is valid
      if (!candidate || !candidate.candidate) {
        return false;
      }

      // Check if remote description is set
      if (!pc.remoteDescription) {
        console.log('Remote description not set yet, candidate will be queued');
        return false;
      }

      // Check if connection is still valid
      if (pc.connectionState === 'closed' || pc.signalingState === 'closed') {
        console.warn('Peer connection is closed, cannot add ICE candidate');
        return false;
      }

      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      return true;
    } catch (error: any) {
      // Ignore errors for invalid/duplicate candidates
      if (error.name === 'OperationError' || error.name === 'InvalidStateError' || error.name === 'TypeError') {
        console.warn('Cannot add ICE candidate:', error.message);
      } else {
        console.error('Error adding ICE candidate:', error);
      }
      return false;
    }
  },

  // Exchange signaling data via Firestore
  async sendOffer(callId: string, offer: RTCSessionDescriptionInit) {
    await setDoc(
      doc(db, 'calls', callId),
      { offer: JSON.stringify(offer) },
      { merge: true }
    );
  },

  async sendAnswer(callId: string, answer: RTCSessionDescriptionInit) {
    await setDoc(
      doc(db, 'calls', callId),
      { answer: JSON.stringify(answer) },
      { merge: true }
    );
  },

  async sendIceCandidate(callId: string, candidate: RTCIceCandidateInit, userId: string) {
    const candidatesRef = doc(db, 'calls', callId, 'candidates', userId);
    await setDoc(candidatesRef, {
      candidate: JSON.stringify(candidate),
      timestamp: Date.now(),
    }, { merge: true });
  },

  // Subscribe to signaling data
  subscribeToSignaling(
    callId: string,
    userId: string,
    otherUserId: string,
    onOffer: (offer: RTCSessionDescriptionInit) => void,
    onAnswer: (answer: RTCSessionDescriptionInit) => void,
    onIceCandidate: (candidate: RTCIceCandidateInit) => void
  ): () => void {
    const callRef = doc(db, 'calls', callId);
    let processedOffer = false;
    let processedAnswer = false;

    const unsubscribeCall = onSnapshot(callRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data();

      // Handle offer
      if (data.offer && !processedOffer) {
        try {
          const offer = JSON.parse(data.offer);
          if (offer.type === 'offer') {
            processedOffer = true;
            onOffer(offer);
          }
        } catch (e) {
          console.error('Error parsing offer:', e);
        }
      }

      // Handle answer
      if (data.answer && !processedAnswer) {
        try {
          const answer = JSON.parse(data.answer);
          if (answer.type === 'answer') {
            processedAnswer = true;
            onAnswer(answer);
          }
        } catch (e) {
          console.error('Error parsing answer:', e);
        }
      }
    });

    // Subscribe to ice candidates from the OTHER user
    const candidatesRef = doc(db, 'calls', callId, 'candidates', otherUserId);
    const unsubscribeCandidates = onSnapshot(candidatesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.candidate) {
          try {
            const candidate = JSON.parse(data.candidate);
            onIceCandidate(candidate);
          } catch (e) {
            console.error('Error parsing candidate:', e);
          }
        }
      }
    });

    // Return cleanup function
    return () => {
      unsubscribeCall();
      unsubscribeCandidates();
    };
  },
};

