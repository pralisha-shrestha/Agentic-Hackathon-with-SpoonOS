import React, { useState } from 'react';
import './App.css'; // You can put your custom styles in here or index.css

// 1. Define the TypeScript interface for the data we expect from the Agent
interface AgentResponse {
    status: 'success' | 'error';
    contractCode: string;
    contractHash: string | null;
    message: string;
}

const Canvas: React.FC = () => {
    // State variables to manage the UI
    const [prompt, setPrompt] = useState<string>('');
    const [result, setResult] = useState<AgentResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // 2. The function to call the SpoonOS Python backend
    const handleWeaveContract = async () => {
        if (!prompt.trim()) return alert("Please enter your contract intent!");

        setIsLoading(true);
        setResult(null); // Clear previous results

        try {
            // NOTE: This uses the /generate-contract path that you will configure 
            // the Vite proxy (in vite.config.ts) to route to your Python backend (e.g., http://localhost:8000).
            const response = await fetch('/generate-contract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            const data: AgentResponse = await response.json();
            setResult(data);

        } catch (error) {
            console.error('Agent API Error:', error);
            // Handle network/connection errors gracefully
            setResult({
                status: 'error',
                contractCode: '// Error: Could not connect to the SpoonOS Agent backend.',
                contractHash: null,
                message: 'Connection failed. Check your Python server and Vite proxy configuration.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div id="canvas-app">
            <header>
                <h1>Canvas</h1>
                <p>Weave your dApp intentions into a verifiable Neo Smart Contract.</p>
            </header>

            <main>
                <section id="input-section">
                    <h2>1. State Your Vibe (Intent)</h2>
                    <textarea
                        id="promptInput"
                        placeholder="e.g., Create a simple token contract with 100,000 supply that only I can mint."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isLoading}
                    ></textarea>
                    <button onClick={handleWeaveContract} disabled={isLoading}>
                        {isLoading ? 'Weaving...' : 'Weave Contract'}
                    </button>
                </section>

                {result && (
                    <section id="output-section">
                        <h2>2. Generated Protocol (Neo Code)</h2>
                        <pre id="codeOutput" className={result.status === 'error' ? 'error-code' : ''}>
                            {result.contractCode}
                        </pre>

                        <h2>3. Deployment Status (Neo Testnet)</h2>
                        <p id="statusOutput" className={result.status === 'error' ? 'error-status' : 'success-status'}>
                            {result.message}
                            {result.contractHash && <span> Contract Hash: {result.contractHash}</span>}
                        </p>
                    </section>
                )}
            </main>
        </div>
    );
};

export default Canvas;