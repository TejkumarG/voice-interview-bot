# Voice Interview Bot - Frontend

Modern Next.js frontend for the AI-powered voice interview assistant.

## Features

- **Voice Input**: Click the microphone button to ask questions using your voice
- **Text Input**: Type questions directly in the chat interface
- **Document Upload**: Upload interview preparation documents (.txt files)
- **Document Selection**: Choose specific documents or search across all
- **Real-time Chat**: Clean, modern chat interface with AI responses
- **Two-Stage RAG**: Smart document retrieval when searching all documents

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Modern, responsive styling
- **Lucide React** - Beautiful icons
- **Axios** - HTTP client for API calls
- **Web Speech API** - Browser-native voice recognition

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend server running on `http://localhost:8000`

### Installation

```bash
npm install
```

### Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Development

```bash
npm run dev
```

Open http://localhost:3000

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page
│   └── globals.css         # Global styles
├── components/
│   ├── VoiceRecorder.tsx   # Voice input button
│   ├── FileUpload.tsx      # Document upload
│   ├── DocumentList.tsx    # Document selection
│   └── ChatInterface.tsx   # Chat UI
├── lib/
│   └── api.ts              # API client
└── package.json
```

## Usage

1. **Upload Document**: Click "Upload Interview Document" to add .txt files
2. **Select Document**: Click a document to search only in that doc, or "All Documents"
3. **Ask Questions**:
   - Voice: Click the microphone and speak
   - Text: Type in the input box and press Enter

## Browser Support

- Chrome (recommended for voice input)
- Edge
- Safari (voice input may have limitations)
- Firefox (voice input not supported)

## Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

Make sure to set environment variables in Vercel dashboard.

## Notes

- Voice recognition requires HTTPS in production
- Only .txt files are supported for upload
- Maximum file size: 5MB
