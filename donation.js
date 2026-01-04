export function initDonation() {
    const donationContainer = document.createElement('div');
    donationContainer.id = 'donation-container';
    donationContainer.className = 'donation-panel glass-panel-compact';
    
    // KakaoTalk Open Chat URL
    const kakaoTalkUrl = "https://open.kakao.com/o/sTMP9M9h";

    donationContainer.innerHTML = `
        <div class="donation-header">
            <span class="donation-badge">개발자 ☕ 사주기</span>
        </div>
        <div class="qr-wrapper" id="qr-click-target">
            <img src="assets/kakaotalk_open_chat_link_qr_code.JPG" alt="KakaoTalk QR Code" class="qr-image">
            <div class="qr-overlay">
                <span>스캔 또는 클릭하여 채팅</span>
            </div>
        </div>
    `;

    const header = document.querySelector('header');
    if (header) {
        header.appendChild(donationContainer);
    } else {
        document.body.appendChild(donationContainer);
    }

    // Only the QR code area is clickable
    const qrTarget = document.getElementById('qr-click-target');
    qrTarget.style.cursor = 'pointer';
    qrTarget.addEventListener('click', (e) => {
        window.open(kakaoTalkUrl, '_blank');
        e.stopPropagation();
    });
}

document.addEventListener('DOMContentLoaded', initDonation);
