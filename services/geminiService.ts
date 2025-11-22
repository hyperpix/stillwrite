import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ChatMessage } from "../types";

const apiKey = process.env.API_KEY || '';
// Initialize conditionally to prevent crashes if key is missing during dev, though prompt says assume valid.
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getChatModel = (systemInstruction: string) => {
    if (!ai) throw new Error("API Key not found");
    
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `You are a helpful, creative writing assistant integrated into a minimalist text editor called Flow. 
            Your goal is to help the user with their writing, offer suggestions, summarize text, or just chat to unblock creative flow.
            Be concise. The user is in a "flow state", so don't overwhelm them.
            
            Current Context: The user is writing a document. You have access to their current text if they ask about it.
            ${systemInstruction}`,
        }
    });
};

export const sendMessageToGemini = async (chat: Chat, message: string, contextText: string): Promise<string> => {
    // We inject the current context text invisibly into the message for the model if it's relevant, 
    // or we can rely on the system instruction update. 
    // For a simple implementation, we prepend context if it's the first message or if requested.
    // Here we'll just append the context to the user message for the model to see.
    
    const prompt = `
    [Current Document Content]:
    """
    ${contextText}
    """
    
    [User Request]:
    ${message}
    `;

    try {
        const result: GenerateContentResponse = await chat.sendMessage({ message: prompt });
        return result.text || "I couldn't generate a response.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Sorry, I encountered an error connecting to the creative muse.";
    }
};
