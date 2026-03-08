import { useState, useRef, useEffect } from 'react';
import { chatWithBot } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';

export default function ChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, sender: 'bot', text: 'Halo! Saya asisten AI pintar dari AquaSentinel. Ada yang bisa saya bantu atau tanyakan terkait cuaca, laporan, area bahaya, maupun edukasi bencana?' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const { location } = useGeolocation();

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userText = inputValue;
        setInputValue('');

        // Add user message to UI
        const newUserMsg = { id: Date.now(), sender: 'user', text: userText };
        setMessages(prev => [...prev, newUserMsg]);
        setIsLoading(true);

        try {
            // Send to backend
            const result = await chatWithBot(userText, location?.lat, location?.lng);

            // Add bot response to UI
            const botMsg = {
                id: Date.now() + 1,
                sender: 'bot',
                text: result.response, // CHANGED: response.reply -> result.response
                suggestions: result.suggestions || []
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error("Chatbot Error:", error);
            const errorMsg = {
                id: Date.now() + 1,
                sender: 'bot',
                text: 'Maaf, saya sedang mengalami kendala jaringan atau server. Silakan coba sesaat lagi.'
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chatbot-container">
            {/* Chat Window */}
            {isOpen && (
                <div className="chat-window fade-in" style={{
                    position: 'fixed',
                    bottom: 90,
                    right: 24,
                    width: 380,
                    height: 550,
                    background: 'var(--color-bg-secondary)', // Use solid dark background
                    borderRadius: 20,
                    boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    zIndex: 9999,
                    border: '1px solid var(--color-border-accent)',
                    backdropFilter: 'blur(10px)',
                }}>
                    <div className="chat-header" style={{
                        padding: '20px',
                        background: 'linear-gradient(135deg, var(--color-accent), #1d4ed8)',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                fontSize: '1.8rem',
                                background: 'rgba(255,255,255,0.2)',
                                padding: '8px',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>🤖</div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.5px' }}>AquaSentinel AI</h3>
                                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.9 }}>Asisten Siaga Bencana</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s'
                        }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
                            ✕
                        </button>
                    </div>

                    <div className="chat-body" style={{
                        flex: 1,
                        padding: '20px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                        background: '#0f172a', // Opaque dark background for high contrast
                    }}>
                        {messages.map(msg => (
                            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{
                                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '85%',
                                    padding: '12px 16px',
                                    borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                    background: msg.sender === 'user' ? 'var(--color-accent)' : '#1e293b',
                                    color: 'white',
                                    border: '1px solid var(--color-border)',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.6',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                }}>
                                    {msg.text || "..."}
                                </div>

                                {/* Suggestions Chips */}
                                {msg.suggestions && msg.suggestions.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                                        {msg.suggestions.map((s, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setInputValue(s);
                                                    // Auto-submit would be better but simple input fill is safer for now
                                                }}
                                                style={{
                                                    background: 'rgba(37, 99, 235, 0.15)',
                                                    border: '1px solid var(--color-accent)',
                                                    color: 'var(--color-accent-light)',
                                                    padding: '6px 12px',
                                                    borderRadius: '15px',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.background = 'var(--color-accent)';
                                                    e.currentTarget.style.color = 'white';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.background = 'rgba(37, 99, 235, 0.15)';
                                                    e.currentTarget.style.color = 'var(--color-accent-light)';
                                                }}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div style={{
                                alignSelf: 'flex-start',
                                padding: '12px 16px',
                                borderRadius: '20px 20px 20px 4px',
                                background: '#1e293b',
                                color: '#94a3b8',
                                border: '1px solid var(--color-border)',
                                fontSize: '0.9rem'
                            }}>
                                <span className="typing-dots">Sedang berpikir...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="chat-footer" style={{
                        padding: '16px',
                        background: '#111827',
                        borderTop: '1px solid var(--color-border)',
                        display: 'flex',
                        gap: 10,
                    }}>
                        <input
                            type="text"
                            placeholder="Ketik pertanyaan..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                borderRadius: '25px',
                                border: '1px solid #334155',
                                background: '#1e293b',
                                color: 'white',
                                outline: 'none',
                                fontSize: '0.9rem',
                            }}
                        />
                        <button type="submit" disabled={isLoading || !inputValue.trim()} style={{
                            width: '45px',
                            height: '45px',
                            borderRadius: '50%',
                            border: 'none',
                            background: 'var(--color-accent)',
                            color: 'white',
                            cursor: (isLoading || !inputValue.trim()) ? 'not-allowed' : 'pointer',
                            opacity: (isLoading || !inputValue.trim()) ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)',
                        }}>
                            ➤
                        </button>
                    </form>
                </div>
            )}

            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    zIndex: 9999,
                    transition: 'transform 0.3s ease',
                    transform: isOpen ? 'scale(0.9)' : 'scale(1)',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={(e) => e.currentTarget.style.transform = isOpen ? 'scale(0.9)' : 'scale(1)'}
            >
                {isOpen ? '✖' : '💬'}
            </button>
        </div>
    );
}
