import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

// Configure axios to use the correct backend URL
axios.defaults.baseURL = 'http://localhost:8000';
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true;

// Add axios interceptor for better error handling
axios.interceptors.response.use(
  response => response,
  error => {
    console.error('Axios error:', error);
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error - Please check if the backend server is running');
    }
    return Promise.reject(error);
  }
);

// AI Bot Component
function AIBot({ messages, onSendMessage, isConnected, botStatus }) {
  // No internal botStatus or timeout logic
  // ...rest of AIBot remains the same, but remove all useState/useEffect for botStatus and timeout...

  // Status message
  const getBotStatus = () => {
    if (!isConnected) return "Connecting to server...";
    if (botStatus === "completed") return "Interview completed";
    if (botStatus === "speaking") return "Speaking...";
    if (botStatus === "processing") return "Processing your response...";
    return "Listening...";
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{
        padding: "15px",
        background: "#f0f0f0",
        borderRadius: "8px",
        margin: "10px 0",
        border: "1px solid #ddd",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <strong>AI Bot:</strong> {getBotStatus()}
      </div>
      <div style={{
        height: "300px",
        overflowY: "auto",
        border: "1px solid #ccc",
        padding: "15px",
        marginTop: "20px",
        borderRadius: "8px",
        background: "#fff"
      }}>
        {messages.map((msg, index) => (
          <div key={index} style={{
            marginBottom: "10px",
            padding: "10px",
            borderRadius: "8px",
            background: msg.type === "system" ? "#e9ecef" :
              msg.type === "error" ? "#f8d7da" :
                msg.sender === "AI Bot" ? "#d4edda" : "#fff",
            border: "1px solid #dee2e6"
          }}>
            <strong>{msg.sender}:</strong> {msg.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MeetingPage() {
  console.log("MeetingPage rendered");
  const { roomName } = useParams();
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [botStatus, setBotStatus] = useState("listening");
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const identity = useRef(`candidate-${Math.floor(Math.random() * 10000)}`);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const speakingTimeoutRef = useRef(null);
  const lastProcessedIndex = useRef(-1);
  const processingRef = useRef(false);
  const lastFinalMessageTime = useRef(Date.now());
  const [conversationHistory, setConversationHistory] = useState([]);

  // Function to handle sending messages
  const handleSendMessage = (message) => {
    console.log("Appending AI message to chat:", message);
    setMessages(prev => [...prev, { type: "message", message, sender: "AI Bot" }]);
  };

  // Live audio streaming effect
  useEffect(() => {
    let ws;
    let mediaRecorder;
    let stream;
    let stopped = false;
    let partialTimeout = null;
    let lastPartial = '';
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 2000; // 2 seconds
    let reconnectTimeout = null;

    const cleanup = () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (partialTimeout) {
        clearTimeout(partialTimeout);
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };

    const connectWebSocket = () => {
      if (stopped) return;
      
      try {
        ws = new window.WebSocket(`ws://localhost:8000/ws/audio_stream/${roomName}/${identity.current}`);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          reconnectAttempts = 0;
          console.log('Audio WebSocket connected');
          
          if (!stream) {
            console.error('No stream available for MediaRecorder');
            return;
          }

          // Prefer OGG/Opus if supported
          const preferredMimeType = MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')
            ? 'audio/ogg; codecs=opus'
            : 'audio/webm; codecs=opus';

          try {
            mediaRecorder = new MediaRecorder(stream, { mimeType: preferredMimeType });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                try {
                  event.data.arrayBuffer().then(buffer => {
                    if (ws.readyState === WebSocket.OPEN) {
                      ws.send(buffer);
                    }
                  });
                } catch (error) {
                  console.error('Error sending audio data:', error);
                }
              }
            };

            // Increase chunk size to 2000ms for better Vosk recognition
            mediaRecorder.start(2000);
          } catch (error) {
            console.error('Error creating MediaRecorder:', error);
            ws.close();
          }
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("Received data:", data);
            if (data.partial) {
              // Optionally, you can show partials as a typing indicator elsewhere
              // Do not add partials to the chat history
            }
            if (data.text && data.text.trim() !== '') {
              console.log("Adding candidate message to chat:", data.text);
              lastFinalMessageTime.current = Date.now();
              setMessages(prev => prev.filter(msg => msg.type !== 'partial'));
              setMessages(prev => [...prev, { type: "message", message: data.text, sender: "Candidate" }]);
            }
          } catch (e) {
            console.error('Error parsing transcript:', e);
          }
        };

        ws.onerror = (err) => {
          console.error('Audio WebSocket error:', err);
          setError('Audio WebSocket error. Attempting to reconnect...');
        };

        ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          setIsConnected(false);
          
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          
          // Attempt to reconnect if not stopped and haven't exceeded max attempts
          if (!stopped && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
            reconnectTimeout = setTimeout(connectWebSocket, RECONNECT_DELAY);
          } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            setError('Failed to maintain connection after multiple attempts. Please refresh the page.');
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        setError('Failed to establish WebSocket connection. Please refresh the page.');
      }
    };

    const startStreaming = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        streamRef.current = stream;
        connectWebSocket();
      } catch (err) {
        setError('Could not access microphone. Please check your permissions and try again.');
        console.error('Error accessing media devices:', err);
      }
    };

    startStreaming();

    return () => {
      stopped = true;
      cleanup();
    };
  }, [roomName]);

  // Add useEffect for video element setup
  useEffect(() => {
    const setupVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 360 },
            facingMode: 'user'
          }
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.onloadedmetadata = () => {
            localVideoRef.current.play().catch(error => {
              console.error('Error playing local video:', error);
            });
          };
        }
      } catch (error) {
        console.error('Error setting up video:', error);
      }
    };

    setupVideo();

    return () => {
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // Message processing effect
  useEffect(() => {
    const processNextMessage = async () => {
      if (processingRef.current || botStatus === "speaking" || botStatus === "processing") return;
      const nextIndex = messages.findIndex(
        (msg, idx) =>
          idx > lastProcessedIndex.current &&
          msg.sender === "Candidate" &&
          msg.type === "message"
      );
      if (nextIndex !== -1) {
        processingRef.current = true;
        setBotStatus("processing");
        const message = messages[nextIndex];
        setConversationHistory(prev => [...prev, { role: "user", content: message.message }]);
        const aiResponse = await getAIResponse(message.message);
        setConversationHistory(prev => [...prev, { role: "assistant", content: aiResponse }]);
        setBotStatus("speaking");
        handleSendMessage(aiResponse);
        lastProcessedIndex.current = nextIndex;
      }
    };
    processNextMessage();
    return () => {
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    };
  }, [messages, botStatus]);

  // Timeout effect for speaking
  useEffect(() => {
    if (botStatus === "speaking") {
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = setTimeout(() => {
        setBotStatus("listening");
        processingRef.current = false;
      }, 3000);
    }
    return () => {
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    };
  }, [botStatus]);

  // Start the interview on mount
  useEffect(() => {
    if (isConnected && messages.length === 0) {
      const welcomeMessage = "Hello! I'm your AI interviewer today. Could you please introduce yourself and tell me about your background?";
      setBotStatus("speaking");
      handleSendMessage(welcomeMessage);
      setConversationHistory([{ role: "assistant", content: welcomeMessage }]);
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = setTimeout(() => {
        setBotStatus("listening");
      }, 3000);
    }
    // eslint-disable-next-line
  }, [isConnected, messages.length]);

  // Get AI response
  const getAIResponse = async (userMessage) => {
    try {
      const response = await axios.post("/api/llm/generate_question", {
        resume: "",
        job_description: "Software Developer position",
        experience: userMessage,
        current_question: messages[messages.length - 2]?.message || "",
        candidate_answer: userMessage,
        interview_history: conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      });
      return response.data.question;
    } catch (error) {
      return "I apologize, but I'm having trouble processing your response. Could you please repeat that?";
    }
  };

  if (error) return <div style={{ padding: "20px", color: "red" }}>{error}</div>;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ 
        padding: "20px", 
        background: "#f8f9fa", 
        borderBottom: "1px solid #dee2e6",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <h2>Interview Room: {roomName}</h2>
        <p>Your ID: {identity.current}</p>
        <p style={{ color: isConnected ? "#28a745" : "#dc3545" }}>
          Status: {isConnected ? "Connected" : "Disconnected"}
        </p>
      </div>
      
      <div style={{ 
        display: "flex", 
        flex: 1, 
        padding: "20px",
        gap: "20px"
      }}>
        <div style={{ flex: 2 }}>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: "20px",
            marginBottom: "20px"
          }}>
            <div style={{ 
              background: "#000", 
              borderRadius: "8px", 
              overflow: "hidden",
              aspectRatio: "16/9"
            }}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{ 
              background: "#000", 
              borderRadius: "8px", 
              overflow: "hidden",
              aspectRatio: "16/9"
            }}>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </div>
          <AIBot
            messages={messages}
            onSendMessage={handleSendMessage}
            isConnected={isConnected}
            botStatus={botStatus}
          />
        </div>
      </div>
    </div>
  );
} 