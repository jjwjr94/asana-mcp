# Asana MCP HTTP Server - Deployment Summary

## What's Been Created

You now have a complete Asana MCP HTTP Server that can be deployed to Render and integrated with n8n. Here's what's been added:

### New Files Created
- `src/http-server.ts` - Main HTTP server implementation
- `render.yaml` - Render deployment configuration
- `docker-compose.yml` - Docker deployment setup
- `Dockerfile` - Container configuration
- `README-HTTP.md` - Detailed HTTP server documentation
- `n8n-integration.md` - n8n integration guide
- `env.example` - Environment configuration template
- `deploy-render.sh` - Deployment helper script
- `test-http-server.js` - Testing script

### Modified Files
- `package.json` - Added HTTP server dependencies and scripts
- `build.js` - Updated to build HTTP server
- `src/http-server.ts` - CORS configured for Render/n8n

## Key Features

✅ **REST API**: All Asana MCP tools exposed as HTTP endpoints  
✅ **Streaming Support**: Server-Sent Events for real-time updates  
✅ **n8n Integration**: Designed specifically for n8n workflows  
✅ **Render Ready**: Configured for cloud deployment  
✅ **Authentication**: Support for Asana tokens via headers  
✅ **CORS**: Configured for n8n domains  
✅ **Docker Support**: Containerized deployment  
✅ **Health Checks**: Built-in monitoring  

## Deployment Options

### 1. Render (Recommended for n8n)
```bash
# Push to GitHub, then connect to Render
# Build command: npm ci && npm run build
# Start command: npm run start:http
# Environment: ASANA_ACCESS_TOKEN=your_token
```

### 2. Docker
```bash
docker-compose up -d
```

### 3. Local Development
```bash
npm run dev:http
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server health check |
| `/mcp` | POST | **Primary MCP HTTP streaming endpoint** |
| `/tools` | GET | List all available tools (legacy) |
| `/tools/execute` | POST | Execute tool with streaming (legacy) |
| `/tools/{toolName}` | POST | Execute specific tool (legacy) |
| `/prompts` | GET | List available prompts (legacy) |
| `/prompts/{name}` | GET | Get specific prompt (legacy) |

## n8n Integration Example

```javascript
// HTTP Request Node in n8n
{
  "method": "POST",
  "url": "https://your-service.onrender.com/mcp",
  "headers": {
    "x-asana-token": "{{ $secret.asana_token }}",
    "Content-Type": "application/json"
  },
  "body": {
    "method": "tools/call",
    "params": {
      "name": "asana_create_task",
      "arguments": {
        "name": "New Task from n8n",
        "notes": "Created via automation",
        "projects": ["1234567890"]
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ASANA_ACCESS_TOKEN` | Yes | Asana personal access token |
| `PORT` | No | Server port (default: 3000, Render: 10000) |
| `NODE_ENV` | No | Environment (production/development) |

## Available Tools

The HTTP server exposes all 22+ Asana MCP tools:

### Task Management
- `asana_search_tasks` - Search for tasks
- `asana_get_task` - Get task details
- `asana_create_task` - Create new task
- `asana_update_task` - Update existing task
- `asana_create_subtask` - Create subtask

### Project Management
- `asana_search_projects` - Search projects
- `asana_get_project` - Get project details
- `asana_get_project_task_counts` - Get project statistics

### Status & Comments
- `asana_get_stories_for_task` - Get task comments
- `asana_create_task_story` - Add comment
- `asana_create_project_status` - Create status update

### Relationships
- `asana_add_task_dependencies` - Add dependencies
- `asana_set_parent_for_task` - Set parent task

## Next Steps

1. **Deploy to Render**:
   ```bash
   ./deploy-render.sh
   git push origin main
   # Connect to Render dashboard
   ```

2. **Test Deployment**:
   ```bash
   curl https://your-service.onrender.com/health
   ```

3. **Integrate with n8n**:
   - Add HTTP Request nodes
   - Use your Render URL
   - Set `x-asana-token` header
   - Reference `README-HTTP.md` for examples

4. **Monitor and Scale**:
   - Check Render dashboard for logs
   - Monitor health endpoint
   - Scale as needed

## Troubleshooting

### Common Issues
- **401 Unauthorized**: Check Asana token validity
- **CORS Errors**: Verify origin domains in server config
- **Build Failures**: Check Node.js version (requires 18+)
- **Port Issues**: Ensure Render uses port 10000

### Debug Commands
```bash
# Test health
curl https://your-service.onrender.com/health

# List tools via MCP endpoint
curl -H "x-asana-token: YOUR_TOKEN" \
     -X POST https://your-service.onrender.com/mcp \
     -H "Content-Type: application/json" \
     -d '{"method": "tools/list"}'

# Test tool execution
curl -H "x-asana-token: YOUR_TOKEN" \
     -X POST https://your-service.onrender.com/mcp \
     -H "Content-Type: application/json" \
     -d '{"method": "tools/call", "params": {"name": "asana_list_workspaces"}}'
```

## Security Notes

- 🔒 Tokens stored as n8n secrets
- 🔒 HTTPS enforced on Render
- 🔒 CORS restricted to trusted domains
- 🔒 Helmet.js security headers
- 🔒 No sensitive data in logs

## Support

- 📖 Full documentation: `README-HTTP.md`
- 🔧 n8n integration guide: `n8n-integration.md`
- 🐛 Issues: GitHub repository
- 💬 Community: Asana developer forums

---

**Ready to deploy!** 🚀
