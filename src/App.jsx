import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";
const WS_URL = "ws://127.0.0.1:8000/ws/detect";

function App() {
  const [mode, setMode] = useState("upload");
  const [audioFile, setAudioFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const [liveText, setLiveText] = useState("Ready for voice analysis");
  const [error, setError] = useState("");

  const socketRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFile = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setAudioFile(file);
    setResult(null);
    setError("");
  };

  const analyzeVoice = async () => {
    if (!audioFile) {
      setError("Please select an audio file.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", audioFile);

      const response = await fetch(`${API_URL}/detect`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Voice analysis failed.");
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Backend connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const stopLive = () => {
    if (recorderRef.current) {
      try {
        if (recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      } catch (err) {
        console.log("Recorder stop:", err);
      }

      recorderRef.current = null;
    }

    if (socketRef.current) {
      try {
        if (
          socketRef.current.readyState === WebSocket.OPEN ||
          socketRef.current.readyState === WebSocket.CONNECTING
        ) {
          socketRef.current.close();
        }
      } catch (err) {
        console.log("Socket close:", err);
      }

      socketRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setLive(false);
    setLiveText("Ready for voice analysis");
  };

  const startLive = async () => {
    setError("");
    setResult(null);
    setLiveText("Connecting to live detection...");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported by this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        setLive(true);
        setLiveText("Listening to live audio...");

        let mimeType = "";

        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus";
        }

        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        recorderRef.current = recorder;

        recorder.ondataavailable = async (event) => {
          if (
            event.data?.size > 0 &&
            socket.readyState === WebSocket.OPEN
          ) {
            try {
              const buffer = await event.data.arrayBuffer();
              socket.send(buffer);
            } catch (err) {
              console.error("Audio send error:", err);
            }
          }
        };

        recorder.onerror = (event) => {
          console.error("Recorder error:", event);
          setError("Microphone recording failed.");
        };

        recorder.start(1000);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.message) {
            setLiveText(data.message);
          }

          if (
            data.ai_clone_probability !== undefined ||
            data.probability !== undefined ||
            data.result
          ) {
            setResult(data);
          }
        } catch {
          console.log("Live response:", event.data);
        }
      };

      socket.onerror = (event) => {
        console.error("WebSocket error:", event);

        setError(
          "Live detection connection failed. Make sure the backend is running on port 8000."
        );

        setLive(false);
        setLiveText("Live detection unavailable");
      };

      socket.onclose = () => {
        setLive(false);

        if (recorderRef.current) {
          try {
            if (recorderRef.current.state !== "inactive") {
              recorderRef.current.stop();
            }
          } catch (err) {
            console.log("Recorder close:", err);
          }

          recorderRef.current = null;
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        socketRef.current = null;
      };
    } catch (err) {
      console.error("Live detection error:", err);

      setLive(false);
      setLiveText("Ready for voice analysis");

      if (err.name === "NotAllowedError") {
        setError("Microphone permission was denied.");
      } else {
        setError(
          err.message || "Could not start live detection."
        );
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      socketRef.current = null;
      recorderRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        try {
          if (recorderRef.current.state !== "inactive") {
            recorderRef.current.stop();
          }
        } catch {}
      }

      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {}
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const aiScore = Number(
    result?.ai_clone_probability ??
      result?.probability ??
      0
  );

  const safeAIScore = Math.min(
    100,
    Math.max(0, aiScore)
  );

  const humanScore = Math.max(
    0,
    100 - safeAIScore
  );

  const resultText =
    result?.result ||
    (safeAIScore >= 50
      ? "Potential AI-generated voice"
      : "Likely human voice");

  const isAI = safeAIScore >= 50;

  const duration =
    result?.features?.duration_seconds ??
    result?.duration_seconds;

  const mfcc =
    result?.features?.mfcc_mean ??
    result?.mfcc_mean;

  const spectral =
    result?.features?.spectral_centroid_mean ??
    result?.spectral_centroid_mean;

  const zcr =
    result?.features?.zero_crossing_rate_mean ??
    result?.zero_crossing_rate_mean;

  return (
    <div className="app">
      <div className="grid-bg" />

      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      {/* NAVBAR */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-logo">VG</div>

          <div>
            <h1>VoiceCloneDetector</h1>
            <span>VOICE AUTHENTICITY SYSTEM</span>
          </div>
        </div>

        <div className="system-status">
          <span className="status-dot" />
          SYSTEM ONLINE
        </div>
      </header>

      <main className="main">

        {/* HERO */}
        <section className="hero">
          <div className="hero-content">

            <div className="hero-tag">
              <span />
              AI VOICE SECURITY
            </div>

           <h2 className="hero-title">
  NEXUS
</h2>

            <p>
              Machine-learning based voice analysis for
              identifying potentially cloned, synthetic,
              and manipulated speech.
            </p>

            <div className="hero-meta">
              <span>VOICE AUTHENTICITY SYSTEM</span>
              <span>VG / 01</span>
            </div>
          </div>

          {/* PULSATING ORB */}
          <div
            className={`orb-area ${
              live ? "orb-live" : ""
            }`}
          >
            <div className="orb-ring ring-one" />
            <div className="orb-ring ring-two" />
            <div className="orb-ring ring-three" />

            <div className="orb-halo" />

            <div className="orb">
              <div className="orb-inner">
                <span>VG</span>
              </div>

              <div className="orb-wave">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>

            <div className="orb-label orb-label-top">
              AI SIGNAL
            </div>

            <div className="orb-label orb-label-bottom">
              {live ? "LISTENING" : "VOICE ANALYSIS"}
            </div>
          </div>
        </section>

        {/* MODE CONTROLS */}
        <section className="controls">
          <div className="tabs">

            <button
              className={
                mode === "upload" ? "active" : ""
              }
              onClick={() => {
                stopLive();
                setMode("upload");
                setResult(null);
                setError("");
              }}
            >
              AUDIO ANALYSIS
            </button>

            <button
              className={
                mode === "live" ? "active" : ""
              }
              onClick={() => {
                setMode("live");
                setResult(null);
                setError("");
              }}
            >
              LIVE DETECTION
            </button>

          </div>

          <div className="control-status">
            <span />
            REAL-TIME ANALYSIS
          </div>
        </section>

        {/* ANALYSIS */}
        <section className="analysis">

          {/* INPUT CARD */}
          <div className="card">

            <div className="card-heading">
              <div>
                <small>01</small>

                <h3>
                  {mode === "upload"
                    ? "AUDIO ANALYSIS"
                    : "LIVE DETECTION"}
                </h3>
              </div>

              <span>
                {mode === "upload"
                  ? "FILE INPUT"
                  : "MIC INPUT"}
              </span>
            </div>

            {mode === "upload" ? (
              <>
                <div
                  className="upload-box"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  <div className="upload-icon">
                    ↑
                  </div>

                  <strong>
                    {audioFile
                      ? audioFile.name
                      : "Select voice recording"}
                  </strong>

                  <small>
                    WAV / MP3 / M4A / OGG
                  </small>

                  <div className="scan-line" />
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".wav,.mp3,.m4a,.ogg,audio/*"
                  onChange={handleFile}
                  hidden
                />

                <button
                  className="primary-btn"
                  disabled={!audioFile || loading}
                  onClick={analyzeVoice}
                >
                  {loading
                    ? "ANALYZING..."
                    : "ANALYZE VOICE →"}
                </button>
              </>
            ) : (
              <div className="live-panel">

                <div
                  className={`mini-orb ${
                    live ? "active" : ""
                  }`}
                >
                  🎙
                </div>

                <p>{liveText}</p>

                <div className="waveform">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>

                {!live ? (
                  <button
                    className="primary-btn"
                    onClick={startLive}
                  >
                    START DETECTION
                  </button>
                ) : (
                  <button
                    className="stop-btn"
                    onClick={stopLive}
                  >
                    STOP DETECTION
                  </button>
                )}

              </div>
            )}
          </div>

          {/* RESULT CARD */}
          <div className="card">

            <div className="card-heading">
              <div>
                <small>02</small>

                <h3>
                  AUTHENTICITY ANALYSIS
                </h3>
              </div>

              <span>
                {result ? "ANALYZED" : "WAITING"}
              </span>
            </div>

            {!result ? (
              <div className="empty-result">

                <div className="empty-orb">
                  VG
                </div>

                <strong>
                  Waiting for voice analysis
                </strong>

                <p>
                  Upload audio or start live
                  detection
                </p>

              </div>
            ) : (
              <div className="result">

                <div className="score-area">

                  <div
                    className={`score-ring ${
                      isAI ? "danger" : "human"
                    }`}
                    style={{
                      "--score": `${safeAIScore}%`,
                    }}
                  >
                    <div className="score-center">
                      <strong>
                        {safeAIScore.toFixed(1)}%
                      </strong>

                      <span>
                        AI SCORE
                      </span>
                    </div>
                  </div>

                  <div className="score-labels">
                    <span>
                      AI {safeAIScore.toFixed(1)}%
                    </span>

                    <span>
                      HUMAN {humanScore.toFixed(1)}%
                    </span>
                  </div>

                </div>

                <div className="result-info">

                  <div
                    className={`risk ${
                      isAI
                        ? "risk-ai"
                        : "risk-human"
                    }`}
                  >
                    {isAI
                      ? "SUSPICIOUS VOICE"
                      : "LIKELY HUMAN"}
                  </div>

                  <h4>{resultText}</h4>

                  <div className="details">

                    <div>
                      <span>
                        AI probability
                      </span>

                      <b>
                        {safeAIScore.toFixed(1)}%
                      </b>
                    </div>

                    <div>
                      <span>
                        Duration
                      </span>

                      <b>
                        {duration !== undefined
                          ? `${Number(duration).toFixed(2)}s`
                          : "--"}
                      </b>
                    </div>

                    <div>
                      <span>MFCC</span>

                      <b>
                        {mfcc !== undefined
                          ? Number(mfcc).toFixed(2)
                          : "--"}
                      </b>
                    </div>

                    <div>
                      <span>
                        Spectral centroid
                      </span>

                      <b>
                        {spectral !== undefined
                          ? Number(spectral).toFixed(0)
                          : "--"}
                      </b>
                    </div>

                  </div>

                  {result.recommended_action && (
                    <div className="recommendation">

                      <small>
                        RECOMMENDED ACTION
                      </small>

                      <p>
                        {result.recommended_action}
                      </p>

                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {/* FEATURES */}
        <section className="card wide">

          <div className="card-heading">
            <div>
              <small>03</small>
              <h3>AUDIO SIGNAL</h3>
            </div>

            <span>FEATURES</span>
          </div>

          <div className="features">

            <div>
              <span>DURATION</span>

              <strong>
                {duration !== undefined
                  ? `${Number(duration).toFixed(2)}s`
                  : "--"}
              </strong>
            </div>

            <div>
              <span>MFCC</span>

              <strong>
                {mfcc !== undefined
                  ? Number(mfcc).toFixed(2)
                  : "--"}
              </strong>
            </div>

            <div>
              <span>SPECTRAL</span>

              <strong>
                {spectral !== undefined
                  ? Number(spectral).toFixed(0)
                  : "--"}
              </strong>
            </div>

            <div>
              <span>ZCR</span>

              <strong>
                {zcr !== undefined
                  ? Number(zcr).toFixed(3)
                  : "--"}
              </strong>
            </div>

          </div>
        </section>

        {/* FOOTER */}
        <footer>
          <span>VOICEGUARD AI</span>

          <span>
            VOICE AUTHENTICITY SYSTEM
          </span>
        </footer>

      </main>
    </div>
  );
}

export default App;