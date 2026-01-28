const API_BASE_URL = "http://localhost:3000";

const app = {
    state: {
        cart: [],
        menuData: [], // Store menu to validate stock/prices
        activeTab: 'menu'
    },

    init: () => {
        console.log("App Initialized");

        // Initial Load
        app.showSection('menu');

        // Event Listeners
        document.getElementById('menu-form').addEventListener('submit', app.handleSaveMenu);
        document.getElementById('add-to-cart-btn').addEventListener('click', app.addToCart);
        document.getElementById('place-order-btn').addEventListener('click', app.placeOrder);
        document.getElementById('debug-view-btn').addEventListener('click', () => {
            document.getElementById('debug-orders-list').classList.remove('hidden');
            app.loadAllOrders(); // Load history/all
        });

        // Polling for staff view (10s)
        setInterval(() => {
            if (app.state.activeTab === 'staff') {
                app.loadActiveOrders(false); // false = quiet, no loading text if already there
            }
        }, 10000);
    },

    showSection: (id) => {
        app.state.activeTab = id;
        document.querySelectorAll('.section').forEach(sec => sec.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');

        // Load specific data
        if (id === 'menu') app.loadMenu();
        if (id === 'customer') {
            app.state.cart = []; // Reset cart on entry? Or keep it. Let's reset for fresh start.
            app.renderCart();
            app.loadMenuForCustomer();
        }
        if (id === 'staff') app.loadActiveOrders();
    },

    // ================= MENUS =================

    loadMenu: async () => {
        const tableBody = document.querySelector('#menu-table tbody');
        tableBody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

        try {
            const res = await fetch(`${API_BASE_URL}/menu`);
            if (!res.ok) throw new Error("Failed to fetch menu");
            const data = await res.json();
            app.state.menuData = data;
            app.renderMenuTable(data, tableBody);
        } catch (err) {
            console.error(err);
            tableBody.innerHTML = `<tr><td colspan="3" class="low-stock">Error loading menu: ${err.message}</td></tr>`;
        }
    },

    renderMenuTable: (items, container) => {
        container.innerHTML = '';
        if (items.length === 0) {
            container.innerHTML = '<tr><td colspan="3">No items found.</td></tr>';
            return;
        }

        items.forEach(item => {
            // item should have name, price, availableQty
            const isLow = item.availableQty <= 3;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>$${item.price}</td>
                <td class="${isLow ? 'low-stock' : ''}">
                    ${item.availableQty} ${isLow ? '<span class="low-stock-badge">LOW</span>' : ''}
                </td>
            `;
            container.appendChild(row);
        });
    },

    handleSaveMenu: async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('menu-msg');
        msgDiv.textContent = "Saving...";
        msgDiv.className = "msg";

        const name = document.getElementById('menu-name').value.trim();
        const price = parseFloat(document.getElementById('menu-price').value);
        const qty = parseInt(document.getElementById('menu-qty').value);

        if (!name || price < 0 || qty < 0) {
            msgDiv.textContent = "Invalid input. Check name and non-negative values.";
            msgDiv.className = "msg error";
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/menu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, price, availableQty: qty })
            });

            if (!res.ok) throw new Error("Failed to save");

            msgDiv.textContent = "Saved!";
            msgDiv.className = "msg success";

            // Clear form and reload
            document.getElementById('menu-form').reset();
            app.loadMenu();

        } catch (err) {
            msgDiv.textContent = "Error: " + err.message;
            msgDiv.className = "msg error";
        }
    },

    // ================= CUSTOMER =================

    loadMenuForCustomer: async () => {
        const select = document.getElementById('cust-menu-select');
        select.innerHTML = '<option>Loading...</option>';

        try {
            // Re-fetch to get latest stock
            const res = await fetch(`${API_BASE_URL}/menu`);
            const data = await res.json();
            app.state.menuData = data;

            select.innerHTML = '<option value="">-- Choose Item --</option>';
            data.forEach(item => {
                const disabled = item.availableQty < 1 ? 'disabled' : '';
                const stockText = item.availableQty < 1 ? '(Out of Stock)' : `(x${item.availableQty})`;

                const option = document.createElement('option');
                option.value = item._id; // Assuming MongoDB _id
                option.textContent = `${item.name} - $${item.price} ${stockText}`;
                if (disabled) option.disabled = true;

                // Store data in dataset for easy access
                option.dataset.name = item.name;
                option.dataset.price = item.price;
                option.dataset.max = item.availableQty;

                select.appendChild(option);
            });
        } catch (err) {
            select.innerHTML = '<option>Error loading menu</option>';
        }
    },

    addToCart: () => {
        const select = document.getElementById('cust-menu-select');
        const qtyInput = document.getElementById('cust-qty');
        const selectedOption = select.options[select.selectedIndex];

        if (!select.value) return alert("Select an item");

        const id = select.value;
        const name = selectedOption.dataset.name;
        const price = parseFloat(selectedOption.dataset.price);
        const max = parseInt(selectedOption.dataset.max);
        const qty = parseInt(qtyInput.value);

        if (qty < 1) return alert("Qty must be >= 1");
        if (qty > max) return alert(`Only ${max} available!`);

        // Check if already in cart
        const existing = app.state.cart.find(c => c.menuItemId === id);
        if (existing) {
            if (existing.qty + qty > max) return alert("Total qty exceeds stock!");
            existing.qty += qty;
        } else {
            app.state.cart.push({ menuItemId: id, name, price, qty });
        }

        app.renderCart();
        qtyInput.value = 1; // reset
        select.value = ""; // reset
    },

    renderCart: () => {
        const list = document.getElementById('cart-list');
        const totalSpan = document.getElementById('cart-total');
        list.innerHTML = '';

        let total = 0;

        app.state.cart.forEach((item, index) => {
            total += item.price * item.qty;
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${item.name} (x${item.qty}) - $${item.price * item.qty}</span>
                <button onclick="app.removeFromCart(${index})">Remove</button>
            `;
            list.appendChild(li);
        });

        totalSpan.textContent = `$${total}`;
    },

    removeFromCart: (index) => {
        app.state.cart.splice(index, 1);
        app.renderCart();
    },

    placeOrder: async () => {
        const custId = document.getElementById('cust-id').value.trim();
        const priority = document.getElementById('cust-priority').checked;
        const resultDiv = document.getElementById('order-result');

        resultDiv.textContent = "";
        resultDiv.className = "msg";

        if (!custId) return alert("Enter Customer ID");
        if (app.state.cart.length === 0) return alert("Cart is empty");

        const payload = {
            customerId: custId,
            isPriority: priority,
            items: app.state.cart.map(c => ({ menuItemId: c.menuItemId, qty: c.qty }))
        };

        try {
            const res = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                // Backend might return error message in data.message
                throw new Error(data.message || "Failed to place order");
            }

            resultDiv.innerHTML = `<strong>Order Placed!</strong><br>ID: ${data._id || data.id}<br>Total: $${data.totalPrice}<br>Status: ${data.status}`;
            resultDiv.className = "msg success";

            // clear
            app.state.cart = [];
            app.renderCart();
            document.getElementById('cust-id').value = "";
            app.loadMenuForCustomer(); // Refresh stock

        } catch (err) {
            resultDiv.textContent = `Error: ${err.message}`;
            resultDiv.className = "msg error";
        }
    },

    // ================= ORDERS (STAFF) =================

    loadActiveOrders: async (showLoading = true) => {
        const container = document.getElementById('orders-list');
        if (showLoading) container.innerHTML = '<p>Loading active orders...</p>';

        try {
            const res = await fetch(`${API_BASE_URL}/orders`); // Active only
            if (!res.ok) throw new Error("Fetch failed");
            const orders = await res.json();
            app.renderOrderCards(orders, container);
        } catch (err) {
            console.error(err);
            if (showLoading) container.innerHTML = `<p class="low-stock">Error: ${err.message}</p>`;
        }
    },

    loadAllOrders: async () => {
        const container = document.getElementById('debug-orders-list');
        container.innerHTML = '<p>Loading history...</p>';
        try {
            const res = await fetch(`${API_BASE_URL}/orders/all`);
            const orders = await res.json();
            app.renderOrderCards(orders, container, true); // true = read only mode mostly? No, same actions allowed usually if valid
        } catch (err) {
            container.innerHTML = `<p>Error: ${err.message}</p>`;
        }
    },

    renderOrderCards: (orders, container) => {
        container.innerHTML = '';
        if (orders.length === 0) {
            container.innerHTML = '<p>No orders found.</p>';
            return;
        }

        orders.forEach(order => {
            const card = document.createElement('div');
            card.className = `order-card ${order.isPriority ? 'priority' : ''}`;

            const dateStr = new Date(order.createdAt).toLocaleTimeString();
            const itemsStr = order.items.map(i => `${i.menuItem ? i.menuItem.name : 'Unknown'} (x${i.qty})`).join(', ');

            let actionsHtml = '';
            // Determine allowable actions
            // Placed -> Preparing, Cancelled
            // Preparing -> Ready, Cancelled
            // Ready -> PickedUp

            if (order.status === 'Placed') {
                actionsHtml += `<button class="btn-sm" onclick="app.updateStatus('${order._id}', 'Preparing')">Start Preparing</button>`;
                actionsHtml += `<button class="btn-sm" style="background:#f44336" onclick="app.updateStatus('${order._id}', 'Cancelled')">Cancel</button>`;
            } else if (order.status === 'Preparing') {
                actionsHtml += `<button class="btn-sm" onclick="app.updateStatus('${order._id}', 'Ready')">Mark Ready</button>`;
                actionsHtml += `<button class="btn-sm" style="background:#f44336" onclick="app.updateStatus('${order._id}', 'Cancelled')">Cancel</button>`;
            } else if (order.status === 'Ready') {
                actionsHtml += `<button class="btn-sm" onclick="app.updateStatus('${order._id}', 'PickedUp')">Picked Up</button>`;
            }

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between">
                    <strong>#${order._id.slice(-6)}</strong>
                    <span class="status-badge status-${order.status}">${order.status}</span>
                </div>
                <div><strong>Customer:</strong> ${order.customerId} ${order.isPriority ? '🔥(PRIORITY)' : ''}</div>
                <div><strong>Total:</strong> $${order.totalPrice}</div>
                <div><strong>Time:</strong> ${dateStr}</div>
                <hr>
                <div>${itemsStr}</div>
                <div class="order-actions">
                    ${actionsHtml}
                </div>
            `;
            container.appendChild(card);
        });
    },

    updateStatus: async (id, newStatus) => {
        if (!confirm(`Change status to ${newStatus}?`)) return;

        try {
            const res = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) throw new Error("Failed to update");

            // Refresh
            app.loadActiveOrders();
            // Also refresh debug view if visible
            if (!document.getElementById('debug-orders-list').classList.contains('hidden')) {
                app.loadAllOrders();
            }

        } catch (err) {
            alert("Error updating status: " + err.message);
        }
    }
};

// Initialize app
document.addEventListener('DOMContentLoaded', app.init);
