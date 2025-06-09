import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import {
  HMSReactiveStore,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  selectPeers,
  selectIsConnectedToRoom,
  selectVideoTrackByID,
} from '@100mslive/hms-video-store';

// Import the functions you need from the SDKs you need
import {initializeApp} from 'firebase/app';
import {CameraType, CameraView} from 'expo-camera';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyCmObxp7iTlgt6gYSfhC2dqVHEoB2a16BQ',
  authDomain: 'findit-ai-d93c6.firebaseapp.com',
  databaseURL:
    'https://findit-ai-d93c6-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'findit-ai-d93c6',
  storageBucket: 'findit-ai-d93c6.firebasestorage.app',
  messagingSenderId: '669473493302',
  appId: '1:669473493302:web:f23deceadadbef92b9a397',
  measurementId: 'G-G9KQLTWJE2',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize HMS Store outside of the component to avoid re-initialization
const hmsManager = new HMSReactiveStore();
hmsManager.triggerOnSubscribe();
const hmsStore = hmsManager.getStore();
const hmsActions = hmsManager.getActions();

/**
 * PeerTile Component: Manages a single peer's video element and its attachment/detachment.
 * This component mimics the original's per-peer subscription logic.
 */
const PeerTile = React.memo(({peer}) => {
  const videoRef = useRef(null); // Ref for THIS peer's video element
  const [videoTrackState, setVideoTrackState] = useState(null); // State to store the track object itself

  // 1. Subscribe to this specific peer's video track changes
  // This useEffect primarily keeps `videoTrackState` updated.
  useEffect(() => {
    const unsubscribe = hmsStore.subscribe(track => {
      setVideoTrackState(track); // Update state with the latest track object
    }, selectVideoTrackByID(peer.videoTrack));

    // Cleanup subscription
    return () => {
      unsubscribe();
    };
  }, [peer.videoTrack, peer.id, peer.name]); // Dependencies: if track ID changes for this peer

  // 2. Separate useEffect for attaching/detaching video, triggered by track state AND ref availability
  useEffect(() => {
    const currentVideoElement = videoRef.current;
    const isVideoEnabled = videoTrackState?.enabled;
    const trackId = videoTrackState?.id;

    if (currentVideoElement && videoTrackState) {
      // Check if element is ready AND track exists
      if (isVideoEnabled) {
        console.log(`Peer ${peer.name}: Attaching video ${trackId}`);
        hmsActions.attachVideo(trackId, currentVideoElement);
      } else {
        console.log(`Peer ${peer.name}: Detaching video ${trackId}`);
        hmsActions.detachVideo(trackId, currentVideoElement);
      }
    }

    // Cleanup function: This runs when the component unmounts,
    // or before the effect re-runs (if dependencies change).
    // It ensures video is detached when the video element is about to be removed.
    return () => {
      if (currentVideoElement && trackId) {
        // Check if element exists before detaching
        console.log(`Peer ${peer.name}: Cleanup - Detaching video ${trackId}`);
        hmsActions.detachVideo(trackId, currentVideoElement);
      }
    };
  }, [videoTrackState, peer.id, peer.name]); // Dependencies: track state changes, OR videoRef.current becomes available/changes

  const isLocal = peer.isLocal;
  const videoStyles = StyleSheet.flatten([
    styles.peerVideo,
    isLocal && styles.localPeerVideo,
  ]);

  return (
    <View key={peer.id} style={styles.peerTile}>
      {/* Conditionally render based on videoTrackState?.enabled */}
      {videoTrackState?.enabled ? (
        <video
          ref={videoRef} // Assign the ref to the video element
          autoPlay
          muted={isLocal ? true : false} // Mute local video by default
          playsInline
          style={videoStyles}
        />
      ) : (
        <View style={[styles.peerVideo, styles.noVideoPlaceholder]}>
          <Text style={styles.noVideoText}>No Video</Text>
        </View>
      )}
      <Text style={styles.peerName}>{peer.name}</Text>
    </View>
  );
});

