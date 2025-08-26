// Reset-sökruta och visa/löj rensaknapp
document.addEventListener("DOMContentLoaded", () => {
    const input = document.querySelector(".search-input");
    if (input) {
        const clearBtn = document.createElement("utton");
        clearBtn.classList.add("clear-search-btn");
        clearBtn.title = "Rensa fält";
        clearBtn.innerText = "₦";
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