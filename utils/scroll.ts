/**
 * Attempts to scroll to an element by its ID.
 * If the element is not found immediately, it will retry.
 * Useful for scrolling to elements that might be lazily loaded (e.g., inside Suspense).
 * 
 * @param id The ID of the element to scroll to
 * @param maxRetries Maximum number of retries
 * @param intervalMs Interval between retries in milliseconds
 */
export const scrollToElementWithRetry = (
    id: string,
    maxRetries = 10,
    intervalMs = 150
): void => {
    let retries = 0;

    const tryScroll = () => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        retries++;
        if (retries <= maxRetries) {
            setTimeout(tryScroll, intervalMs);
        }
    };

    tryScroll();
};
