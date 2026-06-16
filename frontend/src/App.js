import React, { useState } from 'react';
// Using HashRouter behind the scenes makes client-side routing fully compatible with Vercel deployment
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import Workspace from './Workspace';
import './App.css';

function LandingPage() {
  const navigate = useNavigate();
  const [customRoomName, setCustomRoomName] = useState('');

  const createRandomRoom = () => {
    const uniqueRoomId = uuidv4().substring(0, 8); 
    // FIXED: Give the router the plain, direct path. It handles the '#' automatically!
    navigate(`/room/${uniqueRoomId}`);
  };

  const handleJoinCustomRoom = (e) => {
    e.preventDefault();
    if (!customRoomName.trim()) return;
    
    const cleanRoomName = customRoomName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-');

    // FIXED: Clean matching path here as well
    navigate(`/room/${cleanRoomName}`);
  };

  return (
    <div className="landing-container">
      <div className="landing-card">
        <h1 style={{ background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800' }}>
          ⚡ CodeSwift Workspace
        </h1>
        <p>No hassle. Instantly generate real-time collaborative text and code spaces with teammates.</p>
        
        <button onClick={createRandomRoom} className="btn-create">
          Create Random Room
        </button>

        <div className="divider"><span>OR</span></div>

        <form onSubmit={handleJoinCustomRoom} className="custom-room-form">
          <input
            type="text"
            id="room-input"
            name="room-input"
            placeholder="Enter custom room name (e.g., lab-group-4)"
            value={customRoomName}
            onChange={(e) => setCustomRoomName(e.target.value)}
            maxLength={25}
            className="room-input"
          />
          <button type="submit" className="btn-join">Join / Create</button>
        </form>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/room/:roomId" element={<Workspace />} />
      </Routes>
    </Router>
  );
}

export default App;