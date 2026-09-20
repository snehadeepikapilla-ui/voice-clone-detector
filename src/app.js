import { useState } from "react";
import "./App.css";

function App() {
  const [monitoring, setMonitoring] = useState(false);

  const startMonitoring = () => {
    setMonitoring(!monitoring);
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>VoiceGuard AI</h1>
          <p>Real-Time Voice Cloning Detection</p>
        </div>

        <div className="status">
          <span className={monitoring ? "dot active" : "dot"}></span>
          {monitoring ? "Monitoring" : "Inactive"}
        </div>
      </header>

      <main className="dashboard">
        <section className="hero">
          <div>
            <h2>Protect Your Voice</h2>
            <p>
              Detect AI-generated and cloned voices in real time using
              artificial intelligence.
            </p>

            <button onClick={startMonitoring}>
              {monitoring ? "Stop Monitoring" : "Start Monitoring"}
            </button>
          </div>

          <div className="mic">
            🎙️
          </div>
        </section>

        <section className="cards">
          <div className="card">
            <h3>Detection Status</h3>
            <div className="safe">● SAFE</div>
            <p>No suspicious voice detected</p>
          </div>

          <div className="card">
            <h3>Risk Score</h3>
            <div className="score">12%</div>
            <p>Low risk</p>
          </div>

          <div className="card">
            <h3>Microphone</h3>
            <div className={monitoring ? "mic-status on" : "mic-status"}>
              {monitoring ? "ACTIVE" : "OFF"}
            </div>
            <p>Audio input status</p>
          </div>
        </section>

        <section className="visualizer">
          <h3>Real-Time Audio Analysis</h3>

          <div className="waves">
            {[...Array(35)].map((_, index) => (
              <span
                key={index}
                style={{
                  height: `${20 + Math.random() * 70}px`,
                }}
              ></span>
            ))}
          </div>

          <p>
            {monitoring
              ? "Analyzing incoming voice..."
              : "Start monitoring to analyze voice"}
          </p>
        </section>

        <section className="history">
          <h3>Recent Detection History</h3>

          <div className="history-row">
            <span>Voice Sample 01</span>
            <span className="safe">SAFE</span>
            <span>12% Risk</span>
          </div>

          <div className="history-row">
            <span>Voice Sample 02</span>
            <span className="warning">SUSPICIOUS</span>
            <span>68% Risk</span>
          </div>

          <div className="history-row">
            <span>Voice Sample 03</span>
            <span className="safe">SAFE</span>
            <span>8% Risk</span>
          </div>
        </section>
      </main>

      <footer>
        <p>© 2026 VoiceGuard AI • AI-Powered Voice Security</p>
      </footer>
    </div>
  );
}

export default App;