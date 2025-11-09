// This is the complete and correct code for: /lib/api.ts

interface StoredData {
    lists: any[];
    customCategories: string[];
    vendors: any[];
    categoryVendorMap: Record<string, string>;
    itemInfoMap: Record<string, any>;
}

/**
 * Fetches the entire Gist object from our own secure API endpoint.
 * This function no longer knows about tokens or IDs.
 */
export const fetchData = async (): Promise<StoredData | null> => {
    try {
        // This calls the secure middleman you created in /api/gist.ts
        const response = await fetch('/api/gist');

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to fetch data from proxy: ${errorBody}`);
        }

        const data = await response.json();

        // This logic parses the data returned from our secure API
        if (data.files && data.files['mehrnoosh-cafe-data.json']) {
            const fileContent = data.files['mehrnoosh-cafe-data.json'].content;
            if (fileContent) {
                return JSON.parse(fileContent);
            }
        }

        console.warn('Gist was fetched, but contained no valid data file.');
        return null; // Gist is empty or malformed

    } catch (error) {
        console.error("Error in secure fetchData:", error);
        throw error;
    }
};

/**
 * Sends data to be saved to our own secure API endpoint.
 * This function no longer knows about tokens or IDs.
 */
export const saveData = async (data: StoredData): Promise<void> => {
    try {
        const FILENAME = 'mehrnoosh-cafe-data.json';
        const payload = {
            files: {
                [FILENAME]: {
                    content: JSON.stringify(data, null, 2),
                },
            },
        };

        // This calls the secure middleman you created in /api/gist.ts
        const response = await fetch('/api/gist', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to save data via proxy: ${errorBody}`);
        }
    } catch (error) {
        console.error("Error in secure saveData:", error);
        throw error;
    }
};
