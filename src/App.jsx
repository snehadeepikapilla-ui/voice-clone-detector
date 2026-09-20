import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const [audioFile, setAudioFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [liveStatus, setLiveStatus] = useState("");
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    analyzed: 0,
    threats: 0,
    human: 0,
  });

  const socketRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);

  // -----------------------------
  // File selection
  // -----------------------------
  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (!file) {
      setAudioFile(null);
      return;
    }

    setAudioFile(file);
    setResult(null);
    setError("");
  };

  // -----------------------------
  // Upload & Analyze
  // -----------------------------
  const analyzeAudio = async () => {
    if (!audioFile) {
      setError("Please select an audio file first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", audioFile);

      const response = await fetch(
        "http://127.0.0.1:8000/detect",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Detection failed.");
      }

      setResult(data);

      setStats((previous) => ({
        analyzed: previous.analyzed + 1,
        threats:
          previous.threats +
          (data.ai_clone_probability >= 50 ? 1 : 0),
        human:
          previous.human +
          (data.ai_clone_probability < 50 ? 1 : 0),
      }));
    } catch (err) {
      setError(
        err.message || "Unable to connect to backend."
      );
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Start Live Detection
  // -----------------------------
  const startLiveDetection = async () => {
    if (isRecording) return;

    setError("");
    setResult(null);
    setLiveStatus("Requesting microphone...");

    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Microphone access is not supported by this browser."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      streamRef.current = stream;

      const socket = new WebSocket(
        "ws://127.0.0.1:8000/ws/detect"
      );

      socketRef.current = socket;

      socket.onopen = () => {
        setLiveStatus("Live detection connected.");
        setIsRecording(true);

        let mimeType = "";

        if (
          MediaRecorder.isTypeSupported(
            "audio/webm;codecs=opus"
          )
        ) {
          mimeType = "audio/webm;codecs=opus";
        } else if (
          MediaRecorder.isTypeSupported("audio/webm")
        ) {
          mimeType = "audio/webm";
        }

        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        recorderRef.current = recorder;

        recorder.ondataavailable = async (event) => {
          if (
            event.data &&
            event.data.size > 0 &&
            socket.readyState === WebSocket.OPEN
          ) {
            const buffer =
              await event.data.arrayBuffer();

            socket.send(buffer);
          }
        };

        recorder.onerror = () => {
          setError("Microphone recording error.");
        };

        recorder.start(1000);

        setLiveStatus(
          "Listening... speak normally."
        );
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.message) {
            setLiveStatus(data.message);
          }

          if (data.result) {
            setResult(data);

            setStats((previous) => ({
              analyzed: previous.analyzed + 1,
              threats:
                previous.threats +
                (data.ai_clone_probability >= 50
                  ? 1
                  : 0),
              human:
                previous.human +
                (data.ai_clone_probability < 50
                  ? 1
                  : 0),
            }));
          }
        } catch (err) {
          console.error(
            "Invalid WebSocket message:",
            err
          );
        }
      };

      socket.onerror = () => {
        setError(
          "Live detection connection failed. Make sure the backend is running."
        );
        setLiveStatus("");
      };

      socket.onclose = () => {
        setIsRecording(false);
        setLiveStatus("Live detection stopped.");
      };
    } catch (err) {
      console.error(err);

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        streamRef.current = null;
      }

      setIsRecording(false);
      setLiveStatus("");

      setError(
        err.message ||
          "Unable to start live detection."
      );
    }
  };

  // -----------------------------
  // Stop Live Detection
  // -----------------------------
  const stopLiveDetection = () => {
    if (recorderRef.current) {
      if (
        recorderRef.current.state !== "inactive"
      ) {
        recorderRef.current.stop();
      }

      recorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (socketRef.current) {
      if (
        socketRef.current.readyState ===
        WebSocket.OPEN
      ) {
        socketRef.current.close(1000);
      }

      socketRef.current = null;
    }

    setIsRecording(false);
    setLiveStatus("Live detection stopped.");
  };

  // -----------------------------
  // Cleanup
  // -----------------------------
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        if (
          recorderRef.current.state !== "inactive"
        ) {
          recorderRef.current.stop();
        }
      }

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }

      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // -----------------------------
  // Probability
  // -----------------------------
  const probability =
    result?.ai_clone_probability ?? 0;

  const isAI = probability >= 50;

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <div>
          <h1>Voice Clone Detector</h1>

          <p>
            AI-powered voice analysis for detecting
            potentially cloned or synthetic speech.
          </p>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          System Online
        </div>
      </header>

      <main className="container">

        {/* Upload Section */}
        <section className="card">
          <h2>Analyze Voice</h2>

          <p className="subtitle">
            Upload a WAV, MP3, M4A or OGG audio file.
          </p>

          <div className="upload-box">

            <input
              type="file"
              accept=".wav,.mp3,.m4a,.ogg,audio/*"
              onChange={handleFileChange}
            />

            {audioFile && (
              <p className="file-name">
                Selected: {audioFile.name}
              </p>
            )}

            <button
              className="primary-button"
              onClick={analyzeAudio}
              disabled={!audioFile || loading}
            >
              {loading
                ? "Analyzing..."
                : "Analyze Voice"}
            </button>

          </div>
        </section>

        {/* Live Detection */}
        <section className="card">

          <h2>Live Voice Detection</h2>

          <p className="subtitle">
            Speak into your microphone for real-time
            voice analysis.
          </p>

          <div className="live-controls">

            {!isRecording ? (
              <button
                className="primary-button"
                onClick={startLiveDetection}
              >
                🎙 Start Live Detection
              </button>
            ) : (
              <button
                className="stop-button"
                onClick={stopLiveDetection}
              >
                ⏹ Stop Detection
              </button>
            )}

          </div>

          {liveStatus && (
            <p className="live-status">
              {liveStatus}
            </p>
          )}

        </section>

        {/* Error */}
        {error && (
          <div className="error-box">
            ⚠️ {error}
          </div>
        )}

        {/* Detection Result */}
        {result && (
          <section className="card result-card">

            <h2>Detection Result</h2>

            <div className="result-main">

              <div>

                <p className="result-label">
                  Result
                </p>

                <h3
                  className={
                    isAI
                      ? "ai-result"
                      : "human-result"
                  }
                >
                  {result.result}
                </h3>

              </div>

              <div className="probability">

                <span>
                  AI Probability
                </span>

                <strong>
                  {probability}%
                </strong>

              </div>

            </div>

            {/* Probability Bar */}
            <div className="progress-container">

              <div
                className="progress-bar"
                style={{
                  width: `${probability}%`,
                }}
              ></div>

            </div>

            {/* Risk */}
            <div className="risk">

              <strong>
                {probability >= 70
                  ? "High Risk"
                  : probability >= 50
                  ? "Medium Risk"
                  : "Low Risk"}
              </strong>

            </div>

            {/* Decision Engine Results */}
            {result.risk_level && (
              <div className="decision-box">

                <div>
                  <span>Risk Level</span>

                  <strong>
                    {result.risk_level}
                  </strong>
                </div>

                <div>
                  <span>
                    Recommended Action
                  </span>

                  <strong>
                    {result.recommended_action}
                  </strong>
                </div>

              </div>
            )}

            {/* Audio Features */}
            {result.features && (
              <div className="features">

                <h3>Audio Features</h3>

                <div className="feature-grid">

                  <div className="feature">
                    <span>Duration</span>

                    <strong>
                      {result.features.duration_seconds?.toFixed(
                        2
                      )}{" "}
                      sec
                    </strong>
                  </div>

                  <div className="feature">
                    <span>MFCC Mean</span>

                    <strong>
                      {result.features.mfcc_mean?.toFixed(
                        2
                      )}
                    </strong>
                  </div>

                  <div className="feature">
                    <span>MFCC Std</span>

                    <strong>
                      {result.features.mfcc_std?.toFixed(
                        2
                      )}
                    </strong>
                  </div>

                  <div className="feature">
                    <span>
                      Spectral Centroid
                    </span>

                    <strong>
                      {result.features.spectral_centroid_mean?.toFixed(
                        2
                      )}{" "}
                      Hz
                    </strong>
                  </div>

                  <div className="feature">
                    <span>ZCR</span>

                    <strong>
                      {result.features.zero_crossing_rate_mean?.toFixed(
                        4
                      )}
                    </strong>
                  </div>

                  <div className="feature">
                    <span>RMS Energy</span>

                    <strong>
                      {result.features.rms_mean?.toFixed(
                        4
                      )}
                    </strong>
                  </div>

                </div>
              </div>
            )}

          </section>
        )}

        {/* Statistics */}
        <section className="stats-grid">

          <div className="stat-card">
            <span>Analyzed</span>
            <strong>{stats.analyzed}</strong>
          </div>

          <div className="stat-card">
            <span>Potential AI</span>
            <strong>{stats.threats}</strong>
          </div>

          <div className="stat-card">
            <span>Human</span>
            <strong>{stats.human}</strong>
          </div>

        </section>

      </main>

      {/* Footer */}
      <footer>
        <p>
          Voice Clone Detector • AI Voice Analysis
        </p>
      </footer>

    </div>
  );
}

export default App;