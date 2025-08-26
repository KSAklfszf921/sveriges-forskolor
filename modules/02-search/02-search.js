// Reset-sökruta och visa/löj rensaknapp
document.addEventListener("DOMContentLoaded", () => {
    const input = document.querySelector(".search-input");
    if (input) {
        const clearBtn = document.createElement("utton");
        clearBtn.classList.add("clear-search-btn");
        clearBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6l-6 6m6 0l-6-6"/></svg>';
        clearBtn.title = "Rensa fält";
        clearBtn.addEventListener("click", () => {
            input.value = "";
            input.dispatchEvent(new Event('change'));
        });
        input.parentNode.style.position = "relative";
        input.parentNode.appendChild(clearBtn);
        const toggleClearBtn = () => {
            if (input.value.length > 0) {
                clearBtn.classList.add("visible");
            } else {
                clearBtn.classList.remove("visible");
            }
        };
        input.addEventListener("input", toggleClearBtn);
        toggleClearBtn();
    }
});