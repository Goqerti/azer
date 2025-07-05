// public/out_app.js
// Bu fayl "Outgoing" şöbəsinin panel məntiqini idarə edir.

document.addEventListener('DOMContentLoaded', async () => {
    // --- Global Dəyişənlər ---
    let currentUser = null;
    let currentOrders = [];
    let editingOrderId = null;

    // --- DOM Elementləri ---
    const addOrderForm = document.getElementById('addOrderForm');
    const modal = document.getElementById('addOrderModal');
    const showAddOrderFormBtn = document.getElementById('showAddOrderFormBtn');
    const ordersTableBody = document.getElementById('ordersTableBody');
    const modalTitle = modal?.querySelector('h3');
    const modalSubmitButton = modal?.querySelector('button[type="submit"]');
    const closeButton = modal?.querySelector('.close-button');
    const hotelEntriesContainer = document.getElementById('hotelEntriesContainer');
    const addHotelBtn = document.getElementById('addHotelBtn');

    // --- İstifadəçi məlumatlarının alınması ---
    try {
        // DÜZƏLİŞ: `credentials` parametri sessiya cookie-lərini göndərmək üçün əlavə edildi
        const userRes = await fetch('/api/out/user/me', {
            credentials: 'same-origin'
        });
        
        if (!userRes.ok) {
            // Əgər sessiya etibarlı deyilsə, giriş səhifəsinə yönləndir
            window.location.href = '/outlogin.html';
            return;
        }
        currentUser = await userRes.json();
        const headerTitle = document.getElementById('main-header-title');
        if (headerTitle && currentUser.displayName) {
            headerTitle.textContent = `Outgoing - ${currentUser.displayName}`;
        }
    } catch (error) {
        console.error('İstifadəçi məlumatları alına bilmədi:', error);
        window.location.href = '/outlogin.html';
        return;
    }

    // --- Funksiyalar ---

    /**
     * Alış və satış qiymətlərinə görə gəliri hesablayır.
     */
    const calculateGelir = (order) => {
        const alishAmount = order.alish?.amount || 0;
        const satishAmount = order.satish?.amount || 0;
        return { amount: parseFloat((satishAmount - alishAmount).toFixed(2)) };
    };
    
    /**
     * Formadakı xərclərə görə alış qiymətini avtomatik hesablayır.
     */
    const calculateTotalCost = () => {
        let total = 0;
        document.querySelectorAll('#addOrderForm .hotel-price-input').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        const alishAmountInput = document.getElementById('alishAmount');
        if (alishAmountInput) alishAmountInput.value = total.toFixed(2);
    };

    /**
     * Serverdən "Outgoing" sifarişlərini çəkir və cədvəli yeniləyir.
     */
    const fetchOrdersAndRender = async () => {
        try {
            const response = await fetch('/api/out/orders', { credentials: 'same-origin' });
            if (!response.ok) throw new Error('Sifarişləri yükləmək mümkün olmadı.');
            const orders = await response.json();
            currentOrders = orders;
            renderOrdersTable(orders);
        } catch (error) {
            console.error('Sifarişlər yüklənərkən xəta:', error);
            if(ordersTableBody) ordersTableBody.innerHTML = `<tr><td colspan="14" style="text-align:center; color:red;">${error.message}</td></tr>`;
        }
    };

    /**
     * Sifarişləri HTML cədvəlinə render edir.
     */
    const renderOrdersTable = (orders) => {
        if (!ordersTableBody) return;
        ordersTableBody.innerHTML = '';

        if (orders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="14" style="text-align:center;">Heç bir sifariş tapılmadı.</td></tr>';
            return;
        }
        
        orders.sort((a, b) => new Date(b.creationTimestamp) - new Date(a.creationTimestamp));

        orders.forEach(order => {
            const row = ordersTableBody.insertRow();
            const gelir = order.gelir || calculateGelir(order);

            row.insertCell().textContent = order.satisNo || '-';
            row.insertCell().textContent = new Date(order.creationTimestamp).toLocaleString('az-AZ');
            row.insertCell().textContent = order.rezNomresi || '-';
            row.insertCell().textContent = order.turist || '-';
            row.insertCell().textContent = order.adultGuests || '0';
            row.insertCell().textContent = order.childGuests || '0';
            row.insertCell().textContent = order.xariciSirket || '-';
            row.insertCell().textContent = (order.hotels && order.hotels.length > 0) ? order.hotels[0].otelAdi : '-';
            row.insertCell().textContent = `${(order.alish?.amount || 0).toFixed(2)}`;
            row.insertCell().textContent = `${(order.satish?.amount || 0).toFixed(2)}`;
            row.insertCell().textContent = `${gelir.amount.toFixed(2)}`;
            row.insertCell().textContent = order.status || 'Davam edir';

            const operationsCell = row.insertCell();
            const editButton = document.createElement('button');
            editButton.className = 'action-btn edit';
            editButton.innerHTML = '✏️';
            editButton.title = 'Düzəliş et';
            editButton.onclick = () => openEditModal(order.satisNo);
            operationsCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'action-btn delete';
            deleteButton.innerHTML = '🗑️';
            deleteButton.title = 'Sil';
            deleteButton.onclick = () => handleDeleteOrder(order.satisNo);
            operationsCell.appendChild(deleteButton);
            
            row.insertCell().textContent = order.qeyd || '';
        });
    };
    
    /**
     * Yeni sifariş/redaktə modalını sıfırlayır.
     */
    const resetModalToCreateMode = () => {
        if (!addOrderForm) return;
        addOrderForm.reset();
        editingOrderId = null;
        if(hotelEntriesContainer) hotelEntriesContainer.innerHTML = '';
        addHotelEntry();
        calculateTotalCost();
        if(modalTitle) modalTitle.textContent = 'Yeni Sifariş Əlavə Et';
        if(modalSubmitButton) modalSubmitButton.textContent = 'Sifarişi Əlavə Et';
    };

    /**
     * Sifarişi silmək üçün serverə sorğu göndərir.
     */
    const handleDeleteOrder = async (satisNo) => {
        if (!confirm(`'${satisNo}' nömrəli sifarişi silmək istədiyinizə əminsiniz?`)) return;
        try {
            const response = await fetch(`/api/out/orders/${satisNo}`, { method: 'DELETE', credentials: 'same-origin' });
            if (!response.ok) throw new Error('Server xətası: Sifariş silinmədi.');
            fetchOrdersAndRender();
        } catch (error) {
            alert(error.message);
        }
    };

    /**
     * Sifarişi redaktə etmək üçün modalı açır və məlumatları doldurur.
     */
    const openEditModal = (satisNo) => {
        const orderToEdit = currentOrders.find(order => String(order.satisNo) === String(satisNo));
        if (!orderToEdit || !addOrderForm) return;

        resetModalToCreateMode();
        editingOrderId = satisNo;
        
        addOrderForm.querySelector('#turist').value = orderToEdit.turist || '';
        addOrderForm.querySelector('#xariciSirket').value = orderToEdit.xariciSirket || '';
        addOrderForm.querySelector('#adultGuests').value = orderToEdit.adultGuests || 1;
        addOrderForm.querySelector('#childGuests').value = orderToEdit.childGuests || 0;
        addOrderForm.querySelector('#rezNomresi').value = orderToEdit.rezNomresi || '';
        addOrderForm.querySelector('#satishAmount').value = orderToEdit.satish?.amount || 0;
        addOrderForm.querySelector('#status').value = orderToEdit.status || 'Davam edir';
        addOrderForm.querySelector('#qeyd').value = orderToEdit.qeyd || '';

        if(hotelEntriesContainer) hotelEntriesContainer.innerHTML = '';
        if (orderToEdit.hotels && orderToEdit.hotels.length > 0) {
            orderToEdit.hotels.forEach(hotel => addHotelEntry(hotel));
        } else {
            addHotelEntry();
        }
        
        calculateTotalCost();
        
        if(modalTitle) modalTitle.textContent = `Sifarişi Redaktə Et (№ ${satisNo})`;
        if(modalSubmitButton) modalSubmitButton.textContent = 'Dəyişiklikləri Yadda Saxla';
        if(modal) modal.style.display = 'block';
    };

    /**
     * Otel məlumatları üçün yeni input sahələri əlavə edir.
     */
    const addHotelEntry = (hotel = {}) => {
        if (!hotelEntriesContainer) return;
        const entryDiv = document.createElement('div');
        entryDiv.className = 'hotel-entry';
        entryDiv.innerHTML = `
            <div class="form-group-inline">
                <input type="text" class="hotel_otelAdi" placeholder="Otel Adı" value="${hotel.otelAdi || ''}">
                <input type="number" step="0.01" class="hotel-price-input" placeholder="Qiymət" value="${hotel.qiymet || 0}">
                <button type="button" class="action-btn-small remove-hotel-btn">-</button>
            </div>
        `;
        hotelEntriesContainer.appendChild(entryDiv);
        entryDiv.querySelector('.remove-hotel-btn').addEventListener('click', () => {
            entryDiv.remove();
            calculateTotalCost();
        });
        entryDiv.querySelector('.hotel-price-input').addEventListener('input', calculateTotalCost);
    };


    // --- Hadisə Dinləyiciləri (Event Listeners) ---

    if (showAddOrderFormBtn) {
        showAddOrderFormBtn.addEventListener('click', () => {
            resetModalToCreateMode();
            if(modal) modal.style.display = 'block';
        });
    }

    if (closeButton) closeButton.addEventListener('click', () => { if(modal) modal.style.display = 'none'; });
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    
    if(addHotelBtn) addHotelBtn.addEventListener('click', () => addHotelEntry());

    if (addOrderForm) {
        addOrderForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const hotelEntries = Array.from(document.querySelectorAll('.hotel-entry')).map(entry => ({
                otelAdi: entry.querySelector('.hotel_otelAdi').value.trim(),
                qiymet: parseFloat(entry.querySelector('.hotel-price-input').value) || 0
            }));

            const orderData = {
                turist: addOrderForm.querySelector('#turist').value,
                xariciSirket: addOrderForm.querySelector('#xariciSirket').value,
                adultGuests: addOrderForm.querySelector('#adultGuests').value,
                childGuests: addOrderForm.querySelector('#childGuests').value,
                rezNomresi: addOrderForm.querySelector('#rezNomresi').value,
                status: addOrderForm.querySelector('#status').value,
                qeyd: addOrderForm.querySelector('#qeyd').value,
                alish: { amount: parseFloat(addOrderForm.querySelector('#alishAmount').value) || 0 },
                satish: { amount: parseFloat(addOrderForm.querySelector('#satishAmount').value) || 0 },
                hotels: hotelEntries,
            };
            
            const url = editingOrderId ? `/api/out/orders/${editingOrderId}` : '/api/out/orders';
            const method = editingOrderId ? 'PUT' : 'POST';

            try {
                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData),
                    credentials: 'same-origin'
                });
                if (!response.ok) throw new Error('Server xətası.');
                fetchOrdersAndRender();
                if(modal) modal.style.display = 'none';
            } catch (error) {
                alert(`Sifariş yadda saxlanılarkən xəta: ${error.message}`);
            }
        });
    }

    // --- İlkin Yükləmə ---
    fetchOrdersAndRender();
});
