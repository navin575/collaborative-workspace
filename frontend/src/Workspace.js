import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';

// Your authentic Firebase Web App Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJbKb1-aHVRRTsS1U_h5jZ9wcfJ_Quh-E",
  authDomain: "collaborative-notepad-c6d84.firebaseapp.com",
  
  /* 🌟 FIXED: Updated path routing to your regional Singapore server */
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
  const [code, setCode] = useState('// Welcome to your common collaborative workspace!\n// Paste notes, code snippets, logs, or plain text here...');
  const [showCanvas, setShowCanvas] = useState(false);
  
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const codeRef = ref(db, `rooms/${roomId}/code`);
    const drawingRef = ref(db, `rooms/${roomId}/drawing`);

    // 1. Listen for real-time text document changes across the cloud pipeline
    const unsubscribeCode = onValue(codeRef, (snapshot) => {
      const data = snapshot.val();
      if (data !== null) setCode(data);
    });

    // 2. Listen for real-time sketchpad vector streams
    const unsubscribeDrawing = onValue(drawingRef, (snapshot) => {
      const data = snapshot.val();
      if (data && !isDrawing.current) {
        drawOnCanvas(data.x, data.y, data.isDrawingState, false);
      }
    });

    return () => {
      unsubscribeCode();
      unsubscribeDrawing();
    };
  }, [roomId]);

  // Recalibrate line formatting properties if sketchpad is toggled
  useEffect(() => {
    if (showCanvas && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
    }
  }, [showCanvas]);

  const handleEditorChange = (value) => {
    setCode(value);
    set(ref(db, `rooms/${roomId}/code`), value);
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

  const drawOnCanvas = (x, y, isDrawingState, updateFirebase = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (!isDrawingState) {
      ctx.beginPath();
      return;
    }

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#00f2fe';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    if (updateFirebase) {
      set(ref(db, `rooms/${roomId}/drawing`), { x, y, isDrawingState });
    }
  };

  const handleMouseDown = () => { isDrawing.current = true; };
  const handleMouseUp = () => { 
    isDrawing.current = false; 
    drawOnCanvas(0, 0, false); 
  };
  
  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    drawOnCanvas(x, y, true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1e1e1e', color: '#fff' }}>
      
      {/* Header Bar */}
      <div style={{ padding: '12px 24px', background: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
        <h3 style={{ margin: 0, fontWeight: 500 }}>Room: <span style={{ color: '#38bdf8' }}>{roomId}</span></h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={downloadNotes}
            style={{ background: '#1e293b', color: '#38bdf8', border: '1px solid #334155', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.target.style.background = '#334155'}
            onMouseLeave={(e) => e.target.style.background = '#1e293b'}
          >
            📥 Download Notes
          </button>

          <button 
            onClick={() => setShowCanvas(!showCanvas)}
            style={{ background: showCanvas ? '#ff5722' : 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
          >
            {showCanvas ? '❌ Hide Sketchpad' : '🎨 Open Sketchpad'}
          </button>
        </div>
      </div>

      {/* Main Panel Core Layout Layout Split */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: showCanvas ? '50%' : '100%', background: '#1e1e1e', transition: 'width 0.15s ease-out' }}>
          <Editor
            height="100%"
            theme="vs-dark"
            defaultLanguage="plaintext"
            value={code}
            onChange={handleEditorChange}
            options={{ fontSize: 15, automaticLayout: true, minimap: { enabled: false }, wordWrap: "on" }}
          />
        </div>

        {showCanvas && (
          <div style={{ width: '50%', display: 'flex', flexDirection: 'column', padding: '20px', background: '#0f172a' }}>
            <h4 style={{ margin: '0 0 12px 0', fontWeight: 500, color: '#94a3b8' }}>Shared Sketchpad / Diagram Canvas</h4>
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              style={{ backgroundColor: '#1e293b', borderRadius: '8px', cursor: 'crosshair', width: '100%', height: '100%', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)' }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
            />
          </div>
        )}
      </div>
    </div>
  );
}