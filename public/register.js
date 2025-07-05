// public/register.js
document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');
    const regDepartmentSelect = document.getElementById('regDepartment');
    const regNewDepartmentNameInput = document.getElementById('regNewDepartmentName');
    const regMessage = document.getElementById('regMessage');

    // Şöbə seçimi dəyişdikdə yeni şöbə inputunu göstər/gizlə
    regDepartmentSelect.addEventListener('change', () => {
        if (regDepartmentSelect.value === 'new_department') {
            regNewDepartmentNameInput.style.display = 'block';
            regNewDepartmentNameInput.required = true;
        } else {
            regNewDepartmentNameInput.style.display = 'none';
            regNewDepartmentNameInput.required = false;
        }
    });

    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        regMessage.textContent = '';

        let departmentValue = regDepartmentSelect.value;
        if (departmentValue === 'new_department') {
            departmentValue = regNewDepartmentNameInput.value.trim();
            if (!departmentValue) {
                regMessage.textContent = 'Yeni şöbə adı boş ola bilməz.';
                regMessage.style.color = 'red';
                return;
            }
        }

        const userData = {
            department: departmentValue,
            displayName: document.getElementById('regDisplayName').value,
            username: document.getElementById('regUsername').value,
            email: document.getElementById('regEmail').value,
            password: document.getElementById('regPassword').value,
            role: document.getElementById('regRole').value.trim().toLowerCase()
        };

        try {
            const response = await fetch('/api/admin/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
                credentials: 'same-origin' // DÜZƏLİŞ: Sessiya cookie-sini sorğuya daxil et
            });
            const result = await response.json();

            if (response.ok) {
                regMessage.textContent = result.message;
                regMessage.style.color = 'green';
                registrationForm.reset();
                regNewDepartmentNameInput.style.display = 'none';
            } else {
                regMessage.textContent = result.message || 'Xəta baş verdi.';
                regMessage.style.color = 'red';
            }
        } catch (error) {
            regMessage.textContent = 'Serverlə əlaqə xətası.';
            regMessage.style.color = 'red';
        }
    });
});
