const defaultPos = [11.610961926975536, 108.11585590451305];
let data = JSON.parse(localStorage.getItem('bt_data')) || { cams: [], hos: [] };
let tempPos = null, previewLayer = null, handleMarker = null, userMarker = null;

const map = L.map('map', { center: defaultPos, zoom: 18, maxZoom: 22 });
L.tileLayer('./baothuan_tiles/baothuan_tiles/{z}/{x}/{y}.jpg', { maxZoom: 22, maxNativeZoom: 18 }).addTo(map);
const layers = L.layerGroup().addTo(map);

function locateUser(zoomIn = false) {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        if (userMarker) userMarker.setLatLng([lat, lng]);
        else userMarker = L.marker([lat, lng], { icon: L.divIcon({ className: 'user-location-dot', iconSize: [12, 12] }) }).addTo(map);
        if (zoomIn) map.flyTo([lat, lng], 19);
    }, null, { enableHighAccuracy: true });
}

map.on('click', (e) => {
    if (handleMarker) return;
    tempPos = e.latlng;
    L.popup().setLatLng(tempPos).setContent(`
        <div style="text-align:center;">
            <button class="btn btn-save" style="background:#e67e22; margin-bottom:5px;" onclick="startAdd('camera')">THÊM CAMERA</button><br>
            <button class="btn btn-save ho-bg" onclick="startAdd('household')">THÊM HỘ DÂN</button>
        </div>
    `).openOn(map);
});

function startAdd(type, editId = null) {
    showTab('add');
    document.getElementById('guide-text').style.display = 'none';
    document.getElementById('form-container').style.display = 'block';
    document.getElementById('edit-id').value = editId || "";
    document.getElementById('form-cam').style.display = (type === 'camera' ? 'block' : 'none');
    document.getElementById('form-ho').style.display = (type === 'household' ? 'block' : 'none');
    
    if (editId) {
        const item = type === 'camera' ? data.cams.find(c => c.id == editId) : data.hos.find(h => h.id == editId);
        tempPos = { lat: item.lat, lng: item.lng };
        if (type === 'camera') {
            document.getElementById('in-cam-name').value = item.name;
            document.getElementById('in-cam-h').value = item.h;
            document.getElementById('in-cam-a').value = item.a || 90;
            document.getElementById('in-cam-r').value = item.r;
        } else {
            document.getElementById('in-ho-name').value = item.name;
            document.getElementById('in-ho-phone').value = item.phone || "";
            document.getElementById('in-ho-addr').value = item.addr || "";
            document.getElementById('in-ho-note').value = item.note || "";
        }
    }
    if (type === 'camera') { initHandle(); liveUpdate(); }
    map.closePopup();
}

function initHandle() {
    if (handleMarker) map.removeLayer(handleMarker);
    const r = parseInt(document.getElementById('in-cam-r').value);
    const h = parseInt(document.getElementById('in-cam-h').value);
    const p = calculateEndPoint(tempPos.lat, tempPos.lng, h, r);
    handleMarker = L.marker([p.lat, p.lng], { draggable: true, icon: L.divIcon({ className: '', html: '<div class="handle-dot"></div>', iconSize: [16, 16] }) }).addTo(map);
    handleMarker.on('drag', (e) => {
        document.getElementById('in-cam-r').value = Math.round(map.distance(tempPos, e.target.getLatLng()));
        liveUpdate(false);
    });
}

function liveUpdate(moveHandle = true) {
    if (previewLayer) map.removeLayer(previewLayer);
    const h = parseInt(document.getElementById('in-cam-h').value), a = parseInt(document.getElementById('in-cam-a').value), r = parseInt(document.getElementById('in-cam-r').value);
    document.getElementById('val-h').innerText = h; document.getElementById('val-a').innerText = a; document.getElementById('val-r').innerText = r;
    previewLayer = drawFOV(tempPos.lat, tempPos.lng, h, a, r, '#e67e22').addTo(map);
    if (moveHandle && handleMarker) {
        const p = calculateEndPoint(tempPos.lat, tempPos.lng, h, r);
        handleMarker.setLatLng([p.lat, p.lng]);
    }
}

function finalSave(type) {
    const editId = document.getElementById('edit-id').value;
    const id = editId ? parseInt(editId) : Date.now();
    const newItem = { id, lat: tempPos.lat, lng: tempPos.lng };

    if (type === 'camera') {
        newItem.name = document.getElementById('in-cam-name').value || "Camera";
        newItem.h = parseInt(document.getElementById('in-cam-h').value);
        newItem.a = parseInt(document.getElementById('in-cam-a').value);
        newItem.r = parseInt(document.getElementById('in-cam-r').value);
        data.cams = data.cams.filter(c => c.id !== id);
        data.cams.push(newItem);
    } else {
        newItem.name = document.getElementById('in-ho-name').value || "Hộ dân";
        newItem.phone = document.getElementById('in-ho-phone').value;
        newItem.addr = document.getElementById('in-ho-addr').value;
        newItem.note = document.getElementById('in-ho-note').value;
        data.hos = data.hos.filter(h => h.id !== id);
        data.hos.push(newItem);
    }
    saveData();
    cancelAdd();
}

