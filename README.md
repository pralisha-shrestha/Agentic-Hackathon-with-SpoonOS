# **NeoStudio — A Vibe-Based Smart Contract Builder for Neo**

### *Natural-language → Visual Flowchart → On-chain Smart Contract*

NeoStudio is a playful, intuitive, AI-powered interface for creating Neo smart contracts without deep technical knowledge.
Instead of coding in a traditional IDE, users **describe their idea**, collaborate with an AI agent, watch a **flowchart** materialize, and see **live Neo smart-contract code** generate in real time.

NeoStudio embraces the spirit of "Vibe Coding for Web3" by turning smart contract development into a **creative**, **expressive**, and **visually guided** experience.

---

## ✨ **Demo Video**

*(Add link here once recorded)*

## 🌐 **Live Demo**

*(Optional: Add link to deployed version)*

## 💻 **GitHub Repository**

*(Insert your repo link)*

---

# 🚀 **What NeoStudio Does**

## **1. Chat-Based Contract Creation**

Users begin by describing their smart contract idea in plain English.

Example:

> “I want an NFT membership contract with a mint limit and an admin-only function.”

NeoStudio uses a **SpoonOS → LLM** flow to interpret the request, ask clarifying questions, and generate a contract specification.

---

## **2. Visual Flowchart Builder (“Vibe Mode”)**

NeoStudio converts the AI-generated spec into a **visual nodes-and-connections diagram** representing the contract's logic:

* Storage variables
* Methods (public/private/admin)
* Events
* Permission checks
* Neo-specific functionality (verification, GAS, triggers)

Users can drag, modify, and rearrange nodes—like a Web3 version of visual scripting tools (e.g., Unreal Blueprints).

Updates to the flowchart dynamically sync to the live code.

---

## **3. Live Code Window (“Dev Mode”)**

A Monaco-based code editor displays the generated Neo contract code (Python or C#).

Features:

* Auto-sync between visual nodes and source code
* Inline explanations via LLM
* Real-time updates as the user edits either mode
* Viewable in a collapsible sidebar like Bolt.dev or Firebase Studio

---

## **4. Smart Code Generation (SpoonOS Integration)**

NeoStudio uses Spoon's unified LLM protocol to generate, refine, and maintain contract correctness.

This satisfies **Hackathon Baseline Requirements**:

1. **LLM invocation through SpoonOS**
2. **Use of at least one Spoon-toolkit Tool**

   * Storage tool: store draft contract states
   * Crypto/Data tool: hashing or signature simulation
   * Memory tool: persist chat context and versioning

---

## **5. Optional: Deploy to Neo Testnet**

Time permitting, NeoStudio provides:

* Contract export
* Testnet deployment
* Display of transaction hash
* Quick links to Neo explorer

---

# 🧠 **Architecture Overview**

### **Frontend**

* React + TypeScript
* React Flow for visual graph
* Monaco Editor for code window
* Tailwind or Chakra for UI styling

### **Agent Layer**

* SpoonOS runtime
* Contract-spec builder
* Graph transformer
* Code generation module (Python or C#)
* Neo blockchain integration helpers

### **LLM Roles**

* Interpret user intent
* Generate structured contract logic
* Create/refactor Neo smart contract code
* Explain code to users
* Sync changes between graph ↔ code

### **MCP / Spoon Toolkit Tools**

* **Storage**: draft persistence
* **Crypto**: hashing or signing support
* **Memory**: conversational state

---

# 🎯 **Example User Flow**

1. User visits NeoStudio
2. Prompt: *“Describe your smart contract idea.”*
3. LLM asks clarifying questions and creates a structured spec
4. Flowchart appears
5. Code window updates in real time
6. User tweaks nodes or code
7. NeoStudio regenerates synced output
8. User exports or deploys Neo contract

---

# 🏆 **How NeoStudio Meets the Hackathon Criteria**

### **Creativity**

A completely new, expressive way to build smart contracts visually and conversationally.

### **Usability**

Non-developers can create real contracts using simple prompts and visual nodes.

### **Technical Execution**

* End-to-end LLM generation through SpoonOS
* Live code <-> graph synchronization
* Neo-smart-contract templates and structure
* Optional deployment pipeline

### **Fun Factor**

It feels like designing a level in a game, not writing blockchain code.

---

# 🛠 **Local Development**

### **Requirements**

* Node.js 18+
* pnpm or npm
* SpoonOS dependencies
* Neo SDK (optional for deployment)

### **Setup**

```bash
git clone <repo>
cd neostudio
npm install
npm run dev
```

### **Environment Variables**

Create a `.env` file:

```
SPOON_API_KEY=...
NEO_RPC_URL=https://testnet1.neo.org:20332
```

(Replace with actual keys or RPC endpoint.)

---

# 🧪 **Tech Used**

* **Neo blockchain**
* **SpoonOS** (LLM invocation)
* **Spoon-toolkit** tools
* **React Flow**
* **Monaco Editor**
* **TypeScript**
* **Vite / Next.js**

---

# 🔮 **Future Directions**

* Real-time collaboration (like Figma for smart contracts)
* Versioned timelines of contract drafts
* Multi-agent code review
* AI-powered security audit mode
* Visual debugging & test simulation

---

# 🙌 **Acknowledgements**

Thanks to the organizers, Neo community, and Spoon ecosystem for making this hackathon possible.
