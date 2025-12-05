
import { Message } from "../types";

/**
 * Context object passed to the filter script.
 */
export interface FilterContext {
  role: 'user' | 'model';
  history: Message[];
}

/**
 * Executes a user-provided JavaScript string as a function.
 * 
 * Expected script format:
 * The script should return the modified string.
 * Variables available in scope: 'input' (string), 'context' (FilterContext).
 * 
 * Example:
 * return input.replace(/badword/g, '****');
 */
export const executeFilterScript = (
  scriptCode: string, 
  input: string, 
  context: FilterContext
): string => {
  if (!scriptCode || !scriptCode.trim()) return input;

  try {
    // Basic clean up: if user pasted a full function definition, try to extract body
    // But mostly we expect the file content to be the body or a direct return.
    
    // Create the function. We map 'input' and 'context' as arguments.
    // We add a 'return' statement if the user code doesn't explicitly have one 
    // and is a single expression (simple heuristic), otherwise assume they wrote full logic.
    
    let codeBody = scriptCode;

    // Remove simple TS type annotations if possible (Very basic regex, not a full parser)
    // Removes ": string", ": any", etc from variable declarations
    codeBody = codeBody.replace(/:\s*[a-zA-Z]+/g, ''); 

    const func = new Function('input', 'context', codeBody);
    const result = func(input, context);

    if (typeof result === 'string') {
      return result;
    }
    // If script returns nothing or non-string, return original input to be safe
    return input;
  } catch (error) {
    console.error("Script execution failed:", error);
    // On error, fail safe by returning original input
    return input;
  }
};
