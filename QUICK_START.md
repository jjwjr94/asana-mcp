# Quick Start Guide

## Prerequisites

1. **Asana Account**: You need an Asana account
2. **Asana Personal Access Token**: Get your token from [Asana Developer Console](https://app.asana.com/0/my-apps)

## Local Development Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <your-repo-url>
   cd asana-mcp
   npm install
   ```

2. **Set up environment variables**: Create a `.env` file in the project root:
   ```
   ASANA_ACCESS_TOKEN=your_access_token_here
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Run the server**:
   ```bash
   # HTTP server (for n8n integration)
   npm run start:http
   
   # MCP server (stdio)
   npm start
   ```

## Getting an Asana Access Token

1. Go to [Asana Developer Console](https://app.asana.com/0/my-apps)
2. Click "Create New App"
3. Choose "Personal Access Token"
4. Copy the generated token
5. Use this token as your `ASANA_ACCESS_TOKEN`

## Deployment on Render

1. **Create a new Web Service** on Render
2. **Connect your repository**
3. **Configure the service**:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:http`
   - **Environment**: Node.js
4. **Add Environment Variables**:
   - `ASANA_ACCESS_TOKEN`: Your Asana personal access token
5. **Deploy**

## Testing

```bash
# Test health
curl http://localhost:3000/health

# List tools
curl -H "x-asana-token: YOUR_TOKEN" \
     -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -d '{"method": "tools/list"}'
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| ASANA_ACCESS_TOKEN | Asana personal access token | Yes |