function renderAll() {
    layers.clearLayers();
    data.cams.forEach(c => {
        drawFOV(c.lat, c.lng, c.h, c.a || 90, c.r, '#e67e22').addTo(layers);
        L.circleMarker([c.lat, c.lng], { radius: 6, color: '#e67e22', fillOpacity: 1, weight: 2 }).addTo(layers)
        .bindPopup(`<b>📸 ${c.name}</b><br>Hướng: ${c.h}° | Tầm xa: ${c.r}m<br><button class="btn btn-save btn-full" style="margin-top:8px" onclick="startAdd('camera', ${c.id})">SỬA</button>`);
    });
    data.hos.forEach(h => {
        const content = `
            <div class="popup-container">
                <b class="popup-title">🏠 ${h.name}</b>
                <b>📞 SĐT:</b> ${h.phone || 'N/A'}<br>
                <b>📍 Địa chỉ:</b> ${h.addr || 'N/A'}<br>
                <b>📝 Ghi chú:</b>
                <div class="popup-note-box">${h.note || 'Không có ghi chú.'}</div>
                <button class="btn btn-save btn-full ho-bg" style="margin-top:10px" onclick="startAdd('household', ${h.id})">SỬA HỘ DÂN</button>
            </div>
        `;
        L.circleMarker([h.lat, h.lng], { radius: 8, color: '#2ecc71', fillOpacity: 1, weight: 2 }).addTo(layers).bindPopup(content);
    });
    refreshList();
}

function refreshList() {
    const q = document.getElementById('search-q').value.toLowerCase();
    const listBody = document.getElementById('list-body');
    listBody.innerHTML = '';
    document.getElementById('stat-cam').innerText = data.cams.length;
    document.getElementById('stat-ho').innerText = data.hos.length;

    listBody.innerHTML += '<div class="list-header">Mục Camera</div>';
    data.cams.filter(c => c.name.toLowerCase().includes(q)).forEach(c => listBody.appendChild(createRow('camera', c)));

    listBody.innerHTML += '<div class="list-header">Mục Hộ Dân</div>';
    data.hos.filter(h => 
        h.name.toLowerCase().includes(q) || 
        (h.phone||"").includes(q) || 
        (h.addr||"").toLowerCase().includes(q) || 
        (h.note||"").toLowerCase().includes(q)
    ).forEach(h => listBody.appendChild(createRow('household', h)));
}

function createRow(type, item) {
    const div = document.createElement('div'); div.className = 'item-row';
    div.style = "padding:10px; border-bottom:1px solid #eee; display:flex; align-items:center; gap:10px;";
    div.innerHTML = `
        <div style="flex-grow:1; cursor:pointer;" onclick="map.flyTo([${item.lat}, ${item.lng}], 20)">
            <div style="font-weight:bold;">${item.name}</div>
            <div style="font-size:11px; color:#999;">${type==='camera'?'Hướng: '+item.h+'°':'SĐT: '+(item.phone||'N/A')}</div>
        </div>
        <button class="btn-action btn-edit" onclick="startAdd('${type}', ${item.id})">✎</button>
        <button class="btn-action btn-del" onclick="deleteItem('${type}', ${item.id})">🗑</button>
    `;
    return div;
}

function deleteItem(type, id) {
    if (confirm("Xác nhận xóa mục này?")) {
        if (type === 'camera') data.cams = data.cams.filter(c => c.id !== id);
        else data.hos = data.hos.filter(h => h.id !== id);
        saveData();
    }
}

function saveData() { localStorage.setItem('bt_data', JSON.stringify(data)); renderAll(); }
function showTab(t) {
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-btn-'+t).classList.add('active');
    document.getElementById('panel-add').style.display = t==='add'?'block':'none';
    document.getElementById('panel-manage').style.display = t==='manage'?'block':'none';
}
function cancelAdd() {
    document.getElementById('form-container').style.display = 'none';
    document.getElementById('guide-text').style.display = 'block';
    if (handleMarker) map.removeLayer(handleMarker);
    if (previewLayer) map.removeLayer(previewLayer);
    tempPos = null; handleMarker = null;
}

function drawFOV(lat, lng, h, a, r, color) {
    const pts = [[lat, lng]]; const sH = h - a/2;
    for (let i = 0; i <= 20; i++) {
        const b = sH + (i * a/20), p = calculateEndPoint(lat, lng, b, r);
        pts.push([p.lat, p.lng]);
    }
    return L.polygon(pts, { color, weight: 1, fillOpacity: 0.2 });
}

function calculateEndPoint(lat, lng, brng, dist) {
    const R = 6378137, b = brng * Math.PI / 180, l1 = lat * Math.PI / 180, ln1 = lng * Math.PI / 180, dR = dist / R;
    const l2 = Math.asin(Math.sin(l1) * Math.cos(dR) + Math.cos(l1) * Math.sin(dR) * Math.cos(b));
    const ln2 = ln1 + Math.atan2(Math.sin(b) * Math.sin(dR) * Math.cos(l1), Math.cos(dR) - Math.sin(l1) * Math.sin(l2));
    return { lat: l2 * 180 / Math.PI, lng: ln2 * 180 / Math.PI };
}

// Các hàm xuất file (giữ nguyên logic cũ nhưng gọn hơn)
function exportExcel() {
    let csv = "\ufeffLoại,Tên,SĐT,Địa chỉ,Ghi chú,Lat,Lng\n";
    data.hos.forEach(h => csv += `Hộ Dân,${h.name},${h.phone},"${h.addr}","${h.note.replace(/\n/g, ' ')}",${h.lat},${h.lng}\n`);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = "bao_thuan.csv"; a.click();
}

function exportJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = "data_backup.json"; a.click();
}

function importJSON(event) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported.cams && imported.hos) { data = imported; saveData(); alert("Phục hồi thành công!"); }
        } catch(err) { alert("File không hợp lệ!"); }
    };
    reader.readAsText(event.target.files[0]);
}

renderAll();