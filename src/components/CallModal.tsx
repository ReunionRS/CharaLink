import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { callService, Call } from '../services/callService';
import { webrtcService } from '../services/webrtcService';
import { authService } from '../services/authService';
import { imageUtils } from '../utils/imageUtils';
import './CallModal.css';

interface CallModalProps {
  call: Call;
  onAnswer: () => void;
  onReject: () => void;
  onEnd: () => void;
}

const CallModal: React.FC<CallModalProps> = ({ call, onAnswer, onReject, onEnd }) => {
  const { user } = useAuth();
  const [otherUser, setOtherUser] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingUnsubscribeRef = useRef<(() => void)[]>([]);
  const offerProcessedRef = useRef(false);
  const answerProcessedRef = useRef(false);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const connectionStateRef = useRef<string>('new');

  const isCaller = call.callerId === user?.uid;
  const otherUserId = isCaller ? call.receiverId : call.callerId;

  useEffect(() => {
    if (otherUserId) {
      authService.getUserProfile(otherUserId).then(setOtherUser);
    }
  }, [otherUserId]);

  useEffect(() => {
    if (call.status === 'answered') {
      // Небольшая задержка для синхронизации
      const timer = setTimeout(() => {
        startWebRTC();
      }, 500);
      
      return () => {
        clearTimeout(timer);
        cleanup();
      };
    }

    return () => {
      cleanup();
    };
  }, [call.status, call.id, isCaller, otherUserId]);

  // Обновляем аудио элемент при изменении remote stream
  useEffect(() => {
    if (remoteStream && call.type === 'voice' && remoteAudioRef.current) {
      const audioTracks = remoteStream.getAudioTracks();
      console.log('Setting remote audio stream, audio tracks:', audioTracks.length);
      console.log('Track details:', audioTracks.map(t => ({
        id: t.id,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState,
        kind: t.kind
      })));
      
      // Убедимся, что треки включены и не заглушены
      audioTracks.forEach(track => {
        if (!track.enabled) {
          console.log('Enabling audio track');
          track.enabled = true;
        }
        if (track.muted) {
          console.warn('Audio track is muted!');
        }
      });
      
      remoteAudioRef.current.srcObject = remoteStream;
      
      // Принудительное воспроизведение с несколькими попытками
      const playAudio = async (attempts = 0) => {
        try {
          if (remoteAudioRef.current) {
            // Проверяем состояние элемента
            console.log('Audio element state:', {
              readyState: remoteAudioRef.current.readyState,
              paused: remoteAudioRef.current.paused,
              muted: remoteAudioRef.current.muted,
              volume: remoteAudioRef.current.volume
            });
            
            // Убедимся, что элемент не заглушен и громкость установлена
            remoteAudioRef.current.muted = false;
            remoteAudioRef.current.volume = 1.0;
            
            await remoteAudioRef.current.play();
            console.log('Remote audio playing successfully!');
            console.log('Audio element after play:', {
              paused: remoteAudioRef.current.paused,
              currentTime: remoteAudioRef.current.currentTime
            });
          }
        } catch (error: any) {
          console.error(`Error playing remote audio (attempt ${attempts + 1}):`, error);
          if (attempts < 5) {
            setTimeout(() => playAudio(attempts + 1), 1000);
          } else {
            console.error('Failed to play audio after multiple attempts');
          }
        }
      };
      
      // Небольшая задержка перед воспроизведением
      setTimeout(() => playAudio(), 300);
    }
  }, [remoteStream, call.type]);

  const cleanup = () => {
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Unsubscribe from signaling
    signalingUnsubscribeRef.current.forEach(unsub => unsub());
    signalingUnsubscribeRef.current = [];

    // Reset flags
    offerProcessedRef.current = false;
    answerProcessedRef.current = false;
    pendingIceCandidatesRef.current = [];
  };

  const startWebRTC = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: call.type === 'video',
        audio: true,
      });

      console.log('Got local media stream, tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`));

      setLocalStream(stream);
      
      // Set local video/audio element
      if (call.type === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(e => console.error('Error playing local video:', e));
      }

      // Create peer connection
      const pc = webrtcService.createPeerConnection(
        async (candidate) => {
          // Send ICE candidate
          if (user && candidate) {
            try {
              await webrtcService.sendIceCandidate(call.id, candidate.toJSON(), user.uid);
              console.log('ICE candidate sent');
            } catch (error) {
              console.error('Error sending ICE candidate:', error);
            }
          }
        },
        (stream) => {
          // Receive remote stream
          const tracks = stream.getTracks();
          console.log('Received remote stream with tracks:', tracks.map(t => `${t.kind}:${t.enabled ? 'enabled' : 'disabled'}:${t.muted ? 'muted' : 'unmuted'}:${t.readyState}`));
          setRemoteStream(stream);
          
          // Set video element for video calls
          if (call.type === 'video' && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current.play().catch(e => {
              console.error('Error playing remote video:', e);
              setTimeout(() => remoteVideoRef.current?.play().catch(console.error), 500);
            });
          }
          
          // Set audio element for voice calls
          if (call.type === 'voice' && remoteAudioRef.current) {
            const audioTracks = stream.getAudioTracks();
            console.log('Setting remote audio in onTrack, tracks:', audioTracks.length);
            
            // Убедимся, что треки включены
            audioTracks.forEach(track => {
              console.log(`Audio track: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
              if (!track.enabled) {
                track.enabled = true;
                console.log('Enabled audio track');
              }
              if (track.muted) {
                console.warn('Audio track is muted!');
              }
            });
            
            remoteAudioRef.current.srcObject = stream;
            remoteAudioRef.current.muted = false;
            remoteAudioRef.current.volume = 1.0;
            
            // Принудительное воспроизведение
            const tryPlay = async () => {
              try {
                if (remoteAudioRef.current) {
                  await remoteAudioRef.current.play();
                  console.log('Remote audio playing from onTrack');
                }
              } catch (e) {
                console.error('Error playing remote audio in onTrack:', e);
                // Попробуем еще раз
                setTimeout(() => {
                  remoteAudioRef.current?.play().catch(console.error);
                }, 500);
              }
            };
            
            // Небольшая задержка для инициализации
            setTimeout(tryPlay, 200);
          }
        }
      );

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        connectionStateRef.current = state;
        console.log('Connection state changed:', state);
        
        if (state === 'connected' || state === 'completed') {
          console.log('WebRTC connection established!');
          
          // Убедимся, что аудио воспроизводится
          if (call.type === 'voice' && remoteAudioRef.current && remoteStream) {
            console.log('Ensuring audio playback after connection established');
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.muted = false;
            remoteAudioRef.current.volume = 1.0;
            remoteAudioRef.current.play().catch(e => {
              console.error('Error playing audio after connection:', e);
              setTimeout(() => {
                remoteAudioRef.current?.play().catch(console.error);
              }, 500);
            });
          }
        } else if (state === 'failed' || state === 'disconnected') {
          console.error('WebRTC connection failed or disconnected');
        }
      };

      // Monitor ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
      };

      // Monitor ICE gathering state
      pc.onicegatheringstatechange = () => {
        console.log('ICE gathering state:', pc.iceGatheringState);
      };

      peerConnectionRef.current = pc;

      // Subscribe to signaling
      const unsub1 = webrtcService.subscribeToSignaling(
        call.id,
        user?.uid || '',
        otherUserId || '',
        async (offer) => {
          // Received offer (as receiver)
          if (!isCaller && stream && !pc.remoteDescription && !offerProcessedRef.current) {
            offerProcessedRef.current = true;
            try {
              console.log('Received offer, creating answer...');
              const answer = await webrtcService.createAnswer(pc, stream, offer);
              await webrtcService.sendAnswer(call.id, answer);
              console.log('Answer sent');
              
              // Process pending ICE candidates
              console.log('Processing', pendingIceCandidatesRef.current.length, 'pending ICE candidates after answer');
              for (const candidate of pendingIceCandidatesRef.current) {
                try {
                  const added = await webrtcService.addIceCandidate(pc, candidate);
                  if (added) {
                    console.log('Pending ICE candidate added');
                  }
                } catch (e) {
                  console.warn('Error adding pending ICE candidate:', e);
                }
              }
              pendingIceCandidatesRef.current = [];
            } catch (error) {
              console.error('Error creating answer:', error);
              offerProcessedRef.current = false;
            }
          }
        },
        async (answer) => {
          // Received answer (as caller)
          if (isCaller && !pc.remoteDescription && !answerProcessedRef.current) {
            answerProcessedRef.current = true;
            try {
              console.log('Received answer, setting remote description...');
              await webrtcService.setRemoteDescription(pc, answer);
              console.log('Remote description set');
              
              // Process pending ICE candidates
              console.log('Processing', pendingIceCandidatesRef.current.length, 'pending ICE candidates after answer');
              for (const candidate of pendingIceCandidatesRef.current) {
                try {
                  const added = await webrtcService.addIceCandidate(pc, candidate);
                  if (added) {
                    console.log('Pending ICE candidate added');
                  }
                } catch (e) {
                  console.warn('Error adding pending ICE candidate:', e);
                }
              }
              pendingIceCandidatesRef.current = [];
            } catch (error) {
              console.error('Error setting remote description:', error);
              answerProcessedRef.current = false;
            }
          }
        },
        async (candidate) => {
          // Received ICE candidate from other user
          try {
            if (pc.remoteDescription) {
              const added = await webrtcService.addIceCandidate(pc, candidate);
              if (added) {
                console.log('ICE candidate added successfully');
              }
            } else {
              // Store candidate if remote description not set yet
              pendingIceCandidatesRef.current.push(candidate);
              console.log('Storing ICE candidate for later, total pending:', pendingIceCandidatesRef.current.length);
            }
          } catch (error) {
            console.error('Error processing ICE candidate:', error);
          }
        }
      );

      signalingUnsubscribeRef.current.push(unsub1);

      if (isCaller) {
        // Create and send offer
        try {
          console.log('Creating offer as caller...');
          const offer = await webrtcService.createOffer(pc, stream);
          await webrtcService.sendOffer(call.id, offer);
          console.log('Offer sent');
        } catch (error) {
          console.error('Error creating offer:', error);
        }
      } else {
        // As receiver, wait for offer
        console.log('Waiting for offer as receiver...');
      }
    } catch (error) {
      console.error('Error starting WebRTC:', error);
      alert('Не удалось получить доступ к камере/микрофону. Проверьте разрешения браузера.');
    }
  };

  const handleAnswer = async () => {
    await callService.answerCall(call.id);
    onAnswer();
  };

  const handleReject = async () => {
    cleanup();
    await callService.rejectCall(call.id);
    onReject();
  };

  const handleEnd = async () => {
    cleanup();
    await callService.endCall(call.id);
    onEnd();
  };

  return (
    <div className="call-modal">
      <div className="call-modal__content">
        {call.status === 'ringing' && !isCaller && (
          <>
            <div className="call-modal__avatar">
              <img
                src={otherUser?.photoURL || imageUtils.generateAvatarUrl(otherUser?.displayName || 'User', '4a9eff')}
                alt={otherUser?.displayName}
              />
            </div>
            <h2 className="call-modal__name">{otherUser?.displayName || 'Пользователь'}</h2>
            <p className="call-modal__type">
              {call.type === 'video' ? 'Видео звонок' : 'Голосовой звонок'}
            </p>
            <div className="call-modal__actions">
              <button className="call-modal__btn call-modal__btn--reject" onClick={handleReject}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>
                </svg>
              </button>
              <button className="call-modal__btn call-modal__btn--answer" onClick={handleAnswer}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
              </button>
            </div>
          </>
        )}

        {call.status === 'answered' && (
          <>
            {call.type === 'video' ? (
              <div className="call-modal__video">
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="call-modal__video-remote"
                  onLoadedMetadata={() => {
                    remoteVideoRef.current?.play().catch(e => console.error('Error playing remote video:', e));
                  }}
                />
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="call-modal__video-local"
                  onLoadedMetadata={() => {
                    localVideoRef.current?.play().catch(e => console.error('Error playing local video:', e));
                  }}
                />
              </div>
            ) : (
              <div className="call-modal__voice">
                {/* Скрытый аудио элемент для воспроизведения удаленного аудио */}
                <audio 
                  ref={remoteAudioRef} 
                  autoPlay 
                  playsInline 
                  style={{ display: 'none' }}
                  onLoadedMetadata={() => {
                    console.log('Audio metadata loaded');
                    if (remoteAudioRef.current) {
                      remoteAudioRef.current.muted = false;
                      remoteAudioRef.current.volume = 1.0;
                      remoteAudioRef.current.play().catch(e => console.error('Error playing audio on metadata:', e));
                    }
                  }}
                  onCanPlay={() => {
                    console.log('Audio can play');
                    if (remoteAudioRef.current) {
                      remoteAudioRef.current.muted = false;
                      remoteAudioRef.current.volume = 1.0;
                      remoteAudioRef.current.play().catch(e => console.error('Error playing audio on canplay:', e));
                    }
                  }}
                  onPlay={() => {
                    console.log('Audio started playing!');
                  }}
                />
                <div className="call-modal__avatar call-modal__avatar--large">
                  <img
                    src={otherUser?.photoURL || imageUtils.generateAvatarUrl(otherUser?.displayName || 'User', '4a9eff')}
                    alt={otherUser?.displayName}
                  />
                </div>
                <h2 className="call-modal__name">{otherUser?.displayName || 'Пользователь'}</h2>
                <p className="call-modal__status">
                  {connectionStateRef.current === 'connected' ? 'Звонок активен' : 'Идет звонок...'}
                </p>
              </div>
            )}
            <div className="call-modal__actions">
              <button className="call-modal__btn call-modal__btn--end" onClick={handleEnd}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>
                </svg>
              </button>
            </div>
          </>
        )}

        {call.status === 'ringing' && isCaller && (
          <div className="call-modal__ringing">
            <div className="call-modal__avatar">
              <img
                src={otherUser?.photoURL || imageUtils.generateAvatarUrl(otherUser?.displayName || 'User', '4a9eff')}
                alt={otherUser?.displayName}
              />
            </div>
            <h2 className="call-modal__name">{otherUser?.displayName || 'Пользователь'}</h2>
            <p className="call-modal__status">Звонок...</p>
            <button className="call-modal__btn call-modal__btn--end" onClick={handleEnd}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallModal;
