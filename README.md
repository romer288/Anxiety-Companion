# Anxiety Companion

An advanced mental wellness platform providing personalized, adaptive therapeutic support through AI-driven interventions and comprehensive emotional analytics.

## Features

- **AI-Powered Therapeutic Conversations**: Advanced conversational therapy using Claude API
- **Real-time Anxiety Detection**: Sophisticated trigger analysis and anxiety level assessment
- **Multilingual Support**: English, Spanish, and Portuguese with native voice personas
- **Voice Integration**: Speech-to-text and text-to-speech with natural voice synthesis
- **Cross-Platform**: Web and mobile PWA deployment
- **Analytics Dashboard**: Comprehensive emotional intelligence tracking

## Technology Stack

- **Frontend**: React.js with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Anthropic Claude API for therapeutic conversations
- **Voice**: Web Speech API with enhanced voice selection
- **Mobile**: Capacitor for cross-platform deployment

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Anthropic API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd anxiety-companion
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
ANTHROPIC_API_KEY=your-anthropic-api-key-here
DATABASE_URL=your-postgresql-connection-string
```

4. Set up the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5000`

## API Keys Setup

### Anthropic API Key
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create an account and generate an API key
3. Add the key to your `.env` file

### Database Setup
The app uses PostgreSQL. Set up your database and add the connection string to the `DATABASE_URL` environment variable.

## Deployment

### Web Deployment
The app can be deployed to any Node.js hosting platform like Vercel, Railway, or Heroku.

### Mobile Deployment
1. Build for mobile:
```bash
npm run build:mobile
```

2. Deploy to app stores using Capacitor:
```bash
npx cap open ios
npx cap open android
```

## Development

### Project Structure
```
├── client/           # React frontend
├── server/           # Express backend
├── shared/           # Shared types and schemas
├── public/           # Static assets
└── scripts/          # Build scripts
```

### Key Components
- **ChatInterface**: Main therapeutic conversation interface
- **Voice System**: Advanced speech recognition and synthesis
- **Anxiety Detection**: Real-time trigger and anxiety level analysis
- **Session Management**: User session and progress tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Disclaimer

This app is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.

## Support

For technical support or questions, please open an issue in the GitHub repository.