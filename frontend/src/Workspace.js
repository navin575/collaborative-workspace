import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';

export default function Workspace() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const [code, setCode] = useState('// Welcome to your common collaborative workspace!\n// Paste notes, code snippets, logs, or plain text here...');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const socketRef = useRef(null);

  useEffect(() => {
    // Prompt for nickname
    const promptName = prompt("Enter your display nickname for this room:") || `User-${Math.floor(1000 + Math.random() * 9000)}`;

    // Establish WebSocket connection pipeline straight to Render live hub
    socketRef.current = io("https://codeshift-backend.onrender.com", {
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setLoading(false);
      socket.emit('join-room', { roomId, username: promptName });
    });

    socket.on('code-update', (updatedCode) => {
      if (updatedCode !== null) setCode(updatedCode);
    });

    socket.on('user-list-update', (currentUsers) => {
      if (currentUsers) setUsers(currentUsers);
    });

    socket.on('connect_error', (err) => {
      console.warn("Connection optimization fallback rolling over...", err.message);
      // Fallback loader clearance if direct websocket fails to prevent infinite freeze
      setLoading(false); 
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  const handleEditorChange = (value) => {
    if (value === undefined) return;
    setCode(value);
    
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('code-change', { roomId, code: value });
    }
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#1e1e1e', color: '#38bdf8', fontFamily: 'sans-serif', fontSize: '18px' }}>
        ⚡ Connecting to real-time streaming server on Render...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1e1e1e', color: '#fff', fontFamily: 'sans-serif' }}>
      
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
          <button 
            onClick={() => navigate('/')}
            style={{ background: '#f43f5e', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Main Core Viewport */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, background: '#1e1e1e' }}>
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

        {/* Sidebar Panel */}
        <div style={{ width: '240px', background: '#0f172a', borderLeft: '1px solid #334155', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#94a3b8', textTransform: 'uppercase', fontSize: '13px', fontWeight: '700' }}>
            🟢 Active Peers ({users.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
            {users.map((user) => (
              <div 
                key={user.id} 
                style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '6px', fontSize: '14px', border: '1px solid #334155', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
              >
                👤 {user.username} {user.id === socketRef.current?.id && <span style={{ color: '#38bdf8', fontSize: '11px' }}>(You)</span>}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}