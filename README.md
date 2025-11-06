AI Chat Application Using Cloudflare Workers AI and Durable Objects

Live Demo: https://ai-chat-app.nnanali777-c8a.workers.dev
Current Version ID: f7493d32-7806-44c2-b881-9cc7f2a61bde


**Overview**

This project implements an AI-powered chat application built entirely on Cloudflare Workers, using Workers AI, Durable Objects, and a lightweight web interface.
It demonstrates how to create a stateful, LLM-driven application that runs fully on Cloudflare’s edge infrastructure without external servers or API tokens.

**Project Requirements and How They Are Met**
Requirement	Implementation
LLM	Workers AI using the model @cf/meta/llama-3.3-70b-instruct-fp8-fast
Workflow / Coordination	Durable Object (ChatDurableObject) manages conversation flow and serializes LLM calls
User Input	Web-based chat interface served at the root path (/)
Memory / State	Persistent conversation history stored in Durable Object state (this.state.storage)
**Architecture**
Browser (Chat UI)
      │
      ▼
Cloudflare Worker (src/worker.ts)
  ├── "/"         → serves the chat interface
  ├── "/chat"     → receives user input and routes to the Durable Object
  └── "/history"  → retrieves stored messages
      │
      ▼
Durable Object (ChatDurableObject)
  ├── stores conversation history
  └── calls Workers AI (Llama 3.3) through env.AI.run()

**Features**

Fully serverless and deployed on Cloudflare’s global edge network

Integrates Workers AI (Llama 3.3) for intelligent chat responses

Uses Durable Objects to coordinate user sessions and store conversation state

Simple, browser-based chat interface for direct interaction

No external API keys or credentials required

**Setup and Deployment**

**Prerequisites**

Node.js version 18 or higher

A Cloudflare account

wrangler CLI installed (npm install -g wrangler)

**Installation**
npm install

**Local Development**
npx wrangler dev


Visit http://127.0.0.1:8787
 in your browser to chat locally.

**Deployment**
npx wrangler login
npx wrangler deploy


After deployment, your application will be available at
https://cf-ai-chat-app.<your-subdomain>.workers.dev/

**Repository Structure**
File	Description
wrangler.toml	Cloudflare configuration including AI and Durable Object bindings
src/worker.ts	Main Worker and Durable Object implementation
package.json	Node.js project configuration
tsconfig.json	TypeScript compiler configuration
README.md	Project documentation and setup guide


**Local Testing Summary**

Run npm install

Start development server with npx wrangler dev

Open http://127.0.0.1:8787/

Type messages into the chat input

The Worker calls Workers AI (Llama 3.3), and responses appear in the browser

Originality Statement

All source code and configurations in this repository were written specifically for this project.
While they follow Cloudflare’s public documentation for Workers AI and Durable Objects, no portions were copied from any external codebase.
This project was built from scratch to satisfy Cloudflare’s AI-powered application assignment requirements.

**Author**

Created by Nana Li (nanali126)
For the Cloudflare AI-Powered Application Assignment Submission.