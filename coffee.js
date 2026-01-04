export function initCoffee() {
    const container = document.getElementById('coffee-container');
    if (!container) return;

    const bmacButton = document.createElement('div');
    bmacButton.className = 'glass-panel coffee-panel';
    bmacButton.innerHTML = `
        <div class="coffee-content" style="display: flex; align-items: center; gap: 1rem;">
            <div class="coffee-icon" style="font-size: 1.5rem;">☕</div>
            <div style="flex: 1;">
                <p style="font-size: 0.9rem; margin-bottom: 0.2rem; font-weight: 600;">Support this project</p>
                <p style="font-size: 0.75rem; color: #b2bec3;">If you like this tool, buy me a coffee!</p>
            </div>
            <a href="https://www.buymeacoffee.com/yourusername" target="_blank" class="btn primary" style="padding: 0.5rem 1rem; font-size: 0.7rem;">Buy</a>
        </div>
    `;

    container.appendChild(bmacButton);
}

document.addEventListener('DOMContentLoaded', initCoffee);
