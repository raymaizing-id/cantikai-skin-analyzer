/**
 * Chat Page - AI Assistant with Groq Integration + Database Persistence + 3-Tier Mode System
 * Real-time chat with Cantik AI using Groq models
 * Chat history saved to database per user
 * Optimized token usage with sliding window context
 * 3 modes: Fast (llama-3.1-8b-instant), Thinking (gpt-oss-20b), Pro (gpt-oss-120b)
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Send, Sparkles, Plus, Lightbulb, TrendingUp, Calendar, MessageSquare, Trash2, ChevronDown, Mic, Home } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CantikLogo from '../assets/logo/vite.svg';
import { isAuthenticated, isGuestSession } from '../utils/auth';
import { checkAndUseToken, getTokenInfo } from '../utils/tokenSystem';

// Groq API Configuration
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Backend API
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Token optimization: Only send last N messages to API
const MAX_CONTEXT_MESSAGES = 10; // Last 10 messages (5 exchanges)

// Chat Modes Configuration
const CHAT_MODES = {
    fast: {
        name: 'Fast',
        icon: '⚡',
        model: 'llama-3.1-8b-instant',
        maxTokens: 600,
        description: 'Cepat & Efisien',
        color: '#10b981'
    },
    thinking: {
        name: 'Thinking',
        icon: '🧠',
        model: 'openai/gpt-oss-20b',
        maxTokens: 800,
        description: 'Analisis Mendalam',
        color: '#3b82f6'
    },
    pro: {
        name: 'Pro',
        icon: '✨',
        model: 'groq/compound',
        maxTokens: 1000,
        description: 'Kualitas Terbaik',
        color: '#ec4899'
    }
};

// DERMON Products Data
const DERMON_PRODUCTS = [
    {
        name: "DERMON Reboot Cream - Krim Perawatan Area Intim Pria",
        description: "Merawat kelembapan dan kenyamanan kulit area intim, menghilangkan bau tidak sedap dan iritasi. Diformulasikan khusus untuk kulit sensitif.",
        link: "https://dermon.id/products/reboot-cream"
    },
    {
        name: "DERMON FreshCore Mist – Spray Penyegar Area Intim Pria", 
        description: "Memberikan sensasi segar instan dengan menthol alami, melindungi dari bakteri penyebab bau tidak sedap. Merawat kelembapan dan kenyamanan kulit sensitif.",
        link: "https://dermon.id/products/freshcore-mist"
    },
    {
        name: "DERMON Intimate Wash 100ml",
        description: "Membersihkan area intim dengan lembut dan efektif, menghilangkan bakteri dan kotoran yang dapat menyebabkan bau tidak sedap. Diformulasikan khusus untuk kulit sensitif.",
        link: "https://dermon.id/products/intimate-wash"
    },
    {
        name: "DERMON Intimate Lotion 100ml", 
        description: "Merawat kelembapan dan kenyamanan kulit area intim, menghilangkan bau tidak sedap dan iritasi. Diformulasikan khusus untuk kulit sensitif.",
        link: "https://dermon.id/products/intimate-lotion"
    },
    {
        name: "DERMON Body Wash 100ml",
        description: "Membersihkan tubuh dengan lembut dan efektif, menghilangkan bakteri dan kotoran yang dapat menyebabkan bau tidak sedap. Diformulasikan khusus untuk kulit sensitif.",
        link: "https://dermon.id/products/body-wash"
    },
    {
        name: "DERMON Deodorant 50ml",
        description: "Menghilangkan bau tidak sedap dan kelembapan tubuh, memberikan sensasi segar dan kenyamanan. Diformulasikan khusus untuk kulit sensitif.",
        link: "https://dermon.id/products/deodorant"
    }
];

const Chat = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [showSessionList, setShowSessionList] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [chatMode, setChatMode] = useState('fast'); // Default to fast mode
    const [showModeDropdown, setShowModeDropdown] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [suggestedQuestions, setSuggestedQuestions] = useState([]);
    const [banners, setBanners] = useState([]);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const messagesEndRef = useRef(null);
    const initialMessageProcessed = useRef(false);
    const recognitionRef = useRef(null);

    // Get or create unique user ID - UNIFIED with other pages
    const getUserId = () => {
        // Use the same userId as other pages (cantik_user_id)
        let userId = localStorage.getItem('cantik_user_id');
        if (!userId) {
            // If no user ID, user needs to login or will be created on first scan
            // For now, return null to show guest mode
            return null;
        }
        // Convert to integer for consistency with backend
        return parseInt(userId, 10);
    };

    const userId = getUserId();

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'id-ID'; // Indonesian language

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInputMessage(transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const handleVoiceInput = () => {
        if (!recognitionRef.current) {
            alert('Voice input tidak didukung di browser ini. Gunakan Chrome atau Edge.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const quickActions = [
        { 
            icon: Sparkles, 
            description: 'Yuk, kenali kesehatan kulitmu! Mari saya bantu analisis kondisi kulit wajahmu',
            prompt: 'Analisis Kulit Saya'
        },
        { 
            icon: Lightbulb, 
            description: 'Butuh panduan perawatan harian? Saya siap berbagi tips skincare untukmu',
            prompt: 'Tips Skincare Harian'
        },
        { 
            icon: TrendingUp, 
            description: 'Bingung pilih produk? Mari saya rekomendasikan produk terbaik untukmu',
            prompt: 'Rekomendasi Produk'
        },
        { 
            icon: Calendar, 
            description: 'Ingin rutinitas skincare teratur? Saya bantu susun jadwal perawatanmu',
            prompt: 'Routine Skincare'
        }
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load user's chat sessions from database
    useEffect(() => {
        // Always fetch banners
        fetchBanners();
        
        // Check if user is logged in
        if (!userId) {
            console.log('⚠️ No user logged in, showing guest mode');
            setIsLoading(false);
            setMessages([]);
            setShowSuggestions(true);
            setSessions([]);
            return;
        }
        
        // Check if has initial message (from quick questions or chat input)
        const hasInitialMessage = location.state?.initialMessage;
        
        if (hasInitialMessage) {
            // If has initial message, just show welcome screen
            // Session will be created when message is sent
            console.log('💬 Has initial message, showing welcome screen');
            setIsLoading(true);
            loadUserSessionsForSidebar().then(() => {
                setIsLoading(false);
            });
        } else {
            // Normal flow: load existing sessions and show welcome screen
            console.log('📂 Loading existing sessions for sidebar');
            loadUserSessionsForSidebar();
        }
    }, []); // Empty dependency array - only run once on mount

    // Auto-rotate banners every 5 seconds
    useEffect(() => {
        if (banners.length > 1) {
            const interval = setInterval(() => {
                setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [banners]);

    // Cleanup: Delete empty session when leaving page (DISABLED - causing issues)
    // useEffect(() => {
    //     return () => {
    //         // Cleanup function when component unmounts
    //         if (currentSessionId && messages.length === 0) {
    //             console.log('🗑️ Cleaning up empty session on unmount:', currentSessionId);
    //             // Delete empty session only if it has 0 messages
    //             fetch(`${BACKEND_URL}/api/v2/chat/sessions/detail/${currentSessionId}`)
    //                 .then(res => res.json())
    //                 .then(session => {
    //                     if (!session.messages || session.messages.length === 0) {
    //                         console.log('✅ Confirmed empty, deleting session:', currentSessionId);
    //                         fetch(`${BACKEND_URL}/api/v2/chat/sessions/${currentSessionId}`, {
    //                             method: 'DELETE'
    //                         }).catch(err => console.error('Failed to delete empty session:', err));
    //                     } else {
    //                         console.log('⚠️ Session has messages, not deleting:', session.messages.length);
    //                     }
    //                 })
    //                 .catch(err => console.error('Failed to check session:', err));
    //         }
    //     };
    // }, [currentSessionId, messages.length]);

    const loadUserSessions = async () => {
        try {
            setIsLoading(true);
            console.log('🔄 Loading sessions for user:', userId);
            const response = await fetch(`${BACKEND_URL}/api/v2/chat/sessions/${userId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📦 Sessions loaded:', data);
            console.log('📊 Total sessions found:', data.length);
            
            if (data && data.length > 0) {
                // Filter out empty sessions (sessions with 0 messages)
                const sessionsWithMessages = data.filter(s => s.messages && s.messages.length > 0);
                
                console.log('📊 Sessions with messages:', sessionsWithMessages.length);
                console.log('🗑️ Empty sessions filtered:', data.length - sessionsWithMessages.length);
                
                if (sessionsWithMessages.length > 0) {
                    setSessions(sessionsWithMessages);
                    // Load most recent session with messages
                    const latestSession = sessionsWithMessages[0];
                    console.log('📝 Latest session:', latestSession);
                    console.log('💬 Messages count:', latestSession.messages?.length || 0);
                    
                    setCurrentSessionId(latestSession.id);
                    
                    const loadedMessages = latestSession.messages?.map(msg => ({
                        id: msg.id,
                        type: msg.role,
                        content: msg.content,
                        timestamp: new Date(msg.created_at)
                    })) || [];
                    
                    console.log('✅ Setting messages:', loadedMessages);
                    setMessages(loadedMessages);
                    
                    // Hide suggestions if there are messages
                    if (loadedMessages.length > 0) {
                        setShowSuggestions(false);
                        console.log('✅ Hiding suggestions - showing chat history');
                    } else {
                        setShowSuggestions(true);
                        console.log('✅ Showing suggestions - no messages yet');
                    }
                } else {
                    console.log('⚠️ No sessions with messages found, creating new one');
                    // All sessions are empty, create new one
                    await createNewSession();
                }
            } else {
                console.log('⚠️ No sessions found, creating new one');
                // Create first session if none exists
                await createNewSession();
            }
        } catch (error) {
            console.error('❌ Failed to load sessions:', error);
            // Create first session on error
            await createNewSession();
        } finally {
            setIsLoading(false);
        }
    };

    // Refresh sessions list without changing current messages
    const refreshSessionsList = async () => {
        try {
            console.log('🔄 Refreshing sessions list for user:', userId);
            const response = await fetch(`${BACKEND_URL}/api/v2/chat/sessions/${userId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                // Filter out empty sessions
                const sessionsWithMessages = data.filter(s => s.messages && s.messages.length > 0);
                console.log('✅ Refreshed sessions list:', sessionsWithMessages.length);
                setSessions(sessionsWithMessages);
            }
        } catch (error) {
            console.error('❌ Failed to refresh sessions list:', error);
        }
    };

    // Load sessions for sidebar only (show welcome screen)
    const loadUserSessionsForSidebar = async () => {
        try {
            setIsLoading(true);
            
            if (!userId) {
                console.log('⚠️ No user ID, cannot load sessions');
                setMessages([]);
                setShowSuggestions(true);
                setCurrentSessionId(null);
                setSessions([]);
                setIsLoading(false);
                return;
            }
            
            console.log('🔄 Loading sessions for sidebar only');
            const response = await fetch(`${BACKEND_URL}/api/v2/chat/sessions/${userId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                // Filter out empty sessions
                const sessionsWithMessages = data.filter(s => s.messages && s.messages.length > 0);
                console.log('✅ Loaded sessions for sidebar:', sessionsWithMessages.length);
                setSessions(sessionsWithMessages);
                
                // Show welcome screen (don't load any messages)
                setMessages([]);
                setShowSuggestions(true);
                setCurrentSessionId(null);
            } else {
                console.log('⚠️ No sessions found, showing welcome screen');
                // No sessions, show welcome screen
                setMessages([]);
                setShowSuggestions(true);
                setCurrentSessionId(null);
            }
        } catch (error) {
            console.error('❌ Failed to load sessions:', error);
            // Show welcome screen on error
            setMessages([]);
            setShowSuggestions(true);
            setCurrentSessionId(null);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBanners = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/v2/banners`);
            const data = await response.json();
            if (data.success && data.banners) {
                setBanners(data.banners);
                console.log('✅ Banners loaded:', data.banners.length);
            }
        } catch (error) {
            console.error('❌ Error fetching banners:', error);
        }
    };

    const createNewSession = async () => {
        try {
            console.log('➕ Preparing new chat session (welcome screen)');
            
            // Clear current messages and show welcome screen
            setMessages([]);
            setShowSuggestions(true);
            setCurrentSessionId(null);
            setShowSessionList(false);
            
            // Don't create session in database yet
            // Session will be created when user sends first message
            console.log('✅ Welcome screen ready');
            
            return null;
        } catch (error) {
            console.error('❌ Failed to prepare new session:', error);
            return null;
        }
    };

    const handleNewChat = async () => {
        console.log('➕ Creating new chat session');
        // Always create new session when user clicks "Chat Baru"
        await createNewSession();
    };

    const switchSession = async (sessionId) => {
        try {
            console.log('🔄 Switching to session:', sessionId);
            
            // Clear current messages first to prevent mixing
            setMessages([]);
            setShowSuggestions(true);
            
            const response = await fetch(`${BACKEND_URL}/api/v2/chat/sessions/detail/${sessionId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const session = await response.json();
            
            console.log('📦 Loaded session:', session);
            console.log('💬 Messages in session:', session.messages?.length || 0);
            
            setCurrentSessionId(sessionId);
            
            const loadedMessages = session.messages?.map(msg => ({
                id: msg.id,
                type: msg.role,
                content: msg.content,
                timestamp: new Date(msg.created_at)
            })) || [];
            
            console.log('✅ Setting messages for session:', loadedMessages);
            setMessages(loadedMessages);
            setShowSuggestions(loadedMessages.length === 0);
            setShowSessionList(false);
            
            // Clear suggested questions when switching
            setSuggestedQuestions([]);
        } catch (error) {
            console.error('❌ Failed to switch session:', error);
            alert('Gagal memuat percakapan. Silakan coba lagi.');
        }
    };

    const deleteSession = async (sessionId, event) => {
        // Prevent triggering switchSession
        if (event) {
            event.stopPropagation();
        }
        
        try {
            console.log('🗑️ Deleting session:', sessionId);
            
            // Confirm deletion
            const confirmDelete = window.confirm('Hapus percakapan ini? Tindakan ini tidak dapat dibatalkan.');
            if (!confirmDelete) {
                return;
            }
            
            const response = await fetch(`${BACKEND_URL}/api/v2/chat/sessions/${sessionId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete session');
            }
            
            console.log('✅ Session deleted successfully');
            
            // Remove from local state
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            
            // If deleted session was current, create new one or switch to another
            if (sessionId === currentSessionId) {
                const remainingSessions = sessions.filter(s => s.id !== sessionId);
                if (remainingSessions.length > 0) {
                    // Switch to most recent remaining session
                    await switchSession(remainingSessions[0].id);
                } else {
                    // No sessions left, create new one
                    await createNewSession();
                }
            }
        } catch (error) {
            console.error('❌ Failed to delete session:', error);
            alert('Gagal menghapus percakapan. Silakan coba lagi.');
        }
    };
    const saveMessageToDatabase = async (sessionId, role, content) => {
        try {
            console.log(`💾 Saving message to DB - Session: ${sessionId}, Role: ${role}, Content length: ${content.length}`);
            const response = await fetch(`${BACKEND_URL}/api/v2/chat/sessions/${sessionId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, content })
            });
            
            if (!response.ok) {
                console.error('❌ Failed to save message:', response.status, response.statusText);
                return null;
            }
            
            const savedMessage = await response.json();
            console.log('✅ Message saved to DB:', savedMessage.id);
            return savedMessage;
        } catch (error) {
            console.error('❌ Error saving message to DB:', error);
            return null;
        }
    };

    const updateSessionTitle = async (sessionId, title) => {
        try {
            await fetch(`${BACKEND_URL}/api/v2/chat/sessions/${sessionId}/title?title=${encodeURIComponent(title)}`, {
                method: 'PUT'
            });
        } catch (error) {
            console.error('Failed to update title:', error);
        }
    };

    // Function to check if user is asking for DERMON products
    const isDermonRequest = (message) => {
        const dermonKeywords = [
            'dermon', 'area intim', 'intimate', 'pria', 'laki-laki', 'cowok',
            'reboot cream', 'freshcore', 'intimate wash', 'intimate lotion',
            'body wash', 'deodorant', 'perawatan pria', 'produk pria',
            'bau badan', 'bau tidak sedap', 'kelembapan intim', 'kulit sensitif pria'
        ];
        
        const lowerMessage = message.toLowerCase();
        return dermonKeywords.some(keyword => lowerMessage.includes(keyword));
    };

    // Function to check if user is asking for product recommendations
    const isProductRecommendationRequest = (message) => {
        const keywords = [
            // Direct product requests
            'rekomendasi produk', 'produk skincare', 'produk kulit', 'produk untuk', 'produk yang bagus',
            'produk terbaik', 'merk skincare', 'brand skincare', 'beautylatory',
            
            // Product types
            'serum', 'moisturizer', 'cleanser', 'sunscreen', 'toner', 'essence', 'cream', 'lotion', 'gel',
            'pembersih', 'pelembap', 'tabir surya', 'krim', 'sabun muka',
            
            // Recommendation patterns
            'rekomendasi', 'rekomendasiin', 'saranin', 'kasih tau produk', 'ada produk',
            'skincare untuk', 'rekomendasi untuk', 'cocok untuk kulit', 'bagus untuk',
            
            // Shopping intent
            'mau beli', 'pengen coba', 'butuh produk', 'cari produk', 'pilih produk',
            'produk apa', 'pakai produk', 'gunakan produk'
        ];
        
        const lowerMessage = message.toLowerCase();
        
        // Check for direct keyword matches
        const hasKeyword = keywords.some(keyword => lowerMessage.includes(keyword));
        
        // Check for question patterns about products
        const questionPatterns = [
            /ada.*produk/i,
            /produk.*apa/i,
            /bagus.*produk/i,
            /cocok.*produk/i,
            /pakai.*apa/i,
            /gunakan.*apa/i,
            /buat.*kulit/i
        ];
        
        const hasQuestionPattern = questionPatterns.some(pattern => pattern.test(message));
        
        return hasKeyword || hasQuestionPattern;
    };

    // Function to fetch products from Beautylatory API
    const fetchBeautylatory = async (page = 1) => {
        try {
            const apiUrl = import.meta.env.VITE_PRODUCTS_API_URL;
            console.log(`🌐 API URL: ${apiUrl}`);
            console.log(`🌐 Fetching Beautylatory products from page ${page}...`);
            
            const response = await fetch(`${apiUrl}?page=${page}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            console.log(`✅ Fetched ${data.data?.length || 0} products from page ${page}`);
            return data;
        } catch (error) {
            console.error(`❌ Error fetching Beautylatory products from page ${page}:`, error);
            return null;
        }
    };

    const callGroqAPI = async (conversationHistory) => {
        try {
            const currentMode = CHAT_MODES[chatMode];
            
            // Check if user is asking for product recommendations
            const lastUserMessage = conversationHistory[conversationHistory.length - 1];
            const isProductRequest = lastUserMessage && lastUserMessage.role === 'user' && 
                                   isProductRecommendationRequest(lastUserMessage.content);
            
            console.log('🔍 Product request check:', {
                message: lastUserMessage?.content,
                isProductRequest: isProductRequest
            });
            
            // Check for DERMON product requests
            const isDermonProductRequest = isDermonRequest(lastUserMessage?.content || '');
            
            let productData = null;
            let systemMessage = {
                role: 'system',
                content: `Anda adalah Cantik AI, asisten dermatologi pribadi yang ramah dan profesional. Anda membantu pengguna dengan:
- Analisis kondisi kulit
- Rekomendasi produk skincare
- Tips perawatan kulit harian
- Menjawab pertanyaan tentang skincare

Berikan jawaban dalam Bahasa Indonesia yang natural, informatif, dan mudah dipahami. 
Format jawaban dengan markdown untuk readability:
- Gunakan **bold** untuk emphasis
- Gunakan numbered list (1. 2. 3.) untuk langkah-langkah
- Gunakan bullet points (- ) untuk list items
- Gunakan emoji 🌸 sesekali untuk membuat percakapan lebih hangat

Jaga jawaban tetap concise dan to the point.`
            };

            // Handle DERMON product requests
            if (isDermonProductRequest) {
                console.log('🧴 User asking for DERMON products...');
                
                systemMessage.content += `

PENTING: User bertanya tentang produk DERMON untuk perawatan pria. Berikan informasi tentang produk DERMON yang tersedia:

PRODUK DERMON TERSEDIA:
${DERMON_PRODUCTS.map(product => `- ${product.name}: ${product.description}`).join('\n')}

INSTRUKSI:
1. Jelaskan produk DERMON yang sesuai dengan kebutuhan user
2. Berikan informasi manfaat dan kegunaan produk
3. JANGAN berikan link dalam teks, karena akan ditampilkan sebagai tombol terpisah
4. Fokus pada rekomendasi produk yang paling sesuai
5. Gunakan bahasa yang informatif dan profesional

FORMAT RESPONSE:
Berikan rekomendasi produk DERMON dengan penjelasan singkat untuk setiap produk yang relevan.`;

            } else if (isProductRequest) {
                console.log('🛍️ User asking for product recommendations, fetching from Beautylatory API...');
                
                // Try page 1 first
                productData = await fetchBeautylatory(1);
                
                // If no relevant products found, try page 2
                if (!productData || !productData.data || productData.data.length === 0) {
                    console.log('📄 No products on page 1, trying page 2...');
                    productData = await fetchBeautylatory(2);
                }
                
                if (productData && productData.data && productData.data.length > 0) {
                    // Format product data for AI
                    const productsInfo = productData.data.map(product => ({
                        name: product.name,
                        slug: product.slug,
                        category: product.category.name,
                        description: product.description.substring(0, 300) + '...' // Increased for better context
                    }));
                    
                    console.log('📦 Products fetched:', productsInfo.length);
                    
                    systemMessage.content += `

PENTING: Anda sekarang memiliki akses ke data produk BEAUTYLATORY terbaru. WAJIB gunakan data ini untuk memberikan rekomendasi yang spesifik:

PRODUK BEAUTYLATORY TERSEDIA:
${JSON.stringify(productsInfo, null, 2)}

INSTRUKSI WAJIB untuk rekomendasi produk:
1. SELALU gunakan produk dari data di atas
2. WAJIB berikan link markdown yang benar: [Nama Produk](/products/SLUG)
3. Jelaskan manfaat spesifik dari produk tersebut
4. Rekomendasikan 2-3 produk yang paling relevan
5. JANGAN rekomendasikan produk lain selain yang ada di data

FORMAT MARKDOWN YANG BENAR:
**Rekomendasi Produk BEAUTYLATORY untuk Anda:**

1. **[BEAUTYLATORY - Urban Shield Serum 20 ml](/products/beautylatory-urban-shield-serum-20-ml)**
   - Melindungi dari polusi dan radikal bebas
   - Mengandung niacinamide dan ceramide

2. **[BEAUTYLATORY - PHYTOSYNC UV Defense Hybrid Sunscreen 50 gr](/products/beautylatory-phytosync-uv-defense-hybrid-sunscreen-50-gr)**
   - Perlindungan UV optimal
   - Formula hybrid yang ringan

PENTING: Gunakan format [Nama Produk](/products/slug) - BUKAN [/products/slug] saja!
INGAT: Hanya rekomendasikan produk BEAUTYLATORY yang ada di data!`;
                } else {
                    console.log('❌ No products fetched from API');
                }
            }

            // OPTIMIZATION: Only send last N messages to save tokens
            const recentMessages = conversationHistory.slice(-MAX_CONTEXT_MESSAGES);
            
            console.log(`💰 Token optimization: Sending ${recentMessages.length} of ${conversationHistory.length} messages`);
            console.log(`🎯 Using ${currentMode.name} mode: ${currentMode.model} (max ${currentMode.maxTokens} tokens)`);

            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: currentMode.model,
                    messages: [systemMessage, ...recentMessages],
                    temperature: 0.7,
                    max_tokens: currentMode.maxTokens,
                    top_p: 0.9
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Groq API error');
            }

            const data = await response.json();
            
            // Log token usage
            if (data.usage) {
                console.log(`📊 Token usage: ${data.usage.prompt_tokens} prompt + ${data.usage.completion_tokens} completion = ${data.usage.total_tokens} total`);
            }
            
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Groq API Error:', error);
            throw error;
        }
    };

    const generateSuggestedQuestions = async (lastAiResponse) => {
        try {
            console.log('🤔 Generating suggested questions based on AI response');
            
            const systemMessage = {
                role: 'system',
                content: `Kamu adalah asisten yang membuat pertanyaan follow-up. Berdasarkan respons AI berikut, buatlah HANYA 3 pertanyaan follow-up yang relevan dan natural dalam Bahasa Indonesia.

PENTING: 
- Jangan tulis "Berikut 3 pertanyaan..." atau pengantar apapun
- Langsung tulis 3 pertanyaan saja
- Setiap pertanyaan maksimal 8 kata
- Pisahkan dengan karakter "|"
- Pertanyaan harus spesifik dan relevan dengan topik yang dibahas

Contoh format yang BENAR:
"Pabriknya berdiri di lokasi aman?|Bagaimana cara memilih produk?|Apakah cocok untuk kulit sensitif?"

Respons AI: "${lastAiResponse.substring(0, 600)}"`
            };

            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [systemMessage],
                    temperature: 0.7,
                    max_tokens: 150
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate suggestions');
            }

            const data = await response.json();
            let suggestionsText = data.choices[0].message.content.trim();
            
            // Remove common prefixes if AI still adds them
            suggestionsText = suggestionsText
                .replace(/^(Berikut|Here are|Ini dia|Pertanyaan follow-up|Follow-up questions?).*?:/gi, '')
                .replace(/^\d+\.\s*/gm, '') // Remove numbering like "1. "
                .trim();
            
            const questions = suggestionsText
                .split('|')
                .map(q => q.trim())
                .filter(q => q.length > 0 && q.length < 100) // Filter out too long or empty
                .slice(0, 3);
            
            console.log('✅ Generated suggestions:', questions);
            
            if (questions.length >= 2) {
                setSuggestedQuestions(questions);
            } else {
                // Fallback to empty if not enough questions
                setSuggestedQuestions([]);
            }
        } catch (error) {
            console.error('❌ Failed to generate suggestions:', error);
            // Fallback to default suggestions
            setSuggestedQuestions([]);
        }
    };

    const handleSendMessage = async (text = inputMessage) => {
        if (!text.trim()) return;

        // TOKEN CHECK
        const guest = !isAuthenticated() || isGuestSession();
        const tokenCheck = checkAndUseToken('chat', guest);
        
        if (!tokenCheck.success) {
            alert(tokenCheck.message + '\n\nLogin untuk unlimited chat!');
            return;
        }

        // Check if user is logged in
        if (!userId) {
            alert('Silakan lakukan scan wajah terlebih dahulu untuk menggunakan fitur chat.');
            return;
        }

        // If no current session, create one first
        if (!currentSessionId) {
            console.log('📝 No session yet, creating new session');
            try {
                const response = await fetch(`${BACKEND_URL}/api/v2/chat/sessions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        title: text.substring(0, 30) + (text.length > 30 ? '...' : '')
                    })
                });
                
                if (!response.ok) {
                    console.error('❌ Failed to create session');
                    return;
                }
                
                const newSession = await response.json();
                console.log('✅ New session created:', newSession.id);
                setCurrentSessionId(newSession.id);
                
                // Refresh sessions list to include new session
                await refreshSessionsList();
                
                // Now send the message with the new session ID
                await sendMessageToSession(newSession.id, text);
            } catch (error) {
                console.error('❌ Failed to create session:', error);
                return;
            }
        } else {
            // Session exists, just send message
            await sendMessageToSession(currentSessionId, text);
        }
    };

    const sendMessageToSession = async (sessionId, text) => {
        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: text,
            timestamp: new Date()
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputMessage('');
        setIsTyping(true);
        setShowSuggestions(false);

        // Save user message to database
        await saveMessageToDatabase(sessionId, 'user', text);

        // Update session title with first message (if this is the first message)
        if (messages.length === 0) {
            const title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
            await updateSessionTitle(sessionId, title);
            
            // Refresh sessions list to get updated title and include all sessions
            await refreshSessionsList();
        }

        try {
            // Prepare conversation history for Groq
            const conversationHistory = newMessages.map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));

            // Call Groq API
            const aiResponse = await callGroqAPI(conversationHistory);

            const aiMessage = {
                id: Date.now() + 1,
                type: 'assistant',
                content: aiResponse,
                timestamp: new Date()
            };

            const finalMessages = [...newMessages, aiMessage];
            setMessages(finalMessages);

            // Save AI response to database
            await saveMessageToDatabase(sessionId, 'assistant', aiResponse);
            
            // Generate suggested follow-up questions
            await generateSuggestedQuestions(aiResponse);
            
            // Update local sessions list without reloading everything
            setSessions(prev => prev.map(s => 
                s.id === sessionId 
                    ? { ...s, updated_at: new Date().toISOString() }
                    : s
            ));

        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = {
                id: Date.now() + 1,
                type: 'assistant',
                content: 'Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba lagi. 🌸',
                timestamp: new Date()
            };
            setMessages([...newMessages, errorMessage]);
            
            // Save error message to database
            await saveMessageToDatabase(sessionId, 'assistant', errorMessage.content);
        } finally {
            setIsTyping(false);
        }
    };

    // Handle initial message from Home page
    useEffect(() => {
        if (location.state?.initialMessage && !initialMessageProcessed.current && !isLoading) {
            initialMessageProcessed.current = true;
            const message = location.state.initialMessage;
            
            console.log('📝 Sending initial message');
            // Send message (will create session automatically if needed)
            handleSendMessage(message);
            
            // Clear the state
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, isLoading]);

    const handleQuickAction = (text) => {
        handleSendMessage(text);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (isLoading) {
        return (
            <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(180deg, #faf6f8 0%, #f1d3e2 100%)' }}>
                <div style={{ textAlign: 'center' }}>
                    <Sparkles size={48} color="var(--primary-color)" style={{ animation: 'pulse 2s infinite' }} />
                    <p style={{ marginTop: '16px', color: 'var(--text-body)', fontFamily: 'var(--font-sans)' }}>Memuat chat...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container" style={{ background: 'linear-gradient(180deg, #faf6f8 0%, #f1d3e2 100%)', position: 'relative', overflow: 'hidden', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Decorative Background Blobs */}
            <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(157, 90, 118, 0.15), transparent)', filter: 'blur(60px)', pointerEvents: 'none' }}></div>
            <div style={{ position: 'absolute', bottom: '-150px', left: '-100px', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(241, 211, 226, 0.3), transparent)', filter: 'blur(80px)', pointerEvents: 'none' }}></div>

            {/* Header */}
            <div style={{ 
                position: 'sticky', 
                top: 0, 
                zIndex: 100,
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(30px)',
                borderBottom: '1px solid rgba(157, 90, 118, 0.1)',
                padding: '16px 20px',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, var(--primary-color), var(--primary-light))',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(157, 90, 118, 0.25)',
                        padding: '8px'
                    }}>
                        <img src={CantikLogo} alt="Cantik AI" style={{ width: '100%', height: '100%', filter: 'brightness(0) invert(1)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 className="headline" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '2px', fontFamily: 'var(--font-serif)' }}>
                            cantik.ai 
                        </h2>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-body)', fontFamily: 'var(--font-sans)' }}>
                            ai dermatologi assistant
                        </p>
                    </div>
                    <div 
                        style={{ 
                            width: 36, 
                            height: 36, 
                            borderRadius: '50%', 
                            background: 'rgba(255,255,255,0.6)',
                            backdropFilter: 'blur(20px)',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: '1px solid rgba(255,255,255,0.8)',
                            boxShadow: '0 4px 12px rgba(157, 90, 118, 0.08)'
                        }}
                        onClick={() => navigate('/')}
                    >
                        <Home size={18} color="var(--text-headline)" />
                    </div>
                    <div 
                        style={{ 
                            width: 36, 
                            height: 36, 
                            borderRadius: '50%', 
                            background: 'rgba(255,255,255,0.6)',
                            backdropFilter: 'blur(20px)',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: '1px solid rgba(255,255,255,0.8)',
                            boxShadow: '0 4px 12px rgba(157, 90, 118, 0.08)'
                        }}
                        onClick={() => setShowSessionList(!showSessionList)}
                    >
                        <MessageSquare size={18} color="var(--primary-color)" />
                    </div>
                    <div 
                        style={{ 
                            width: 36, 
                            height: 36, 
                            borderRadius: '50%', 
                            background: 'rgba(255,255,255,0.6)',
                            backdropFilter: 'blur(20px)',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: '1px solid rgba(255,255,255,0.8)',
                            boxShadow: '0 4px 12px rgba(157, 90, 118, 0.08)'
                        }}
                        onClick={handleNewChat}
                    >
                        <Plus size={18} color="var(--primary-color)" />
                    </div>
                </div>
            </div>

            {/* Session List Sidebar - Slide from Right */}
            {showSessionList && (
                <>
                    {/* Backdrop */}
                    <div 
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.3)',
                            zIndex: 199,
                            animation: 'fadeIn 0.2s ease'
                        }}
                        onClick={() => setShowSessionList(false)}
                    />
                    
                    {/* Sidebar */}
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        right: 0,
                        width: '85%',
                        maxWidth: '360px',
                        height: '100vh',
                        background: 'linear-gradient(180deg, #ffffff 0%, #faf6f8 100%)',
                        boxShadow: '-4px 0 24px rgba(157, 90, 118, 0.15)',
                        zIndex: 200,
                        display: 'flex',
                        flexDirection: 'column',
                        animation: 'slideInRight 0.3s ease'
                    }}>
                        {/* Sidebar Header */}
                        <div style={{
                            padding: '20px',
                            borderBottom: '1px solid rgba(157, 90, 118, 0.1)',
                            background: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(20px)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <h3 style={{ 
                                    fontSize: '1.1rem', 
                                    fontWeight: 600, 
                                    color: 'var(--text-headline)', 
                                    fontFamily: 'var(--font-serif)',
                                    margin: 0
                                }}>
                                    Riwayat Chat
                                </h3>
                                <div 
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        background: 'rgba(157, 90, 118, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onClick={() => setShowSessionList(false)}
                                >
                                    <span style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }}>×</span>
                                </div>
                            </div>
                            <p style={{ 
                                fontSize: '0.75rem', 
                                color: 'var(--text-body)', 
                                fontFamily: 'var(--font-sans)',
                                margin: 0
                            }}>
                                {sessions.length} percakapan tersimpan
                            </p>
                        </div>

                        {/* Sessions List */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '12px'
                        }} className="no-scrollbar">
                            {sessions.length === 0 ? (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    padding: '40px 20px',
                                    textAlign: 'center'
                                }}>
                                    <MessageSquare size={48} color="rgba(157, 90, 118, 0.3)" style={{ marginBottom: '16px' }} />
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', fontFamily: 'var(--font-sans)' }}>
                                        Belum ada riwayat chat
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', fontFamily: 'var(--font-sans)', marginTop: '8px' }}>
                                        Mulai percakapan baru dengan Cantik AI
                                    </p>
                                </div>
                            ) : (
                                sessions.map((session, index) => {
                                    const messageCount = session.messages?.length || 0;
                                    return (
                                        <div
                                            key={session.id}
                                            onClick={() => {
                                                switchSession(session.id);
                                                setShowSessionList(false);
                                            }}
                                            style={{
                                                padding: '16px',
                                                borderRadius: '16px',
                                                marginBottom: '8px',
                                                cursor: 'pointer',
                                                background: session.id === currentSessionId 
                                                    ? 'linear-gradient(135deg, rgba(157, 90, 118, 0.15), rgba(241, 211, 226, 0.15))'
                                                    : 'rgba(255, 255, 255, 0.6)',
                                                border: session.id === currentSessionId 
                                                    ? '2px solid var(--primary-color)' 
                                                    : '2px solid transparent',
                                                transition: 'all 0.2s',
                                                boxShadow: session.id === currentSessionId 
                                                    ? '0 4px 12px rgba(157, 90, 118, 0.15)'
                                                    : '0 2px 8px rgba(0, 0, 0, 0.05)',
                                                position: 'relative'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                <p style={{ 
                                                    fontSize: '0.9rem', 
                                                    fontWeight: 600, 
                                                    color: 'var(--text-headline)', 
                                                    fontFamily: 'var(--font-sans)', 
                                                    margin: 0,
                                                    flex: 1,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    lineHeight: 1.4,
                                                    paddingRight: '8px'
                                                }}>
                                                    {session.title}
                                                </p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                    {messageCount > 0 && (
                                                        <span style={{ 
                                                            fontSize: '0.7rem', 
                                                            fontWeight: 600,
                                                            color: 'white',
                                                            background: session.id === currentSessionId 
                                                                ? 'var(--primary-color)'
                                                                : 'rgba(157, 90, 118, 0.6)',
                                                            padding: '4px 10px',
                                                            borderRadius: '12px'
                                                        }}>
                                                            {messageCount}
                                                        </span>
                                                    )}
                                                    <div
                                                        onClick={(e) => deleteSession(session.id, e)}
                                                        style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '8px',
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            border: '1px solid rgba(239, 68, 68, 0.2)'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                                            e.currentTarget.style.transform = 'scale(1.05)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                                            e.currentTarget.style.transform = 'scale(1)';
                                                        }}
                                                    >
                                                        <Trash2 size={14} color="#ef4444" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-body)', fontFamily: 'var(--font-sans)' }}>
                                                    {new Date(session.updated_at || session.timestamp).toLocaleString('id-ID', { 
                                                        hour: '2-digit', 
                                                        minute: '2-digit', 
                                                        day: 'numeric', 
                                                        month: 'short' 
                                                    })}
                                                </span>
                                                {session.id === currentSessionId && (
                                                    <span style={{
                                                        fontSize: '0.65rem',
                                                        fontWeight: 600,
                                                        color: 'var(--primary-color)',
                                                        background: 'rgba(157, 90, 118, 0.1)',
                                                        padding: '2px 8px',
                                                        borderRadius: '8px'
                                                    }}>
                                                        Aktif
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Sidebar Footer */}
                        <div style={{
                            padding: '16px 20px',
                            borderTop: '1px solid rgba(157, 90, 118, 0.1)',
                            background: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(20px)'
                        }}>
                            <button
                                onClick={() => {
                                    handleNewChat();
                                    setShowSessionList(false);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, var(--primary-color), var(--primary-light))',
                                    color: 'white',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    fontFamily: 'var(--font-sans)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(157, 90, 118, 0.25)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Plus size={18} />
                                <span>Chat Baru</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Messages Container */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '170px 20px 120px 20px',
                position: 'relative'
            }} className="no-scrollbar">
                {messages.length === 0 && showSuggestions ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '24px' }}>
                        {/* Banner Slider - Full width with minimal padding */}
                        <div style={{ width: '100%', padding: '0 8px' }}>
                            {banners.length > 0 && (
                                <div 
                                    style={{ 
                                        position: 'relative', 
                                        width: '100%',
                                        maxWidth: '100%',
                                        borderRadius: '24px', 
                                        overflow: 'hidden',
                                        height: '200px',
                                        boxShadow: '0 8px 24px rgba(157, 90, 118, 0.2)'
                                    }}
                                    onTouchStart={(e) => {
                                        const touchStart = e.targetTouches[0].clientX;
                                        e.currentTarget.dataset.touchStart = touchStart;
                                    }}
                                    onTouchMove={(e) => {
                                        const touchEnd = e.targetTouches[0].clientX;
                                        e.currentTarget.dataset.touchEnd = touchEnd;
                                    }}
                                    onTouchEnd={(e) => {
                                        const touchStart = parseFloat(e.currentTarget.dataset.touchStart || 0);
                                        const touchEnd = parseFloat(e.currentTarget.dataset.touchEnd || 0);
                                        if (touchStart - touchEnd > 50) {
                                            setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
                                        }
                                        if (touchStart - touchEnd < -50) {
                                            setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
                                        }
                                    }}
                                >
                                    {banners.map((banner, index) => (
                                        <div
                                            key={banner.id}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                opacity: index === currentBannerIndex ? 1 : 0,
                                                transition: 'opacity 0.5s ease',
                                                cursor: banner.link_url ? 'pointer' : 'default'
                                            }}
                                            onClick={() => banner.link_url && navigate(banner.link_url)}
                                        >
                                            <img 
                                                src={apiService.resolveMediaUrl(banner.image_url)} 
                                                alt={banner.title}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        </div>
                                    ))}
                                    
                                    {banners.length > 1 && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '16px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            display: 'flex',
                                            gap: '8px',
                                            zIndex: 10
                                        }}>
                                            {banners.map((_, index) => (
                                                <div
                                                    key={index}
                                                    onClick={() => setCurrentBannerIndex(index)}
                                                    style={{
                                                        width: index === currentBannerIndex ? '28px' : '8px',
                                                        height: '8px',
                                                        borderRadius: '4px',
                                                        background: index === currentBannerIndex ? 'white' : 'rgba(255,255,255,0.5)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Welcome Message - Normal padding */}
                        <div style={{ width: '100%', padding: '0 20px', display: 'flex', justifyContent: 'center' }}>
                            <div style={{
                                textAlign: 'center',
                                maxWidth: '500px'
                            }}>
                                <h3 className="headline" style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '10px', fontFamily: 'var(--font-serif)' }}>
                                    Halo! Ada yang bisa saya bantu?
                                </h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>
                                    Tanyakan apa saja tentang perawatan kulit Anda
                                </p>
                            </div>
                        </div>

                        {/* Quick Actions - Normal padding, not affected by banner width */}
                        <div style={{ width: '100%', padding: '0 20px', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '500px' }}>
                                {quickActions.map((action, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleQuickAction(action.prompt)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px 14px',
                                            borderRadius: '16px',
                                            background: 'rgba(255, 255, 255, 0.4)',
                                            backdropFilter: 'blur(25px)',
                                            border: '1px solid rgba(255,255,255,0.6)',
                                            boxShadow: '0 2px 8px rgba(157, 90, 118, 0.06)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateX(3px)';
                                            e.currentTarget.style.boxShadow = '0 3px 12px rgba(157, 90, 118, 0.1)';
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateX(0)';
                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(157, 90, 118, 0.06)';
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)';
                                        }}
                                    >
                                        {/* Icon Container - Smaller */}
                                        <div 
                                            className="icon-container"
                                            style={{ 
                                                width: 42, 
                                                height: 42, 
                                                borderRadius: '11px', 
                                                background: 'rgba(255, 255, 255, 0.5)',
                                                backdropFilter: 'blur(20px)',
                                                border: '1px solid rgba(255,255,255,0.7)',
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                boxShadow: '0 2px 8px rgba(157, 90, 118, 0.06)',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <action.icon size={20} color="var(--primary-color)" />
                                        </div>
                                        
                                        {/* Text Content - Smaller font */}
                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                            <p style={{ 
                                                fontSize: '0.8rem', 
                                                color: 'var(--text-body)', 
                                                fontFamily: 'var(--font-sans)',
                                                lineHeight: 1.35,
                                                margin: 0,
                                                fontWeight: 400,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical'
                                            }}>
                                                {action.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((message) => (
                            <div 
                                key={message.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                                    marginBottom: '16px',
                                    animation: 'slideUp 0.3s ease'
                                }}
                            >
                                <div
                                    style={{
                                        maxWidth: '90%',
                                        padding: '14px 18px',
                                        borderRadius: message.type === 'user' ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
                                        background: message.type === 'user' 
                                            ? 'linear-gradient(135deg, var(--primary-color), var(--primary-light))'
                                            : 'rgba(255, 255, 255, 0.6)',
                                        backdropFilter: 'blur(30px)',
                                        border: message.type === 'user' ? 'none' : '1px solid rgba(255,255,255,0.8)',
                                        boxShadow: message.type === 'user' 
                                            ? '0 4px 16px rgba(157, 90, 118, 0.25)'
                                            : '0 4px 16px rgba(157, 90, 118, 0.08)'
                                    }}
                                >
                                    {message.type === 'user' ? (
                                        <p style={{
                                            fontSize: '0.9rem',
                                            lineHeight: 1.6,
                                            color: 'white',
                                            fontFamily: 'var(--font-sans)',
                                            margin: 0
                                        }}>
                                            {message.content}
                                        </p>
                                    ) : (
                                        <div style={{
                                            fontSize: '0.9rem',
                                            lineHeight: 1.6,
                                            color: 'var(--text-headline)',
                                            fontFamily: 'var(--font-sans)'
                                        }} className="markdown-content">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({node, ...props}) => <p style={{ margin: '0 0 8px 0' }} {...props} />,
                                                    strong: ({node, ...props}) => <strong style={{ fontWeight: 600, color: 'var(--primary-color)' }} {...props} />,
                                                    a: ({node, href, children, ...props}) => {
                                                        // Handle internal links (starting with /)
                                                        if (href && href.startsWith('/')) {
                                                            return (
                                                                <span
                                                                    onClick={() => navigate(href)}
                                                                    style={{
                                                                        color: 'var(--primary-color)',
                                                                        textDecoration: 'underline',
                                                                        cursor: 'pointer',
                                                                        fontWeight: 500
                                                                    }}
                                                                    {...props}
                                                                >
                                                                    {children}
                                                                </span>
                                                            );
                                                        }
                                                        // Handle external links
                                                        return (
                                                            <a
                                                                href={href}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    color: 'var(--primary-color)',
                                                                    textDecoration: 'underline'
                                                                }}
                                                                {...props}
                                                            >
                                                                {children}
                                                            </a>
                                                        );
                                                    },
                                                    ul: ({node, ...props}) => <ul style={{ margin: '8px 0', paddingLeft: '20px' }} {...props} />,
                                                    ol: ({node, ...props}) => <ol style={{ margin: '8px 0', paddingLeft: '20px' }} {...props} />,
                                                    li: ({node, ...props}) => <li style={{ marginBottom: '4px' }} {...props} />,
                                                    h1: ({node, ...props}) => <h1 style={{ fontSize: '1.2rem', fontWeight: 600, margin: '12px 0 8px 0', fontFamily: 'var(--font-serif)' }} {...props} />,
                                                    h2: ({node, ...props}) => <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '12px 0 8px 0', fontFamily: 'var(--font-serif)' }} {...props} />,
                                                    h3: ({node, ...props}) => <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '10px 0 6px 0', fontFamily: 'var(--font-serif)' }} {...props} />,
                                                    table: ({node, ...props}) => <table style={{ borderCollapse: 'collapse', width: '100%', margin: '12px 0', fontSize: '0.85rem' }} {...props} />,
                                                    thead: ({node, ...props}) => <thead style={{ background: 'rgba(157, 90, 118, 0.1)' }} {...props} />,
                                                    tbody: ({node, ...props}) => <tbody {...props} />,
                                                    tr: ({node, ...props}) => <tr style={{ borderBottom: '1px solid rgba(157, 90, 118, 0.2)' }} {...props} />,
                                                    th: ({node, ...props}) => <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--primary-color)' }} {...props} />,
                                                    td: ({node, ...props}) => <td style={{ padding: '8px', textAlign: 'left' }} {...props} />,
                                                }}
                                            >
                                                {message.content}
                                            </ReactMarkdown>

                                            {/* DERMON Products Buttons - Show after AI response if DERMON request detected */}
                                            {message.type === 'assistant' && (() => {
                                                // Find the user message that triggered this AI response
                                                const messageIndex = messages.indexOf(message);
                                                const previousUserMessage = messages.slice(0, messageIndex).reverse().find(m => m.type === 'user');
                                                return previousUserMessage && isDermonRequest(previousUserMessage.content);
                                            })() && (
                                                <div style={{ marginTop: '16px' }}>
                                                    <p style={{ 
                                                        fontSize: '0.85rem', 
                                                        fontWeight: 600, 
                                                        color: 'var(--primary-color)', 
                                                        marginBottom: '12px',
                                                        fontFamily: 'var(--font-sans)'
                                                    }}>
                                                        🛍️ Produk DERMON Tersedia:
                                                    </p>
                                                    <div style={{ 
                                                        display: 'flex', 
                                                        flexDirection: 'column', 
                                                        gap: '8px' 
                                                    }}>
                                                        {DERMON_PRODUCTS.map((product, index) => (
                                                            <button
                                                                key={index}
                                                                onClick={() => window.open(product.link, '_blank', 'noopener,noreferrer')}
                                                                style={{
                                                                    padding: '12px 16px',
                                                                    borderRadius: '12px',
                                                                    border: '2px solid var(--primary-color)',
                                                                    background: 'rgba(157, 90, 118, 0.05)',
                                                                    cursor: 'pointer',
                                                                    textAlign: 'left',
                                                                    transition: 'all 0.2s ease',
                                                                    fontFamily: 'var(--font-sans)',
                                                                    width: '100%'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.background = 'var(--primary-color)';
                                                                    e.currentTarget.style.color = 'white';
                                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(157, 90, 118, 0.25)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.background = 'rgba(157, 90, 118, 0.05)';
                                                                    e.currentTarget.style.color = 'var(--text-headline)';
                                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                                    e.currentTarget.style.boxShadow = 'none';
                                                                }}
                                                            >
                                                                <div style={{ 
                                                                    fontSize: '0.85rem', 
                                                                    fontWeight: 600, 
                                                                    marginBottom: '4px',
                                                                    color: 'inherit'
                                                                }}>
                                                                    {product.name}
                                                                </div>
                                                                <div style={{ 
                                                                    fontSize: '0.75rem', 
                                                                    lineHeight: 1.4,
                                                                    color: 'inherit',
                                                                    opacity: 0.8
                                                                }}>
                                                                    {product.description}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
                                <div style={{
                                    padding: '14px 18px',
                                    borderRadius: '24px 24px 24px 4px',
                                    background: 'rgba(255, 255, 255, 0.6)',
                                    backdropFilter: 'blur(30px)',
                                    border: '1px solid rgba(255,255,255,0.8)'
                                }}>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-color)', animation: 'bounce 1.4s infinite ease-in-out' }}></div>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-color)', animation: 'bounce 1.4s infinite ease-in-out 0.2s' }}></div>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-color)', animation: 'bounce 1.4s infinite ease-in-out 0.4s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Floating Quick Actions (when chatting) */}
            {messages.length > 0 && !isTyping && (
                <div style={{
                    position: 'fixed',
                    bottom: '125px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'calc(100% - 40px)',
                    maxWidth: '560px',
                    display: 'flex',
                    gap: '5px',
                    overflowX: 'auto',
                    padding: '4px 0',
                    zIndex: 50
                }} className="no-scrollbar">
                    {(suggestedQuestions.length > 0 ? suggestedQuestions : quickActions.slice(0, 3).map(a => a.prompt)).map((text, index) => {
                        const isDefaultAction = suggestedQuestions.length === 0;
                        const action = isDefaultAction ? quickActions[index] : null;
                        
                        return (
                            <div
                                key={index}
                                onClick={() => handleQuickAction(text)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '16px',
                                    background: 'rgba(255, 255, 255, 0.7)',
                                    backdropFilter: 'blur(30px)',
                                    border: '1px solid rgba(255,255,255,0.8)',
                                    boxShadow: '0 4px 16px rgba(157, 90, 118, 0.12)',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '0.7rem',
                                    fontFamily: 'var(--font-sans)',
                                    color: 'var(--text-headline)',
                                    fontWeight: 500
                                }}
                            >
                                {isDefaultAction && <action.icon size={13} color="var(--primary-color)" />}
                                {text}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Input Container - Fixed at bottom */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px 20px 20px',
                zIndex: 100
            }}>
                <div style={{
                    maxWidth: '700px',
                    margin: '0 auto'
                }}>
                    {/* Main Input Container - Gemini Style */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '28px',
                        border: '1px solid rgba(157, 90, 118, 0.15)',
                        padding: '12px 12px 8px 12px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        boxShadow: '0 2px 16px rgba(157, 90, 118, 0.08)',
                        transition: 'all 0.2s'
                    }}>
                        {/* Input Field - Full width on top */}
                        <textarea
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Tanya apa saja tentang skincare..."
                            disabled={isTyping}
                            rows={1}
                            style={{
                                width: '100%',
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                fontSize: '0.95rem',
                                color: 'var(--text-headline)',
                                fontFamily: 'var(--font-sans)',
                                padding: '4px 8px',
                                lineHeight: '1.5',
                                resize: 'none',
                                maxHeight: '120px',
                                overflowY: 'auto',
                                scrollbarWidth: 'thin',
                                scrollbarColor: 'rgba(157, 90, 118, 0.3) transparent',
                                minHeight: '24px'
                            }}
                            onInput={(e) => {
                                // Auto-resize textarea
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                            }}
                        />

                        {/* Bottom Row: Mode Dropdown + Spacer + Buttons */}
                        <div style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px'
                        }}>
                            {/* Mode Dropdown - Left */}
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <button
                                    onClick={() => setShowModeDropdown(!showModeDropdown)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '20px',
                                        background: 'linear-gradient(135deg, rgba(157, 90, 118, 0.12), rgba(241, 211, 226, 0.12))',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.2s',
                                        height: '36px',
                                        whiteSpace: 'nowrap',
                                        border: '1px solid rgba(157, 90, 118, 0.15)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(157, 90, 118, 0.18), rgba(241, 211, 226, 0.18))';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(157, 90, 118, 0.12), rgba(241, 211, 226, 0.12))';
                                    }}
                                >
                                    <span style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                                        {CHAT_MODES[chatMode].name}
                                    </span>
                                    <ChevronDown size={12} color="var(--primary-color)" style={{ 
                                        transform: showModeDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s'
                                    }} />
                                </button>

                                {/* Dropdown Menu */}
                                {showModeDropdown && (
                                    <>
                                        <div 
                                            style={{
                                                position: 'fixed',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                zIndex: 150
                                            }}
                                            onClick={() => setShowModeDropdown(false)}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '44px',
                                            left: 0,
                                            minWidth: '200px',
                                            background: 'rgba(255, 255, 255, 0.98)',
                                            backdropFilter: 'blur(30px)',
                                            borderRadius: '16px',
                                            boxShadow: '0 8px 24px rgba(157, 90, 118, 0.2)',
                                            overflow: 'hidden',
                                            zIndex: 200,
                                            animation: 'slideUpFade 0.2s ease',
                                            border: '1px solid rgba(157, 90, 118, 0.15)'
                                        }}>
                                            {Object.entries(CHAT_MODES).map(([key, mode]) => (
                                                <div
                                                    key={key}
                                                    onClick={() => {
                                                        setChatMode(key);
                                                        setShowModeDropdown(false);
                                                        console.log(`🔄 Switched to ${mode.name} mode (${mode.model})`);
                                                    }}
                                                    style={{
                                                        padding: '12px 14px',
                                                        cursor: 'pointer',
                                                        background: chatMode === key 
                                                            ? 'linear-gradient(135deg, rgba(157, 90, 118, 0.1), rgba(241, 211, 226, 0.1))' 
                                                            : 'transparent',
                                                        transition: 'all 0.2s',
                                                        borderLeft: chatMode === key ? `3px solid var(--primary-color)` : '3px solid transparent'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (chatMode !== key) {
                                                            e.currentTarget.style.background = 'rgba(157, 90, 118, 0.05)';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (chatMode !== key) {
                                                            e.currentTarget.style.background = 'transparent';
                                                        }
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                                        <span style={{ fontSize: '1rem' }}>{mode.icon}</span>
                                                        <span style={{ 
                                                            fontSize: '0.85rem', 
                                                            fontWeight: chatMode === key ? 600 : 500,
                                                            color: 'var(--text-headline)',
                                                            fontFamily: 'var(--font-sans)'
                                                        }}>
                                                            {mode.name}
                                                        </span>
                                                    </div>
                                                    <p style={{ 
                                                        fontSize: '0.7rem', 
                                                        color: 'var(--text-body)',
                                                        fontFamily: 'var(--font-sans)',
                                                        margin: 0,
                                                        paddingLeft: '26px'
                                                    }}>
                                                        {mode.description}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Right Side Buttons */}
                            <div style={{
                                display: 'flex',
                                gap: '4px',
                                alignItems: 'center',
                                flexShrink: 0
                            }}>
                                {/* Voice Button */}
                                <button
                                    onClick={handleVoiceInput}
                                    disabled={isTyping}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        border: 'none',
                                        background: isListening 
                                            ? 'linear-gradient(135deg, #ef4444, #f87171)'
                                            : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: isTyping ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        flexShrink: 0,
                                        animation: isListening ? 'pulse 1.5s infinite' : 'none'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isListening && !isTyping) {
                                            e.currentTarget.style.background = 'rgba(157, 90, 118, 0.1)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isListening) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    <Mic size={20} color={isListening ? 'white' : 'var(--text-body)'} />
                                </button>

                                {/* Send Button - Always visible */}
                                <button
                                    onClick={() => handleSendMessage()}
                                    disabled={!inputMessage.trim() || isTyping}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        border: 'none',
                                        background: (inputMessage.trim() && !isTyping)
                                            ? 'linear-gradient(135deg, var(--primary-color), var(--primary-light))'
                                            : 'rgba(200, 200, 200, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: (inputMessage.trim() && !isTyping) ? 'pointer' : 'not-allowed',
                                        transition: 'all 0.2s',
                                        flexShrink: 0,
                                        opacity: 1
                                    }}
                                >
                                    <Send size={18} color={(inputMessage.trim() && !isTyping) ? 'white' : 'rgba(100, 100, 100, 0.5)'} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.3; transform: rotate(var(--rotation)) translateY(-50px) scale(0.8); }
                    50% { opacity: 0.8; transform: rotate(var(--rotation)) translateY(-55px) scale(1); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUpFade {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                /* Custom scrollbar for textarea */
                textarea::-webkit-scrollbar {
                    width: 6px;
                }
                textarea::-webkit-scrollbar-track {
                    background: transparent;
                }
                textarea::-webkit-scrollbar-thumb {
                    background: rgba(157, 90, 118, 0.3);
                    border-radius: 3px;
                }
                textarea::-webkit-scrollbar-thumb:hover {
                    background: rgba(157, 90, 118, 0.5);
                }
            `}</style>
        </div>
    );
};

export default Chat;
