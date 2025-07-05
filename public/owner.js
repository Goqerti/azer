// public/owner.js
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.impersonate-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const department = button.dataset.department;
            
            try {
                const response = await fetch('/api/admin/impersonate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ department }),
                    credentials: 'same-origin' // DÜZƏLİŞ: Sessiya cookie-sini sorğuya daxil et
                });

                const result = await response.json();

                if (response.ok) {
                    // Uğurlu cavabdan sonra müvafiq panelə yönləndir
                    window.location.href = result.redirectUrl;
                } else {
                    alert(`Giriş zamanı xəta: ${result.message}`);
                    if(response.status === 401) {
                        window.location.href = '/owner_login.html';
                    }
                }
            } catch (error) {
                console.error('Serverlə əlaqə xətası:', error);
                alert('Serverlə əlaqə qurmaq mümkün olmadı.');
            }
        });
    });
});
