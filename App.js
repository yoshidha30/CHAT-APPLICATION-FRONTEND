import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import EmojiPicker from "emoji-picker-react";

const socket = io("http://localhost:3001");

export default function App() {
  const [username, setUsername] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // On mount: setup socket events
  useEffect(() => {
    socket.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("typing", (user) => {
      setTypingUsers((prev) => {
        if (!prev.includes(user) && user !== username) {
          return [...prev, user];
        }
        return prev;
      });
    });

    socket.on("stopTyping", (user) => {
      setTypingUsers((prev) => prev.filter((u) => u !== user));
    });

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off("message");
      socket.off("typing");
      socket.off("stopTyping");
      socket.off("onlineUsers");
    };
  }, [username]);

  // Handle sending username to server
  const handleSetUsername = () => {
    if (username.trim() !== "") {
      socket.emit("setUsername", username);
      setNameSet(true);
    }
  };

  // Send message to server
  const handleSend = () => {
    if (message.trim() !== "") {
      const msg = {
        username,
        message,
        timestamp: new Date().toISOString(),
      };
      socket.emit("message", msg);
      setMessages((prev) => [...prev, msg]);
      setMessage("");
      setShowEmojiPicker(false);
      socket.emit("stopTyping", username);
      setTyping(false);
    }
  };

  // Handle typing events
  const handleTyping = (e) => {
    setMessage(e.target.value);

    if (!typing) {
      setTyping(true);
      socket.emit("typing", username);
    }

    // Debounce stopTyping event
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      setTyping(false);
      socket.emit("stopTyping", username);
    }, 1000);
  };

  let typingTimeout;

  // Emoji click handler
  const onEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
  };

  // Format timestamp like WhatsApp (hh:mm am/pm)
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // hour '0' should be '12'
    minutes = minutes < 10 ? "0" + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
  };

  if (!nameSet) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Enter your name to join chat</h2>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your name"
        />
        <button onClick={handleSetUsername} disabled={!username.trim()}>
          Join
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20, fontFamily: "Arial" }}>
      <h2>Welcome, {username}</h2>

      {/* Online Users */}
      <div
        style={{
          marginBottom: 10,
          borderBottom: "1px solid #ccc",
          paddingBottom: 5,
        }}
      >
        <strong>Online Users:</strong>{" "}
        {onlineUsers.length === 0
          ? "No one online"
          : onlineUsers.map((user) => (
              <span
                key={user}
                style={{
                  marginRight: 10,
                  color: user === username ? "green" : "blue",
                  fontWeight: user === username ? "bold" : "normal",
                }}
              >
                🟢 {user}
              </span>
            ))}
      </div>

      {/* Messages */}
      <div
        style={{
          height: 400,
          border: "1px solid #ccc",
          padding: 10,
          overflowY: "scroll",
          marginBottom: 10,
          backgroundColor: "#f9f9f9",
          borderRadius: 5,
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: 10,
              textAlign: msg.username === username ? "right" : "left",
            }}
          >
            <div
              style={{
                display: "inline-block",
                backgroundColor: msg.username === username ? "#dcf8c6" : "#fff",
                padding: "8px 12px",
                borderRadius: 15,
                maxWidth: "70%",
                boxShadow: "0 1px 1px rgba(0,0,0,0.1)",
              }}
            >
              <strong>{msg.username}</strong>: {msg.message}
              <div
                style={{
                  fontSize: 12,
                  color: "#555",
                  marginTop: 4,
                }}
              >
                🕒 {formatTimestamp(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      <div style={{ minHeight: 20, marginBottom: 10, color: "#888", fontStyle: "italic" }}>
        {typingUsers.length > 0 && (
          <span>
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </span>
        )}
      </div>

      {/* Message input */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          style={{
            fontSize: 24,
            marginRight: 8,
            cursor: "pointer",
            background: "none",
            border: "none",
          }}
          aria-label="Toggle emoji picker"
        >
          😊
        </button>
        <input
          type="text"
          placeholder="Type a message"
          value={message}
          onChange={handleTyping}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
          style={{
            flexGrow: 1,
            padding: 10,
            borderRadius: 20,
            border: "1px solid #ccc",
            outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          style={{
            marginLeft: 8,
            padding: "10px 16px",
            borderRadius: 20,
            border: "none",
            backgroundColor: "#4caf50",
            color: "white",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div style={{ position: "absolute", bottom: 70, left: 20, zIndex: 1000 }}>
          <EmojiPicker onEmojiClick={onEmojiClick} />
        </div>
      )}
    </div>
  );
}