// Main App Component
const App = () => {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [peers, setPeers] = useState([]);
  const [facing, setFacing] = useState<CameraType>('back');

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  // Listen to connection state
  useEffect(() => {
    const unsubscribe = hmsStore.subscribe(connected => {
      setIsConnected(connected);
      if (!connected) {
        // Clear peers on disconnect
        setPeers([]);
      }
    }, selectIsConnectedToRoom);
    return unsubscribe;
  }, []);

  // Listen to local audio/video enabled state (for button text)
  useEffect(() => {
    const unsubscribeAudio = hmsStore.subscribe(
      enabled => setLocalAudioEnabled(enabled),
      selectIsLocalAudioEnabled,
    );
    const unsubscribeVideo = hmsStore.subscribe(
      enabled => setLocalVideoEnabled(enabled),
      selectIsLocalVideoEnabled,
    );
    return () => {
      unsubscribeAudio();
      unsubscribeVideo();
    };
  }, []);

  // Subscribe to the overall peer list
  useEffect(() => {
    const unsubscribePeers = hmsStore.subscribe(currentPeers => {
      console.log(
        'Peers list updated:',
        currentPeers.map(p => p.name),
      );
      setPeers(currentPeers);
    }, selectPeers);

    return () => {
      unsubscribePeers();
    };
  }, []);

  const handleJoin = async () => {
    if (!username || !roomCode) {
      Alert.alert('Please enter your name and room code.');
      return;
    }
    try {
      const authToken = await hmsActions.getAuthTokenByRoomCode({roomCode});
      await hmsActions.join({
        userName: username,
        authToken: authToken,
      });
    } catch (error) {
      console.error('Failed to join room:', error);
      Alert.alert(`Failed to join room: ${error.message}`);
    }
  };

  const handleLeave = async () => {
    await hmsActions.leave();
  };

  const toggleAudio = async () => {
    await hmsActions.setLocalAudioEnabled(!localAudioEnabled);
  };

  const toggleVideo = async () => {
    await hmsActions.setLocalVideoEnabled(!localVideoEnabled);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={{uri: 'https://www.100ms.live/assets/logo.svg'}}
          style={styles.logo}
        />
        {isConnected && (
          <TouchableOpacity onPress={handleLeave} style={styles.btnDanger}>
            <Text style={styles.btnDangerText}>Leave Room</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Join Form / Conference Section */}
      {!isConnected ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Join Room</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="#aaa"
              value={username}
              onChangeText={setUsername}
            />
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Room code"
              placeholderTextColor="#aaa"
              value={roomCode}
              onChangeText={setRoomCode}
            />
          </View>
          <TouchableOpacity onPress={handleJoin} style={styles.btnPrimary}>
            <Text style={styles.btnPrimaryText}>Join</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.conferenceSection}>
          <Text style={styles.conferenceTitle}>Conference</Text>
          <View style={styles.peersContainer}>
            {/* Render PeerTile components for each peer */}
            {peers.map(peer => (
              <PeerTile key={peer.id} peer={peer} />
            ))}
          </View>
        </View>
      )}
      <CameraView style={styles.camera} facing={facing}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Text style={styles.text}>Flip Camera</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
      {/* Control Bar */}
      {isConnected && (
        <View style={styles.controlBar}>
          <TouchableOpacity onPress={toggleAudio} style={styles.btnControl}>
            <Text style={styles.btnControlText}>
              {localAudioEnabled ? 'Mute' : 'Unmute'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleVideo} style={styles.btnControl}>
            <Text style={styles.btnControlText}>
              {localVideoEnabled ? 'Hide' : 'Unhide'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#263238',
  },
  header: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-end', // Equivalent to align-items: end
    justifyContent: 'space-between',
  },
  logo: {
    width: 100, // Adjust size as needed
    height: 40, // Adjust size as needed
    resizeMode: 'contain', // Keep aspect ratio
  },
  btnDanger: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#f44336',
  },
  btnDangerText: {
    color: 'white',
    fontSize: 14,
  },
  form: {
    maxWidth: 450,
    marginVertical: 30,
    marginHorizontal: 'auto', // For centering on web
    shadowColor: 'rgba(0, 0, 0, 0.4)', // box-shadow
    shadowOffset: {width: 0, height: 20},
    shadowOpacity: 1,
    shadowRadius: 40,
    borderRadius: 8,
    padding: 20,
  },
  input: {
    display: 'flex', // block
    width: '100%',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    height: 34,
    padding: 5,
    backgroundColor: '#37474f',
    color: 'white',
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  btnPrimary: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#1565c0',
    alignItems: 'center', // Center text
  },
  btnPrimaryText: {
    color: 'white',
    fontSize: 14,
  },
  formTitle: {
    marginBottom: 20,
    color: 'white',
    fontSize: 24,
    textAlign: 'center', // Center title
  },
  conferenceSection: {
    paddingVertical: 20,
    paddingHorizontal: 30,
    maxWidth: 960,
    marginHorizontal: 'auto', // For centering on web
  },
  conferenceTitle: {
    textAlign: 'center',
    fontSize: 32,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#546e7a',
    marginBottom: 20,
    color: 'white',
  },
  peersContainer: {
    flex: 1, // Allow peers container to take available space
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  peerVideo: {
    flex: 1, // Occupy whole area within its container
    width: '100%', // Ensure it takes full width of its container
    height: '100%', // Ensure it takes full height of its container
    borderRadius: 8, // Small border radius
    objectFit: 'cover',
    backgroundColor: 'black', // fallback background
  },
  localPeerVideo: {
    transform: 'scaleX(-1)',
  },
  noVideoPlaceholder: {
    flex: 1, // Occupy whole area within its container
    width: '100%', // Ensure it takes full width of its container
    height: '100%', // Ensure it takes full height of its container
    borderRadius: 8, // Small border radius
    backgroundColor: '#546e7a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noVideoText: {
    color: 'white',
    fontSize: 18,
  },
  peerName: {
    fontSize: 14,
    textAlign: 'center',
    color: 'white',
    marginTop: 5, // Add some space above the name
  },
  peerTile: {
    flex: 1, // Allow each peer tile to take available space
    minWidth: 300, // Minimum width for each video tile
    maxWidth: '50%', // Max width to allow two videos side-by-side
    aspectRatio: 16 / 9, // Maintain aspect ratio for video
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center', // Center content vertically
    backgroundColor: '#37474f', // Background for the tile
    borderRadius: 8,
    overflow: 'hidden', // Hide overflow for rounded corners
  },
  controlBar: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 15,
    justifyContent: 'center',
    zIndex: 10,
  },
  btnControl: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderWidth: 2,
    borderColor: '#37474f',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#607d8b',
    shadowColor: 'rgba(0, 0, 0, 0.4)',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
    marginHorizontal: 4,
  },
  btnControlText: {
    color: 'white',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default App;
