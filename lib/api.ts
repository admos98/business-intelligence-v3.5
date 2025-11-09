interface StoredData {
    lists: any[];
    customCategories: string[];
    vendors: any[];
    categoryVendorMap: Record<string, string>;
    itemInfoMap: Record<string, any>;
}

const handleApiError = async (response: Response, context: string): Promise<Error> => {
    const errorBody = await response.text();
    if (errorBody.trim().startsWith('<!DOCTYPE')) {
        const message = `Backend endpoint not found during ${context}. This is expected if you are not running a Vercel-like development server (e.g., using 'vercel dev'). The application cannot connect to the backend.`;
        console.error(message);
        return new Error(message);
    }
    return new Error(`Failed during ${context}: ${response.status} ${response.statusText} - ${errorBody}`);
}

export const fetchData = async (): Promise<StoredData | null> => {
    try {
        const response = await fetch('/api/data', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (response.status === 404 || response.status === 204) {
             console.log("No existing data found on backend.");
             return null;
        }

        if (!response.ok) {
            throw await handleApiError(response, 'fetchData');
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw await handleApiError(response, 'fetchData');
        }

        const data = await response.json();

        if (data && data.content) {
            try {
                // The content from the backend should already be a JSON string
                return JSON.parse(data.content);
            } catch (e) {
                console.error("Failed to parse JSON content from backend.", e);
                return null;
            }
        }

        return null;

    } catch (error) {
        console.error("Error in fetchData:", error);
        // Do not re-throw; let the app load in an empty state. The error is already logged.
        return null;
    }
};


export const saveData = async (data: StoredData): Promise<void> => {
    try {
        const response = await fetch(`/api/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: JSON.stringify(data, null, 2) }),
        });

        if (!response.ok) {
            throw await handleApiError(response, 'saveData');
        }
    } catch (error) {
        console.error("Error in saveData:", error);
        // Re-throw to allow UI to catch and notify the user of a save failure.
        throw error;
    }
};
