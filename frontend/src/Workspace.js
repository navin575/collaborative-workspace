import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, get, remove, update } from 'firebase/database';

// Your authentic Firebase Web App Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJbKb1-aHVRRTsS1U_h5jZ9wcfJ_Quh-E",
  authDomain: "collaborative-notepad-c6d84.firebaseapp.com",
  databaseURL: "https://collaborative-notepad-c6d84-default-rtdb.asia-southeast1.firebasedatabase.app", 
  projectId: "collaborative-notepad-c6d84",
  storageBucket: "collaborative-notepad-c6d84.firebasestorage.app",
  messagingSenderId: "446578856728",
  appId: "1:446578856728:web:44eec04f4ef94b72eb846d"
};

// Initialize Firebase Core and Realtime Database references
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function Workspace() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState('// Welcome to your common collaborative workspace!\n// Paste notes, code snippets, logs, or plain text here...');
  
  // Storage Expiry Control States
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Run Lifecycle Check Once on Page Mount
  useEffect(() => {
    const roomRootRef = ref(db, `rooms/${roomId}`);

    get(roomRootRef).then((snapshot) => {
      if (snapshot.exists()) {
        const roomData = snapshot.val();
        
        if (roomData.lastUpdatedAt) {
          const twentyFourHours = 24 * 60 * 60 * 1000; // Milliseconds in a day
          const timeDifference = Date.now() - roomData.lastUpdatedAt;

          // If the room hasn't been active for 24 hours, perform deletion cleanup
          if (timeDifference > twentyFourHours) {
            remove(roomRootRef);
            setIsExpired(true);
            setLoading(false);
            return;
          }
        }
      }
      setLoading(false);
    }).catch((err) => {
      console.error("Error running lifecycle assessment:", err);
      setLoading(false);
    });
  }, [roomId]);

  // 2. Main Real-time Connection Pipelines (Text Document Only)
  useEffect(() => {
    if (isExpired || loading) return; // Block active listeners if room is loading or dead

    const codeRef = ref(db, `rooms/${roomId}/code`);

    // Listen for real-time text document changes across the cloud pipeline
    const unsubscribeCode = onValue(codeRef, (snapshot) => {
      const data = snapshot.val();
      if (data !== null) setCode(data);
    });

    return () => {
      unsubscribeCode();
    };
  }, [roomId, isExpired, loading]);

  // Unified activity pulse function to bump the room's heartbeat timestamp node
  const bumpHeartbeat = () => {
    update(ref(db, `rooms/${roomId}`), {
      lastUpdatedAt: Date.now()
    });
  };

  const handleEditorChange = (value) => {
    setCode(value);
    set(ref(db, `rooms/${roomId}/code`), value);
    bumpHeartbeat(); // Register room activity on keystrokes
  };

  const downloadNotes = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const blobUrl = URL.createObjectURL(blob);
    const tempLink = document.createElement('a');
    tempLink.href = blobUrl;
    tempLink.download = `${roomId}-shared-notes.txt`;
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
    URL.revokeObjectURL(blobUrl);
  };

  // Render Loader screen while async lifecycle check resolves
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#1e1e1e', color: '#38bdf8', fontFamily: 'sans-serif', fontSize: '18px' }}>
        ⚡ Assessing workspace authentication lifecycle...
      </div>
    );
  }

  // Render Expiry Fallback UI if the room was wiped due to 24-hour inactivity
  if (isExpired) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f172a', color: '#fff', fontFamily: 'sans-serif', padding: '20px' }}>
        <div style={{ background: '#1e293b', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', maxWidth: '450px', textAlign: 'center', border: '1px solid #334155' }}>
          <h2 style={{ color: '#f43f5e', marginTop: 0, fontSize: '26px' }}>⚠️ Workspace Expired</h2>
          <p style={{ color: '#94a3b8', lineHeight: '1.6', margin: '18px 0 28px 0' }}>
            This collaborative room was automatically deleted because it has been inactive for more than 24 hours. We clean inactive paths to optimize cloud resources.
          </p>
          <button 
            onClick={() => navigate('/')} 
            style={{ background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '6px', fontWeight: '600', fontSize: '15px', cursor: 'pointer', width: '100%' }}
          >
            Create Fresh Room
          </button>
        </div>
      </div>
    );
  }

  // Render Active Working Workspace Structure
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1e1e1e', color: '#fff' }}>
      
      {/* Header Bar */}
      <div style={{ padding: '12px 24px', background: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
        <h3 style={{ margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '700' }}>CODESWIFT</span>
          <span style={{ color: '#334155' }}>|</span>
          <span>Room: <span style={{ color: '#38bdf8' }}>{roomId}</span></span>
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={downloadNotes}
            style={{ background: '#1e293b', color: '#38bdf8', border: '1px solid #334155', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.target.style.background = '#334155'}
            onMouseLeave={(e) => e.target.style.background = '#1e293b'}
          >
            📥 Download Notes
          </button>
        </div>
      </div>

      {/* Main Panel Core Layout (Full Screen Text Editor) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: '100%', background: '#1e1e1e' }}>
          <Editor
            height="100%"
            theme="vs-dark"
            defaultLanguage="plaintext"
            value={code}
            onChange={handleEditorChange}
            options={{ 
              fontSize: 15, 
              automaticLayout: true, 
              minimap: { enabled: false }, 
              wordWrap: "on" 
            }}
          />
        </div>
      </div>
    </div>
  );
}