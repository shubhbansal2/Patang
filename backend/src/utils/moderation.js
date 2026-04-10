import axios from 'axios';

/**
 * Checks if the given text is toxic using the Perspective API.
 * 
 * @param {string} text - The text to analyze.
 * @returns {Promise<boolean>} - True if the text is toxic (score > 0.7), false otherwise.
 */
export const isToxic = async (text) => {
    try {
        const apiKey = process.env.PERSPECTIVE_API_KEY;
        if (!apiKey) {
            console.warn('[Perspective API] Warning: PERSPECTIVE_API_KEY is not configured. Skipping moderation.');
            return false;
        }

        if (!text || text.trim() === '') {
            return false;
        }

        const endpoint = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`;
        
        const payload = {
            comment: { text: text },
            languages: ['en', 'hi'],
            requestedAttributes: {
                TOXICITY: {},
                INSULT: {},
                PROFANITY: {}
            }
        };

        const response = await axios.post(endpoint, payload);
        const attributeScores = response.data.attributeScores;

        for (const attribute of ['TOXICITY', 'INSULT', 'PROFANITY']) {
            if (attributeScores[attribute]) {
                const score = attributeScores[attribute].summaryScore.value;
                if (score > 0.7) {
                    return true;
                }
            }
        }

        return false;
    } catch (error) {
        // Log the error but allow the request (soft warning)
        console.error('[Perspective API] Moderation error:', error.response?.data || error.message);
        return false;
    }
};
