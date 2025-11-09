const API_BASE_URL = 'https://api.github.com/gists';

interface StoredData {
    lists: any[];
    customCategories: string[];
    vendors: any[];
    categoryVendorMap: Record<string, string>;
    itemInfoMap: Record<string, any>;
}

export const fetchData = async (githubToken: string, gistId: string): Promise<StoredData | null> => {
    if (!githubToken || !gistId) {
        throw new Error("GitHub Token or Gist ID is missing.");
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/${gistId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `Bearer ${githubToken}`,
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });

        if (response.status === 404) {
             console.log("Gist not found. Please check the Gist ID.");
             return null;
        }

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to fetch Gist data: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        const data = await response.json();
        
        if (data.files && Object.keys(data.files).length > 0) {
            const files = data.files;
            let fileToUse = null;

            // 1. Look for the specific, default filename
            if (files['mehrnoosh-cafe-data.json']) {
                fileToUse = files['mehrnoosh-cafe-data.json'];
            } else {
                // 2. If not found, look for the first .json file
                const firstJsonFileKey = Object.keys(files).find(key => key.endsWith('.json'));
                if (firstJsonFileKey) {
                    fileToUse = files[firstJsonFileKey];
                } else {
                    // 3. As a fallback, use the very first file in the gist
                    const firstFileKey = Object.keys(files)[0];
                    if (firstFileKey) {
                        fileToUse = files[firstFileKey];
                    }
                }
            }
            
            if (fileToUse && fileToUse.content) {
                try {
                    return JSON.parse(fileToUse.content);
                } catch (e) {
                    console.error("Failed to parse JSON content from Gist. The data may be corrupt.", e);
                    // Returning null allows the app to handle it as an empty or invalid state
                    // and potentially overwrite the corrupted data with a fresh state on next save.
                    return null;
                }
            }
        }
        
        console.warn(`No file with content found in the Gist. Returning empty state.`);
        return null; // File doesn't exist or is empty, treat as new.

    } catch (error) {
        console.error("Error in fetchData:", error);
        throw error;
    }
};


export const saveData = async (githubToken: string, gistId: string, data: StoredData): Promise<void> => {
    if (!githubToken || !gistId) {
        console.warn("GitHub Token or Gist ID is missing. Skipping save.");
        return;
    }
    
    try {
        // Always save with the consistent filename the app expects.
        const FILENAME = 'mehrnoosh-cafe-data.json';
        const payload = {
            files: {
                [FILENAME]: {
                    content: JSON.stringify(data, null, 2), // Pretty-print the JSON
                },
            },
        };

        const response = await fetch(`${API_BASE_URL}/${gistId}`, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `Bearer ${githubToken}`,
                'X-GitHub-Api-Version': '2022-11-28',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to save data to Gist: ${response.status} ${response.statusText} - ${errorBody}`);
        }
    } catch (error) {
        console.error("Error in saveData:", error);
        throw error;
    }
};