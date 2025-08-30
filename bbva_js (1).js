let paymentsData = [];
let bcvRate = 0;

// Establecer fecha actual por defecto
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').value = today;
});

function extractPayments() {
    const text = document.getElementById('textInput').value;
    const fecha = document.getElementById('fecha').value;
    const tasaBcvInput = document.getElementById('tasaBcv').value;
    
    if (!text.trim()) {
        alert('Por favor, pega los mensajes de BBVA Provincial primero.');
        return;
    }
    
    if (!fecha) {
        alert('Por favor, selecciona una fecha.');
        return;
    }
    
    if (!tasaBcvInput || tasaBcvInput <= 0) {
        alert('Por favor, ingresa una tasa BCV válida.');
        return;
    }
    
    bcvRate = parseFloat(tasaBcvInput);
    
    // Regex para extraer datos
    const regex = /BBVA Provincial informa: has recibido un Pago Movil Dinero Rapido Otros Bancos Ref:(\d+) del Tlf\.(\*?\d+) por Bs\s+([\d\.,]+)\.?/g;
    
    paymentsData = [];
    let match;
    
    while ((match = regex.exec(text)) !== null) {
        const referencia = match[1];
        const telefono = match[2];
        let monto = match[3].trim();
        
        // Procesar el monto
        const commas = monto.split(',');
        if (commas.length > 1) {
            const decimals = commas[commas.length - 1];
            const integerPart = commas.slice(0, -1).join('').replace(/\./g, '');
            monto = integerPart + '.' + decimals;
        } else {
            monto = monto.replace(/\./g, '');
        }
        
        const numericAmount = parseFloat(monto);
        
        if (!isNaN(numericAmount)) {
            const usdAmount = numericAmount / bcvRate;
            paymentsData.push({
                fecha: fecha,
                referencia: referencia,
                telefono: telefono,
                monto: numericAmount,
                montoUsd: usdAmount,
                cliente: '',
                estado: 'Pendiente'
            });
        }
    }
    
    if (paymentsData.length === 0) {
        alert('No se encontraron pagos válidos en el texto.');
        return;
    }
    
    displayResults();
}

