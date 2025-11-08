'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Sparkles, Loader2, User, MessageCircle, Upload, FileText, Beaker, Network, Trash2, BookOpen, Send, X, Pause, Play, Square, MessageSquare } from 'lucide-react';
import { api, Document, SourceInfo } from '@/lib/api';
import mermaid from 'mermaid';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceInfo[];
}

const SAMPLE_QUESTIONS = [
  "What should we know about your life story in a few sentences?",
  "What's your #1 superpower?",
  "What are the top 3 areas you'd like to grow in?",
  "What misconception do your coworkers have about you?",
  "How do you push your boundaries and limits?",
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'interview' | 'playground' | 'architecture'>('interview');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [selectedSources, setSelectedSources] = useState<SourceInfo[] | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const [currentSources, setCurrentSources] = useState<SourceInfo[]>([]);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    loadDocuments();
    initSpeechRecognition();
    initSpeechSynthesis();
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#9333ea',
        primaryTextColor: '#fff',
        primaryBorderColor: '#c084fc',
        lineColor: '#a855f7',
        secondaryColor: '#ec4899',
        tertiaryColor: '#1e293b'
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'architecture' && mermaidRef.current) {
      mermaidRef.current.removeAttribute('data-processed');
      mermaid.contentLoaded();
    }
  }, [activeTab]);

  const loadDocuments = async () => {
    try {
      const response = await api.listDocuments();
      setDocuments(response.documents);

      const interviewDoc = response.documents.find(d => d.is_interview);
      if (interviewDoc && activeTab === 'interview') {
        setSelectedDocId(interviewDoc.document_id);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const initSpeechRecognition = () => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const rec = new (window as any).webkitSpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        sendMessage(transcript);
      };

      rec.onstart = () => setIsRecording(true);
      rec.onend = () => setIsRecording(false);
      rec.onerror = () => setIsRecording(false);

      setRecognition(rec);
    }
  };

  const initSpeechSynthesis = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  };

  const speakText = (text: string) => {
    if (!synthRef.current) return;

    // Stop any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const pauseSpeech = () => {
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeSpeech = () => {
    if (synthRef.current) {
      synthRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopSpeech = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  const handleVoiceRecord = () => {
    if (!recognition) {
      alert('Voice input not supported. Please use Chrome browser.');
      return;
    }

    if (isRecording) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendMessage(textInput);
      setTextInput('');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, isInterview: boolean) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.txt')) {
      alert('Only .txt files are supported');
      return;
    }

    setUploading(true);
    try {
      await api.uploadDocument(file, isInterview);
      await loadDocuments();
      e.target.value = '';
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || loading) return;

    const isInterviewMode = activeTab === 'interview';
    const docToUse = isInterviewMode ? undefined : selectedDocId ?? undefined;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await api.chat(messageText, docToUse, isInterviewMode);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        sources: response.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Update current sources and speak the response
      if (response.sources && response.sources.length > 0) {
        setCurrentSources(response.sources);
      }
      speakText(response.response);
    } catch (err) {
      console.error('Chat error:', err);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, there was an error processing your message. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
      speakText('Sorry, there was an error processing your message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;

    setDeleting(documentId);
    try {
      await api.deleteDocument(documentId);
      if (selectedDocId === documentId) {
        setSelectedDocId(null);
      }
      await loadDocuments();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete document');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Delete ALL documents? This will permanently clear all data from Pinecone!')) return;
    if (!confirm('Are you absolutely sure? This cannot be undone!')) return;

    setDeleting('all');
    try {
      await api.deleteAllDocuments();
      setSelectedDocId(null);
      setMessages([]);
      await loadDocuments();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to clear data');
    } finally {
      setDeleting(null);
    }
  };

  const interviewDoc = documents.find(d => d.is_interview);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="w-full p-6 h-screen flex flex-col">

        {/* Header with Tabs */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 animate-pulse opacity-50"></div>
                <Mic className="w-7 h-7 text-white relative z-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                  Voice Interview Bot
                  <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
                </h1>
                <p className="text-sm text-purple-300">100x Assessment - AI-Powered Interview</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('interview')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'interview'
                  ? 'bg-white/20 backdrop-blur-xl border border-white/30 text-white shadow-lg'
                  : 'bg-white/5 border border-white/10 text-purple-300 hover:bg-white/10'
              }`}
            >
              <User className="w-4 h-4" />
              Interview Mode
              {documents.length > 0 && (
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full border ${
                  interviewDoc
                    ? 'bg-green-500/30 text-green-200 border-green-400/30'
                    : 'bg-yellow-500/30 text-yellow-200 border-yellow-400/30'
                }`}>
                  {interviewDoc ? 'Ready' : 'No Interview Doc'}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('playground')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'playground'
                  ? 'bg-white/20 backdrop-blur-xl border border-white/30 text-white shadow-lg'
                  : 'bg-white/5 border border-white/10 text-purple-300 hover:bg-white/10'
              }`}
            >
              <Beaker className="w-4 h-4" />
              Playground
              <span className="text-xs text-purple-400">(Test Mode)</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'architecture'
                  ? 'bg-white/20 backdrop-blur-xl border border-white/30 text-white shadow-lg'
                  : 'bg-white/5 border border-white/10 text-purple-300 hover:bg-white/10'
              }`}
            >
              <Network className="w-4 h-4" />
              Architecture
              <span className="text-xs text-purple-400">(System Design)</span>
            </button>
          </div>
        </div>

        {activeTab === 'architecture' ? (
          // Architecture Mode
          <div className="flex-1 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 overflow-auto">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-block p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
                  <Network className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-3">System Architecture</h2>
                <p className="text-purple-200 text-lg">Two-Stage RAG Pipeline with Vector Search</p>
              </div>

              <div ref={mermaidRef} className="mermaid bg-white/5 p-6 rounded-2xl border border-white/10">
{`graph TB
    subgraph Frontend["🎨 FRONTEND LAYER"]
        UI([Next.js 14 + React + TypeScript])
        Voice([Web Speech API])
    end

    subgraph Backend["⚙️ BACKEND - CLEAN ARCHITECTURE"]
        Router{{Router Layer}}
        Service{{Service Layer}}
        Handler{{Handler Layer}}
        Repo{{Repository Layer}}
    end

    subgraph AI["🤖 AI SERVICES"]
        Embed[(OpenAI<br/>Embeddings)]
        LLM[(GPT-4o-mini<br/>LLM)]
    end

    subgraph Storage["💾 VECTOR DATABASE"]
        Pine[("Pinecone<br/>Serverless<br/>1536-dim")]
    end

    subgraph Ingestion["📥 DOCUMENT INGESTION PIPELINE"]
        Upload[/Upload .txt Document/]
        Hash[SHA256 Hash]
        Chunk[Text Chunking<br/>2000 chars]
        EmbedDoc[Generate Embeddings]
        StoreVec[Store Vectors + Metadata]
    end

    subgraph Retrieval["🔍 TWO-STAGE RAG PIPELINE"]
        Query[/User Query/]
        EmbedQ[Embed Query]
        Stage1[STAGE 1<br/>Top-3 Semantic Search]
        Extract[Extract doc_ids]
        Stage2[STAGE 2<br/>Fetch All Chunks]
        Rerank[Re-rank & Select Top-5]
        Generate[Generate Response]
    end

    UI -.->|Voice Input| Voice
    Voice -->|Speech to Text| Router
    UI -->|Text Input| Router
    Router --> Service
    Service --> Handler
    Handler --> Repo
    Repo <-->|Query/Store| Pine

    Upload --> Hash
    Hash --> Chunk
    Chunk --> Embed
    Embed --> EmbedDoc
    EmbedDoc --> StoreVec
    StoreVec -->|Upsert| Pine

    Query --> EmbedQ
    EmbedQ --> Stage1
    Stage1 -->|Search| Pine
    Pine -->|Top-3 Results| Extract
    Extract --> Stage2
    Stage2 -->|Get All| Pine
    Pine -->|All Chunks| Rerank
    Rerank --> LLM
    LLM --> Generate
    Generate -->|Response| UI

    Handler -.->|Use| Embed
    Handler -.->|Use| LLM

    classDef frontendStyle fill:#9333ea,stroke:#c084fc,stroke-width:3px,color:#fff
    classDef backendStyle fill:#7c3aed,stroke:#a78bfa,stroke-width:3px,color:#fff
    classDef aiStyle fill:#ec4899,stroke:#f472b6,stroke-width:3px,color:#fff
    classDef storageStyle fill:#06b6d4,stroke:#22d3ee,stroke-width:3px,color:#fff
    classDef ingestionStyle fill:#10b981,stroke:#34d399,stroke-width:3px,color:#fff
    classDef retrievalStyle fill:#f59e0b,stroke:#fbbf24,stroke-width:3px,color:#fff

    class UI,Voice frontendStyle
    class Router,Service,Handler,Repo backendStyle
    class Embed,LLM aiStyle
    class Pine storageStyle
    class Upload,Hash,Chunk,EmbedDoc,StoreVec ingestionStyle
    class Query,EmbedQ,Stage1,Extract,Stage2,Rerank,Generate retrievalStyle`}
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl">📥</span>
                    Ingestion Pipeline
                  </h3>
                  <ul className="space-y-3 text-purple-200">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span>Upload .txt document with interview flag</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span>Generate SHA256 hash for deduplication</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span>Chunk text: 2000 chars with 300 overlap</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span>Generate embeddings via OpenAI</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span>Store vectors in Pinecone with metadata</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl">🔍</span>
                    Retrieval Pipeline
                  </h3>
                  <ul className="space-y-3 text-purple-200">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span><strong>Stage 1:</strong> Top-3 semantic search across all docs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span>Extract unique document_ids from results</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span><strong>Stage 2:</strong> Fetch ALL chunks from those docs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span>Re-rank by relevance and select top-5</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span>Generate response with GPT-4o-mini</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl">🏗️</span>
                    Clean Architecture
                  </h3>
                  <ul className="space-y-3 text-purple-200">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span><strong>Router:</strong> HTTP layer with FastAPI</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span><strong>Service:</strong> Orchestration logic</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span><strong>Handler:</strong> Business logic & RAG</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span><strong>Repository:</strong> Data access layer</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span>Dependency injection with singletons</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    Key Features
                  </h3>
                  <ul className="space-y-3 text-purple-200">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span>Voice input via Web Speech API</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span>File hash-based deduplication</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span>Interview document flagging</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span>Multi-doc or single-doc search modes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">→</span>
                      <span>Real-time streaming responses</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'interview' ? (
          // Interview Mode
          (
            <div className="flex-1 flex gap-6 overflow-hidden">
              {/* Sample Questions */}
              <div className="w-80 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 overflow-y-auto">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-400" />
                  Sample Questions
                </h3>
                <div className="space-y-3">
                  {SAMPLE_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(q)}
                      disabled={loading}
                      className="w-full text-left p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm text-purple-200 transition-all hover:border-purple-400/50 disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-purple-500/10 border border-purple-400/30 rounded-2xl">
                  <p className="text-xs text-purple-300 leading-relaxed">
                    💡 Click any question or use voice to ask your own
                  </p>
                </div>
              </div>

              {/* Voice-First Interface */}
              <div className="flex-1 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 flex flex-col overflow-hidden shadow-2xl">
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="text-center max-w-xl w-full space-y-8">
                    {/* Status Display */}
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-6">
                        {isRecording ? 'Listening...' : isSpeaking ? 'Bot is speaking...' : loading ? 'Thinking...' : 'Ready'}
                      </h2>
                      {!interviewDoc && documents.length > 0 ? (
                        <p className="text-sm text-yellow-400 mb-6">
                          No interview doc - searching all {documents.length} documents
                        </p>
                      ) : !interviewDoc && (
                        <p className="text-sm text-purple-400 mb-6">
                          Upload documents in Playground to get started
                        </p>
                      )}
                    </div>

                    {/* Voice Controls */}
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={handleVoiceRecord}
                        disabled={loading || isSpeaking}
                        className={`p-12 rounded-full transition-all transform ${
                          isRecording
                            ? 'bg-red-500 recording-pulse shadow-2xl shadow-red-500/50 scale-110'
                            : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Mic className="w-16 h-16 text-white" />
                      </button>

                      {isSpeaking && (
                        <>
                          <button
                            onClick={isPaused ? resumeSpeech : pauseSpeech}
                            className="p-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 transition-all hover:scale-105"
                            title={isPaused ? "Resume" : "Pause"}
                          >
                            {isPaused ? <Play className="w-6 h-6 text-white" /> : <Pause className="w-6 h-6 text-white" />}
                          </button>
                          <button
                            onClick={stopSpeech}
                            className="p-6 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 transition-all hover:scale-105"
                            title="Stop"
                          >
                            <Square className="w-6 h-6 text-red-300" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Sources Display */}
                    {currentSources.length > 0 && (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3 text-sm text-purple-300">
                          <BookOpen className="w-4 h-4" />
                          <span>Sources: {currentSources.length} document{currentSources.length > 1 ? 's' : ''} used</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {currentSources.map((source, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedSources(currentSources)}
                              className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
                            >
                              {source.title.length > 25 ? source.title.substring(0, 25) + '...' : source.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* View Captions Button */}
                    {messages.length > 0 && (
                      <button
                        onClick={() => setShowCaptions(true)}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl text-white font-medium transition-all flex items-center gap-2 mx-auto"
                      >
                        <MessageSquare className="w-5 h-5" />
                        View Conversation Transcript
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          // Playground Mode
          <div className="flex-1 flex gap-6 overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 overflow-y-auto flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                Test Documents
              </h3>

              {/* Upload */}
              <div className="mb-6 space-y-3">
                <label className="block">
                  <input
                    type="file"
                    accept=".txt"
                    onChange={(e) => handleUpload(e, false)}
                    disabled={uploading || deleting !== null}
                    className="hidden"
                  />
                  <div className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-purple-200 transition-all cursor-pointer flex items-center gap-2 justify-center">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload Document
                  </div>
                </label>

                <label className="block">
                  <input
                    type="file"
                    accept=".txt"
                    onChange={(e) => handleUpload(e, true)}
                    disabled={uploading || deleting !== null}
                    className="hidden"
                  />
                  <div className="px-4 py-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-400/30 rounded-xl text-sm text-purple-200 transition-all cursor-pointer flex items-center gap-2 justify-center">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload as Interview Doc ⭐
                  </div>
                </label>

                {documents.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    disabled={deleting !== null}
                    className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-sm text-red-300 transition-all flex items-center gap-2 justify-center disabled:opacity-50"
                  >
                    {deleting === 'all' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Clear All Data
                  </button>
                )}
              </div>

              {/* Documents List */}
              <div className="flex-1 space-y-2">
                <button
                  onClick={() => setSelectedDocId(null)}
                  className={`w-full p-3 rounded-xl text-left transition-all ${
                    selectedDocId === null
                      ? 'bg-white/20 border border-white/30'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <p className="text-sm font-medium text-white">All Documents</p>
                  <p className="text-xs text-purple-300">{documents.length} docs</p>
                </button>

                {documents.map((doc) => (
                  <div
                    key={doc.document_id}
                    className={`group relative p-3 rounded-xl transition-all ${
                      selectedDocId === doc.document_id
                        ? doc.is_interview
                          ? 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border-2 border-yellow-400/50'
                          : 'bg-white/20 border border-white/30'
                        : doc.is_interview
                          ? 'bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-2 border-yellow-400/30 hover:border-yellow-400/50'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedDocId(doc.document_id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className={`w-4 h-4 flex-shrink-0 ${doc.is_interview ? 'text-yellow-400' : 'text-purple-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${doc.is_interview ? 'text-yellow-100' : 'text-white'}`}>
                            {doc.title}
                          </p>
                          <p className="text-xs text-purple-300 flex items-center gap-1">
                            {doc.total_chunks} chunks
                            {doc.is_interview && <span className="text-yellow-400">⭐ Interview</span>}
                          </p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc.document_id);
                      }}
                      disabled={deleting !== null}
                      className="absolute top-2 right-2 p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Delete document"
                    >
                      {deleting === doc.document_id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="flex-1 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 flex flex-col overflow-hidden shadow-2xl">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-xl">
                    <Beaker className="w-20 h-20 mx-auto mb-6 text-purple-400" />
                    <h2 className="text-3xl font-bold text-white mb-4">Playground Mode</h2>
                    <p className="text-purple-200">
                      Upload documents and test the bot with any questions
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                          msg.role === 'user'
                            ? 'bg-white/10 backdrop-blur-xl border border-white/20 text-white'
                            : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/20">
                            <button
                              onClick={() => setSelectedSources(msg.sources || [])}
                              className="flex items-center gap-1 text-xs text-white/70 mb-1 hover:text-white transition-colors cursor-pointer"
                            >
                              <BookOpen className="w-3 h-3" />
                              <span>Sources: {msg.sources.length} doc{msg.sources.length > 1 ? 's' : ''}</span>
                              <span className="text-[10px] opacity-50">(click to view)</span>
                            </button>
                            <div className="flex flex-wrap gap-1">
                              {msg.sources.map((source, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setSelectedSources(msg.sources || [])}
                                  className="text-xs px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                                  title="Click to view source details"
                                >
                                  {source.title.length > 20 ? source.title.substring(0, 20) + '...' : source.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl px-6 py-4">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col items-center gap-4 w-full">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleVoiceRecord}
                    disabled={loading}
                    className={`p-6 rounded-full transition-all ${
                      isRecording
                        ? 'bg-red-500 recording-pulse shadow-2xl shadow-red-500/50'
                        : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:shadow-2xl hover:shadow-purple-500/50'
                    } disabled:opacity-50`}
                  >
                    <Mic className="w-8 h-8 text-white" />
                  </button>
                  <div className="text-sm text-purple-300">
                    {isRecording ? 'Listening...' : 'Use voice'}
                  </div>
                </div>

                <div className="w-full flex items-center gap-2 text-purple-300 text-sm">
                  <div className="flex-1 border-t border-purple-400/30"></div>
                  <span>or type</span>
                  <div className="flex-1 border-t border-purple-400/30"></div>
                </div>

                <form onSubmit={handleTextSubmit} className="w-full flex gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    disabled={loading}
                    placeholder="Type your question here..."
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400/50 transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={loading || !textInput.trim()}
                    className="px-6 py-3 bg-gradient-to-br from-purple-500 to-pink-500 hover:shadow-xl hover:shadow-purple-500/50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sources Modal */}
      {selectedSources && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedSources(null)}
        >
          <div
            className="bg-gradient-to-br from-slate-900 to-purple-900 border border-purple-400/30 rounded-2xl p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-purple-400" />
                Source Chunks Used ({selectedSources.length})
              </h3>
              <button
                onClick={() => setSelectedSources(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="space-y-4">
              {selectedSources.map((source, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 border border-white/10 rounded-xl p-5"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-semibold text-lg mb-2">{source.title}</h4>
                      <div className="flex flex-wrap gap-2 text-xs text-purple-300">
                        <span className="px-3 py-1.5 bg-purple-500/20 border border-purple-400/30 rounded-lg">
                          📄 ID: {source.document_id.substring(0, 16)}...
                        </span>
                        <span className="px-3 py-1.5 bg-pink-500/20 border border-pink-400/30 rounded-lg">
                          📍 Chunk #{source.chunk_number}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wider">
                      Chunk Content:
                    </div>
                    {source.text && source.text.trim() ? (
                      <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                        {source.text}
                      </p>
                    ) : (
                      <p className="text-yellow-300 text-sm italic">
                        ⚠️ Chunk text is empty or unavailable
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg">
              <p className="text-sm text-purple-200 leading-relaxed">
                💡 These are the exact text chunks that were retrieved from your documents and used to generate the AI response.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Captions Modal */}
      {showCaptions && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowCaptions(false)}
        >
          <div
            className="bg-gradient-to-br from-slate-900 to-purple-900 border border-purple-400/30 rounded-2xl p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-purple-400" />
                Conversation Transcript
              </h3>
              <button
                onClick={() => setShowCaptions(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                        : 'bg-gradient-to-br from-purple-500 to-pink-500'
                    }`}>
                      {msg.role === 'user' ? <MessageCircle className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-white font-semibold">
                          {msg.role === 'user' ? 'You' : 'Assistant'}
                        </h4>
                        <span className="text-xs text-purple-300">
                          Message {idx + 1}
                        </span>
                      </div>
                      <p className="text-purple-100 leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg">
              <p className="text-sm text-purple-200 leading-relaxed">
                💡 This is a text transcript of your voice conversation with the assistant.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
