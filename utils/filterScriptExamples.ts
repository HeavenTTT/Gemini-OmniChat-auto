/**
 * Detailed examples for Script Filters (Middleware).
 * These strings are downloadable as .js files by the user from the Settings UI.
 */

export const EXAMPLE_INPUT_FILTER = `/**
 * OmniChat Input Filter Script (Middleware)
 * 
 * This script runs BEFORE your message is sent to the AI.
 * Use it to redact sensitive data, append context, or block specific messages.
 * 
 * @param {string} input - The raw text entered by the user.
 * @param {object} context - Execution context.
 * @param {string} context.role - 'user'
 * @param {Array} context.history - Array of previous messages [{role, text, ...}]
 * 
 * @returns {string} The modified message text that will be sent to the AI.
 */

// 1. Logging (View in Browser Console F12)
console.log("[Input Filter] Original Input:", input);
console.log("[Input Filter] Conversation History Length:", context.history.length);

// 2. Redact Sensitive Information (Regex Example)
// Replace email addresses with [EMAIL REDACTED]
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g;
let modified = input.replace(emailRegex, '[EMAIL REDACTED]');

// Replace specific sensitive keywords
const sensitiveWords = ['secret_key', 'private_token'];
sensitiveWords.forEach(word => {
    const reg = new RegExp(word, 'gi');
    modified = modified.replace(reg, '***');
});

// 3. Conditional Logic based on Context
// Example: If this is the start of a conversation, append a system instruction wrapper
// (Note: usually System Prompts are better for this, but filters give dynamic control)
if (context.history.length === 0) {
    // modified += "\\n\\n[System: Please answer concisely]";
}

// 4. Validation / Blocking
// If the input contains forbidden content, you can replace it entirely
if (modified.includes("DROP TABLE")) {
    return "[BLOCKED SQL INJECTION ATTEMPT]";
}

console.log("[Input Filter] Processed Output:", modified);
return modified;
`;

export const EXAMPLE_OUTPUT_FILTER = `/**
 * OmniChat Output Filter Script (Middleware)
 * 
 * This script runs BEFORE the AI's response is displayed to you.
 * It runs on every chunk during streaming, and once on the final text.
 * Use it to format text, add disclaimers, or post-process code blocks.
 * 
 * @param {string} input - The raw text returned by the AI model.
 * @param {object} context - Execution context.
 * @param {string} context.role - 'model'
 * @param {Array} context.history - Array of conversation history.
 * 
 * @returns {string} The modified response text to display.
 */

let modified = input;

// 1. Simple Text Replacement
// Example: Convert specific internal markers to emojis
modified = modified.replace(/\\[WARNING\\]/g, "⚠️");
modified = modified.replace(/\\[INFO\\]/g, "ℹ️");

// 2. Force specific formatting
// Example: Ensure 'Note:' is always bolded
modified = modified.replace(/^Note:/gm, "**Note:**");

// 3. Append a footer (Only if it doesn't already exist to avoid duplication during streaming)
// Note: In streaming, 'input' grows. We only want to see the footer at the end, 
// but since we don't know exactly when "end" is in this context easily, 
// we might just append it if the text is long enough or matches a pattern.
// A better approach for footers is to use the App's UI, but here is a code approach:

/*
const footer = "\\n\\n---n> *Verified by Output Filter*";
if (modified.length > 50 && !modified.includes("Verified by Output Filter")) {
    // modified += footer; // Uncomment to enable
}
*/

return modified;
`;