function displayResults() {
    // Mostrar tasa BCV
    const bcvDisplay = document.getElementById('bcvRateDisplay');
    bcvDisplay.innerHTML = `💵 Tasa BCV utilizada: Bs ${formatNumber(bcvRate)} por USD`;
    bcvDisplay.classList.remove('hidden');
    
    // Calcular estadísticas
    const total = paymentsData.reduce((sum, payment) => sum + payment.monto, 0);
    const totalUsd = paymentsData.reduce((sum, payment) => sum + payment.montoUsd, 0);
    const count = paymentsData.length;
    const average = total / count;
    const amounts = paymentsData.map(p => p.monto);
    const max = Math.max(...amounts);
    const min = Math.min(...amounts);
    
    // Mostrar estadísticas
    document.getElementById('totalAmount').innerHTML = `
        Total: <span style="color: #28a745;">Bs ${formatNumber(total)}</span><br>
        <span style="font-size: 0.7em; color: #007bff;">≈ $${formatNumber(totalUsd)} USD</span>
    `;
    document.getElementById('paymentCount').textContent = count;
    document.getElementById('averageAmount').textContent = `Bs ${formatNumber(average)}`;
    document.getElementById('maxAmount').textContent = `Bs ${formatNumber(max)}`;
    document.getElementById('minAmount').textContent = `Bs ${formatNumber(min)}`;
    
    // Generar tabla
    const tbody = document.getElementById('paymentsTableBody');
    tbody.innerHTML = '';
    
    paymentsData.forEach((payment, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${payment.fecha}</td>
            <td class="ref-cell">${payment.referencia}</td>
            <td class="phone-cell">${payment.telefono}</td>
            <td class="amount-cell">Bs ${formatNumber(payment.monto)}</td>
            <td class="usd-amount">$${formatNumber(payment.montoUsd)}</td>
            <td>
                <input type="text" 
                       class="client-input" 
                       placeholder="Nombre del cliente..." 
                       value="${payment.cliente}"
                       onchange="updateClientName(${index}, this.value)"
                       onblur="updateStatus(${index})">
            </td>
            <td id="status-${index}">${payment.estado}</td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('results').classList.remove('hidden');
}

function updateClientName(index, name) {
    paymentsData[index].cliente = name.trim();
}

function updateStatus(index) {
    const statusCell = document.getElementById(`status-${index}`);
    if (paymentsData[index].cliente.trim() !== '') {
        paymentsData[index].estado = 'Completado';
        statusCell.textContent = 'Completado';
        statusCell.style.color = '#28a745';
        statusCell.style.fontWeight = 'bold';
    } else {
        paymentsData[index].estado = 'Pendiente';
        statusCell.textContent = 'Pendiente';
        statusCell.style.color = '#dc3545';
        statusCell.style.fontWeight = 'bold';
    }
}

function formatNumber(num) {
    return num.toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function clearAll() {
    document.getElementById('textInput').value = '';
    document.getElementById('tasaBcv').value = '';
    document.getElementById('results').classList.add('hidden');
    document.getElementById('bcvRateDisplay').classList.add('hidden');
    paymentsData = [];
    bcvRate = 0;
}

function exportToCSV() {
    if (paymentsData.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }
    
    let csv = 'Fecha,Referencia,Teléfono,Monto (Bs),Monto (USD),Cliente,Estado,Tasa BCV\n';
    
    paymentsData.forEach(payment => {
        csv += `${payment.fecha},${payment.referencia},${payment.telefono},${payment.monto},${payment.montoUsd.toFixed(2)},"${payment.cliente}",${payment.estado},${bcvRate}\n`;
    });
    
    downloadFile(csv, 'pagos_bbva.csv', 'text/csv');
}

function exportToText() {
    if (paymentsData.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }
    
    const total = paymentsData.reduce((sum, payment) => sum + payment.monto, 0);
    const totalUsd = paymentsData.reduce((sum, payment) => sum + payment.montoUsd, 0);
    const fecha = paymentsData[0].fecha;
    
    let text = `RESUMEN DE PAGOS BBVA - ${fecha}\n`;
    text += `========================================\n\n`;
    text += `Tasa BCV utilizada: Bs ${formatNumber(bcvRate)} por USD\n`;
    text += `Total de pagos: ${paymentsData.length}\n`;
    text += `Monto total: Bs ${formatNumber(total)} (≈ $${formatNumber(totalUsd)} USD)\n\n`;
    text += `DETALLE DE PAGOS:\n`;
    text += `----------------------------------------\n`;
    
    paymentsData.forEach((payment, index) => {
        text += `${index + 1}. Ref: ${payment.referencia}\n`;
        text += `   Teléfono: ${payment.telefono}\n`;
        text += `   Monto: Bs ${formatNumber(payment.monto)} ($${formatNumber(payment.montoUsd)} USD)\n`;
        text += `   Cliente: ${payment.cliente || 'No asignado'}\n`;
        text += `   Estado: ${payment.estado}\n\n`;
    });
    
    downloadFile(text, 'resumen_pagos_bbva.txt', 'text/plain');
}

function copyToClipboard() {
    if (paymentsData.length === 0) {
        alert('No hay datos para copiar.');
        return;
    }
    
    const total = paymentsData.reduce((sum, payment) => sum + payment.monto, 0);
    const totalUsd = paymentsData.reduce((sum, payment) => sum + payment.montoUsd, 0);
    const fecha = paymentsData[0].fecha;
    
    let text = `RESUMEN DE PAGOS BBVA - ${fecha}\n`;
    text += `Tasa BCV: Bs ${formatNumber(bcvRate)}/$\n`;
    text += `Total: Bs ${formatNumber(total)} (≈ $${formatNumber(totalUsd)} USD) - ${paymentsData.length} pagos\n\n`;
    
    paymentsData.forEach((payment, index) => {
        text += `${index + 1}. ${payment.cliente || 'Cliente pendiente'} - Bs ${formatNumber(payment.monto)} ($${formatNumber(payment.montoUsd)}) - Ref: ${payment.referencia}\n`;
    });
    
    navigator.clipboard.writeText(text).then(function() {
        alert('Resumen copiado al portapapeles');
    }).catch(function(err) {
        console.error('Error al copiar: ', err);
        alert('Error al copiar al portapapeles');
    });
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}