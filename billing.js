/* ==========================================================================
   Anaya Automobiles - Billing Counter & POS Module (billing.js - With GST Toggle)
   ========================================================================== */

let currentBillItems = [];
let reservedInvoiceNo = null;
let editingDocId = null;
let editingOriginal = null;
let isGstMode = false; // Default Non-GST mode

// Money formatting helper
const money = (n) => '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Toggle GST / Non-GST Mode
function toggleGstMode() {
  isGstMode = !isGstMode;
  const btn = document.getElementById('gst-toggle-btn');
  const gstSection = document.getElementById('gst-extra-fields');
  
  if (btn) {
    if (isGstMode) {
      btn.textContent = '⚡ Mode: GST Invoice (ON)';
      btn.className = 'btn btn-primary text-xs font-bold';
      if(gstSection) gstSection.classList.remove('hidden');
    } else {
      btn.textContent = '⚡ Mode: Regular Bill (No GST)';
      btn.className = 'btn btn-light text-xs font-bold';
      if(gstSection) gstSection.classList.add('hidden');
    }
  }
  renderBillItems();
}

// Calculation Helper (Handles both Non-GST and GST 18% split)
function invoiceTotal() {
  const sub = currentBillItems.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
  const discount = Math.max(0, Number(document.getElementById('bill-discount')?.value) || 0);
  const taxable = Math.max(0, sub - discount);
  
  let cgst = 0, sgst = 0, total = taxable;
  if (isGstMode) {
    // Assuming standard 18% GST (9% CGST + 9% SGST) or calculated from input
    const gstRate = Number(document.getElementById('gst-rate-select')?.value) || 18;
    const totalTax = taxable * (gstRate / 100);
    cgst = totalTax / 2;
    sgst = totalTax / 2;
    total = taxable + totalTax;
  }

  return { sub, discount, taxable, cgst, sgst, total };
}

// Render Items Table
function renderBillItems() {
  const body = document.getElementById('bill-items-body');
  const prev = document.getElementById('prev-items-body');
  
  if (!currentBillItems.length) {
    if(body) body.innerHTML = '<tr><td colspan="6" class="text-center text-slate-400 py-6">No items added yet</td></tr>';
    if(prev) prev.innerHTML = '<tr><td colspan="4" class="text-center py-3 text-slate-400">No items yet</td></tr>';
  } else {
    if(body) {
      body.innerHTML = currentBillItems.map((i, n) => `
        <tr>
          <td><input class="field" value="${escapeHtml(i.name)}" onchange="updateItemProp(${n}, 'name', this.value)" placeholder="Part Name"></td>
          ${isGstMode ? `<td><input class="field" style="width:80px" value="${escapeHtml(i.hsn \vert{}\vert{} '8708')}" onchange="updateItemProp(${n}, 'hsn', this.value)" placeholder="HSN"></td>` : ''}
          <td><input class="field" style="width:90px" type="number" min="0" step="0.01" value="${Number(i.price)}" onchange="updateItemProp(${n}, 'price', this.value)"></td>
          <td><input class="field" style="width:70px" type="number" min="1" step="1" value="${Number(i.qty)}" onchange="updateItemProp(${n}, 'qty', this.value)"></td>
          <td class="font-bold">${money((Number(i.price) || 0) * (Number(i.qty) || 0))}</td>
          <td><button class="btn btn-danger" style="padding:4px 8px" onclick="removeItem(${n})">×</button></td>
        </tr>
      `).join('');
    }
    if(prev) {
      prev.innerHTML = currentBillItems.map(i => `
        <tr>
          <td style="padding:4px">${escapeHtml(i.name)} ${isGstMode && i.hsn ? `<br><small class="text-slate-500">HSN: ${i.hsn}</small>` : ''}</td>
          <td style="padding:4px">${money(i.price)}</td>
          <td style="padding:4px">${Number(i.qty)}</td>
          <td style="padding:4px">${money((Number(i.price) || 0) * (Number(i.qty) || 0))}</td>
        </tr>
      `).join('');
    }
  }
  updatePreview();
}

function updateItemProp(index, prop, val) {
  if (!currentBillItems[index]) return;
  if (prop === 'price') {
    currentBillItems[index].price = Math.max(0, Number(val) || 0);
  } else if (prop === 'qty') {
    currentBillItems[index].qty = Math.max(1, parseInt(val) || 1);
  } else {
    currentBillItems[index][prop] = val.trim();
  }
  renderBillItems();
}

