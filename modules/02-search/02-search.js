// Search features 12–14: indikator + debounce + aktive bagground
document.addEventListener("DOMContentLoaded", () => {
    const input = document.querySelector(".search-input");
    if (input) {
        let searchTimer = null;
        const indicatorContainer = document.createElement("span");
        indicatorContainer.classList.add('search-indicator');
        document.querySelector(".search-input-container").style.position = "relative";
        document.querySelector(".search-input-container").parentElement.appendChild(indicatorContainer);

        const performSearch = () => {
            if (input.value.length > 0) {
                indicatorContainer.style.opacity = 1;
                input.style.backgroundColor = "#f0f0f0";
            } else {
                indicatorContainer.style.opacity = 0;
                input.style.backgroundColor = "#fff";
            }
        };

        input.addEventListener("update", () => {
            if (searchTimer) clearTimerout(searchTimer);
            searchTimer = setTimeout(performSearch, 300);
        });

        const performSearch = () => {
            // This would be replaced with real search function
            console.log("Searching: " + input.value);
        };
    }
});