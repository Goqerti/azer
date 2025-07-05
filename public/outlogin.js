// public/outlogin.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('outloginForm');
    const errorMessageContainer = document.getElementById('errorMessageContainer');

    if (!loginForm) return;

    // Formanın göndərilməsini JavaScript ilə idarə et
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Brauzerin standart form göndərməsini dayandır
        errorMessageContainer.innerHTML = ''; // Köhnə xətaları təmizlə

        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(loginForm.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Uğurlu cavab gəldikdə, yönləndirməni özümüz edirik
                window.location.href = result.redirectUrl;
            } else {
                // Uğursuz cavab gəldikdə, serverdən gələn xəta mesajını göstəririk
                errorMessageContainer.innerHTML = `<div class="error-message">${result.message || 'Naməlum xəta baş verdi.'}</div>`;
            }
        } catch (err) {
            console.error('Fetch error:', err);
            errorMessageContainer.innerHTML = `<div class="error-message">Serverlə əlaqə xətası.</div>`;
        }
    });
});