function removeItem(index) {
  currentBillItems.splice(index, 1);
  renderBillItems();
}

// Live Preview & Calculations Updater
function updatePreview() {
  const fields = [
    ['cust-name', 'prev-cust-name', 'Walk-in'],
    ['cust-mobile', 'prev-cust-mobile', 'N/A'],
    ['vehicle-model', 'prev-vehicle-model', '-'],
    ['vehicle-no', 'prev-vehicle-no', '-']
  ];
  fields.forEach(([a, b, fb]) => {
    const el = document.getElementById(b);
    const input = document.getElementById(a);
    if (el && input) el.textContent = input.value.trim() || fb;
  });

  const payModeEl = document.getElementById('prev-pay-mode');
  const payInput = document.getElementById('payment-mode');
  if (payModeEl && payInput) payModeEl.textContent = payInput.value;

  const { sub, discount, taxable, cgst, sgst, total } = invoiceTotal();
  
  if(document.getElementById('bill-grand-total')) document.getElementById('bill-grand-total').textContent = money(total);
  if(document.getElementById('prev-subtotal')) document.getElementById('prev-subtotal').textContent = money(sub);
  if(document.getElementById('prev-discount')) document.getElementById('prev-discount').textContent = money(discount);
  
  const taxBreakdownEl = document.getElementById('prev-tax-breakdown');
  if (taxBreakdownEl) {
    if (isGstMode) {
      taxBreakdownEl.innerHTML = `
        <div class="flex justify-between"><span>Taxable Amount</span><span>${money(taxable)}</span></div>
        <div class="flex justify-between"><span>CGST (9%)</span><span>${money(cgst)}</span></div>
        <div class="flex justify-between"><span>SGST (9%)</span><span>${money(sgst)}</span></div>
      `;
      taxBreakdownEl.classList.remove('hidden');
    } else {
      taxBreakdownEl.classList.add('hidden');
    }
  }
  if(document.getElementById('prev-total')) document.getElementById('prev-total').textContent = money(total);
}

// Udhaar Alert check
function checkPendingUdhaar() {
  const mobile = document.getElementById('cust-mobile')?.value.trim();
  const vehicleNo = document.getElementById('vehicle-no')?.value.trim().toUpperCase();
  const alertBox = document.getElementById('udhaar-alert-box');
  if (!alertBox) return;

  if ((!mobile || mobile.length < 5) && (!vehicleNo || vehicleNo.length < 4)) {
    alertBox.classList.add('hidden');
    return;
  }

  if (window.allBillsCache && Array.isArray(window.allBillsCache)) {
    const pendingBills = window.allBillsCache.filter(b => {
      const isMatch = (mobile && b.mobile === mobile) || (vehicleNo && b.vehicleNo === vehicleNo);
      return isMatch && b.paymentMode === 'Udhaar' && b.id !== editingDocId;
    });

    if (pendingBills.length > 0) {
      const totalPending = pendingBills.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);
      alertBox.innerHTML = `⚠️ <b>Pending Udhaar Alert:</b> Is Customer/Vehicle ka pehle ka <b>${money(totalPending)}</b> udhaar baaki hai! (${pendingBills.length} Bill)`;
      alertBox.classList.remove('hidden');
    } else {
      alertBox.classList.add('hidden');
    }
  }
}

// Event Listeners setup
document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('add-item-btn');
  if (addBtn) {
    addBtn.onclick = () => {
      const name = document.getElementById('item-name')?.value.trim();
      const price = Number(document.getElementById('item-price')?.value);
      const qty = Number(document.getElementById('item-qty')?.value);

      if (!name || isNaN(price) || price < 0 || qty < 1) {
        alert('Valid part name and price enter karein');
        return;
      }

      currentBillItems.push({ name, hsn: '8708', price, qty, total: price * qty });
      document.getElementById('item-name').value = '';
      document.getElementById('item-price').value = '';
      document.getElementById('item-qty').value = '1';
      renderBillItems();
    };
  }

  ['cust-name', 'cust-mobile', 'vehicle-model', 'vehicle-no', 'payment-mode', 'bill-discount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        updatePreview();
        if (id === 'cust-mobile' || id === 'vehicle-no') checkPendingUdhaar();
      });
    }
  });

  const paySelect = document.getElementById('payment-mode');
  if (paySelect) paySelect.addEventListener('change', updatePreview);
});
